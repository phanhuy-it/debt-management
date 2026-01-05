import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Loan, LoanType, CreditCard, FixedExpense, Income, Investment, InvestmentType, LoanStatus, Payment } from '../types';
import { generateUUID } from '../utils/uuid';
import { Wallet, CreditCard as CreditCardIcon, Home, AlertCircle, Calendar, TrendingUp, TrendingDown, X } from 'lucide-react';
import { Amount, useAmountVisibility } from './AmountVisibility';
import { getVietnameseLunarDate } from '../utils/lunarCalendar';

interface DashboardProps {
  loans: Loan[];
  creditCards: CreditCard[];
  fixedExpenses: FixedExpense[];
  incomes: Income[];
  investments: Investment[];
  onAddLoanPayment: (loanId: string, payment: Payment) => void;
  onAddCardPayment: (cardId: string, payment: Payment) => void;
  onAddExpensePayment: (expenseId: string, payment: Payment) => void;
}

interface PersonalLoanGroupStats {
  total: number;
  paid: number;
  remaining: number;
  count: number;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

interface UnpaidExpense {
  id: string;
  name: string;
  type: 'loan' | 'creditCard' | 'expense';
  amount: number;
  dueDate: number;
  provider?: string;
  isNextMonth?: boolean; // Đánh dấu là khoản thanh toán tháng kế tiếp
}

const Dashboard: React.FC<DashboardProps> = ({ loans, creditCards, fixedExpenses, incomes, investments, onAddLoanPayment, onAddCardPayment, onAddExpensePayment }) => {
  const [selectedExpense, setSelectedExpense] = useState<UnpaidExpense | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const { formatAmount } = useAmountVisibility();
  
  // Format số tiền cho chart (chia cho 1,000,000)
  const formatChartAmount = (value: number): string => {
    const millions = value / 1000000;
    return `${millions.toFixed(millions >= 10 ? 0 : 1)}M`;
  };
  // Kiểm tra xem tháng hiện tại đã được thanh toán chưa
  const isCurrentMonthPaid = (payments: Payment[]): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return payments.some(p => {
      const paymentDate = new Date(p.date);
      return paymentDate.getFullYear() === currentYear && 
             paymentDate.getMonth() === currentMonth;
    });
  };

  // Lấy danh sách các khoản thanh toán sắp tới (chưa thanh toán tháng này + đến hạn trong 10 ngày tới)
  const unpaidExpenses = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const result: UnpaidExpense[] = [];

    // Tính ngày cuối cùng trong 10 ngày tới
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const nextMonthStartDay = currentDay + 10 > daysInCurrentMonth ? 1 : currentDay + 10;
    const nextMonthEndDay = currentDay + 10 > daysInCurrentMonth ? (currentDay + 10 - daysInCurrentMonth) : 0;

    // Khoản vay ngân hàng
    loans.filter(loan => loan.type === LoanType.BANK && loan.monthlyPayment > 0).forEach(loan => {
      const isPaid = isCurrentMonthPaid(loan.payments.filter(p => {
        const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
        return !isBorrow;
      }));

      if (!isPaid) {
        // Chưa thanh toán tháng này
        result.push({
          id: loan.id,
          name: loan.name,
          type: 'loan',
          amount: loan.monthlyPayment,
          dueDate: loan.monthlyDueDate,
          provider: loan.provider,
          isNextMonth: false
        });
      } else {
        // Đã thanh toán tháng này, kiểm tra xem có đến hạn trong 10 ngày tới không
        if (nextMonthEndDay > 0) {
          // Có ngày của tháng kế tiếp trong 10 ngày tới
          if (loan.monthlyDueDate <= nextMonthEndDay) {
            result.push({
              id: loan.id,
              name: loan.name,
              type: 'loan',
              amount: loan.monthlyPayment,
              dueDate: loan.monthlyDueDate,
              provider: loan.provider,
              isNextMonth: true
            });
          }
        }
        // Nếu không vượt qua tháng, không cần thêm các khoản đã thanh toán (vì chúng đã được xử lý ở phần chưa thanh toán)
      }
    });

    // Thẻ tín dụng (chỉ nếu có paymentAmount > 0)
    creditCards.filter(card => card.paymentAmount > 0).forEach(card => {
      const isPaid = isCurrentMonthPaid(card.payments);

      if (!isPaid) {
        // Chưa thanh toán tháng này
        result.push({
          id: card.id,
          name: card.name,
          type: 'creditCard',
          amount: card.paymentAmount,
          dueDate: card.dueDate,
          provider: card.provider,
          isNextMonth: false
        });
      } else {
        // Đã thanh toán tháng này, kiểm tra xem có đến hạn trong 10 ngày tới không
        if (nextMonthEndDay > 0) {
          // Có ngày của tháng kế tiếp trong 10 ngày tới
          if (card.dueDate <= nextMonthEndDay) {
            result.push({
              id: card.id,
              name: card.name,
              type: 'creditCard',
              amount: card.paymentAmount,
              dueDate: card.dueDate,
              provider: card.provider,
              isNextMonth: true
            });
          }
        }
        // Nếu không vượt qua tháng, không cần thêm các khoản đã thanh toán (vì chúng đã được xử lý ở phần chưa thanh toán)
      }
    });

