import React, { useMemo } from 'react';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Loan, LoanType, CreditCard, FixedExpense, Income, Payment } from '../types';
import { formatCurrency } from '../App';
import { Wallet, CreditCard as CreditCardIcon, Home, AlertCircle, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface DashboardProps {
  loans: Loan[];
  creditCards: CreditCard[];
  fixedExpenses: FixedExpense[];
  incomes: Income[];
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
}

const Dashboard: React.FC<DashboardProps> = ({ loans, creditCards, fixedExpenses, incomes }) => {
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

  // Lấy danh sách chi phí chưa thanh toán trong tháng hiện tại
  const unpaidExpenses = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const result: UnpaidExpense[] = [];

    // Khoản vay ngân hàng
    loans.filter(loan => loan.type === LoanType.BANK && loan.monthlyPayment > 0).forEach(loan => {
      if (!isCurrentMonthPaid(loan.payments.filter(p => !p.id.startsWith('borrow-')))) {
        result.push({
          id: loan.id,
          name: loan.name,
          type: 'loan',
          amount: loan.monthlyPayment,
          dueDate: loan.monthlyDueDate,
          provider: loan.provider
        });
      }
    });

    // Thẻ tín dụng (chỉ nếu có paymentAmount > 0)
    creditCards.filter(card => card.paymentAmount > 0).forEach(card => {
      if (!isCurrentMonthPaid(card.payments)) {
        result.push({
          id: card.id,
          name: card.name,
          type: 'creditCard',
          amount: card.paymentAmount,
          dueDate: card.dueDate,
          provider: card.provider
        });
      }
    });

    // Chi tiêu cố định
    fixedExpenses.forEach(expense => {
      if (!isCurrentMonthPaid(expense.payments)) {
        result.push({
          id: expense.id,
          name: expense.name,
          type: 'expense',
          amount: expense.amount,
          dueDate: expense.dueDate
        });
      }
    });

    // Sắp xếp theo ngày đến hạn
    return result.sort((a, b) => {
      // Ưu tiên các khoản quá hạn (dueDate < currentDay)
      const aOverdue = currentDay > a.dueDate;
      const bOverdue = currentDay > b.dueDate;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      // Sau đó sắp xếp theo ngày đến hạn
      return a.dueDate - b.dueDate;
    });
  }, [loans, creditCards, fixedExpenses]);

  const totalUnpaid = useMemo(() => {
    return unpaidExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [unpaidExpenses]);

  // Tính tổng thu nhập hàng tháng
  const totalMonthlyIncome = useMemo(() => {
    return incomes.reduce((sum, income) => sum + income.amount, 0);
  }, [incomes]);

  // Tính tổng chi tiêu hàng tháng (loans + credit cards + fixed expenses)
  const totalMonthlyExpenses = useMemo(() => {
    let total = 0;
    
    // Khoản vay ngân hàng
    loans.filter(loan => loan.type === LoanType.BANK && loan.monthlyPayment > 0).forEach(loan => {
      total += loan.monthlyPayment;
    });
    
    // Thẻ tín dụng (thanh toán tối thiểu)
    creditCards.forEach(card => {
      if (card.paymentAmount > 0) {
        total += card.paymentAmount;
      }
    });
    
    // Chi tiêu cố định
    fixedExpenses.forEach(expense => {
      total += expense.amount;
    });
    
    return total;
  }, [loans, creditCards, fixedExpenses]);

  // Tính dư/thiếu
  const monthlyBalance = totalMonthlyIncome - totalMonthlyExpenses;
  
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
      const paidForLoan = loan.payments
        .filter(p => !p.id.startsWith('borrow-'))
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

  const barData = loans.filter(l => l.type === LoanType.BANK).map(loan => {
    // Chỉ tính các payment thực sự (loại bỏ các record vay thêm)
    const paid = loan.payments
      .filter(p => !p.id.startsWith('borrow-'))
      .reduce((acc, p) => acc + p.amount, 0);
    return {
      name: loan.name,
      'Đã trả': paid,
      'Còn lại': Math.max(0, loan.originalAmount - paid),
    };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* So sánh Thu - Chi */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 p-6 rounded-xl shadow-sm border border-emerald-200">
        <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="text-emerald-600" size={20} />
          Tình hình tài chính hàng tháng
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-emerald-100">
            <p className="text-sm text-slate-600 mb-1">Tổng thu nhập</p>
            <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(totalMonthlyIncome)}</h3>
            <p className="text-xs text-slate-500 mt-1">{incomes.length} nguồn thu nhập</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-red-100">
            <p className="text-sm text-slate-600 mb-1">Tổng chi tiêu</p>
            <h3 className="text-2xl font-bold text-red-600">{formatCurrency(totalMonthlyExpenses)}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {loans.filter(l => l.type === LoanType.BANK && l.monthlyPayment > 0).length + 
               creditCards.filter(c => c.paymentAmount > 0).length + 
               fixedExpenses.length} khoản chi
            </p>
          </div>
          <div className={`bg-white/80 backdrop-blur-sm p-4 rounded-lg border ${
            monthlyBalance >= 0 ? 'border-emerald-200' : 'border-red-200'
          }`}>
            <p className="text-sm text-slate-600 mb-1">Số dư</p>
            <h3 className={`text-2xl font-bold ${
              monthlyBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {formatCurrency(Math.abs(monthlyBalance))}
            </h3>
            <p className={`text-xs font-medium mt-1 ${
              monthlyBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {monthlyBalance >= 0 ? (
                <span className="flex items-center gap-1">
                  <TrendingUp size={12} /> Dư {formatCurrency(monthlyBalance)}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <TrendingDown size={12} /> Thiếu {formatCurrency(Math.abs(monthlyBalance))}
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

      {/* Chi phí chưa thanh toán trong tháng hiện tại */}
      {unpaidExpenses.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <AlertCircle className="text-orange-500" size={20} />
              Chi phí chưa thanh toán tháng này
            </h4>
            <div className="text-right">
              <p className="text-xs text-slate-500">Tổng cộng</p>
              <p className="text-xl font-bold text-rose-600">{formatCurrency(totalUnpaid)}</p>
            </div>
          </div>
          <div className="space-y-2">
            {unpaidExpenses.map(expense => {
              const now = new Date();
              const isOverdue = now.getDate() > expense.dueDate;
              const IconComponent = expense.type === 'loan' 
                ? Wallet 
                : expense.type === 'creditCard' 
                ? CreditCardIcon 
                : Home;
              
              return (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isOverdue 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-slate-50 border-slate-200'
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
                    </div>
                    <div className="text-right min-w-[120px]">
                      <p className="font-bold text-slate-900">{formatCurrency(expense.amount)}</p>
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
            <p className="text-sm text-slate-500 mb-1">Tổng tiền vay gốc</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.bankOriginal)}</h3>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Đã thanh toán</p>
            <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.bankPaid)}</h3>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Dư còn lại</p>
            <h3 className="text-2xl font-bold text-rose-600">{formatCurrency(stats.bankRemaining)}</h3>
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
            <p className="text-sm text-slate-500 mb-1">Tổng tiền vay gốc</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.personalOriginal)}</h3>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Đã thanh toán</p>
            <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.personalPaid)}</h3>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">Dư còn lại</p>
            <h3 className="text-2xl font-bold text-rose-600">{formatCurrency(stats.personalRemaining)}</h3>
          </div>
        </div>
      </div>
      
      {/* Progress Chart (Bank Only mostly) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Tiến độ trả  Ngân hàng</h4>
           {barData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Đã trả" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Còn lại" stackId="a" fill="#E2E8F0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
           ) : (
            <div className="h-32 flex items-center justify-center text-slate-400">Chưa có khoản vay ngân hàng để hiển thị biểu đồ</div>
           )}
      </div>
    </div>
  );
};

export default Dashboard;