import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { PlusCircle, LayoutDashboard, List, X, Download, Upload, Calendar, CreditCard, Home, TrendingUp, Wallet, LogOut, Route as RouteIcon, Eye, EyeOff, Sun, Moon, BarChart3, HandCoins, MoreVertical, ChevronUp } from 'lucide-react';
import { Loan, LoanType, LoanStatus, Payment, CreditCard as CreditCardType, FixedExpense, Income, Lending, Investment, InvestmentAccount, InvestmentTransaction } from './types';
import Dashboard from './components/Dashboard';
import LoanList from './components/LoanList';
import CalendarView from './components/Calendar';
import CreditCardList from './components/CreditCardList';
import FixedExpenseList from './components/FixedExpenseList';
import IncomeList from './components/IncomeList';
import LendingList from './components/LendingList';
import InvestmentList from './components/InvestmentList';
import PaymentRoadmap from './components/PaymentRoadmap';
import Statistics from './components/Statistics';
import Login from './components/Login';
import { loadLoansFromServer, saveLoansToServer, loadCreditCardsFromServer, saveCreditCardsToServer, loadFixedExpensesFromServer, saveFixedExpensesToServer, loadIncomeFromServer, saveIncomeToServer, loadLendingsFromServer, saveLendingsToServer, loadInvestmentsFromServer, loadInvestmentAccountsFromServer, saveInvestmentAccountsToServer, loadInvestmentTransactionsFromServer, saveInvestmentTransactionsToServer, exportDataToFile, importDataFromFile } from './services/fileService';
import { generateUUID } from './utils/uuid';
import { AmountVisibilityProvider, useAmountVisibility } from './components/AmountVisibility';
import { useDataManagement } from './hooks/useDataManagement';
import { useModals } from './hooks/useModals';
import { formatCurrency } from './utils/constants';
import { migrateInvestmentsToNewFormat } from './utils/investmentMigration';
import AddLoanModal from './components/modals/AddLoanModal';

// Re-export for backward compatibility
export { formatCurrency };

// Initial tabs
type Tab = 'DASHBOARD' | 'LOANS' | 'LENDINGS' | 'CREDIT_CARDS' | 'EXPENSES' | 'INCOME' | 'INVESTMENTS' | 'CALENDAR' | 'ROADMAP' | 'STATISTICS';
type Theme = 'light' | 'dark';

// Helper function to get tab from pathname
const getTabFromPath = (pathname: string): Tab => {
  if (pathname === '/' || pathname === '/dashboard') return 'DASHBOARD';
  if (pathname === '/loans') return 'LOANS';
  if (pathname === '/lendings') return 'LENDINGS';
  if (pathname === '/credit-cards') return 'CREDIT_CARDS';
  if (pathname === '/expenses') return 'EXPENSES';
  if (pathname === '/income') return 'INCOME';
  if (pathname === '/investments') return 'INVESTMENTS';
  if (pathname === '/calendar') return 'CALENDAR';
  if (pathname === '/roadmap') return 'ROADMAP';
  if (pathname === '/statistics') return 'STATISTICS';
  return 'DASHBOARD';
};

interface AppContentProps {
  handleLogout: () => void;
}

