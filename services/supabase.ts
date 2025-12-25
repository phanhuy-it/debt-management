import { createClient } from '@supabase/supabase-js';
import { Loan, CreditCard, FixedExpense, Income, Lending, Investment, Payment, InvestmentAccount, InvestmentTransaction } from '../types';

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

export interface IncomeRow {
  id: string;
  name: string;
  amount: number;
  received_date: number;
  status: string;
  notes: string | null;
  payments: Payment[];
  created_at: string;
  updated_at: string;
}

export interface LendingRow {
  id: string;
  name: string;
  borrower: string;
  original_amount: number;
  start_date: string;
  monthly_due_date: number | null;
  monthly_payment: number | null;
  term_months: number | null;
  status: string;
  notes: string | null;
  payments: Payment[];
  created_at: string;
  updated_at: string;
}

export interface InvestmentRow {
  id: string;
  name: string;
  type: string;
  amount: number;
  date: string;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentAccountRow {
  id: string;
  name: string;
  status: string;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentTransactionRow {
  id: string;
  account_id: string;
  type: string;
  amount: number;
  date: string;
  status: string;
  note: string | null;
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

export const incomeRowToIncome = (row: IncomeRow): Income => ({
  id: row.id,
  name: row.name,
  amount: Number(row.amount),
  receivedDate: row.received_date,
  status: row.status as 'ACTIVE' | 'COMPLETED',
  notes: row.notes || undefined,
  payments: Array.isArray(row.payments) ? row.payments : []
});

export const lendingRowToLending = (row: LendingRow): Lending => ({
  id: row.id,
  name: row.name,
  borrower: row.borrower,
  originalAmount: Number(row.original_amount),
  startDate: row.start_date,
  monthlyDueDate: row.monthly_due_date || undefined,
  monthlyPayment: row.monthly_payment ? Number(row.monthly_payment) : undefined,
  termMonths: row.term_months || undefined,
  status: row.status as 'ACTIVE' | 'COMPLETED',
  notes: row.notes || undefined,
  payments: Array.isArray(row.payments) ? row.payments : []
});

export const investmentRowToInvestment = (row: InvestmentRow): Investment => ({
  id: row.id,
  name: row.name,
  type: row.type as 'DEPOSIT' | 'WITHDRAW',
  amount: Number(row.amount),
  date: row.date,
  status: row.status as 'ACTIVE' | 'COMPLETED',
  note: row.note || undefined
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

export const incomeToIncomeRow = (income: Income): Partial<IncomeRow> => ({
  id: income.id,
  name: income.name,
  amount: income.amount,
  received_date: income.receivedDate,
  status: income.status,
  notes: income.notes || null,
  payments: income.payments || []
});

export const lendingToLendingRow = (lending: Lending): Partial<LendingRow> => ({
  id: lending.id,
  name: lending.name,
  borrower: lending.borrower,
  original_amount: lending.originalAmount,
  start_date: lending.startDate,
  monthly_due_date: lending.monthlyDueDate || null,
  monthly_payment: lending.monthlyPayment || null,
  term_months: lending.termMonths || null,
  status: lending.status,
  notes: lending.notes || null,
  payments: lending.payments || []
});

export const investmentToInvestmentRow = (investment: Investment): Partial<InvestmentRow> => ({
  id: investment.id,
  name: investment.name,
  type: investment.type,
  amount: investment.amount,
  date: investment.date,
  status: investment.status,
  note: investment.note || null
});

// Convert database row to app type for InvestmentAccount
export const investmentAccountRowToInvestmentAccount = (row: InvestmentAccountRow): InvestmentAccount => ({
  id: row.id,
  name: row.name,
  status: row.status as 'ACTIVE' | 'COMPLETED',
  notes: row.notes || undefined,
  startDate: row.start_date || undefined,
  endDate: row.end_date || undefined
});

// Convert app type to database row for InvestmentAccount
export const investmentAccountToInvestmentAccountRow = (account: InvestmentAccount): Partial<InvestmentAccountRow> => ({
  id: account.id,
  name: account.name,
  status: account.status,
  notes: account.notes || null,
  start_date: account.startDate || null,
  end_date: account.endDate || null
});

// Convert database row to app type for InvestmentTransaction
export const investmentTransactionRowToInvestmentTransaction = (row: InvestmentTransactionRow): InvestmentTransaction => ({
  id: row.id,
  accountId: row.account_id,
  type: row.type as 'DEPOSIT' | 'WITHDRAW',
  amount: Number(row.amount),
  date: row.date,
  status: row.status as 'ACTIVE' | 'COMPLETED',
  note: row.note || undefined
});

// Convert app type to database row for InvestmentTransaction
export const investmentTransactionToInvestmentTransactionRow = (transaction: InvestmentTransaction): Partial<InvestmentTransactionRow> => ({
  id: transaction.id,
  account_id: transaction.accountId,
  type: transaction.type,
  amount: transaction.amount,
  date: transaction.date,
  status: transaction.status,
  note: transaction.note || null
});

