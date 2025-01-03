import { EventType, eventWithTime } from '@rrweb/types';

export type BatchPayload = {
  sessionId: string;
  events: eventWithTime[];
};

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
  percent: number;
  /**
   * Filter events based on the type of event
   * If array is empty or null then don't filter any event
   */
  eventFilter: EventType[];
}

type Config = {
  enable_collect_everything: boolean;
};

type SessionRecording = {
  endpoint: string;
  consoleLogRecordingEnabled: boolean;
};

type ViZData = {
  toolbarParams: Record<string, unknown>; //??
  errorsWhileComputingFlags: boolean; //??
  capturePerformance: boolean; // Which Performance
  isAuthenticated: boolean; // I guess not required
  supportedCompression: string[]; // Base64 is not a compression Its an Encoding
  config: Config; // What other config
  featureFlagPayloads: Record<string, unknown>; // What is this
  featureFlags: Record<string, unknown>; // What is this
  sessionRecording: SessionRecording; // ??
  siteApps: unknown[]; // What is this
};
