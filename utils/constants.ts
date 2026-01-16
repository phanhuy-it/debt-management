/**
 * Application constants
 */

export const DAYS_IN_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

export const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

export const CHART_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#14B8A6', '#F97316'
];

/**
 * Format currency to Vietnamese format
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export const getTodayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Check if a payment is a borrow record
 */
export const isBorrowPayment = (paymentId: string, note?: string): boolean => {
  return paymentId.startsWith('borrow-') || (note?.includes('Vay thêm') ?? false);
};
