import { pack, record } from 'rrweb';
import { getRequestData, getRrwebDataPercentage } from './decideApi';
import { processEvent } from './rrweb';
import { eventWithTime } from '@rrweb/types';
import { SessionIdGetter } from './types';

export function decideAndRecord(sessionIdGetter: SessionIdGetter): void {
  const sessionId = sessionIdGetter();
  getRrwebDataPercentage(getRequestData(sessionId))
    .then((responseData) => {
      console.log('RRWEB data percentage is', responseData.percent);
      record({
        emit(event) {
          if (shouldFilterEvent(event, responseData.percent)) {
            processEvent(sessionIdGetter, event);
          }
        },
        recordCanvas: true,
        packFn: pack,
      });
    })
    .catch((error) => {
      console.error('Failed to get RRWEB data percentage:', error);
    });
}

function shouldFilterEvent(event: eventWithTime, percent: number): boolean {
  const threshold = 100 - percent;
  const random = Math.floor(Math.random() * 100);
  return random > threshold;
}
