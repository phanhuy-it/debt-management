import { Loan, CreditCard, FixedExpense, Income, Lending, InvestmentAccount, InvestmentTransaction, Company, CompanyIncomeRecord, BhxhAdjustmentIndex } from '../types';

export interface AppData {
  loans: Loan[];
  creditCards: CreditCard[];
  fixedExpenses: FixedExpense[];
  incomes: Income[];
  lendings: Lending[];
  companies: Company[];
  companyIncomeRecords: CompanyIncomeRecord[];
  bhxhAdjustmentIndices: BhxhAdjustmentIndex[];
  investmentAccounts: InvestmentAccount[];
  investmentTransactions: InvestmentTransaction[];
}

export const emptyData = (): AppData => ({
  loans: [], creditCards: [], fixedExpenses: [], incomes: [], lendings: [],
  companies: [], companyIncomeRecords: [], bhxhAdjustmentIndices: [],
  investmentAccounts: [], investmentTransactions: []
});

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body as T;
}

export const loadData = () => apiRequest<{ data: AppData; version: string }>('/data');
export const saveData = (data: AppData, version: string) =>
  apiRequest<{ version: string }>('/data', { method: 'PUT', body: JSON.stringify({ data, version }) });

export const exportDataToFile = async (data: AppData): Promise<void> => {
  const blob = new Blob([JSON.stringify({ version: '2.0', exportDate: new Date().toISOString(), ...data }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `debt-management-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export type ImportedData = AppData;

const requiredFields: Record<keyof AppData, { strings: string[]; numbers: string[]; payments?: boolean }> = {
  loans: { strings: ['id', 'name', 'provider', 'type', 'startDate', 'status'], numbers: ['originalAmount', 'monthlyDueDate', 'monthlyPayment', 'termMonths'], payments: true },
  creditCards: { strings: ['id', 'name', 'provider', 'status'], numbers: ['creditLimit', 'totalDebt', 'paymentAmount', 'dueDate'], payments: true },
  fixedExpenses: { strings: ['id', 'name', 'status'], numbers: ['amount', 'dueDate'], payments: true },
  incomes: { strings: ['id', 'name', 'status'], numbers: ['amount', 'receivedDate'], payments: true },
  lendings: { strings: ['id', 'name', 'borrower', 'startDate', 'status'], numbers: ['originalAmount'], payments: true },
  companies: { strings: ['id', 'name'], numbers: [] },
  companyIncomeRecords: { strings: ['id', 'companyId', 'month'], numbers: [] },
  bhxhAdjustmentIndices: { strings: ['id'], numbers: ['year', 'factor'] },
  investmentAccounts: { strings: ['id', 'name', 'status'], numbers: [] },
  investmentTransactions: { strings: ['id', 'accountId', 'type', 'date', 'status'], numbers: ['amount'] }
};

function isValidItem(item: unknown, key: keyof AppData): boolean {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const record = item as Record<string, unknown>;
  const fields = requiredFields[key];
  if (!fields.strings.every(field => typeof record[field] === 'string') ||
      !fields.numbers.every(field => typeof record[field] === 'number' && Number.isFinite(record[field]))) return false;
  if (fields.payments && (!Array.isArray(record.payments) || !record.payments.every((payment: unknown) => {
    if (!payment || typeof payment !== 'object' || Array.isArray(payment)) return false;
    const p = payment as Record<string, unknown>;
    return typeof p.id === 'string' && typeof p.date === 'string' &&
      typeof p.amount === 'number' && Number.isFinite(p.amount);
  }))) return false;
  return true;
}

export const importDataFromFile = async (file: File): Promise<ImportedData> => {
  const parsed: unknown = JSON.parse(await file.text());
  const source = Array.isArray(parsed) ? { loans: parsed } : parsed;
  if (!source || typeof source !== 'object') throw new Error('Dữ liệu trong file không hợp lệ');
  const result = emptyData();
  const record = source as Record<string, unknown>;
  let found = false;
  for (const key of Object.keys(result) as (keyof AppData)[]) {
    if (record[key] === undefined) continue;
    if (!Array.isArray(record[key]) || !(record[key] as unknown[]).every(item => isValidItem(item, key))) {
      throw new Error(`Dữ liệu ${key} không hợp lệ`);
    }
    found = true;
    Object.assign(result, { [key]: record[key] });
  }
  if (!found) throw new Error('File không chứa dữ liệu hợp lệ');
  return result;
};
