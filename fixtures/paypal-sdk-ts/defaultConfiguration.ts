export const DEFAULT_RETRY_CONFIG = {
  maxNumberOfRetries: 0,
  retryOnTimeout: true,
  retryInterval: 1,
  httpMethodsToRetry: ['GET', 'PUT'], // Notice POST is intentionally excluded
};
