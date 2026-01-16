import { useState, useEffect, useCallback } from 'react';
import { Loan, CreditCard, FixedExpense, Income, Lending, InvestmentAccount, InvestmentTransaction } from '../types';
import {
  loadLoansFromServer,
  saveLoansToServer,
  loadCreditCardsFromServer,
  saveCreditCardsToServer,
  loadFixedExpensesFromServer,
  saveFixedExpensesToServer,
  loadIncomeFromServer,
  saveIncomeToServer,
  loadLendingsFromServer,
  saveLendingsToServer,
  loadInvestmentAccountsFromServer,
  saveInvestmentAccountsToServer,
  loadInvestmentTransactionsFromServer,
  saveInvestmentTransactionsToServer
} from '../services/fileService';

interface UseDataManagementReturn {
  loans: Loan[];
  creditCards: CreditCard[];
  fixedExpenses: FixedExpense[];
  incomes: Income[];
  lendings: Lending[];
  investmentAccounts: InvestmentAccount[];
  investmentTransactions: InvestmentTransaction[];
  isLoading: boolean;
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  setCreditCards: React.Dispatch<React.SetStateAction<CreditCard[]>>;
  setFixedExpenses: React.Dispatch<React.SetStateAction<FixedExpense[]>>;
  setIncomes: React.Dispatch<React.SetStateAction<Income[]>>;
  setLendings: React.Dispatch<React.SetStateAction<Lending[]>>;
  setInvestmentAccounts: React.Dispatch<React.SetStateAction<InvestmentAccount[]>>;
  setInvestmentTransactions: React.Dispatch<React.SetStateAction<InvestmentTransaction[]>>;
}

/**
 * Custom hook to manage all application data with automatic saving
 */
export const useDataManagement = (): UseDataManagementReturn => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [lendings, setLendings] = useState<Lending[]>([]);
  const [investmentAccounts, setInvestmentAccounts] = useState<InvestmentAccount[]>([]);
  const [investmentTransactions, setInvestmentTransactions] = useState<InvestmentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [loadedLoans, loadedCards, loadedExpenses, loadedIncomes, loadedLendings, loadedAccounts, loadedTransactions] = await Promise.all([
          loadLoansFromServer(),
          loadCreditCardsFromServer(),
          loadFixedExpensesFromServer(),
          loadIncomeFromServer(),
          loadLendingsFromServer(),
          loadInvestmentAccountsFromServer(),
          loadInvestmentTransactionsFromServer()
        ]);
        setLoans(loadedLoans);
        setCreditCards(loadedCards);
        setFixedExpenses(loadedExpenses);
        setIncomes(loadedIncomes);
        setLendings(loadedLendings);
        setInvestmentAccounts(loadedAccounts);
        setInvestmentTransactions(loadedTransactions);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Auto-save when data changes (debounced)
  useEffect(() => {
    if (!isLoading && loans.length >= 0) {
      saveLoansToServer(loans).catch(error => {
        console.error('Lỗi khi lưu dữ liệu:', error);
      });
    }
  }, [loans, isLoading]);

  useEffect(() => {
    if (!isLoading && creditCards.length >= 0) {
      saveCreditCardsToServer(creditCards).catch(error => {
        console.error('Lỗi khi lưu dữ liệu thẻ tín dụng:', error);
      });
    }
  }, [creditCards, isLoading]);

  useEffect(() => {
    if (!isLoading && fixedExpenses.length >= 0) {
      saveFixedExpensesToServer(fixedExpenses).catch(error => {
        console.error('Lỗi khi lưu dữ liệu chi tiêu cố định:', error);
      });
    }
  }, [fixedExpenses, isLoading]);

  useEffect(() => {
    if (!isLoading && incomes.length >= 0) {
      saveIncomeToServer(incomes).catch(error => {
        console.error('Lỗi khi lưu dữ liệu thu nhập:', error);
      });
    }
  }, [incomes, isLoading]);

  useEffect(() => {
    if (!isLoading && lendings.length >= 0) {
      saveLendingsToServer(lendings).catch(error => {
        console.error('Lỗi khi lưu dữ liệu cho vay:', error);
      });
    }
  }, [lendings, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveInvestmentAccountsToServer(investmentAccounts).catch(error => {
        console.error('Lỗi khi lưu investment accounts:', error);
      });
      saveInvestmentTransactionsToServer(investmentTransactions).catch(error => {
        console.error('Lỗi khi lưu investment transactions:', error);
      });
    }
  }, [investmentAccounts, investmentTransactions, isLoading]);

  return {
    loans,
    creditCards,
    fixedExpenses,
    incomes,
    lendings,
    investmentAccounts,
    investmentTransactions,
    isLoading,
    setLoans,
    setCreditCards,
    setFixedExpenses,
    setIncomes,
    setLendings,
    setInvestmentAccounts,
    setInvestmentTransactions
  };
};
