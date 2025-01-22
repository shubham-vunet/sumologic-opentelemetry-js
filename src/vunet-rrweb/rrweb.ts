import { eventWithTime } from '@rrweb/types';
import * as api from '@opentelemetry/api';
import { TRACES_ENDPOINT } from './common';
import { BatchingOptions, BatchPayload, SessionIdGetter } from './types';
import { decideAndRecord } from './decideAndRecordEvents';

export interface SessionReplayExporterOptions {
  collectionSourceUrl: string;
  authorizationToken?: string;
  serviceName?: string;
  applicationName?: string;
  deploymentEnvironment?: string;
  defaultAttributes?: api.Attributes;
  samplingProbability?: number | string;
  bufferMaxSpans?: number;
  maxExportBatchSize?: number;
  bufferTimeout?: number;
  getCurrentSessionId: SessionIdGetter;
  decideApiEndpoint: string;
  rrwebCollectionSourceUrl: string;
}

const eventQueue: eventWithTime[] = [];
const BATCH_SIZE = 500;
const MIN_BATCH_SIZE = 10;
const DEBOUNCE_TIME_MS = 2000;

let debounceTimeout: NodeJS.Timeout | null = null;

/// Write a logic to batch events and send them to the server
/// This will add events to the events array and when conditions meet then It'll send them to the server
/// If the internet connection is fast then send events frequently and bigger batch size
/// If the internet connection is slow then send events less frequently and smaller batch size
/// If events generated are more frequent then we need to send data frequently
/// If events generated are less frequent then we can send data less frequently
/// Events once collected can be sent using the sendPayload function
export const processEvent = (
  sidGetter: SessionIdGetter,
  event?: eventWithTime,
  options?: BatchingOptions,
): void => {
  event && eventQueue.push(event);

  if (eventQueue.length < MIN_BATCH_SIZE && !options?.forceSend) {
    debounceSendEvents(sidGetter);
    return;
  }

  const eventsToSend = eventQueue.splice(0, BATCH_SIZE);

  const sessionId = sidGetter();
  const payload: BatchPayload = {
    sessionId,
    events: eventsToSend,
  };
  sendPayload(payload);
};

const sendPayload = (payload: BatchPayload) => {
  console.log(payload);
  const otelPayload = {
    resourceLogs: [
      {
        resource: {
          attributes: [
            {
              key: 'service.name',
              value: { stringValue: 'vunet-rrweb' },
            },
          ],
        },
        scopeLogs: [
          {
            scope: {
              name: 'vunet-rrweb',
              version: '1.0.0',
            },
            logRecords: payload.events.map((event) => ({
              timeUnixNano: event.timestamp * 1e6,
              body: { stringValue: JSON.stringify(event) },
              attributes: [
                {
                  key: 'session.id',
                  value: { stringValue: payload.sessionId },
                },
              ],
            })),
          },
        ],
      },
    ],
  };

  fetch(TRACES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(otelPayload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data) => {
      console.log('Successfully sent events:', data);
    })
    .catch((error) => {
      console.error('Error sending events:', error);
      // Re-add the events to the queue if sending fails
      eventQueue.unshift(...payload.events);
    });
};

const debounceSendEvents = (sidGetter: SessionIdGetter) => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    processEvent(sidGetter, undefined, { forceSend: true });
  }, DEBOUNCE_TIME_MS);
};

export class SessionReplayExporter {
  options: SessionReplayExporterOptions;
  constructor(options: SessionReplayExporterOptions) {
    this.options = options;
  }
  decideAndRecord = () => decideAndRecord(this.options);
}
