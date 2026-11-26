import { createHash } from 'node:crypto';

const definitions = [
  { key: 'loans', table: 'loans', fields: {
    id: 'id', name: 'name', provider: 'provider', type: 'type',
    originalAmount: 'original_amount', monthlyDueDate: 'monthly_due_date',
    monthlyPayment: 'monthly_payment', startDate: 'start_date',
    firstPaymentMonthYear: 'first_payment_month_year', termMonths: 'term_months',
    status: 'status', notes: 'notes', payments: 'payments', interestOnly: 'interest_only'
  }, numbers: ['originalAmount', 'monthlyPayment'], zero: ['monthlyDueDate', 'monthlyPayment', 'termMonths'], dates: ['startDate'], payments: true },
  { key: 'creditCards', table: 'credit_cards', fields: {
    id: 'id', name: 'name', provider: 'provider', creditLimit: 'credit_limit',
    totalDebt: 'total_debt', paymentAmount: 'payment_amount', dueDate: 'due_date',
    status: 'status', notes: 'notes', payments: 'payments'
  }, numbers: ['creditLimit', 'totalDebt', 'paymentAmount'], zero: ['paymentAmount'], payments: true },
  { key: 'fixedExpenses', table: 'fixed_expenses', fields: {
    id: 'id', name: 'name', amount: 'amount', dueDate: 'due_date',
    status: 'status', notes: 'notes', payments: 'payments'
  }, numbers: ['amount'], payments: true },
  { key: 'incomes', table: 'income', fields: {
    id: 'id', name: 'name', amount: 'amount', receivedDate: 'received_date',
    status: 'status', notes: 'notes', payments: 'payments'
  }, numbers: ['amount'], payments: true },
  { key: 'lendings', table: 'lendings', fields: {
    id: 'id', name: 'name', borrower: 'borrower', originalAmount: 'original_amount',
    startDate: 'start_date', monthlyDueDate: 'monthly_due_date', monthlyPayment: 'monthly_payment',
    termMonths: 'term_months', status: 'status', notes: 'notes', payments: 'payments'
  }, numbers: ['originalAmount', 'monthlyPayment'], payments: true },
  { key: 'companies', table: 'companies', fields: {
    id: 'id', name: 'name', notes: 'notes', createdAt: 'created_at'
  }, createdAt: true },
  { key: 'companyIncomeRecords', table: 'company_income_records', fields: {
    id: 'id', companyId: 'company_id', month: 'month', netSalary: 'net_salary',
    bhxhBase: 'bhxh_base', excludeBhxh: 'exclude_bhxh', note: 'note', createdAt: 'created_at'
  }, numbers: ['netSalary', 'bhxhBase'], createdAt: true },
  { key: 'bhxhAdjustmentIndices', table: 'bhxh_adjustment_indices', fields: {
    id: 'id', year: 'year', factor: 'factor', note: 'note', createdAt: 'created_at'
  }, numbers: ['factor'], createdAt: true },
  { key: 'investmentAccounts', table: 'investment_accounts', fields: {
    id: 'id', name: 'name', status: 'status', notes: 'notes', startDate: 'start_date', endDate: 'end_date'
  }, dates: ['startDate', 'endDate'] },
  { key: 'investmentTransactions', table: 'investment_transactions', fields: {
    id: 'id', accountId: 'account_id', type: 'type', amount: 'amount', date: 'date',
    status: 'status', note: 'note'
  }, numbers: ['amount'], dates: ['date'] }
];

