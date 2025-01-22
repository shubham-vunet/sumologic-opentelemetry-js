import axios from 'axios';
import { DecideApiRequest, ApiResponseData } from './types';

/**
 * Get RRWEB data percentage
 */
export async function getRrwebDataPercentage(
  decideApiEndpoint: string,
  requestData: DecideApiRequest,
): Promise<ApiResponseData> {
  try {
    const response = await axios.get<ApiResponseData>(decideApiEndpoint, {
      params: requestData,
    });
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
