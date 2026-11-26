export async function migrateLegacyInvestments(client, schema = 'public') {
  if (!['public', 'pg_temp'].includes(schema)) throw new Error('Unsupported database schema');
  const accounts = `${schema}.investment_accounts`;
  const transactions = `${schema}.investment_transactions`;
  const investments = `${schema}.investments`;
  const markers = `${schema}.debt_app_legacy_investments`;
  await client.query('BEGIN');
  try {
    await client.query(`LOCK TABLE ${markers}, ${accounts}, ${transactions}, ${investments} IN SHARE ROW EXCLUSIVE MODE`);
    const conflicts = await client.query(`
      SELECT 1 FROM ${investments} i
      JOIN ${transactions} t ON t.id = i.id
      JOIN ${accounts} a ON a.id = t.account_id
      WHERE NOT EXISTS (SELECT 1 FROM ${markers} m WHERE m.id = i.id)
        AND (i.name, i.type, i.amount, i.date, i.status, i.note)
        IS DISTINCT FROM (a.name, t.type, t.amount, t.date, t.status, t.note)
      LIMIT 1
    `);
    if (conflicts.rowCount) throw new Error('Giao dịch cũ trùng ID nhưng khác nội dung với giao dịch mới; cần kiểm tra thủ công.');

    const groups = await client.query(`
      SELECT i.name, bool_or(i.status = 'ACTIVE') AS active, min(i.created_at) AS created_at
      FROM ${investments} i
      WHERE NOT EXISTS (SELECT 1 FROM ${markers} m WHERE m.id = i.id)
        AND NOT EXISTS (SELECT 1 FROM ${transactions} t WHERE t.id = i.id)
      GROUP BY i.name
    `);
    let migrated = 0;
    for (const group of groups.rows) {
      const matchingAccounts = await client.query(`SELECT id FROM ${accounts} WHERE name = $1`, [group.name]);
      if (matchingAccounts.rowCount > 1) throw new Error('Có nhiều tài khoản đầu tư cùng tên với giao dịch cũ; cần kiểm tra thủ công.');
      let accountId = matchingAccounts.rows[0]?.id;
      if (!accountId) {
        const account = await client.query(
          `INSERT INTO ${accounts} (name, status, created_at) VALUES ($1, $2, COALESCE($3, now())) RETURNING id`,
          [group.name, group.active ? 'ACTIVE' : 'COMPLETED', group.created_at]
        );
        accountId = account.rows[0].id;
      }
      const result = await client.query(`
        INSERT INTO ${transactions} (id, account_id, type, amount, date, status, note, created_at, updated_at)
        SELECT i.id, $1, i.type, i.amount, i.date, i.status, i.note, i.created_at, i.updated_at
        FROM ${investments} i
        WHERE i.name = $2 AND NOT EXISTS (SELECT 1 FROM ${transactions} t WHERE t.id = i.id)
      `, [accountId, group.name]);
      migrated += result.rowCount;
    }
    await client.query(`
      INSERT INTO ${markers} (id)
      SELECT i.id FROM ${investments} i JOIN ${transactions} t ON t.id = i.id
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query('COMMIT');
    return migrated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
