/**
 * Date utility functions
 */

/**
 * Check if a payment was made in the current month
 */
export const isCurrentMonthPaid = (payments: Array<{ date: string; id?: string; note?: string }>, isBorrowCheck?: (id: string, note?: string) => boolean): boolean => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  return payments.some(p => {
    if (isBorrowCheck && isBorrowCheck(p.id || '', p.note)) {
      return false;
    }
    const paymentDate = new Date(p.date);
    return paymentDate.getFullYear() === currentYear && 
           paymentDate.getMonth() === currentMonth;
  });
};

/**
 * Format date to Vietnamese locale
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('vi-VN');
};

/**
 * Get current date info
 */
export const getCurrentDateInfo = () => {
  const now = new Date();
  return {
    day: now.getDate(),
    month: now.getMonth(),
    year: now.getFullYear(),
    date: now
  };
};
