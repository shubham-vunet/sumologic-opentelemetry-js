import axios from 'axios';
import { RRWEB_ENDPOINT } from './common';
import { DecideApiRequest, ApiResponseData } from './types';

/**
 * Pick one element from the array
 */
function pickOne<T extends object | string>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get RRWEB data percentage
 */
export async function getRrwebDataPercentage(
  requestData: DecideApiRequest,
): Promise<ApiResponseData> {
  try {
    const response = await axios.post<ApiResponseData>(
      `${RRWEB_ENDPOINT}-${pickOne(['partial', 'full', 'none'])}.json`,
      requestData,
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching RRWEB data percentage:', error);
    throw error;
  }
}

// Dummy function to get the request data
export const getRequestData = (sessionId: string): DecideApiRequest => {
  const navigatorConnection = (window.navigator as any).connection;
  const connectionInfo = navigatorConnection
    ? {
        downlink: navigatorConnection.downlink,
        effectiveType: navigatorConnection.effectiveType,
        rtt: navigatorConnection.rtt,
        saveData: navigatorConnection.saveData,
      }
    : null;

  return {
    connectionInfo,
    userAgent: navigator.userAgent,
    resolution: `${window.screen.width}x${window.screen.height}`,
    sessionId,
  };
};