function AppContent({ handleLogout }: AppContentProps) {
  const location = useLocation();
  const activeTab = getTabFromPath(location.pathname);
  
  // Use custom hooks for data and modal management
  const {
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
  } = useDataManagement();
  
  const {
    showAddModal,
    showAddCardModal,
    showAddExpenseModal,
    showAddIncomeModal,
    showAddLendingModal,
    showImportModal,
    setShowAddModal,
    setShowAddCardModal,
    setShowAddExpenseModal,
    setShowAddIncomeModal,
    setShowAddLendingModal,
    setShowImportModal
  } = useModals();
  
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { globalHidden, toggleGlobal } = useAmountVisibility();
  const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  };
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('theme-dark');
    } else {
      body.classList.remove('theme-dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Handle investment migration from old format
  useEffect(() => {
    if (!isLoading && investmentAccounts.length === 0 && investmentTransactions.length === 0) {
      const migrateInvestments = async () => {
        try {
          const loadedInvestments = await loadInvestmentsFromServer();
          if (loadedInvestments && loadedInvestments.length > 0) {
            const { accounts, transactions } = migrateInvestmentsToNewFormat(loadedInvestments);
            setInvestmentAccounts(accounts);
            setInvestmentTransactions(transactions);
            
            // Save migrated data to new structure
            await saveInvestmentAccountsToServer(accounts);
            await saveInvestmentTransactionsToServer(transactions);
          }
        } catch (error) {
          console.error('Lỗi khi migrate investments:', error);
        }
      };
      migrateInvestments();
    }
  }, [isLoading, investmentAccounts.length, investmentTransactions.length, setInvestmentAccounts, setInvestmentTransactions]);

  // Credit Card form fields
  const [cardName, setCardName] = useState('');
  const [cardProvider, setCardProvider] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardDebt, setCardDebt] = useState('');
  const [cardPaymentAmount, setCardPaymentAmount] = useState('');
  const [cardDueDate, setCardDueDate] = useState<number>(1);

  // Fixed Expense form fields
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDueDate, setExpenseDueDate] = useState<number>(1);

  // Income form fields
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeReceivedDate, setIncomeReceivedDate] = useState<number>(1);

  // Lending form fields
  const [lendingName, setLendingName] = useState('');
  const [lendingAmount, setLendingAmount] = useState('');
  const [lendingStartDate, setLendingStartDate] = useState('');
  const [lendingMonthlyPayment, setLendingMonthlyPayment] = useState('');
  const [lendingMonthlyDueDate, setLendingMonthlyDueDate] = useState<number>(1);
  const [lendingTermMonths, setLendingTermMonths] = useState('');

  // Data saving is now handled by useDataManagement hook

  // Modal management is now handled by useModals hook

  const handleAddLoan = (formData: {
    name: string;
    provider: string;
    type: LoanType;
    monthlyDueDate: number;
    monthlyPayment: number;
    term: number;
    paidTerms: number;
    amount: number;
    startDate: string;
    interestOnly: boolean;
  }) => {
    let loanAmount = 0;
    let monthlyPayment = formData.monthlyPayment;
    let term = formData.term;
    let payments: Payment[] = [];
    let monthlyDueDate = formData.monthlyDueDate;
    
    // Determine name logic: explicit for bank/app, default for personal if input hidden
    const loanName = (formData.type === LoanType.BANK || formData.type === LoanType.APP) ? formData.name : 'Tiền mặt';

    if (formData.type === LoanType.BANK || formData.type === LoanType.APP) {
      const paidTerms = formData.paidTerms;
      
      if (!formData.interestOnly && paidTerms > term) {
        alert("Số kỳ đã trả không thể lớn hơn tổng số kỳ vay!");
        return;
      }

      if (formData.interestOnly) {
        loanAmount = formData.amount;
        if (loanAmount === 0) {
          alert("Vui lòng nhập số tiền gốc cho khoản vay chỉ trả lãi!");
          return;
        }
      } else {
        loanAmount = monthlyPayment * term;
      }

      // Create initial payment record if terms are already paid
      if (paidTerms > 0) {
        const now = new Date();
        const pastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        payments.push({
          id: generateUUID(),
          date: pastDate.toISOString(),
          amount: paidTerms * monthlyPayment,
          note: `Đã thanh toán ${paidTerms} kỳ trước`
        });
      }
    } else {
      // Personal Loan Logic
      loanAmount = formData.amount;
      monthlyPayment = 0;
      term = 0;
      monthlyDueDate = 0;
    }

    const loan: Loan = {
      id: generateUUID(),
      name: loanName,
      provider: formData.provider,
      type: formData.type,
      originalAmount: loanAmount,
      monthlyDueDate: monthlyDueDate,
      monthlyPayment: monthlyPayment,
      startDate: formData.type === LoanType.PERSONAL && formData.startDate ? formData.startDate : new Date().toISOString(),
      termMonths: term,
      payments: payments,
      status: LoanStatus.ACTIVE,
      interestOnly: (formData.type === LoanType.BANK || formData.type === LoanType.APP) ? formData.interestOnly : undefined
    };

    setLoans([...loans, loan]);
  };

  const resetCardForm = () => {
    setCardName('');
    setCardProvider('');
    setCardLimit('');
    setCardDebt('');
    setCardPaymentAmount('');
    setCardDueDate(1);
  };

  const resetExpenseForm = () => {
    setExpenseName('');
    setExpenseAmount('');
    setExpenseDueDate(1);
  };

  const resetIncomeForm = () => {
    setIncomeName('');
    setIncomeAmount('');
    setIncomeReceivedDate(1);
  };

  const resetLendingForm = () => {
    setLendingName('');
    setLendingAmount('');
    setLendingStartDate(new Date().toISOString().split('T')[0]);
    setLendingMonthlyPayment('');
    setLendingMonthlyDueDate(1);
    setLendingTermMonths('');
  };

  const handleDeleteLoan = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khoản vay này không?')) {
      setLoans(loans.filter(l => l.id !== id));
    }
  };

  const handleUpdateLoan = (id: string, updatedLoan: Partial<Loan>) => {
    setLoans(loans.map(loan => {
      if (loan.id === id) {
        return { ...loan, ...updatedLoan };
      }
      return loan;
    }));
  };

  const handleAddPayment = (loanId: string, payment: Payment) => {
    setLoans(loans.map(loan => {
      if (loan.id === loanId) {
        return { ...loan, payments: [...loan.payments, payment] };
      }
      return loan;
    }));
  };

  const handleRemovePayment = (loanId: string, paymentIds: string[]) => {
    setLoans(loans.map(loan => {
      if (loan.id === loanId) {
        return { 
          ...loan, 
          payments: loan.payments.filter(p => !paymentIds.includes(p.id))
        };
      }
      return loan;
    }));
  };

  const handleAddLoanAmount = (loanId: string, additionalAmount: number, note?: string) => {
    setLoans(loans.map(loan => {
      if (loan.id === loanId) {
        // Tăng số tiền gốc
        const newOriginalAmount = loan.originalAmount + additionalAmount;
        
        // Ghi lại lịch sử vay thêm (để tracking)
        const borrowRecord: Payment = {
          id: `borrow-${generateUUID()}`,
          date: new Date().toISOString(),
          amount: additionalAmount,
          note: note || `Vay thêm ${formatCurrency(additionalAmount)}`
        };

        return { 
          ...loan, 
          originalAmount: newOriginalAmount,
          payments: [...loan.payments, borrowRecord]
        };
      }
      return loan;
    }));
  };

  // Credit Card Handlers
  const handleAddCreditCard = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newCard: CreditCardType = {
      id: generateUUID(),
      name: cardName,
      provider: cardProvider,
      creditLimit: parseFloat(cardLimit) || 0,
      totalDebt: parseFloat(cardDebt) || 0,
      paymentAmount: parseFloat(cardPaymentAmount) || 0,
      dueDate: cardDueDate,
      payments: [],
      status: LoanStatus.ACTIVE
    };

    setCreditCards([...creditCards, newCard]);
    setShowAddCardModal(false);
    resetCardForm();
  };

  const handleDeleteCreditCard = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thẻ tín dụng này không?')) {
      setCreditCards(creditCards.filter(c => c.id !== id));
    }
  };

  const handleUpdateCreditCard = (id: string, updatedCard: Partial<CreditCardType>) => {
    setCreditCards(creditCards.map(card => {
      if (card.id === id) {
        return { ...card, ...updatedCard };
      }
      return card;
    }));
  };

  // Fixed Expense Handlers
  const handleAddFixedExpense = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newExpense: FixedExpense = {
      id: generateUUID(),
      name: expenseName,
      amount: parseFloat(expenseAmount) || 0,
      dueDate: expenseDueDate,
      payments: [],
      status: LoanStatus.ACTIVE
    };

    setFixedExpenses([...fixedExpenses, newExpense]);
    setShowAddExpenseModal(false);
    resetExpenseForm();
  };

  const handleDeleteFixedExpense = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chi tiêu cố định này không?')) {
      setFixedExpenses(fixedExpenses.filter(e => e.id !== id));
    }
  };

  const handleAddExpensePayment = (expenseId: string, payment: Payment) => {
    setFixedExpenses(fixedExpenses.map(expense => {
      if (expense.id === expenseId) {
        return { 
          ...expense, 
          payments: [...expense.payments, payment]
        };
      }
      return expense;
    }));
  };

  const handleRemoveExpensePayment = (expenseId: string, paymentIds: string[]) => {
    setFixedExpenses(fixedExpenses.map(expense => {
      if (expense.id === expenseId) {
        return { 
          ...expense, 
          payments: expense.payments.filter(p => !paymentIds.includes(p.id))
        };
      }
      return expense;
    }));
  };

  const handleUpdateFixedExpense = (id: string, updatedExpense: Partial<FixedExpense>) => {
    setFixedExpenses(fixedExpenses.map(expense => {
      if (expense.id === id) {
        return { ...expense, ...updatedExpense };
      }
      return expense;
    }));
  };

  // Income Handlers
  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newIncome: Income = {
      id: generateUUID(),
      name: incomeName,
      amount: parseFloat(incomeAmount) || 0,
      receivedDate: incomeReceivedDate,
      payments: [],
      status: LoanStatus.ACTIVE
    };

    setIncomes([...incomes, newIncome]);
    setShowAddIncomeModal(false);
    resetIncomeForm();
  };

  const handleDeleteIncome = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nguồn thu nhập này không?')) {
      setIncomes(incomes.filter(i => i.id !== id));
    }
  };

  const handleAddIncomePayment = (incomeId: string, payment: Payment) => {
    setIncomes(incomes.map(income => {
      if (income.id === incomeId) {
        return { 
          ...income, 
          payments: [...income.payments, payment]
        };
      }
      return income;
    }));
  };

  const handleRemoveIncomePayment = (incomeId: string, paymentIds: string[]) => {
    setIncomes(incomes.map(income => {
      if (income.id === incomeId) {
        return { 
          ...income, 
          payments: income.payments.filter(p => !paymentIds.includes(p.id))
        };
      }
      return income;
    }));
  };

  const handleUpdateIncome = (id: string, updatedIncome: Partial<Income>) => {
    setIncomes(incomes.map(income => {
      if (income.id === id) {
        return { ...income, ...updatedIncome };
      }
      return income;
    }));
  };

  // Lending Handlers
  const handleAddLending = (e: React.FormEvent) => {
    e.preventDefault();
    
    const lending: Lending = {
      id: generateUUID(),
      name: lendingName,
      borrower: lendingName, // Tự động set borrower = name
      originalAmount: parseFloat(lendingAmount) || 0,
      startDate: lendingStartDate || new Date().toISOString(),
      payments: [],
      status: LoanStatus.ACTIVE,
      monthlyPayment: lendingMonthlyPayment ? parseFloat(lendingMonthlyPayment) : undefined,
      monthlyDueDate: lendingMonthlyPayment ? lendingMonthlyDueDate : undefined,
      termMonths: lendingTermMonths ? parseInt(lendingTermMonths) : undefined
    };

    setLendings([...lendings, lending]);
    setShowAddLendingModal(false);
    resetLendingForm();
  };

  const handleDeleteLending = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khoản cho vay này không?')) {
      setLendings(lendings.filter(l => l.id !== id));
    }
  };

  const handleUpdateLending = (id: string, updatedLending: Partial<Lending>) => {
    setLendings(lendings.map(lending => {
      if (lending.id === id) {
        return { ...lending, ...updatedLending };
      }
      return lending;
    }));
  };

  const handleAddLendingPayment = (lendingId: string, payment: Payment) => {
    setLendings(lendings.map(lending => {
      if (lending.id === lendingId) {
        return { ...lending, payments: [...lending.payments, payment] };
      }
      return lending;
    }));
  };

  const handleRemoveLendingPayment = (lendingId: string, paymentIds: string[]) => {
    setLendings(lendings.map(lending => {
      if (lending.id === lendingId) {
        return { 
          ...lending, 
          payments: lending.payments.filter(p => !paymentIds.includes(p.id))
        };
      }
      return lending;
    }));
  };

  // Investment Account Handlers
  const handleAddInvestmentAccount = (account: InvestmentAccount) => {
    setInvestmentAccounts([...investmentAccounts, account]);
  };

  const handleUpdateInvestmentAccount = (id: string, updatedAccount: Partial<InvestmentAccount>) => {
    setInvestmentAccounts(investmentAccounts.map(account => {
      if (account.id === id) {
        return { ...account, ...updatedAccount };
      }
      return account;
    }));
  };

  const handleDeleteInvestmentAccount = (id: string) => {
    setInvestmentAccounts(investmentAccounts.filter(a => a.id !== id));
  };

  // Investment Transaction Handlers
  const handleAddInvestmentTransaction = (transaction: InvestmentTransaction) => {
    setInvestmentTransactions([...investmentTransactions, transaction]);
  };

  const handleUpdateInvestmentTransaction = (id: string, updatedTransaction: Partial<InvestmentTransaction>) => {
    setInvestmentTransactions(investmentTransactions.map(transaction => {
      if (transaction.id === id) {
        return { ...transaction, ...updatedTransaction };
      }
      return transaction;
    }));
  };

  const handleDeleteInvestmentTransaction = (id: string) => {
    setInvestmentTransactions(investmentTransactions.filter(t => t.id !== id));
  };

  const handleAddLendingAmount = (lendingId: string, additionalAmount: number, note?: string) => {
    setLendings(lendings.map(lending => {
      if (lending.id === lendingId) {
        const newOriginalAmount = lending.originalAmount + additionalAmount;
        
        const lendRecord: Payment = {
          id: `lend-${generateUUID()}`,
          date: new Date().toISOString(),
          amount: additionalAmount,
          note: note || `Cho vay thêm ${formatCurrency(additionalAmount)}`
        };

        return { 
          ...lending, 
          originalAmount: newOriginalAmount,
          payments: [...lending.payments, lendRecord]
        };
      }
      return lending;
    }));
  };

  const handleAddCardPayment = (cardId: string, payment: Payment) => {
    setCreditCards(creditCards.map(card => {
      if (card.id === cardId) {
        // Khi thanh toán, giảm dư nợ
        const newTotalDebt = Math.max(0, card.totalDebt - payment.amount);
        return { 
          ...card, 
          totalDebt: newTotalDebt,
          payments: [...card.payments, payment]
        };
      }
      return card;
    }));
  };

  const handleRemoveCardPayment = (cardId: string, paymentIds: string[]) => {
    setCreditCards(creditCards.map(card => {
      if (card.id === cardId) {
        // Khi xóa payment, cần tăng lại dư nợ
        const removedPayments = card.payments.filter(p => paymentIds.includes(p.id));
        const totalRemoved = removedPayments
          .filter(p => !p.id.startsWith('borrow-'))
          .reduce((sum, p) => sum + p.amount, 0);
        
        return { 
          ...card, 
          totalDebt: card.totalDebt + totalRemoved,
          payments: card.payments.filter(p => !paymentIds.includes(p.id))
        };
      }
      return card;
    }));
  };

  const handleExportData = async () => {
    try {
      await exportDataToFile();
      alert('Đã xuất dữ liệu thành công!');
    } catch (error) {
      alert('Có lỗi xảy ra khi xuất dữ liệu: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    }
  };

  const handleImportClick = () => {
    setShowImportModal(true);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith('.json')) {
      alert('Vui lòng chọn file JSON (.json)');
      return;
    }

    try {
      const importedData = await importDataFromFile(file);
      
        const totalItems = importedData.loans.length + importedData.creditCards.length + importedData.fixedExpenses.length + (importedData.incomes?.length || 0) + (importedData.lendings?.length || 0);
        
        if (totalItems === 0) {
          alert('File không chứa dữ liệu nào');
          return;
        }

        // Build confirmation message
        const parts = [];
        if (importedData.loans.length > 0) parts.push(`${importedData.loans.length} khoản vay`);
        if (importedData.creditCards.length > 0) parts.push(`${importedData.creditCards.length} thẻ tín dụng`);
        if (importedData.fixedExpenses.length > 0) parts.push(`${importedData.fixedExpenses.length} chi tiêu cố định`);
        if (importedData.incomes && importedData.incomes.length > 0) parts.push(`${importedData.incomes.length} nguồn thu nhập`);
        if (importedData.lendings && importedData.lendings.length > 0) parts.push(`${importedData.lendings.length} khoản cho vay`);
        
        const currentTotal = loans.length + creditCards.length + fixedExpenses.length + incomes.length + lendings.length;
      const confirmMessage = currentTotal > 0
        ? `Bạn đang có ${currentTotal} mục dữ liệu. Import sẽ thay thế toàn bộ dữ liệu hiện tại bằng:\n${parts.join(', ')}\n\nBạn có chắc chắn?`
        : `Import ${parts.join(', ')} từ file?\n\nLưu ý: ID sẽ được tự động chuyển đổi sang UUID format.`;

      if (window.confirm(confirmMessage)) {
        // Update all data
        if (importedData.loans.length > 0) {
          setLoans(importedData.loans);
          await saveLoansToServer(importedData.loans);
        }
        
        if (importedData.creditCards.length > 0) {
          setCreditCards(importedData.creditCards);
          await saveCreditCardsToServer(importedData.creditCards);
        }
        
        if (importedData.fixedExpenses.length > 0) {
          setFixedExpenses(importedData.fixedExpenses);
          await saveFixedExpensesToServer(importedData.fixedExpenses);
        }
        
        if (importedData.lendings && importedData.lendings.length > 0) {
          setLendings(importedData.lendings);
          await saveLendingsToServer(importedData.lendings);
        }
        
        setShowImportModal(false);
        alert(`✅ Đã import thành công:\n${parts.join('\n')}\n\nID đã được tự động chuyển đổi sang UUID format.`);
      }
    } catch (error) {
      console.error('Error in handleFileSelect:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      alert('❌ Lỗi khi import dữ liệu:\n\n' + errorMessage + '\n\nVui lòng kiểm tra console để xem chi tiết lỗi.');
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0 font-sans">
      
      {/* Top Navigation / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="w-full px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-2 rounded-xl shadow-lg flex items-center justify-center">
              <Wallet size={20} className="font-bold" />
            </div>
            <h1 className="font-bold text-xl text-slate-800 tracking-tight hidden sm:block bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">Quản Lý</h1>
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-200 text-slate-700 hover:bg-slate-100"
              title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Sáng' : 'Tối'}</span>
            </button>
            <button
              onClick={toggleGlobal}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-200 ${
                globalHidden ? 'bg-slate-900 text-white hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
              }`}
              title={globalHidden ? 'Hiển thị số tiền' : 'Ẩn tất cả số tiền'}
            >
              {globalHidden ? <EyeOff size={16} /> : <Eye size={16} />} <span className="hidden sm:inline"></span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors border border-slate-200"
              title="Đăng xuất"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Đăng xuất</span>
            </button>
            {activeTab === 'CREDIT_CARDS' ? (
              <button 
                onClick={() => setShowAddCardModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <CreditCard size={18} /> <span className="hidden sm:inline">Thêm thẻ tín dụng</span> <span className="sm:hidden">Thêm</span>
              </button>
            ) : activeTab === 'EXPENSES' ? (
              <button 
                onClick={() => setShowAddExpenseModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <Home size={18} /> <span className="hidden sm:inline">Thêm chi tiêu</span> <span className="sm:hidden">Thêm</span>
              </button>
            ) : activeTab === 'INCOME' ? (
              <button 
                onClick={() => setShowAddIncomeModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <TrendingUp size={18} /> <span className="hidden sm:inline">Thêm thu nhập</span> <span className="sm:hidden">Thêm</span>
              </button>
            ) : activeTab === 'LENDINGS' ? (
              <button 
                onClick={() => setShowAddLendingModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <HandCoins size={18} /> <span className="hidden sm:inline">Thêm cho vay</span> <span className="sm:hidden">Thêm</span>
              </button>
            ) : activeTab === 'INVESTMENTS' ? (
              <button 
                onClick={() => {
                  // InvestmentList sẽ tự quản lý modal
                  const event = new CustomEvent('openInvestmentModal');
                  window.dispatchEvent(event);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <BarChart3 size={18} /> <span className="hidden sm:inline">Thêm đầu tư</span> <span className="sm:hidden">Thêm</span>
              </button>
            ) : (
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <PlusCircle size={18} /> <span className="hidden sm:inline">Thêm khoản vay</span> <span className="sm:hidden">Thêm</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 py-6 pb-24 md:pb-6 md:ml-[306px] md:w-[calc(100%-306px)]">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard loans={loans} creditCards={creditCards} fixedExpenses={fixedExpenses} incomes={incomes} investments={investmentTransactions.map(t => {
            const account = investmentAccounts.find(a => a.id === t.accountId);
            return {
              id: t.id,
              name: account?.name || '',
              type: t.type,
              amount: t.amount,
              date: t.date,
              note: t.note,
              status: t.status
            } as Investment;
          })} onAddLoanPayment={handleAddPayment} onAddCardPayment={handleAddCardPayment} onAddExpensePayment={handleAddExpensePayment} />} />
          <Route path="/loans" element={<LoanList loans={loans} onDeleteLoan={handleDeleteLoan} onAddPayment={handleAddPayment} onRemovePayment={handleRemovePayment} onAddLoanAmount={handleAddLoanAmount} onUpdateLoan={handleUpdateLoan} />} />
          <Route path="/lendings" element={<LendingList lendings={lendings} onDeleteLending={handleDeleteLending} onAddPayment={handleAddLendingPayment} onRemovePayment={handleRemoveLendingPayment} onAddLendingAmount={handleAddLendingAmount} onUpdateLending={handleUpdateLending} />} />
          <Route path="/credit-cards" element={<CreditCardList creditCards={creditCards} onDeleteCard={handleDeleteCreditCard} onAddPayment={handleAddCardPayment} onRemovePayment={handleRemoveCardPayment} onUpdateCard={handleUpdateCreditCard} />} />
          <Route path="/expenses" element={<FixedExpenseList fixedExpenses={fixedExpenses} onDeleteExpense={handleDeleteFixedExpense} onAddPayment={handleAddExpensePayment} onRemovePayment={handleRemoveExpensePayment} onUpdateExpense={handleUpdateFixedExpense} />} />
          <Route path="/income" element={<IncomeList incomes={incomes} onDeleteIncome={handleDeleteIncome} onAddPayment={handleAddIncomePayment} onRemovePayment={handleRemoveIncomePayment} onUpdateIncome={handleUpdateIncome} onAddIncome={(income) => setIncomes([...incomes, income])} />} />
          <Route path="/investments" element={<InvestmentList accounts={investmentAccounts} transactions={investmentTransactions} onAddAccount={handleAddInvestmentAccount} onUpdateAccount={handleUpdateInvestmentAccount} onDeleteAccount={handleDeleteInvestmentAccount} onAddTransaction={handleAddInvestmentTransaction} onUpdateTransaction={handleUpdateInvestmentTransaction} onDeleteTransaction={handleDeleteInvestmentTransaction} />} />
          <Route path="/calendar" element={<CalendarView loans={loans} creditCards={creditCards} fixedExpenses={fixedExpenses} />} />
          <Route path="/roadmap" element={<PaymentRoadmap loans={loans} />} />
          <Route path="/statistics" element={<Statistics loans={loans} creditCards={creditCards} fixedExpenses={fixedExpenses} incomes={incomes} investments={investmentTransactions.map(t => {
            const account = investmentAccounts.find(a => a.id === t.accountId);
            return {
              id: t.id,
              name: account?.name || '',
              type: t.type,
              amount: t.amount,
              date: t.date,
              note: t.note,
              status: t.status
            } as Investment;
          })} />} />
          {/* Catch-all route - redirect unknown paths to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {/* Mobile Bottom Navigation */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black/20 md:hidden z-[19]"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 md:hidden z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="relative">
          <div className="flex justify-around items-center h-20 px-2 pb-safe">
          <Link 
            to="/dashboard"
            className={`flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0 transition-all duration-200 ${
              activeTab === 'DASHBOARD' 
                ? 'text-emerald-600 scale-105' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'DASHBOARD' 
                ? 'bg-emerald-50 shadow-sm' 
                : ''
            }`}>
              <LayoutDashboard size={22} strokeWidth={activeTab === 'DASHBOARD' ? 2.5 : 2} />
            </div>
            <span className={`text-[11px] font-medium truncate w-full text-center ${
              activeTab === 'DASHBOARD' ? 'font-semibold' : ''
            }`}>Tổng quan</span>
          </Link>
          <Link 
            to="/loans"
            className={`flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0 transition-all duration-200 ${
              activeTab === 'LOANS' 
                ? 'text-emerald-600 scale-105' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'LOANS' 
                ? 'bg-emerald-50 shadow-sm' 
                : ''
            }`}>
              <List size={22} strokeWidth={activeTab === 'LOANS' ? 2.5 : 2} />
            </div>
            <span className={`text-[11px] font-medium truncate w-full text-center ${
              activeTab === 'LOANS' ? 'font-semibold' : ''
            }`}>Vay</span>
          </Link>
          <Link 
            to="/credit-cards"
            className={`flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0 transition-all duration-200 ${
              activeTab === 'CREDIT_CARDS' 
                ? 'text-indigo-600 scale-105' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'CREDIT_CARDS' 
                ? 'bg-indigo-50 shadow-sm' 
                : ''
            }`}>
              <CreditCard size={22} strokeWidth={activeTab === 'CREDIT_CARDS' ? 2.5 : 2} />
            </div>
            <span className={`text-[11px] font-medium truncate w-full text-center ${
              activeTab === 'CREDIT_CARDS' ? 'font-semibold' : ''
            }`}>Thẻ</span>
          </Link>
          <Link 
            to="/expenses"
            className={`flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0 transition-all duration-200 ${
              activeTab === 'EXPENSES' 
                ? 'text-purple-600 scale-105' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'EXPENSES' 
                ? 'bg-purple-50 shadow-sm' 
                : ''
            }`}>
              <Home size={22} strokeWidth={activeTab === 'EXPENSES' ? 2.5 : 2} />
            </div>
            <span className={`text-[11px] font-medium truncate w-full text-center ${
              activeTab === 'EXPENSES' ? 'font-semibold' : ''
            }`}>Chi tiêu</span>
          </Link>
          <Link 
            to="/income"
            className={`flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0 transition-all duration-200 ${
              activeTab === 'INCOME' 
                ? 'text-emerald-600 scale-105' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'INCOME' 
                ? 'bg-emerald-50 shadow-sm' 
                : ''
            }`}>
              <TrendingUp size={22} strokeWidth={activeTab === 'INCOME' ? 2.5 : 2} />
            </div>
            <span className={`text-[11px] font-medium truncate w-full text-center ${
              activeTab === 'INCOME' ? 'font-semibold' : ''
            }`}>Thu nhập</span>
          </Link>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`flex flex-col items-center justify-center gap-1.5 flex-1 min-w-0 transition-all duration-200 ${
              showMobileMenu 
                ? 'text-slate-700 scale-105' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              showMobileMenu 
                ? 'bg-slate-100 shadow-sm' 
                : ''
            }`}>
              <MoreVertical size={22} strokeWidth={showMobileMenu ? 2.5 : 2} />
            </div>
            <span className={`text-[11px] font-medium truncate w-full text-center ${
              showMobileMenu ? 'font-semibold' : ''
            }`}>Thêm</span>
          </button>
        </div>
        
          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] mb-1">
              <div className="grid grid-cols-2 gap-2 p-3">
              <Link 
                to="/lendings"
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all ${
                  activeTab === 'LENDINGS' 
                    ? 'bg-amber-50 text-amber-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <HandCoins size={18} />
                <span className="text-sm">Cho vay</span>
              </Link>
              <Link 
                to="/investments"
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all ${
                  activeTab === 'INVESTMENTS' 
                    ? 'bg-blue-50 text-blue-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BarChart3 size={18} />
                <span className="text-sm">Đầu tư</span>
              </Link>
              <Link 
                to="/calendar"
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all ${
                  activeTab === 'CALENDAR' 
                    ? 'bg-blue-50 text-blue-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar size={18} />
                <span className="text-sm">Lịch</span>
              </Link>
              <Link 
                to="/roadmap"
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all ${
                  activeTab === 'ROADMAP' 
                    ? 'bg-orange-50 text-orange-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <RouteIcon size={18} />
                <span className="text-sm">Lộ trình</span>
              </Link>
              <Link 
                to="/statistics"
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all col-span-2 ${
                  activeTab === 'STATISTICS' 
                    ? 'bg-blue-50 text-blue-700 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BarChart3 size={18} />
                <span className="text-sm">Thống kê</span>
              </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Sidebar / Tabs */}
      <div className="hidden md:flex fixed top-20 left-4 flex-col gap-2 pr-5 pt-3 w-[306px]">
         <Link 
            to="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-white shadow-md text-emerald-600 font-semibold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <LayoutDashboard size={20} /> Tổng quan
          </Link>
          <Link 
            to="/loans"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'LOANS' ? 'bg-white shadow-md text-emerald-600 font-semibold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <List size={20} /> Khoản vay
          </Link>
          <Link 
            to="/lendings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'LENDINGS' ? 'bg-white shadow-md text-amber-600 font-semibold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <HandCoins size={20} /> Cho vay
          </Link>
          <Link 
            to="/credit-cards"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'CREDIT_CARDS' ? 'bg-white shadow-md text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <CreditCard size={20} /> Thẻ tín dụng
          </Link>
          <Link 
            to="/expenses"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'EXPENSES' ? 'bg-white shadow-md text-purple-600 font-semibold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Home size={20} /> Chi tiêu cố định
          </Link>
          <Link 
            to="/income"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'INCOME' ? 'bg-white shadow-md text-emerald-600 font-semibold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <TrendingUp size={20} /> Thu nhập
          </Link>
          <Link 
            to="/investments"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'INVESTMENTS' ? 'bg-white shadow-md text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <BarChart3 size={20} /> Đầu tư
          </Link>
          <Link 
            to="/calendar"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'CALENDAR' ? 'bg-white shadow-md text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Calendar size={20} /> Lịch thanh toán
          </Link>
          <Link 
            to="/roadmap"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ROADMAP' ? 'bg-white shadow-md text-orange-600 font-semibold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <RouteIcon size={20} /> Lộ trình
          </Link>
          <Link 
            to="/statistics"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'STATISTICS' ? 'bg-white shadow-md text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <BarChart3 size={20} /> Thống kê
          </Link>
      </div>

      {/* Add Loan Modal */}
      <AddLoanModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddLoan}
      />

      {/* Add Credit Card Modal */}
      {showAddCardModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in"
          onClick={() => setShowAddCardModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Thêm thẻ tín dụng mới</h2>
              <button onClick={() => setShowAddCardModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCreditCard} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên thẻ
                </label>
                <input required type="text" placeholder="VD: Thẻ vàng Visa" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={cardName} onChange={e => setCardName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ngân hàng phát hành
                </label>
                <input required type="text" placeholder="VD: Vietcombank" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={cardProvider} onChange={e => setCardProvider(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hạn mức thẻ (VNĐ)
                </label>
                <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={cardLimit} onChange={e => setCardLimit(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tổng dư nợ hiện tại (VNĐ)
                </label>
                <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={cardDebt} onChange={e => setCardDebt(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Khoản thanh toán tối thiểu hàng tháng (VNĐ) - Tùy chọn
                </label>
                <input type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={cardPaymentAmount} onChange={e => setCardPaymentAmount(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày đến hạn thanh toán hàng tháng</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  value={cardDueDate}
                  onChange={e => setCardDueDate(parseInt(e.target.value))}
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Ngày {d}</option>
                  ))}
                </select>
              </div>

              {cardLimit && cardDebt && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <div className="text-sm text-indigo-800">
                    <div className="font-semibold mb-1">Thông tin tính toán:</div>
                    <div>Hạn mức khả dụng: <span className="font-bold">{formatCurrency(Math.max(0, parseFloat(cardLimit) - parseFloat(cardDebt)))}</span></div>
                    {parseFloat(cardLimit) > 0 && (
                      <div className="mt-1">Tỷ lệ sử dụng: <span className="font-bold">{Math.round((parseFloat(cardDebt) / parseFloat(cardLimit)) * 100)}%</span></div>
                    )}
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-transform active:scale-95 shadow-lg shadow-indigo-200">
                Lưu thẻ tín dụng
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Fixed Expense Modal */}
      {showAddExpenseModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in"
          onClick={() => setShowAddExpenseModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Thêm chi tiêu cố định mới</h2>
              <button onClick={() => setShowAddExpenseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddFixedExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên chi tiêu
                </label>
                <input required type="text" placeholder="VD: Tiền thuê nhà" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={expenseName} onChange={e => setExpenseName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Số tiền hàng tháng (VNĐ)
                </label>
                <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày thanh toán hàng tháng</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  value={expenseDueDate}
                  onChange={e => setExpenseDueDate(parseInt(e.target.value))}
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Ngày {d}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-transform active:scale-95 shadow-lg shadow-purple-200">
                Lưu chi tiêu cố định
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Lending Modal */}
      {showAddLendingModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in"
          onClick={() => setShowAddLendingModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Thêm khoản cho vay mới</h2>
              <button onClick={() => setShowAddLendingModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddLending} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên người vay
                </label>
                <input required type="text" placeholder="VD: Anh Ba, Chị Tư" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={lendingName} onChange={e => setLendingName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Số tiền cho vay (VNĐ)
                </label>
                <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={lendingAmount} onChange={e => setLendingAmount(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày cho vay</label>
                <input required type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={lendingStartDate} onChange={e => setLendingStartDate(e.target.value)} />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800 mb-2">Tùy chọn: Cho vay có kỳ hạn</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Số tiền nhận hàng tháng (VNĐ) - Tùy chọn
                    </label>
                    <input type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={lendingMonthlyPayment} onChange={e => setLendingMonthlyPayment(e.target.value)} />
                  </div>
                  {lendingMonthlyPayment && parseFloat(lendingMonthlyPayment) > 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ngày nhận tiền hàng tháng</label>
                        <select 
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                          value={lendingMonthlyDueDate}
                          onChange={e => setLendingMonthlyDueDate(parseInt(e.target.value))}
                        >
                          {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>Ngày {d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Tổng số tháng - Tùy chọn
                        </label>
                        <input type="number" min="1" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={lendingTermMonths} onChange={e => setLendingTermMonths(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button type="submit" className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-transform active:scale-95 shadow-lg shadow-amber-200">
                Lưu khoản cho vay
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Income Modal */}
      {showAddIncomeModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in"
          onClick={() => setShowAddIncomeModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Thêm thu nhập mới</h2>
              <button onClick={() => setShowAddIncomeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddIncome} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên nguồn thu nhập
                </label>
                <input required type="text" placeholder="VD: Lương, Freelance" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={incomeName} onChange={e => setIncomeName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Số tiền hàng tháng (VNĐ)
                </label>
                <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày nhận tiền hàng tháng</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  value={incomeReceivedDate}
                  onChange={e => setIncomeReceivedDate(parseInt(e.target.value))}
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Ngày {d}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-200">
                Lưu thu nhập
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Import Data Modal */}
      {showImportModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in"
          onClick={() => setShowImportModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Nhập dữ liệu từ file</h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Lưu ý:</strong> Import dữ liệu sẽ thay thế toàn bộ dữ liệu hiện tại. 
                  Nếu bạn muốn giữ dữ liệu cũ, hãy xuất dữ liệu trước khi import.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Chọn file JSON đã xuất trước đó
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Chỉ chấp nhận file có định dạng .json
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if user is already logged in
    const auth = localStorage.getItem('debt_app_auth');
    return auth === 'true';
  });

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      localStorage.removeItem('debt_app_auth');
      localStorage.removeItem('debt_app_auth_time');
      setIsAuthenticated(false);
    }
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <AmountVisibilityProvider>
      <BrowserRouter>
        <AppContent handleLogout={handleLogout} />
      </BrowserRouter>
    </AmountVisibilityProvider>
  );
}

export default App;