import { pack, record } from 'rrweb';
import { getRequestData, getRrwebDataPercentage } from './decideApi';
import { processEvent } from './rrweb';
import { eventWithTime } from '@rrweb/types';
import { SessionIdGetter } from './types';

export function decideAndRecord(sessionIdGetter: SessionIdGetter): void {
  const sessionId = sessionIdGetter();
  getRrwebDataPercentage(getRequestData(sessionId))
    .then((responseData) => {
      console.log('RRWEB data percentage is', responseData.percentage);
      record({
        emit(event) {
          if (shouldFilterEvent(event, responseData.percentage)) {
            processEvent(sessionIdGetter, event);
          }
        },
        recordCanvas: true,
        // packFn: pack,
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
