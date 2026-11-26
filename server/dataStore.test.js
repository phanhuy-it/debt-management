import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import pg from 'pg';
import { loadRelationalData, saveRelationalData } from './dataStore.js';
import { migrateLegacyInvestments } from './legacyInvestments.js';

test('relational data round trip, conflict detection and rollback using temporary tables', {
  skip: !process.env.TEST_DATABASE_URL && 'TEST_DATABASE_URL must point to a direct PostgreSQL connection'
}, async () => {
  pg.types.setTypeParser(1082, value => value);
  const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, enableChannelBinding: true });
  await client.connect();
  const pool = { connect: async () => ({ query: client.query.bind(client), release() {} }) };
  const load = () => loadRelationalData(pool, 'pg_temp');
  const save = (data, version) => saveRelationalData(pool, data, version, 'pg_temp');
  const migrate = () => migrateLegacyInvestments(client, 'pg_temp');
  try {
    const tables = ['loans', 'credit_cards', 'fixed_expenses', 'income', 'lendings',
      'companies', 'company_income_records', 'bhxh_adjustment_indices', 'investment_accounts',
      'investment_transactions', 'income_payments', 'investments'];
    for (const table of tables) {
      await client.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS)`);
    }
    await client.query('CREATE TEMP TABLE debt_app_legacy_investments (id uuid PRIMARY KEY)');
    const empty = await load();
    const companyId = randomUUID();
    const incomeId = randomUUID();
    const accountId = randomUUID();
    const data = structuredClone(empty.data);
    data.companies.push({ id: companyId, name: 'Test company' });
    data.incomes.push({ id: incomeId, name: 'Test income', amount: 125.25, receivedDate: 1,
      status: 'ACTIVE', payments: [], companyId, excludeBhxh: true, notes: 'Test note' });
    data.creditCards.push({ id: randomUUID(), name: 'Test card', provider: 'Test provider',
      creditLimit: 1000, totalDebt: 50, paymentAmount: 10, dueDate: 1, status: 'ACTIVE', payments: [] });
    data.fixedExpenses.push({ id: randomUUID(), name: 'Test expense', amount: 15,
      dueDate: 2, status: 'ACTIVE', payments: [] });
    data.lendings.push({ id: randomUUID(), name: 'Test lending', borrower: 'Test borrower',
      originalAmount: 50, startDate: '2026-01-03', status: 'ACTIVE', payments: [] });
    data.companyIncomeRecords.push({ id: randomUUID(), companyId, month: '2026-01',
      netSalary: 123.45, bhxhBase: 100, excludeBhxh: false });
    data.bhxhAdjustmentIndices.push({ id: randomUUID(), year: 2026, factor: 1.25 });
    data.investmentAccounts.push({ id: accountId, name: 'Test account', status: 'ACTIVE', startDate: '2026-01-03' });
    data.investmentTransactions.push({ id: randomUUID(), accountId, type: 'DEPOSIT',
      amount: 12.5, date: '2026-01-04', status: 'ACTIVE' });
    data.loans.push({ id: randomUUID(), name: 'Test loan', provider: 'Test provider', type: 'BANK',
      originalAmount: 100, monthlyDueDate: 1, monthlyPayment: 10, startDate: '2026-01-01',
      termMonths: 10, status: 'ACTIVE', payments: [] });
    const saved = await save(data, empty.version);
    assert.ok(saved);
    const loaded = await load();
    assert.equal(loaded.version, saved.version);
    assert.equal(loaded.data.incomes[0].companyId, companyId);
    assert.equal(loaded.data.incomes[0].excludeBhxh, true);
    assert.equal(loaded.data.incomes[0].notes, 'Test note');
    assert.equal(loaded.data.incomes[0].amount, 125.25);
    assert.equal(loaded.data.investmentAccounts[0].startDate, '2026-01-03');
    assert.equal(loaded.data.investmentTransactions[0].date, '2026-01-04');
    assert.equal(loaded.data.creditCards[0].creditLimit, 1000);
    assert.equal(loaded.data.fixedExpenses[0].amount, 15);
    assert.equal(loaded.data.lendings[0].originalAmount, 50);
    assert.equal(loaded.data.companyIncomeRecords[0].netSalary, 123.45);
    assert.equal(loaded.data.bhxhAdjustmentIndices[0].factor, 1.25);
    assert.equal(await save(data, empty.version), null);

    await client.query('UPDATE income SET name = $1 WHERE id = $2', ['External change', incomeId]);
    assert.equal(await save(data, loaded.version), null);
    const beforeInvalid = await load();
    const invalid = structuredClone(beforeInvalid.data);
    invalid.companyIncomeRecords[0].month = null;
    invalid.companies[0].name = 'Must roll back';
    await assert.rejects(save(invalid, beforeInvalid.version));
    const afterInvalid = await load();
    assert.equal(afterInvalid.version, beforeInvalid.version);
    assert.equal(afterInvalid.data.companies[0].name, 'Test company');

    const remove = structuredClone(afterInvalid.data);
    remove.investmentTransactions = [];
    remove.investmentAccounts = [];
    remove.companyIncomeRecords = [];
    remove.companies = [];
    assert.ok(await save(remove, afterInvalid.version));
    const afterRemove = await load();
    assert.equal(afterRemove.data.investmentTransactions.length, 0);
    assert.equal(afterRemove.data.investmentAccounts.length, 0);
    assert.equal(afterRemove.data.companies.length, 0);

    await client.query(`INSERT INTO income_payments (income_id, amount) VALUES ($1, 1)`, [incomeId]);
    await assert.rejects(load(), /income_payments/);
    await client.query('DELETE FROM income_payments');
    const investmentId = randomUUID();
    await client.query(`INSERT INTO investments (id, name, type, amount, date, status)
      VALUES ($1, 'Legacy account', 'DEPOSIT', 20, '2026-01-02', 'ACTIVE')`, [investmentId]);
    await assert.rejects(load(), /investments/);
    assert.equal(await migrate(), 1);
    assert.equal(await migrate(), 0);
    const migrated = await load();
    assert.equal(migrated.data.investmentTransactions.length, 1);
    await client.query('UPDATE investment_transactions SET amount = 30 WHERE id = $1', [investmentId]);
    assert.equal(await migrate(), 0);
    const edited = await load();
    edited.data.investmentTransactions = [];
    assert.ok(await save(edited.data, edited.version));
    assert.equal((await load()).data.investmentTransactions.length, 0);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM investments')).rows[0].n, 1);
    const conflictingId = randomUUID();
    const existingAccount = randomUUID();
    await client.query(`INSERT INTO investment_accounts (id, name, status) VALUES ($1, 'Conflict', 'ACTIVE')`, [existingAccount]);
    await client.query(`INSERT INTO investments (id, name, type, amount, date, status)
      VALUES ($1, 'Conflict', 'DEPOSIT', 20, '2026-01-02', 'ACTIVE')`, [conflictingId]);
    await client.query(`INSERT INTO investment_transactions (id, account_id, type, amount, date, status)
      VALUES ($1, $2, 'DEPOSIT', 30, '2026-01-02', 'ACTIVE')`, [conflictingId, existingAccount]);
    await assert.rejects(migrate(), /trùng ID/);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM debt_app_legacy_investments')).rows[0].n, 1);
  } finally {
    await client.end();
  }
});
