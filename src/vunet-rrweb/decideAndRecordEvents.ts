import { record } from 'rrweb';
import { getRequestData, getRrwebDataPercentage } from './decideApi';
import { processEvent, SessionReplayExporterOptions } from './rrweb';
import { eventWithTime } from '@rrweb/types';

export function decideAndRecord(options: SessionReplayExporterOptions): void {
  const sessionId = options.getCurrentSessionId();
  const requestData = getRequestData(sessionId);
  getRrwebDataPercentage(options.decideApiEndpoint, requestData)
    .then((responseData) => {
      console.log('RRWEB data percentage is', responseData.percentage);
      record({
        emit(event) {
          if (shouldFilterEvent(event, responseData.percentage)) {
            processEvent(options.getCurrentSessionId, event);
          }
        },
        recordCanvas: true,
      });
    })
    .catch((error) => {
      console.error('Failed to get RRWEB data percentage:', error);
    });
}

function shouldFilterEvent(event: eventWithTime, percentage: number): boolean {
  const threshold = 100 - percentage;
  const random = Math.floor(Math.random() * 100);
  return random > threshold;
}
