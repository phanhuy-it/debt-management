/**
 * Date utility functions
 */
import { Loan, LoanType, LoanStatus } from '../types';

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

/**
 * Parse "YYYY-MM" to {year, monthIndex} (0-11)
 */
export const parseMonthYear = (value?: string): { year: number; month: number } | null => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const monthIndex = parseInt(m[2], 10) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;
  return { year, month: monthIndex };
};

export const toMonthStart = (year: number, month: number): Date => new Date(year, month, 1);

/**
 * Get first payment month for a loan (month start date)
 * - Uses loan.firstPaymentMonthYear when available
 * - Fallbacks to month of loan.startDate
 */
export const getLoanFirstPaymentMonthStart = (loan: Pick<Loan, 'firstPaymentMonthYear' | 'startDate'>): Date => {
  const parsed = parseMonthYear(loan.firstPaymentMonthYear);
  if (parsed) return toMonthStart(parsed.year, parsed.month);

  const d = new Date(loan.startDate);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return toMonthStart(now.getFullYear(), now.getMonth());
  }
  return toMonthStart(d.getFullYear(), d.getMonth());
};

/**
 * Check if a loan has a scheduled monthly payment in a target month.
 * Applies for BANK/APP loans with monthlyPayment > 0 and ACTIVE status.
 *
 * Rules:
 * - monthsDiff < 0: not started yet
 * - interestOnly: active indefinitely from firstPaymentMonthYear
 * - termMonths > 0: active for [0, termMonths)
 */
export const isLoanPaymentDueInMonth = (loan: Loan, targetYear: number, targetMonth: number): boolean => {
  if (loan.status !== LoanStatus.ACTIVE) return false;
  if (loan.type !== LoanType.BANK && loan.type !== LoanType.APP) return false;
  if (!loan.monthlyPayment || loan.monthlyPayment <= 0) return false;

  const start = getLoanFirstPaymentMonthStart(loan);
  const target = toMonthStart(targetYear, targetMonth);
  const monthsDiff = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());

  if (monthsDiff < 0) return false;
  if (loan.interestOnly) return true;
  if (!loan.termMonths || loan.termMonths <= 0) return true;
  return monthsDiff < loan.termMonths;
};
