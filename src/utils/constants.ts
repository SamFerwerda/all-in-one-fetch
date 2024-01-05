export const RETRY_DEFAULTS: Record<string, number> = {
    '5XX': 3,
    '4XX': 0,
    '3XX': 0,
    '2XX': 0,
    '1XX': 0,
    TIMEOUT: 3,
    NETWORK_ISSUE: 5,
    RETRY_DELAY: 4000,
    MAX_RETRY_DELAY: 25000,
    EXPONENTIAL_COEFFICIENT: 1.5
}