import { createClient } from '@supabase/supabase-js';
import { Loan, CreditCard, FixedExpense, Payment } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials chưa được cấu hình. Vui lòng thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface LoanRow {
  id: string;
  name: string;
  provider: string;
  type: string;
  original_amount: number;
  monthly_due_date: number | null;
  monthly_payment: number;
  start_date: string | null;
  term_months: number;
  status: string;
  notes: string | null;
  payments: Payment[];
  created_at: string;
  updated_at: string;
}

export interface CreditCardRow {
  id: string;
  name: string;
  provider: string;
  credit_limit: number;
  total_debt: number;
  payment_amount: number;
  due_date: number;
  status: string;
  notes: string | null;
  payments: Payment[];
  created_at: string;
  updated_at: string;
}

export interface FixedExpenseRow {
  id: string;
  name: string;
  amount: number;
  due_date: number;
  status: string;
  notes: string | null;
  payments: Payment[];
  created_at: string;
  updated_at: string;
}

// Convert database row to app type
export const loanRowToLoan = (row: LoanRow): Loan => ({
  id: row.id,
  name: row.name,
  provider: row.provider,
  type: row.type as 'BANK' | 'PERSONAL',
  originalAmount: Number(row.original_amount),
  monthlyDueDate: row.monthly_due_date || 0,
  monthlyPayment: Number(row.monthly_payment),
  startDate: row.start_date || new Date().toISOString(),
  termMonths: row.term_months,
  status: row.status as 'ACTIVE' | 'COMPLETED',
  notes: row.notes || undefined,
  payments: Array.isArray(row.payments) ? row.payments : []
});

export const creditCardRowToCreditCard = (row: CreditCardRow): CreditCard => ({
  id: row.id,
  name: row.name,
  provider: row.provider,
  creditLimit: Number(row.credit_limit),
  totalDebt: Number(row.total_debt),
  paymentAmount: Number(row.payment_amount),
  dueDate: row.due_date,
  status: row.status as 'ACTIVE' | 'COMPLETED',
  notes: row.notes || undefined,
  payments: Array.isArray(row.payments) ? row.payments : []
});

export const fixedExpenseRowToFixedExpense = (row: FixedExpenseRow): FixedExpense => ({
  id: row.id,
  name: row.name,
  amount: Number(row.amount),
  dueDate: row.due_date,
  status: row.status as 'ACTIVE' | 'COMPLETED',
  notes: row.notes || undefined,
  payments: Array.isArray(row.payments) ? row.payments : []
});

// Convert app type to database row
export const loanToLoanRow = (loan: Loan): Partial<LoanRow> => ({
  id: loan.id,
  name: loan.name,
  provider: loan.provider,
  type: loan.type,
  original_amount: loan.originalAmount,
  monthly_due_date: loan.monthlyDueDate || null,
  monthly_payment: loan.monthlyPayment,
  start_date: loan.startDate || null,
  term_months: loan.termMonths,
  status: loan.status,
  notes: loan.notes || null,
  payments: loan.payments || []
});

export const creditCardToCreditCardRow = (card: CreditCard): Partial<CreditCardRow> => ({
  id: card.id,
  name: card.name,
  provider: card.provider,
  credit_limit: card.creditLimit,
  total_debt: card.totalDebt,
  payment_amount: card.paymentAmount,
  due_date: card.dueDate,
  status: card.status,
  notes: card.notes || null,
  payments: card.payments || []
});

export const fixedExpenseToFixedExpenseRow = (expense: FixedExpense): Partial<FixedExpenseRow> => ({
  id: expense.id,
  name: expense.name,
  amount: expense.amount,
  due_date: expense.dueDate,
  status: expense.status,
  notes: expense.notes || null,
  payments: expense.payments || []
});

