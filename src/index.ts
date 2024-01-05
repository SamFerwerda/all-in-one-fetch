/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import {
    FetchOptions,
    HttpStatus,
} from './types/http';
import { RETRY_DEFAULTS } from './utils/constants';
import { isDOMException } from './utils/guards';

export function fetchWithRetry(
    url: string,
    options: Partial<FetchOptions> = {},
): Promise<Response> {
    const { 
        maxRetryDelay = RETRY_DEFAULTS.MAX_RETRY_DELAY,
        initialRetryDelay = RETRY_DEFAULTS.RETRY_DELAY,
        exponentialBackoff = true,
        exponentialCoefficient = RETRY_DEFAULTS.EXPONENTIAL_COEFFICIENT,
        retriesPerCode = {}
     } = options;

    const {
        networkIssue: NETWORK_ISSUE = RETRY_DEFAULTS.NETWORK_ISSUE,
        timeout: TIMEOUT = RETRY_DEFAULTS.NETWORK_ISSUE,
        '5XX': INTERNAL_SERVER_ERROR = RETRY_DEFAULTS['5XX']
    } = retriesPerCode;
    
    function _retryDelay(attempt: number){
        return exponentialBackoff ? Math.min(exponentialCoefficient**attempt * initialRetryDelay, maxRetryDelay) : initialRetryDelay;
    }

    function _isRetry(
        attempt: number,
        error: Error | null,
        response: Response | null,
      ) {
        if (attempt < TIMEOUT && isDOMException(error)){
            return true
        }

        // retry on network errors
        if (attempt < NETWORK_ISSUE && error && !isDOMException(error)) {
          return true;
        }
      
        // retry on server errors
        if (
          attempt < INTERNAL_SERVER_ERROR
          && response?.status
          && response.status >= HttpStatus.INTERNAL_SERVER_ERROR
        ) {
          return true;
        }
        
        if (response){
            const status = `${response.status}`;
            const codeGroup = `${status[0]}XX`
            const maxRetries = retriesPerCode[status] || retriesPerCode[codeGroup] || RETRY_DEFAULTS[codeGroup] || 0;
            return attempt < maxRetries
        }
        return false;
      }

    const { retryDelay = _retryDelay, isRetry = _isRetry, timeout = 30000 } = options;
  
    const callback = async (attempt: number): Promise<Response> => {
      try {
        const result = await fetch(url, { signal: AbortSignal.timeout(timeout), ...options });
  
        if (isRetry(attempt, null, result)) {
          return await new Promise((resolve) => {
            setTimeout(() => resolve(callback(attempt + 1)), retryDelay(attempt));
          });
        }
        return result;
      } catch (err) {
        if (isRetry(attempt, err as Error, null)) {
          return new Promise((resolve) => {
            setTimeout(() => resolve(callback(attempt + 1)), retryDelay(attempt));
          });
        }
        throw err;
      }
    };
    return callback(0);
  }
  