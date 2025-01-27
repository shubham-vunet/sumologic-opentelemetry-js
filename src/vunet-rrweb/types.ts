import { EventType } from '@rrweb/types';

export type BatchingOptions = {
  // Sends the events immediately without batching
  forceSend?: boolean;
};

export interface DecideApiRequest {
  connectionInfo: {
    downlink: number;
    effectiveType: string;
    rtt: number;
    saveData: boolean;
  } | null;
  userAgent: string;
  resolution: string;
  sessionId: string;
}

export interface SessionIdGetter {
  (): string;
}

export interface ApiResponseData {
  percentage: number;
  /**
   * Filter events based on the type of event
   * If array is empty or null then don't filter any event
   */
  eventFilter: EventType[];
}