export const keys = definitions.map(definition => definition.key);
const companyTag = /\s*\[#companyId:([0-9a-fA-F-]{36})\]\s*$/;
const bhxhTag = /\s*\[#excludeBhxh:(true|false|1|0)\]\s*$/i;

function decodeIncomeNotes(item) {
  let notes = item.notes?.trim();
  if (!notes) return;
  if (notes.startsWith('salary-income:')) {
    item.companyId = notes.slice('salary-income:'.length).trim() || undefined;
    return;
  }
  while (true) {
    const company = notes.match(companyTag);
    const bhxh = notes.match(bhxhTag);
    if (company) {
      item.companyId = company[1];
      notes = notes.replace(companyTag, '').trim();
    } else if (bhxh) {
      item.excludeBhxh = ['true', '1'].includes(bhxh[1].toLowerCase());
      notes = notes.replace(bhxhTag, '').trim();
    } else break;
  }
  item.notes = notes || undefined;
}

function encodeIncomeNotes(item) {
  let notes = item.notes?.trim() || '';
  if (notes.startsWith('salary-income:')) return notes;
  while (true) {
    const cleaned = notes.replace(companyTag, '').replace(bhxhTag, '').trim();
    if (cleaned === notes) break;
    notes = cleaned;
  }
  return [notes, item.companyId && `[#companyId:${item.companyId}]`,
    item.excludeBhxh && '[#excludeBhxh:true]'].filter(Boolean).join('\n') || null;
}

function toItem(definition, row) {
  const item = {};
  for (const [field, column] of Object.entries(definition.fields)) {
    let value = row[column];
    if (value == null) value = definition.zero?.includes(field) ? 0 : undefined;
    else if (definition.numbers?.includes(field)) {
      value = Number(value);
      if (!Number.isFinite(value)) throw new Error(`Invalid numeric value in ${definition.table}.${column}`);
    } else if (definition.dates?.includes(field) && value instanceof Date) {
      value = value.toISOString().slice(0, 10);
    } else if (value instanceof Date) value = value.toISOString();
    item[field] = value;
  }
  if (definition.key === 'loans' && item.startDate == null) item.startDate = '';
  if (definition.payments && !Array.isArray(item.payments)) {
    if (item.payments != null) throw new Error(`Invalid payments in ${definition.table}`);
    item.payments = [];
  }
  if (definition.key === 'incomes') decodeIncomeNotes(item);
  return item;
}

function columnValue(definition, item, field) {
  if (definition.key === 'incomes' && field === 'notes') return encodeIncomeNotes(item);
  const value = item[field];
  if (field === 'monthlyDueDate' && definition.key === 'loans' && value === 0) return null;
  if (definition.dates?.includes(field) && value === '') return null;
  if (field === 'payments') return JSON.stringify(value);
  return value ?? null;
}

function equal(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function table(schema, name) {
  if (!['public', 'pg_temp'].includes(schema)) throw new Error('Unsupported database schema');
  return `${schema}.${name}`;
}

async function readSnapshot(client, schema) {
  const extra = await client.query(`
    SELECT EXISTS (SELECT 1 FROM ${table(schema, 'income_payments')}) AS separate_payments,
      EXISTS (SELECT 1 FROM ${table(schema, 'investments')} i WHERE NOT EXISTS
        (SELECT 1 FROM ${table(schema, 'debt_app_legacy_investments')} m WHERE m.id = i.id)) AS unmigrated_investments
  `);
  if (extra.rows[0].separate_payments) throw new Error('Bảng income_payments có dữ liệu chưa được đồng bộ với income.payments.');
  if (extra.rows[0].unmigrated_investments) throw new Error('Bảng investments có giao dịch cũ chưa được chuyển sang investment_transactions.');

  const data = {};
  const rows = {};
  for (const definition of definitions) {
    const result = await client.query(`SELECT * FROM ${table(schema, definition.table)} ORDER BY id`);
    rows[definition.key] = result.rows;
    data[definition.key] = result.rows.map(row => toItem(definition, row));
  }
  const version = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  return { data, rows, version };
}

export async function loadRelationalData(pool, schema = 'public') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const { data, version } = await readSnapshot(client, schema);
    await client.query('COMMIT');
    return { data, version };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function saveRelationalData(pool, data, version, schema = 'public') {
  const companyIds = new Set(data.companies.map(item => item?.id));
  const accountIds = new Set(data.investmentAccounts.map(item => item?.id));
  if (data.companyIncomeRecords.some(item => !companyIds.has(item?.companyId)) ||
      data.investmentTransactions.some(item => !accountIds.has(item?.accountId))) {
    throw new Error('Dữ liệu chứa bản ghi liên kết với công ty hoặc tài khoản đầu tư không tồn tại.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tables = [...definitions.map(definition => definition.table), 'income_payments', 'investments', 'debt_app_legacy_investments'].sort();
    await client.query(`LOCK TABLE ${tables.map(name => table(schema, name)).join(', ')} IN SHARE ROW EXCLUSIVE MODE`);
    const current = await readSnapshot(client, schema);
    if (current.version !== version) {
      await client.query('ROLLBACK');
      return null;
    }

    for (const definition of definitions) {
      const currentItems = new Map(current.data[definition.key].map(item => [item.id, item]));
      const ids = new Set();
      for (const item of data[definition.key]) {
        if (!item || typeof item !== 'object' || Array.isArray(item) ||
            typeof item.id !== 'string' || ids.has(item.id)) {
          throw new Error(`Invalid or duplicate ID in ${definition.key}`);
        }
        ids.add(item.id);
        const previous = currentItems.get(item.id);
        const fields = Object.keys(definition.fields).filter(field =>
          field !== 'id' && field !== 'createdAt' &&
          (!previous || !equal(columnValue(definition, item, field), columnValue(definition, previous, field))));
        if (!previous) {
          const insertFields = ['id', ...fields];
          if (definition.createdAt && item.createdAt) insertFields.push('createdAt');
          const columns = insertFields.map(field => definition.fields[field]);
          const values = insertFields.map(field => columnValue(definition, item, field));
          await client.query(`INSERT INTO ${table(schema, definition.table)} (${columns.join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})`, values);
        } else if (fields.length) {
          const values = fields.map(field => columnValue(definition, item, field));
          await client.query(`UPDATE ${table(schema, definition.table)} SET ${fields.map((field, i) => `${definition.fields[field]} = $${i + 1}`).join(', ')} WHERE id = $${values.length + 1}`, [...values, item.id]);
        }
      }
    }
    for (const definition of [...definitions].reverse()) {
      const retained = new Set(data[definition.key].map(item => item.id));
      const removed = current.data[definition.key].filter(item => !retained.has(item.id)).map(item => item.id);
      if (removed.length) await client.query(`DELETE FROM ${table(schema, definition.table)} WHERE id = ANY($1::uuid[])`, [removed]);
    }
    const saved = await readSnapshot(client, schema);
    await client.query('COMMIT');
    return { version: saved.version };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
