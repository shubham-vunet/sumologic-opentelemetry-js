import { eventWithTime } from '@rrweb/types';
import * as api from '@opentelemetry/api';
import { TRACES_ENDPOINT } from './common';
import { ApiResponseData, BatchingOptions, SessionIdGetter } from './types';
import { getRequestData, getRrwebDataPercentage } from './decideApi';
import { record } from 'rrweb';

export interface SessionReplayExporterOptions {
  collectionSourceUrl: string;
  authorizationToken?: string;
  serviceName?: string;
  applicationName: string;
  deploymentEnvironment?: string;
  defaultAttributes?: api.Attributes;
  samplingProbability?: number | string;
  bufferMaxSpans?: number;
  maxExportBatchSize?: number;
  bufferTimeout?: number;
  getCurrentSessionId: SessionIdGetter;
  decideApiEndpoint: string;
  rrwebCollectionSourceUrl: string;
  flushTimeout?: number;
}

const BATCH_SIZE = 500;
const MIN_BATCH_SIZE = 10;

export class SessionReplayExporter<Q extends eventWithTime = eventWithTime> {
  debounceTimeout?: ReturnType<typeof setTimeout>;
  flushTimeout: number;
  eventQueue: Q[] = [];
  options: SessionReplayExporterOptions;

  constructor(options: SessionReplayExporterOptions) {
    this.options = options;
    this.flushTimeout = options.flushTimeout || 3000;
  }

  private debounceSendEvents() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = setTimeout(() => {
      this.processEvent(undefined, { forceSend: true });
    }, this.flushTimeout);
  }

  /// Write a logic to batch events and send them to the server
  /// This will add events to the events array and when conditions meet then It'll send them to the server
  /// If the internet connection is fast then send events frequently and bigger batch size
  /// If the internet connection is slow then send events less frequently and smaller batch size
  /// If events generated are more frequent then we need to send data frequently
  /// If events generated are less frequent then we can send data less frequently
  /// Events once collected can be sent using the sendPayload function
  processEvent(event: Q): void;
  processEvent(event?: Q, options?: BatchingOptions): void;
  processEvent(event?: Q, options?: BatchingOptions): void {
    event && this.eventQueue.push(event);

    if (this.eventQueue.length < MIN_BATCH_SIZE && !options?.forceSend) {
      this.debounceSendEvents();
      return;
    }

    this.sendPayload();
  }

  async decideAndRecord(): Promise<ApiResponseData | null> {
    const urlObj = new URL(this.options.decideApiEndpoint);
    urlObj.searchParams.set('app_id', this.options.applicationName);

    const decideApiEndpoint = urlObj.toString();

    if (!decideApiEndpoint) {
      console.error(
        'Not recording Data because decideApiEndpoint is not provided',
      );
      return null;
    }

    const sessionId = this.options.getCurrentSessionId();
    const requestData = getRequestData(sessionId);

    try {
      const responseData = await getRrwebDataPercentage(
        decideApiEndpoint,
        requestData,
      );
      console.log(
        'RRWEB data percentage is',
        responseData.session_replay_percentage,
      );
      this.processResponse(responseData);
      return responseData;
    } catch (error) {
      console.error('Failed to get RRWEB data percentage:', error);
      return null;
    }
  }

  private processResponse(responseData: ApiResponseData) {
    const process = this.processEvent.bind(this);
    record({
      emit(event: Q) {
        if (shouldFilterEvent(event, responseData.session_replay_percentage)) {
          process(event);
        }
      },
      recordCanvas: true,
    });
  }

  sendPayload() {
    const eventsToSend = this.eventQueue.splice(0, BATCH_SIZE);
    console.log(eventsToSend);
    const sessionId = this.options.getCurrentSessionId();
    const otelPayload = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              {
                key: 'service.name',
                value: { stringValue: this.options.serviceName },
              },
            ],
          },
          scopeLogs: [
            {
              scope: { name: 'vunet-rrweb', version: '1.0.0' /* TODO */ },
              logRecords: eventsToSend.map((event) => ({
                timeUnixNano: event.timestamp * 1e6,
                body: { stringValue: JSON.stringify(event) },
                attributes: [
                  {
                    key: 'session.id',
                    value: { stringValue: sessionId },
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
        this.eventQueue.unshift(...eventsToSend);
      });
  }
}

function shouldFilterEvent(event: eventWithTime, percentage: number): boolean {
  const threshold = 100 - percentage;
  const random = Math.floor(Math.random() * 100);
  return random > threshold;
}
