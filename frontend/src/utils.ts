/**
 * Utility functions for the frontend application
 */

/**
 * Format a number as currency
 */
export const formatCurrency = (value: number, currency = '$'): string => {
  return `${currency}${value.toFixed(2)}`;
};

/**
 * Format a number as percentage
 */
export const formatPercentage = (value: number, decimals = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a date for display
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format a date with time
 */
export const formatDatetime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Truncate a string to a maximum length
 */
export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
};

/**
 * Get the CSS class for a positive/negative value
 */
export const getValueClass = (value: number): string => {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
};

/**
 * Format a large number with K, M, B suffixes
 */
export const formatLargeNumber = (num: number): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
};

/**
 * Get trend indicator text
 */
export const getTrendText = (trend: 'up' | 'down' | 'sideways'): string => {
  switch (trend) {
    case 'up':
      return '📈 Uptrend';
    case 'down':
      return '📉 Downtrend';
    case 'sideways':
      return '➡️ Sideways';
    default:
      return 'Unknown';
  }
};

/**
 * Get color class for trend
 */
export const getTrendColor = (trend: 'up' | 'down' | 'sideways'): string => {
  switch (trend) {
    case 'up':
      return 'positive';
    case 'down':
      return 'negative';
    case 'sideways':
      return 'neutral';
    default:
      return 'neutral';
  }
};

/**
 * Parse error message from API response
 */
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
};

/**
 * Check if a string is a valid email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check password strength
 */
export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (password.length < 8) return 'weak';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'medium';
  }
  if (!/[!@#$%^&*]/.test(password)) return 'medium';
  return 'strong';
};

/**
 * Debounce a function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle a function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Determine if a portfolio is profitable
 */
export const isProfitable = (totalPnl: number): boolean => {
  return totalPnl > 0;
};

/**
 * Get portfolio status badge text
 */
export const getPortfolioStatus = (roi: number, isActive: boolean): string => {
  if (!isActive) return 'Inactive';
  if (roi > 20) return '🔥 Excellent';
  if (roi > 10) return '📈 Good';
  if (roi > 0) return '✅ Positive';
  if (roi === 0) return '➡️ Breakeven';
  return '📉 Negative';
};
