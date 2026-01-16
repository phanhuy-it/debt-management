import { Investment, InvestmentAccount, InvestmentTransaction } from '../types';
import { generateUUID } from './uuid';

/**
 * Migrate old Investment format to new InvestmentAccount + InvestmentTransaction format
 */
export const migrateInvestmentsToNewFormat = (
  investments: Investment[]
): { accounts: InvestmentAccount[]; transactions: InvestmentTransaction[] } => {
  const accountsMap = new Map<string, InvestmentAccount>();
  const transactions: InvestmentTransaction[] = [];

  investments.forEach(inv => {
    // Find or create account
    let account = Array.from(accountsMap.values()).find(acc => acc.name === inv.name);
    if (!account) {
      account = {
        id: generateUUID(),
        name: inv.name,
        status: inv.status,
        notes: undefined
      };
      accountsMap.set(account.id, account);
    }

    // Create transaction
    transactions.push({
      id: inv.id,
      accountId: account.id,
      type: inv.type,
      amount: inv.amount,
      date: inv.date,
      note: inv.note,
      status: inv.status
    });
  });

  return {
    accounts: Array.from(accountsMap.values()),
    transactions
  };
};
