import { createClient } from '@supabase/supabase-js';
import { Loan, CreditCard, FixedExpense, Income, Lending, Investment, Payment, InvestmentAccount, InvestmentTransaction, Company, CompanyIncomeRecord, BhxhAdjustmentIndex } from '../types';

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
  first_payment_month_year?: string | null;
  term_months: number;
  status: string;
  notes: string | null;
  payments: Payment[];
  interest_only: boolean | null;
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

export interface CompanyRow {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyIncomeRecordRow {
  id: string;
  company_id: string;
  month: string; // YYYY-MM
  net_salary: number | null;
  bhxh_base: number | null;
  exclude_bhxh?: boolean | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface BhxhAdjustmentIndexRow {
  id: string;
  year: number;
  factor: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// Convert database row to app type
export const loanRowToLoan = (row: LoanRow): Loan => ({
  id: row.id,
  name: row.name,
  provider: row.provider,
  type: row.type as 'BANK' | 'APP' | 'PERSONAL',
  originalAmount: Number(row.original_amount),
  monthlyDueDate: row.monthly_due_date || 0,
  monthlyPayment: Number(row.monthly_payment),
  startDate: row.start_date || new Date().toISOString(),
  firstPaymentMonthYear: row.first_payment_month_year || undefined,
  termMonths: row.term_months,
  status: row.status as 'ACTIVE' | 'COMPLETED',
  notes: row.notes || undefined,
  payments: Array.isArray(row.payments) ? row.payments : [],
  interestOnly: row.interest_only || undefined
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

const COMPANY_ID_TAG_RE = /\s*\[#companyId:([0-9a-fA-F-]{36})\]\s*$/;
const EXCLUDE_BHXH_TAG_RE = /\s*\[#excludeBhxh:(true|false|1|0)\]\s*$/i;
const SALARY_INCOME_PREFIX = 'salary-income:';

function parseIncomeNotes(notes?: string | null): { companyId?: string; excludeBhxh?: boolean; notes?: string } {
  const raw = notes || undefined;
  if (!raw) return {};

  // Salary incomes use notes as a stable key; keep it intact.
  if (raw.startsWith(SALARY_INCOME_PREFIX)) {
    const companyId = raw.slice(SALARY_INCOME_PREFIX.length).trim();
    return { companyId: companyId || undefined, notes: raw };
  }

  let cleaned = raw.trim();
  let companyId: string | undefined;
  let excludeBhxh: boolean | undefined;

  // Allow multiple tags at the end, regardless of their order.
  while (true) {
    const mExclude = EXCLUDE_BHXH_TAG_RE.exec(cleaned);
    if (mExclude) {
      const v = (mExclude[1] || '').toLowerCase();
      excludeBhxh = v === 'true' || v === '1';
      cleaned = cleaned.replace(EXCLUDE_BHXH_TAG_RE, '').trim();
      continue;
    }

    const mCompany = COMPANY_ID_TAG_RE.exec(cleaned);
    if (mCompany) {
      companyId = mCompany[1];
      cleaned = cleaned.replace(COMPANY_ID_TAG_RE, '').trim();
      continue;
    }

    break;
  }

  return { companyId, excludeBhxh, notes: cleaned || undefined };
}

function encodeIncomeNotes(income: Pick<Income, 'notes' | 'companyId' | 'excludeBhxh'>): string | null {
  const raw = income.notes || '';

  // Preserve salary key as-is
  if (raw.startsWith(SALARY_INCOME_PREFIX)) return raw;

  // Remove existing tags if any (support multiple tags and any order)
  let cleaned = raw.trim();
  while (true) {
    const next = cleaned
      .replace(COMPANY_ID_TAG_RE, '')
      .replace(EXCLUDE_BHXH_TAG_RE, '')
      .trim();
    if (next === cleaned) break;
    cleaned = next;
  }

  const tags: string[] = [];
  if (income.companyId) tags.push(`[#companyId:${income.companyId}]`);
  if (income.excludeBhxh) tags.push(`[#excludeBhxh:true]`);

  const out = [cleaned, ...tags].filter(Boolean).join('\n').trim();
  return out ? out : null;
}

export const incomeRowToIncome = (row: IncomeRow): Income => {
  const parsed = parseIncomeNotes(row.notes);
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    receivedDate: row.received_date,
    status: row.status as 'ACTIVE' | 'COMPLETED',
    notes: parsed.notes,
    companyId: parsed.companyId,
    excludeBhxh: parsed.excludeBhxh,
    payments: Array.isArray(row.payments) ? row.payments : []
  };
};

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
  first_payment_month_year: loan.firstPaymentMonthYear || null,
  term_months: loan.termMonths,
  status: loan.status,
  notes: loan.notes || null,
  payments: loan.payments || [],
  interest_only: loan.interestOnly || null
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
  notes: encodeIncomeNotes(income),
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

export const companyRowToCompany = (row: CompanyRow): Company => ({
  id: row.id,
  name: row.name,
  notes: row.notes || undefined,
  createdAt: row.created_at || undefined
});

export const companyToCompanyRow = (company: Company): Partial<CompanyRow> => ({
  id: company.id,
  name: company.name,
  notes: company.notes || null
});

export const companyIncomeRecordRowToCompanyIncomeRecord = (row: CompanyIncomeRecordRow): CompanyIncomeRecord => ({
  // Supabase/PostgREST may return DECIMAL/NUMERIC as string; normalize to number for calculations.
  // Keep undefined when value is null/empty/NaN.
  id: row.id,
  companyId: row.company_id,
  month: row.month,
  netSalary: (() => {
    const v: any = (row as any).net_salary;
    if (v == null || v === '') return undefined;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
  })(),
  bhxhBase: (() => {
    const v: any = (row as any).bhxh_base;
    if (v == null || v === '') return undefined;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
  })(),
  excludeBhxh: (row as any).exclude_bhxh ?? undefined,
  note: row.note || undefined,
  createdAt: row.created_at || undefined
});

export const companyIncomeRecordToCompanyIncomeRecordRow = (record: CompanyIncomeRecord): Partial<CompanyIncomeRecordRow> => ({
  id: record.id,
  company_id: record.companyId,
  month: record.month,
  net_salary: record.netSalary ?? null,
  bhxh_base: record.bhxhBase ?? null,
  exclude_bhxh: record.excludeBhxh ?? null,
  note: record.note || null
});

export const bhxhAdjustmentIndexRowToBhxhAdjustmentIndex = (row: BhxhAdjustmentIndexRow): BhxhAdjustmentIndex => ({
  id: row.id,
  year: Number(row.year),
  factor: Number(row.factor),
  note: row.note || undefined,
  createdAt: row.created_at || undefined
});

export const bhxhAdjustmentIndexToBhxhAdjustmentIndexRow = (idx: BhxhAdjustmentIndex): Partial<BhxhAdjustmentIndexRow> => ({
  id: idx.id,
  year: idx.year,
  factor: idx.factor,
  note: idx.note || null
});

