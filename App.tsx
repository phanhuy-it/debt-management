import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { PlusCircle, LayoutDashboard, List, X, Download, Upload, Calendar, CreditCard, Home, TrendingUp, Wallet, LogOut, Route as RouteIcon, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { Loan, LoanType, LoanStatus, Payment, CreditCard as CreditCardType, FixedExpense, Income } from './types';
import Dashboard from './components/Dashboard';
import LoanList from './components/LoanList';
import CalendarView from './components/Calendar';
import CreditCardList from './components/CreditCardList';
import FixedExpenseList from './components/FixedExpenseList';
import IncomeList from './components/IncomeList';
import PaymentRoadmap from './components/PaymentRoadmap';
import Login from './components/Login';
import { loadLoansFromServer, saveLoansToServer, loadCreditCardsFromServer, saveCreditCardsToServer, loadFixedExpensesFromServer, saveFixedExpensesToServer, loadIncomeFromServer, saveIncomeToServer, exportDataToFile, importDataFromFile } from './services/fileService';
import { generateUUID, migrateIdToUUID } from './utils/uuid';
import { AmountVisibilityProvider, useAmountVisibility } from './components/AmountVisibility';

// Utility for formatting currency
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Initial tabs
type Tab = 'DASHBOARD' | 'LOANS' | 'CREDIT_CARDS' | 'EXPENSES' | 'INCOME' | 'CALENDAR' | 'ROADMAP';
type Theme = 'light' | 'dark';

// Helper function to get tab from pathname
const getTabFromPath = (pathname: string): Tab => {
  if (pathname === '/' || pathname === '/dashboard') return 'DASHBOARD';
  if (pathname === '/loans') return 'LOANS';
  if (pathname === '/credit-cards') return 'CREDIT_CARDS';
  if (pathname === '/expenses') return 'EXPENSES';
  if (pathname === '/income') return 'INCOME';
  if (pathname === '/calendar') return 'CALENDAR';
  if (pathname === '/roadmap') return 'ROADMAP';
  return 'DASHBOARD';
};

interface AppContentProps {
  handleLogout: () => void;
}

function AppContent({ handleLogout }: AppContentProps) {
  const location = useLocation();
  const activeTab = getTabFromPath(location.pathname);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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

  // Load data from server on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [loadedLoans, loadedCards, loadedExpenses, loadedIncomes] = await Promise.all([
          loadLoansFromServer(),
          loadCreditCardsFromServer(),
          loadFixedExpensesFromServer(),
          loadIncomeFromServer()
        ]);
        setLoans(loadedLoans);
        setCreditCards(loadedCards);
        setFixedExpenses(loadedExpenses);
        setIncomes(loadedIncomes);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Form State
  const [newName, setNewName] = useState('');
  const [newProvider, setNewProvider] = useState('');
  const [newType, setNewType] = useState<LoanType>(LoanType.BANK);
  
  // Bank specific fields
  const [newMonthlyDueDate, setNewMonthlyDueDate] = useState<number>(1);
  const [newMonthlyPayment, setNewMonthlyPayment] = useState('');
  const [newTerm, setNewTerm] = useState('');
  const [newPaidTerms, setNewPaidTerms] = useState('');

  // Personal specific fields
  const [newAmount, setNewAmount] = useState('');
  const [newStartDate, setNewStartDate] = useState('');

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

  // Save data to server whenever loans or creditCards change
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
    // Set default date to today when opening modal
    if (showAddModal && !newStartDate) {
      setNewStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [showAddModal]);

  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    
    let loanAmount = 0;
    let monthlyPayment = 0;
    let term = 0;
    let payments: Payment[] = [];
    let monthlyDueDate = 0;
    
    // Determine name logic: explicit for bank, default for personal if input hidden
    const loanName = newType === LoanType.BANK ? newName : 'Tiền mặt';

    if (newType === LoanType.BANK) {
      monthlyPayment = parseFloat(newMonthlyPayment) || 0;
      term = parseInt(newTerm) || 0;
      const paidTerms = parseInt(newPaidTerms) || 0;
      
      if (paidTerms > term) {
        alert("Số kỳ đã trả không thể lớn hơn tổng số kỳ vay!");
        return;
      }

      loanAmount = monthlyPayment * term;
      monthlyDueDate = newMonthlyDueDate;

      // Create initial payment record if terms are already paid
      // Đặt date trong quá khứ để không bị coi là đã trả tháng hiện tại
      if (paidTerms > 0) {
        const now = new Date();
        const pastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Ngày 1 của tháng trước
        payments.push({
          id: generateUUID(),
          date: pastDate.toISOString(),
          amount: paidTerms * monthlyPayment,
          note: `Đã thanh toán ${paidTerms} kỳ trước`
        });
      }
    } else {
      // Personal Loan Logic
      loanAmount = parseFloat(newAmount) || 0;
      monthlyPayment = 0; // Not applicable or variable
      term = 0; // Not applicable
      monthlyDueDate = 0; // Not applicable
    }

    const loan: Loan = {
      id: generateUUID(),
      name: loanName,
      provider: newProvider,
      type: newType,
      originalAmount: loanAmount,
      monthlyDueDate: monthlyDueDate,
      monthlyPayment: monthlyPayment,
      startDate: newType === LoanType.PERSONAL && newStartDate ? newStartDate : new Date().toISOString(),
      termMonths: term,
      payments: payments,
      status: LoanStatus.ACTIVE
    };

    setLoans([...loans, loan]);
    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setNewName('');
    setNewProvider('');
    setNewType(LoanType.BANK);
    setNewMonthlyDueDate(1);
    setNewMonthlyPayment('');
    setNewTerm('');
    setNewPaidTerms('');
    setNewAmount('');
    setNewStartDate(new Date().toISOString().split('T')[0]);
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
      
      const totalItems = importedData.loans.length + importedData.creditCards.length + importedData.fixedExpenses.length + (importedData.incomes?.length || 0);
      
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
      
      const currentTotal = loans.length + creditCards.length + fixedExpenses.length + incomes.length;
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
        
        setShowImportModal(false);
        alert(`✅ Đã import thành công:\n${parts.join('\n')}\n\nID đã được tự động chuyển đổi sang UUID format.`);
      }
    } catch (error) {
      console.error('Error in handleFileSelect:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      alert('❌ Lỗi khi import dữ liệu:\n\n' + errorMessage + '\n\nVui lòng kiểm tra console để xem chi tiết lỗi.');
    }
  };

  // Calculate total for preview (Bank only)
  const previewBankTotal = (parseFloat(newMonthlyPayment) || 0) * (parseInt(newTerm) || 0);

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
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-1.5 rounded-lg">
               <span className="font-bold text-lg">Debt</span>
            </div>
            <h1 className="font-bold text-xl text-slate-800 tracking-tight hidden sm:block">Quản Lý</h1>
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
            <button 
              onClick={handleExportData}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors border border-slate-200"
              title="Xuất dữ liệu ra file"
            >
              <Download size={16} /> <span>Xuất</span>
            </button>
            <button 
              onClick={handleImportClick}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors border border-slate-200"
              title="Nhập dữ liệu từ file"
            >
              <Upload size={16} /> <span>Nhập</span>
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
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard loans={loans} creditCards={creditCards} fixedExpenses={fixedExpenses} incomes={incomes} onAddLoanPayment={handleAddPayment} onAddCardPayment={handleAddCardPayment} onAddExpensePayment={handleAddExpensePayment} />} />
          <Route path="/loans" element={<LoanList loans={loans} onDeleteLoan={handleDeleteLoan} onAddPayment={handleAddPayment} onRemovePayment={handleRemovePayment} onAddLoanAmount={handleAddLoanAmount} onUpdateLoan={handleUpdateLoan} />} />
          <Route path="/credit-cards" element={<CreditCardList creditCards={creditCards} onDeleteCard={handleDeleteCreditCard} onAddPayment={handleAddCardPayment} onRemovePayment={handleRemoveCardPayment} onUpdateCard={handleUpdateCreditCard} />} />
          <Route path="/expenses" element={<FixedExpenseList fixedExpenses={fixedExpenses} onDeleteExpense={handleDeleteFixedExpense} onAddPayment={handleAddExpensePayment} onRemovePayment={handleRemoveExpensePayment} onUpdateExpense={handleUpdateFixedExpense} />} />
          <Route path="/income" element={<IncomeList incomes={incomes} onDeleteIncome={handleDeleteIncome} onAddPayment={handleAddIncomePayment} onRemovePayment={handleRemoveIncomePayment} onUpdateIncome={handleUpdateIncome} />} />
          <Route path="/calendar" element={<CalendarView loans={loans} creditCards={creditCards} fixedExpenses={fixedExpenses} />} />
          <Route path="/roadmap" element={<PaymentRoadmap loans={loans} />} />
        </Routes>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-20">
        <div className="flex justify-around items-center h-16">
          <Link 
            to="/dashboard"
            className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'DASHBOARD' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-medium">Tổng quan</span>
          </Link>
          <Link 
            to="/loans"
            className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'LOANS' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <List size={20} />
            <span className="text-[10px] font-medium">Danh sách</span>
          </Link>
          <Link 
            to="/credit-cards"
            className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'CREDIT_CARDS' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <CreditCard size={20} />
            <span className="text-[10px] font-medium">Thẻ</span>
          </Link>
          <Link 
            to="/expenses"
            className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'EXPENSES' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <Home size={20} />
            <span className="text-[10px] font-medium">Chi tiêu</span>
          </Link>
          <Link 
            to="/calendar"
            className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'CALENDAR' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <Calendar size={20} />
            <span className="text-[10px] font-medium">Lịch</span>
          </Link>
          <Link 
            to="/roadmap"
            className={`flex flex-col items-center gap-1 w-full h-full justify-center ${activeTab === 'ROADMAP' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <RouteIcon size={20} />
            <span className="text-[10px] font-medium">Lộ trình</span>
          </Link>
        </div>
      </div>

      {/* Desktop Sidebar / Tabs */}
      <div className="hidden md:flex fixed top-20 left-[max(0px,calc(50%-42rem))] flex-col gap-2 p-4">
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
            <List size={20} /> Danh sách
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
      </div>

      {/* Add Loan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Thêm khoản vay mới</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddLoan} className="p-6 space-y-4">
              
              <div className="bg-slate-100 p-1 rounded-lg flex gap-1 mb-4">
                 <button
                   type="button"
                   onClick={() => setNewType(LoanType.BANK)}
                   className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newType === LoanType.BANK ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   Vay Ngân Hàng
                 </button>
                 <button
                   type="button"
                   onClick={() => setNewType(LoanType.PERSONAL)}
                   className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newType === LoanType.PERSONAL ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   Vay Người Thân
                 </button>
              </div>

              {newType === LoanType.BANK && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tên khoản vay (Mục đích)
                  </label>
                  <input required type="text" placeholder="VD: Vay mua xe" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {newType === LoanType.BANK ? 'Tên ngân hàng / Tổ chức' : 'Tên người cho vay'}
                </label>
                <input required type="text" placeholder={newType === LoanType.BANK ? "VD: Vietcombank" : "VD: Anh Ba, Chị Tư"} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={newProvider} onChange={e => setNewProvider(e.target.value)} />
              </div>

              {/* BANK FIELDS */}
              {newType === LoanType.BANK && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền trả hàng tháng (VNĐ)</label>
                    <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white" value={newMonthlyPayment} onChange={e => setNewMonthlyPayment(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tổng số tháng</label>
                      <input required type="number" min="1" placeholder="12" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={newTerm} onChange={e => setNewTerm(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Số kỳ đã trả</label>
                      <input type="number" min="0" max={newTerm} placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={newPaidTerms} onChange={e => setNewPaidTerms(e.target.value)} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày thanh toán hàng tháng</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      value={newMonthlyDueDate}
                      onChange={e => setNewMonthlyDueDate(parseInt(e.target.value))}
                    >
                      {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>Ngày {d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-center text-sm font-medium text-slate-600 bg-slate-100 p-3 rounded-lg">
                      <span>Tổng  dự tính:</span>
                      <span className="text-emerald-600 font-bold text-lg">{formatCurrency(previewBankTotal)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-center">*Tổng  = Tiền trả hàng tháng x Số tháng</p>
                  </div>
                </div>
              )}

              {/* PERSONAL FIELDS */}
              {newType === LoanType.PERSONAL && (
                 <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền vay (VNĐ)</label>
                      <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ngày vay</label>
                      <input required type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
                    </div>
                 </div>
              )}

              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-200">
                Lưu khoản vay
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Credit Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
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

      {/* Add Income Modal */}
      {showAddIncomeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
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

      {/* Mobile Export/Import Buttons (hidden on desktop) */}
      <div className="fixed bottom-20 right-4 md:hidden z-30 flex flex-col gap-2">
        <button
          onClick={handleExportData}
          className="bg-emerald-600 text-white p-3 rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
          title="Xuất dữ liệu"
        >
          <Download size={20} />
        </button>
        <button
          onClick={handleImportClick}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Nhập dữ liệu"
        >
          <Upload size={20} />
        </button>
      </div>
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