    // Chi tiêu cố định
    fixedExpenses.forEach(expense => {
      const isPaid = isCurrentMonthPaid(expense.payments);

      if (!isPaid) {
        // Chưa thanh toán tháng này
        result.push({
          id: expense.id,
          name: expense.name,
          type: 'expense',
          amount: expense.amount,
          dueDate: expense.dueDate,
          isNextMonth: false
        });
      } else {
        // Đã thanh toán tháng này, kiểm tra xem có đến hạn trong 10 ngày tới không
        if (nextMonthEndDay > 0) {
          // Có ngày của tháng kế tiếp trong 10 ngày tới
          if (expense.dueDate <= nextMonthEndDay) {
            result.push({
              id: expense.id,
              name: expense.name,
              type: 'expense',
              amount: expense.amount,
              dueDate: expense.dueDate,
              isNextMonth: true
            });
          }
        }
        // Nếu không vượt qua tháng, không cần thêm các khoản đã thanh toán (vì chúng đã được xử lý ở phần chưa thanh toán)
      }
    });

    // Sắp xếp theo ngày đến hạn gần nhất
    return result.sort((a, b) => {
      // Tính ngày đến hạn thực tế cho mỗi khoản
      const getActualDueDate = (expense: UnpaidExpense): number => {
        if (expense.isNextMonth) {
          // Nếu là tháng kế tiếp, tính số ngày từ hôm nay đến ngày đến hạn của tháng sau
          const now = new Date();
          const nowDay = now.getDate();
          const nowMonth = now.getMonth();
          const nowYear = now.getFullYear();
          const daysInCurrentMonth = new Date(nowYear, nowMonth + 1, 0).getDate();
          // Trả về số ngày tính từ hôm nay (số lớn hơn = xa hơn)
          return (daysInCurrentMonth - nowDay) + expense.dueDate;
        } else {
          // Nếu là tháng hiện tại, tính số ngày còn lại
          const dayDiff = expense.dueDate - currentDay;
          // Nếu quá hạn, đặt số âm để ưu tiên (số càng âm = quá hạn càng lâu)
          return dayDiff < 0 ? dayDiff - 1000 : dayDiff;
        }
      };

      const aDueDate = getActualDueDate(a);
      const bDueDate = getActualDueDate(b);
      
      // Sắp xếp: quá hạn trước (số âm), sau đó đến các khoản sắp đến hạn (số dương nhỏ nhất)
      return aDueDate - bDueDate;
    });
  }, [loans, creditCards, fixedExpenses]);

  const totalUnpaid = useMemo(() => {
    return unpaidExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [unpaidExpenses]);

  // Tính tổng thu nhập hàng tháng (tính tất cả các khoản sẽ thu trong tháng hiện tại)
  const totalMonthlyIncome = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Thu nhập từ Income: tính tất cả các khoản active (sẽ thu trong tháng này)
    const incomeFromIncomes = incomes
      .filter(income => income.status === LoanStatus.ACTIVE)
      .reduce((sum, income) => sum + income.amount, 0);
    
    // Đầu tư: Rút tiền = thu nhập (tính các transaction trong tháng hiện tại)
    const incomeFromWithdraw = investments
      .filter(inv => inv.type === InvestmentType.WITHDRAW && inv.status === LoanStatus.ACTIVE)
      .reduce((sum, inv) => {
        const transactionDate = new Date(inv.date);
        if (transactionDate.getFullYear() === currentYear && 
            transactionDate.getMonth() === currentMonth) {
          return sum + inv.amount;
        }
        return sum;
      }, 0);
    
    return incomeFromIncomes + incomeFromWithdraw;
  }, [incomes, investments]);

  // Tính tổng chi tiêu hàng tháng (tính tất cả các khoản sẽ chi trong tháng hiện tại)
  const totalMonthlyExpenses = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let total = 0;
    
    // Khoản vay ngân hàng: tính tất cả các khoản active (sẽ chi trong tháng này)
    loans
      .filter(loan => loan.type === LoanType.BANK && loan.monthlyPayment > 0 && loan.status === LoanStatus.ACTIVE)
      .forEach(loan => {
        total += loan.monthlyPayment;
      });
    
    // Thẻ tín dụng: tính tất cả các khoản active (sẽ chi trong tháng này)
    creditCards
      .filter(card => card.paymentAmount > 0 && card.status === LoanStatus.ACTIVE)
      .forEach(card => {
        total += card.paymentAmount;
      });
    
    // Chi tiêu cố định: tính tất cả các khoản active (sẽ chi trong tháng này)
    fixedExpenses
      .filter(expense => expense.status === LoanStatus.ACTIVE)
      .forEach(expense => {
        total += expense.amount;
      });
    
    // Đầu tư: Nạp tiền = chi tiêu (tính các transaction trong tháng hiện tại)
    const expensesFromDeposit = investments
      .filter(inv => inv.type === InvestmentType.DEPOSIT && inv.status === LoanStatus.ACTIVE)
      .reduce((sum, inv) => {
        const transactionDate = new Date(inv.date);
        if (transactionDate.getFullYear() === currentYear && 
            transactionDate.getMonth() === currentMonth) {
          return sum + inv.amount;
        }
        return sum;
      }, 0);
    total += expensesFromDeposit;
    
    return total;
  }, [loans, creditCards, fixedExpenses, investments]);

  // Tính dư/thiếu
  const monthlyBalance = totalMonthlyIncome - totalMonthlyExpenses;
  
  // Đếm số nguồn thu nhập sẽ thu trong tháng hiện tại
  const currentMonthIncomeCount = useMemo(() => {
    let count = 0;
    
    // Đếm Income active (sẽ thu trong tháng này)
    count += incomes.filter(income => income.status === LoanStatus.ACTIVE).length;
    
    // Đếm Investment WITHDRAW có transaction trong tháng hiện tại
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    investments
      .filter(inv => inv.type === InvestmentType.WITHDRAW && inv.status === LoanStatus.ACTIVE)
      .forEach(inv => {
        const transactionDate = new Date(inv.date);
        if (transactionDate.getFullYear() === currentYear && 
            transactionDate.getMonth() === currentMonth) {
          count++;
        }
      });
    
    return count;
  }, [incomes, investments]);
  
  // Đếm số khoản chi sẽ chi trong tháng hiện tại
  const currentMonthExpenseCount = useMemo(() => {
    let count = 0;
    
    // Đếm Loan active (sẽ chi trong tháng này)
    count += loans.filter(l => l.type === LoanType.BANK && l.monthlyPayment > 0 && l.status === LoanStatus.ACTIVE).length;
    
    // Đếm CreditCard active (sẽ chi trong tháng này)
    count += creditCards.filter(c => c.paymentAmount > 0 && c.status === LoanStatus.ACTIVE).length;
    
    // Đếm FixedExpense active (sẽ chi trong tháng này)
    count += fixedExpenses.filter(e => e.status === LoanStatus.ACTIVE).length;
    
    // Đếm Investment DEPOSIT có transaction trong tháng hiện tại
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    investments
      .filter(inv => inv.type === InvestmentType.DEPOSIT && inv.status === LoanStatus.ACTIVE)
      .forEach(inv => {
        const transactionDate = new Date(inv.date);
        if (transactionDate.getFullYear() === currentYear && 
            transactionDate.getMonth() === currentMonth) {
          count++;
        }
      });
    
    return count;
  }, [loans, creditCards, fixedExpenses, investments]);

  // Danh sách các khoản thu nhập trong tháng hiện tại (đã nhóm theo loại)
  const monthlyIncomeListGrouped = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const grouped: Record<string, Array<{ id: string; name: string; amount: number; type: string; provider?: string; date?: string }>> = {};
    
    // Thu nhập từ Income
    incomes
      .filter(income => income.status === LoanStatus.ACTIVE)
      .forEach(income => {
        const type = 'Thu nhập';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push({
          id: income.id,
          name: income.name,
          amount: income.amount,
          type: type,
          date: `Ngày ${income.receivedDate}`
        });
      });
    
    // Đầu tư: Rút tiền
    investments
      .filter(inv => inv.type === InvestmentType.WITHDRAW && inv.status === LoanStatus.ACTIVE)
      .forEach(inv => {
        const transactionDate = new Date(inv.date);
        if (transactionDate.getFullYear() === currentYear && 
            transactionDate.getMonth() === currentMonth) {
          const type = 'Rút tiền đầu tư';
          if (!grouped[type]) {
            grouped[type] = [];
          }
          grouped[type].push({
            id: inv.id,
            name: inv.name,
            amount: inv.amount,
            type: type,
            date: transactionDate.toLocaleDateString('vi-VN')
          });
        }
      });
    
    return grouped;
  }, [incomes, investments]);

  // Danh sách các khoản thu nhập (flat list để tính tổng)
  const monthlyIncomeList = useMemo(() => {
    return Object.values(monthlyIncomeListGrouped).flat();
  }, [monthlyIncomeListGrouped]);

  // Danh sách các khoản chi tiêu trong tháng hiện tại (đã nhóm theo loại)
  const monthlyExpenseListGrouped = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const grouped: Record<string, Array<{ id: string; name: string; amount: number; type: string; provider?: string; dueDate?: number; date?: string }>> = {};
    
    // Khoản vay ngân hàng
    loans
      .filter(loan => loan.type === LoanType.BANK && loan.monthlyPayment > 0 && loan.status === LoanStatus.ACTIVE)
      .forEach(loan => {
        const type = 'Khoản vay ngân hàng';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push({
          id: loan.id,
          name: loan.name,
          amount: loan.monthlyPayment,
          type: type,
          provider: loan.provider,
          dueDate: loan.monthlyDueDate
        });
      });
    
    // Thẻ tín dụng
    creditCards
      .filter(card => card.paymentAmount > 0 && card.status === LoanStatus.ACTIVE)
      .forEach(card => {
        const type = 'Thẻ tín dụng';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push({
          id: card.id,
          name: card.name,
          amount: card.paymentAmount,
          type: type,
          provider: card.provider,
          dueDate: card.dueDate
        });
      });
    
    // Chi tiêu cố định
    fixedExpenses
      .filter(expense => expense.status === LoanStatus.ACTIVE)
      .forEach(expense => {
        const type = 'Chi tiêu cố định';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push({
          id: expense.id,
          name: expense.name,
          amount: expense.amount,
          type: type,
          dueDate: expense.dueDate
        });
      });
    
    // Đầu tư: Nạp tiền
    investments
      .filter(inv => inv.type === InvestmentType.DEPOSIT && inv.status === LoanStatus.ACTIVE)
      .forEach(inv => {
        const transactionDate = new Date(inv.date);
        if (transactionDate.getFullYear() === currentYear && 
            transactionDate.getMonth() === currentMonth) {
          const type = 'Nạp tiền đầu tư';
          if (!grouped[type]) {
            grouped[type] = [];
          }
          grouped[type].push({
            id: inv.id,
            name: inv.name,
            amount: inv.amount,
            type: type,
            date: transactionDate.toLocaleDateString('vi-VN')
          });
        }
      });
    
    return grouped;
  }, [loans, creditCards, fixedExpenses, investments]);

  // Danh sách các khoản chi tiêu (flat list để tính tổng)
  const monthlyExpenseList = useMemo(() => {
    return Object.values(monthlyExpenseListGrouped).flat();
  }, [monthlyExpenseListGrouped]);
  
  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  const todayLunarLabel = useMemo(() => {
    return getVietnameseLunarDate(new Date());
  }, []);

  const currentDay = new Date().getDate();

  const stats = useMemo(() => {
    let totalOriginal = 0;
    let totalPaid = 0;
    let bankOriginal = 0;
    let bankPaid = 0;
    let bankRemaining = 0;
    let personalOriginal = 0;
    let personalPaid = 0;
    let personalRemaining = 0;
    
    const personalLoansByProvider: Record<string, PersonalLoanGroupStats> = {};

    loans.forEach(loan => {
      totalOriginal += loan.originalAmount;
      // Chỉ tính các payment thực sự (loại bỏ các record vay thêm)
      // Check cả ID và note để hỗ trợ dữ liệu cũ
      const paidForLoan = loan.payments
        .filter(p => {
          const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
          return !isBorrow;
        })
        .reduce((acc, p) => acc + p.amount, 0);
      totalPaid += paidForLoan;
      
      const remaining = Math.max(0, loan.originalAmount - paidForLoan);
      
      if (loan.type === LoanType.BANK) {
        bankOriginal += loan.originalAmount;
        bankPaid += paidForLoan;
        bankRemaining += remaining;
      } else {
        personalOriginal += loan.originalAmount;
        personalPaid += paidForLoan;
        personalRemaining += remaining;
        
        // Aggregate Personal Loans
        const providerName = loan.provider.trim();
        if (!personalLoansByProvider[providerName]) {
            personalLoansByProvider[providerName] = { total: 0, paid: 0, remaining: 0, count: 0 };
        }
        personalLoansByProvider[providerName].total += loan.originalAmount;
        personalLoansByProvider[providerName].paid += paidForLoan;
        personalLoansByProvider[providerName].remaining += remaining;
        personalLoansByProvider[providerName].count += 1;
      }
    });

    const totalRemaining = Math.max(0, totalOriginal - totalPaid);
    
    return {
      totalOriginal,
      totalPaid,
      totalRemaining,
      bankOriginal,
      bankPaid,
      bankRemaining,
      personalOriginal,
      personalPaid,
      personalRemaining,
      personalLoansByProvider
    };
  }, [loans]);

  // Tính toán dữ liệu biểu đồ đường theo thời gian (tháng/năm) cho từng khoản vay
  const lineChartData = useMemo(() => {
    // Chỉ lấy các khoản vay ngân hàng, có monthlyPayment > 0 và đang ACTIVE
    const bankLoans = loans.filter(l => 
      l.type === LoanType.BANK && 
      l.monthlyPayment > 0 && 
      l.status === LoanStatus.ACTIVE
    );
    
    if (bankLoans.length === 0) return [];
    
    // Tìm kỳ thanh toán cuối cùng (tháng cuối cùng có thanh toán) của khoản vay dài nhất
    // Dựa trên số kỳ còn lại (termMonths - số kỳ đã trả)
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let latestPaymentMonth: Date | null = null;
    bankLoans.forEach(loan => {
      // Tính số kỳ đã trả = tổng tiền đã trả / số tiền trả hàng tháng (giống LoanList)
      const validPayments = loan.payments.filter(p => {
        const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
        return !isBorrow;
      });
      
      const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
      // Tính số kỳ đã trả = số tiền đã trả / số tiền trả hàng tháng
      const paidTerms = loan.monthlyPayment > 0 ? Math.floor(totalPaid / loan.monthlyPayment) : 0;
      
      // Số kỳ còn lại = tổng số kỳ - số kỳ đã trả
      const remainingTerms = Math.max(0, loan.termMonths - paidTerms);
      
      // Kỳ thanh toán cuối cùng = tháng hiện tại + số kỳ còn lại
      // Ví dụ: tháng hiện tại là 12/2025, còn lại 12 kỳ => kỳ cuối là 12/2026
      const currentYear = currentMonth.getFullYear();
      const currentMonthIndex = currentMonth.getMonth(); // 0-11
      
      // Tính tháng cuối cùng: currentMonthIndex + remainingTerms
      // Nếu tháng hiện tại là 12/2025 (index 11), còn lại 12 kỳ:
      // totalMonths = 11 + 12 = 23
      // finalYear = 2025 + Math.floor(23/12) = 2025 + 1 = 2026
      // finalMonth = 23 % 12 = 11 (tháng 12)
      const totalMonths = currentMonthIndex + remainingTerms;
      const finalYear = currentYear + Math.floor(totalMonths / 12);
      const finalMonth = totalMonths % 12;
      
      const lastPaymentMonth = new Date(finalYear, finalMonth, 1);
      
      if (!latestPaymentMonth || lastPaymentMonth > latestPaymentMonth) {
        latestPaymentMonth = lastPaymentMonth;
      }
    });
    
    if (!latestPaymentMonth) return [];
    
    // Thời gian bắt đầu: Tháng hiện tại
    const startMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    // Thời gian kết thúc: Kỳ thanh toán cuối cùng của khoản vay dài nhất
    const endMonth = new Date(latestPaymentMonth.getFullYear(), latestPaymentMonth.getMonth(), 1);
    
    // Tạo danh sách các tháng từ startMonth đến endMonth
    const chartMonths: Date[] = [];
    let chartCurrentMonth = new Date(startMonth);
    
    while (chartCurrentMonth <= endMonth) {
      chartMonths.push(new Date(chartCurrentMonth));
      chartCurrentMonth = new Date(chartCurrentMonth.getFullYear(), chartCurrentMonth.getMonth() + 1, 1);
    }
    
    // Tính toán dữ liệu cho mỗi tháng
    // Tính số dư nợ thực tế hiện tại (Còn lại) cho mỗi khoản vay
    const currentDebtByLoan: Record<string, number> = {};
    bankLoans.forEach(loan => {
      const validPayments = loan.payments.filter(p => {
        const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
        return !isBorrow;
      });
      
      const totalPaid = validPayments.reduce((sum, p) => sum + p.amount, 0);
      // Số dư nợ thực tế hiện tại = originalAmount - tổng đã trả
      currentDebtByLoan[loan.name] = Math.max(0, loan.originalAmount - totalPaid);
    });
    
    // Lưu số dư nợ của tháng trước để tính tháng tiếp theo
    const previousDebt: Record<string, number> = {};
    
    const chartData = chartMonths.map(monthDate => {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const monthKey = `${year}-${month}`;
      const timeLabel = monthDate.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
      
      const dataPoint: Record<string, any> = {
        time: timeLabel,
        monthYear: `${month + 1}/${year}`,
        date: monthDate
      };
      
      // Tính số dư nợ còn lại cho mỗi khoản vay đến tháng này
      // Bắt đầu từ số dư nợ thực tế hiện tại (Còn lại), mỗi tháng sau trừ đi monthlyPayment
      bankLoans.forEach(loan => {
        const loanStartDate = new Date(loan.startDate);
        const loanStartMonth = new Date(loanStartDate.getFullYear(), loanStartDate.getMonth(), 1);
        const loanEndDate = new Date(loanStartDate);
        loanEndDate.setMonth(loanEndDate.getMonth() + loan.termMonths);
        const loanEndMonth = new Date(loanEndDate.getFullYear(), loanEndDate.getMonth(), 1);
        
        const loanKey = loan.name;
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Nếu tháng này trước khi bắt đầu khoản vay, số dư nợ = số tiền gốc
        if (monthDate < loanStartMonth) {
          const debt = loan.originalAmount;
          dataPoint[loanKey] = debt;
          previousDebt[loanKey] = debt;
        }
        // Nếu tháng này sau khi kết thúc khoản vay, số dư nợ = 0
        else if (monthDate > loanEndMonth) {
          dataPoint[loanKey] = 0;
          previousDebt[loanKey] = 0;
        }
        // Nếu tháng này là tháng hiện tại, dùng số dư nợ thực tế (Còn lại)
        else if (monthDate.getTime() === currentMonth.getTime()) {
          const debt = currentDebtByLoan[loanKey];
          dataPoint[loanKey] = debt;
          previousDebt[loanKey] = debt;
        }
        // Nếu tháng này là tháng tương lai (sau tháng hiện tại)
        else if (monthDate > currentMonth) {
          // Lấy số dư nợ tháng trước và trừ đi monthlyPayment
          let currentDebt = previousDebt[loanKey] !== undefined ? previousDebt[loanKey] : currentDebtByLoan[loanKey];
          currentDebt = Math.max(0, currentDebt - loan.monthlyPayment);
          dataPoint[loanKey] = currentDebt;
          previousDebt[loanKey] = currentDebt;
        }
        // Nếu tháng này là tháng quá khứ (trước tháng hiện tại)
        else {
          // Tính số dư nợ dựa trên payments thực tế trong quá khứ
          const validPayments = loan.payments.filter(p => {
            const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
            return !isBorrow;
          });
          
          const monthEndDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
          const totalPaidUpToMonth = validPayments
            .filter(p => {
              const paymentDate = new Date(p.date);
              return paymentDate <= monthEndDate;
            })
            .reduce((sum, p) => sum + p.amount, 0);
          
          const debt = Math.max(0, loan.originalAmount - totalPaidUpToMonth);
          dataPoint[loanKey] = debt;
          previousDebt[loanKey] = debt;
        }
      });
      
      return dataPoint;
    });
    
    return chartData;
  }, [loans]);

  // Lấy chi tiết đầy đủ của expense được chọn
  const getExpenseDetails = (expense: UnpaidExpense) => {
    if (expense.type === 'loan') {
      return loans.find(l => l.id === expense.id);
    } else if (expense.type === 'creditCard') {
      return creditCards.find(c => c.id === expense.id);
    } else {
      return fixedExpenses.find(e => e.id === expense.id);
    }
  };

  const handleExpenseClick = (expense: UnpaidExpense) => {
    setSelectedExpense(expense);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedExpense(null);
  };

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDetailModal) {
          handleCloseModal();
        }
        if (showIncomeModal) {
          setShowIncomeModal(false);
        }
        if (showExpenseModal) {
          setShowExpenseModal(false);
        }
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showDetailModal, showIncomeModal, showExpenseModal]);

  const handlePayment = () => {
    if (!selectedExpense) return;

    const payment: Payment = {
      id: generateUUID(),
      date: new Date().toISOString(),
      amount: selectedExpense.amount,
      note: `Thanh toán hàng tháng - ${new Date().toLocaleDateString('vi-VN')}`
    };

    if (selectedExpense.type === 'loan') {
      onAddLoanPayment(selectedExpense.id, payment);
    } else if (selectedExpense.type === 'creditCard') {
      onAddCardPayment(selectedExpense.id, payment);
    } else {
      onAddExpensePayment(selectedExpense.id, payment);
    }

    handleCloseModal();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Hôm nay</p>
          <p className="text-lg font-semibold text-slate-900">{todayLabel}</p>
          {todayLunarLabel && (
            <p className="text-sm text-slate-600 mt-1">{todayLunarLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-emerald-600">
          <Calendar size={18} />
          <span className="text-sm font-medium">Tổng quan</span>
        </div>
      </div>

      {/* So sánh Thu - Chi */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 p-6 rounded-xl shadow-sm border border-emerald-200">
        <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="text-emerald-600" size={20} />
          Tình hình tài chính hàng tháng
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div 
            onClick={() => setShowIncomeModal(true)}
            className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-emerald-100 cursor-pointer hover:bg-white transition-colors"
          >
            <p className="text-sm text-slate-600 mb-1">Tổng thu nhập</p>
            <h3 className="text-2xl font-bold text-emerald-600">
              <Amount value={totalMonthlyIncome} id="dashboard-total-income" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {currentMonthIncomeCount} nguồn thu nhập
            </p>
          </div>
          <div 
            onClick={() => setShowExpenseModal(true)}
            className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-red-100 cursor-pointer hover:bg-white transition-colors"
          >
            <p className="text-sm text-slate-600 mb-1">Tổng chi tiêu</p>
            <h3 className="text-2xl font-bold text-red-600">
              <Amount value={totalMonthlyExpenses} id="dashboard-total-expenses" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {currentMonthExpenseCount} khoản chi
            </p>
          </div>
          <div className={`bg-white/80 backdrop-blur-sm p-4 rounded-lg border ${
            monthlyBalance >= 0 ? 'border-emerald-200' : 'border-red-200'
          }`}>
            <p className="text-sm text-slate-600 mb-1">Số dư</p>
            <h3 className={`text-2xl font-bold ${
              monthlyBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              <Amount value={Math.abs(monthlyBalance)} id="dashboard-balance" />
            </h3>
            <p className={`text-xs font-medium mt-1 ${
              monthlyBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {monthlyBalance >= 0 ? (
                <span className="flex items-center gap-1">
                  <TrendingUp size={12} /> Dư <Amount value={monthlyBalance} id="dashboard-balance" showToggle={false} />
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <TrendingDown size={12} /> Thiếu <Amount value={Math.abs(monthlyBalance)} id="dashboard-balance" showToggle={false} />
                </span>
              )}
            </p>
          </div>
        </div>
        {monthlyBalance < 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-red-800">
              ⚠️ <strong>Cảnh báo:</strong> Chi tiêu của bạn vượt quá thu nhập. 
              Bạn cần kiểm soát chi tiêu hoặc tăng thu nhập.
            </p>
          </div>
        )}
        {monthlyBalance >= 0 && monthlyBalance > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-emerald-800">
              ✅ <strong>Tốt:</strong> Bạn đang có số dư dương. 
              Có thể sử dụng để trả nợ hoặc tiết kiệm.
            </p>
          </div>
        )}
      </div>

      {/* Các khoản thanh toán sắp tới */}
      {unpaidExpenses.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <AlertCircle className="text-orange-500" size={20} />
              Các khoản thanh toán sắp tới
            </h4>
            <div className="text-right">
              <p className="text-xs text-slate-500">Tổng cộng</p>
              <p className="text-xl font-bold text-rose-600">
                <Amount value={totalUnpaid} id="dashboard-unpaid-total" />
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {unpaidExpenses.map(expense => {
              // Tính số ngày còn lại đến hạn
              let dayDiff: number;
              if (expense.isNextMonth) {
                // Nếu là tháng kế tiếp, tính số ngày từ hôm nay đến ngày đến hạn của tháng sau
                const now = new Date();
                const nowDay = now.getDate();
                const nowMonth = now.getMonth();
                const nowYear = now.getFullYear();
                const daysInCurrentMonth = new Date(nowYear, nowMonth + 1, 0).getDate();
                dayDiff = (daysInCurrentMonth - nowDay) + expense.dueDate;
              } else {
                dayDiff = expense.dueDate - currentDay;
              }
              const isOverdue = !expense.isNextMonth && dayDiff < 0;
              const isDueToday = !expense.isNextMonth && dayDiff === 0;
              const dueDescription = expense.isNextMonth
                ? `Đến hạn sau ${dayDiff} ngày`
                : isOverdue
                ? `Quá hạn ${Math.abs(dayDiff)} ngày`
                : isDueToday
                ? 'Đến hạn hôm nay'
                : `Còn ${dayDiff} ngày`;
              const dueBadgeClass = isOverdue
                ? 'text-red-700 bg-red-50 border-red-200'
                : isDueToday
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200';
              const IconComponent = expense.type === 'loan' 
                ? Wallet 
                : expense.type === 'creditCard' 
                ? CreditCardIcon 
                : Home;
              
              return (
                <div
                  key={expense.id}
                  onClick={() => handleExpenseClick(expense)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    isOverdue 
                      ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex-shrink-0 p-2 rounded-lg ${
                      expense.type === 'loan' 
                        ? 'bg-blue-100 text-blue-600'
                        : expense.type === 'creditCard'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-purple-100 text-purple-600'
                    }`}>
                      <IconComponent size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate">{expense.name}</p>
                        {isOverdue && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium whitespace-nowrap">
                            Quá hạn
                          </span>
                        )}
                        {expense.isNextMonth && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium whitespace-nowrap">
                            Tháng kế tiếp
                          </span>
                        )}
                      </div>
                      {expense.provider && (
                        <p className="text-xs text-slate-500 truncate">{expense.provider}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={14} />
                        <span className="text-sm">Ngày {expense.dueDate}</span>
                      </div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${dueBadgeClass}`}>
                          {dueDescription}
                        </span>
                      </div>
                    </div>
                    <div className="text-right min-w-[120px]">
                      <p className="font-bold text-slate-900">
                        <Amount value={expense.amount} id={`unpaid-${expense.id}`} />
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Thống kê Ngân hàng */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Wallet className="text-blue-600" size={20} />
          Ngân hàng
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Tổng tiền gốc</p>
            <h3 className="text-2xl font-bold text-slate-900">
              <Amount value={stats.bankOriginal} id="bank-original" />
            </h3>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Đã thanh toán</p>
            <h3 className="text-2xl font-bold text-emerald-600">
              <Amount value={stats.bankPaid} id="bank-paid" />
            </h3>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Còn lại</p>
            <h3 className="text-2xl font-bold text-rose-600">
              <Amount value={stats.bankRemaining} id="bank-remaining" />
            </h3>
          </div>
        </div>
      </div>

      {/* Thống kê Người thân */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Wallet className="text-purple-600" size={20} />
          Người thân
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Tổng tiền gốc</p>
            <h3 className="text-2xl font-bold text-slate-900">
              <Amount value={stats.personalOriginal} id="personal-original" />
            </h3>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Đã thanh toán</p>
            <h3 className="text-2xl font-bold text-emerald-600">
              <Amount value={stats.personalPaid} id="personal-paid" />
            </h3>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Còn lại</p>
            <h3 className="text-2xl font-bold text-rose-600">
              <Amount value={stats.personalRemaining} id="personal-remaining" />
            </h3>
          </div>
        </div>
      </div>
      
      {/* Progress Chart (Bank Only mostly) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h4 className="text-lg font-semibold text-slate-800 mb-6">Tiến độ Ngân hàng</h4>
           {lineChartData.length > 0 ? (
            <div className="w-full" style={{ height: '600px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={lineChartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis 
                    type="category"
                    dataKey="time"
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    type="number"
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    tickFormatter={(value) => formatChartAmount(value)}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (value === null || value === undefined) return null;
                      return [
                        `${formatChartAmount(value)} (${formatAmount(value, 'chart-tooltip')})`,
                        name
                      ];
                    }}
                    label="Số dư nợ còn lại"
                    labelFormatter={(label) => label}
                    labelStyle={{ fontWeight: 600, marginBottom: 8 }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: 20 }}
                    iconType="line"
                  />
                  {loans
                    .filter(l => l.type === LoanType.BANK)
                    .map((loan, index) => {
                      const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
                      const color = colors[index % colors.length];
                      return (
                        <Line
                          key={loan.id}
                          type="monotone"
                          dataKey={loan.name}
                          stroke={color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={false}
                          connectNulls={false}
                        />
                      );
                    })}
                </LineChart>
              </ResponsiveContainer>
            </div>
           ) : (
            <div className="h-32 flex items-center justify-center text-slate-400">Chưa có khoản vay ngân hàng để hiển thị biểu đồ</div>
           )}
      </div>

      {/* Modal danh sách thu nhập */}
      {showIncomeModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          style={{ marginTop: 0 }}
          onClick={() => setShowIncomeModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Danh sách thu nhập tháng này</h3>
                <button
                  onClick={() => setShowIncomeModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* Tổng thu nhập */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-600 mb-1">Tổng thu nhập</p>
                <h3 className="text-2xl font-bold text-emerald-600">
                  <Amount value={totalMonthlyIncome} id="modal-total-income" />
                </h3>
              </div>

              {/* Danh sách */}
              {Object.keys(monthlyIncomeListGrouped).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(monthlyIncomeListGrouped).map(([type, items]) => {
                    const groupTotal = items.reduce((sum, item) => sum + item.amount, 0);
                    return (
                      <div key={type} className="space-y-2">
                        {/* Tiêu đề nhóm */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                              {type}
                            </span>
                            <span className="text-sm text-slate-500">
                              ({items.length} khoản)
                            </span>
                          </h4>
                          <p className="font-bold text-emerald-600">
                            <Amount value={groupTotal} id={`income-group-${type}`} />
                          </p>
                        </div>
                        {/* Danh sách khoản trong nhóm */}
                        <div className="space-y-2 pl-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{item.name}</p>
                                {item.provider && (
                                  <p className="text-xs text-slate-500 mt-1">{item.provider}</p>
                                )}
                                {item.date && (
                                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    <Calendar size={12} />
                                    {item.date}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold text-emerald-600">
                                  <Amount value={item.amount} id={`income-item-${item.id}`} />
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  Chưa có khoản thu nhập nào trong tháng này
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal danh sách chi tiêu */}
      {showExpenseModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          style={{ marginTop: 0 }}
          onClick={() => setShowExpenseModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Danh sách chi tiêu tháng này</h3>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* Tổng chi tiêu */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-600 mb-1">Tổng chi tiêu</p>
                <h3 className="text-2xl font-bold text-red-600">
                  <Amount value={totalMonthlyExpenses} id="modal-total-expenses" />
                </h3>
              </div>

              {/* Danh sách */}
              {Object.keys(monthlyExpenseListGrouped).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(monthlyExpenseListGrouped).map(([type, items]) => {
                    const groupTotal = items.reduce((sum, item) => sum + item.amount, 0);
                    return (
                      <div key={type} className="space-y-2">
                        {/* Tiêu đề nhóm */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                          <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                              {type}
                            </span>
                            <span className="text-sm text-slate-500">
                              ({items.length} khoản)
                            </span>
                          </h4>
                          <p className="font-bold text-red-600">
                            <Amount value={groupTotal} id={`expense-group-${type}`} />
                          </p>
                        </div>
                        {/* Danh sách khoản trong nhóm */}
                        <div className="space-y-2 pl-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{item.name}</p>
                                {item.provider && (
                                  <p className="text-xs text-slate-500 mt-1">{item.provider}</p>
                                )}
                                {item.dueDate && (
                                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    <Calendar size={12} />
                                    Đến hạn ngày {item.dueDate}
                                  </p>
                                )}
                                {item.date && (
                                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    <Calendar size={12} />
                                    {item.date}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold text-red-600">
                                  <Amount value={item.amount} id={`expense-item-${item.id}`} />
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  Chưa có khoản chi tiêu nào trong tháng này
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết và thanh toán */}
      {showDetailModal && selectedExpense && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          style={{ marginTop: 0 }}
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Chi tiết khoản thanh toán</h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* Chi tiết */}
              {(() => {
                const details = getExpenseDetails(selectedExpense);
                const now = new Date();
                const isOverdue = now.getDate() > selectedExpense.dueDate;
                const IconComponent = selectedExpense.type === 'loan' 
                  ? Wallet 
                  : selectedExpense.type === 'creditCard' 
                  ? CreditCardIcon 
                  : Home;

                return (
                  <div className="space-y-4">
                    {/* Icon và tên */}
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        selectedExpense.type === 'loan' 
                          ? 'bg-blue-100 text-blue-600'
                          : selectedExpense.type === 'creditCard'
                          ? 'bg-indigo-100 text-indigo-600'
                          : 'bg-purple-100 text-purple-600'
                      }`}>
                        <IconComponent size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-slate-900">{selectedExpense.name}</h4>
                        {selectedExpense.provider && (
                          <p className="text-sm text-slate-500">{selectedExpense.provider}</p>
                        )}
                      </div>
                    </div>

                    {/* Loại */}
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Loại</p>
                      <p className="font-medium text-slate-900">
                        {selectedExpense.type === 'loan' 
                          ? 'Khoản vay ngân hàng'
                          : selectedExpense.type === 'creditCard'
                          ? 'Thẻ tín dụng'
                          : 'Chi tiêu cố định'}
                      </p>
                    </div>

                    {/* Số tiền */}
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Số tiền cần thanh toán</p>
                      <p className="text-2xl font-bold text-rose-600">
                        <Amount value={selectedExpense.amount} id={`modal-${selectedExpense.id}-amount`} />
                      </p>
                    </div>

                    {/* Ngày đến hạn */}
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Ngày đến hạn</p>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-500" />
                        <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                          Ngày {selectedExpense.dueDate} hàng tháng
                        </p>
                        {isOverdue && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                            Quá hạn
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Thông tin bổ sung */}
                    {details && (
                      <>
                        {selectedExpense.type === 'loan' && (details as Loan) && (
                          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Số tiền gốc</p>
                              <p className="font-medium text-slate-900">
                                <Amount value={(details as Loan).originalAmount} id={`modal-${selectedExpense.id}-loan-original`} />
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Đã thanh toán</p>
                              <p className="font-medium text-emerald-600">
                                <Amount
                                  value={(details as Loan).payments
                                  .filter(p => {
                                    const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
                                    return !isBorrow;
                                  })
                                  .reduce((acc, p) => acc + p.amount, 0)}
                                  id={`modal-${selectedExpense.id}-loan-paid`}
                                />
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Còn lại</p>
                              <p className="font-medium text-rose-600">
                                <Amount
                                  value={Math.max(0, (details as Loan).originalAmount - (details as Loan).payments
                                    .filter(p => {
                                      const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
                                      return !isBorrow;
                                    })
                                    .reduce((acc, p) => acc + p.amount, 0))}
                                  id={`modal-${selectedExpense.id}-loan-remaining`}
                                />
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedExpense.type === 'creditCard' && (details as CreditCard) && (
                          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Hạn mức</p>
                              <p className="font-medium text-slate-900">
                                <Amount value={(details as CreditCard).creditLimit} id={`modal-${selectedExpense.id}-card-limit`} />
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Tổng dư nợ</p>
                              <p className="font-medium text-rose-600">
                                <Amount value={(details as CreditCard).totalDebt} id={`modal-${selectedExpense.id}-card-debt`} />
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Nút thanh toán */}
                    <button
                      onClick={handlePayment}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Wallet size={20} />
                      Thanh Toán
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;