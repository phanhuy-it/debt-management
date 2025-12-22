import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Loan, LoanType, CreditCard, FixedExpense, Income, Payment } from '../types';
import { Calendar, TrendingUp, TrendingDown, DollarSign, ArrowLeft, ArrowRight } from 'lucide-react';
import { Amount, useAmountVisibility } from './AmountVisibility';

interface StatisticsProps {
  loans: Loan[];
  creditCards: CreditCard[];
  fixedExpenses: FixedExpense[];
  incomes: Income[];
}

const Statistics: React.FC<StatisticsProps> = ({ loans, creditCards, fixedExpenses, incomes }) => {
  const { formatAmount } = useAmountVisibility();
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Chuyển tháng trước/sau
  const changeMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Tính toán thống kê cho tháng được chọn
  const monthlyStats = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    
    // Thu nhập trong tháng
    const incomePayments = incomes.flatMap(income => 
      income.payments.filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
      })
    );
    const totalIncome = incomePayments.reduce((sum, p) => sum + p.amount, 0);

    // Chi tiêu từ khoản vay ngân hàng
    const loanPayments = loans
      .filter(loan => loan.type === LoanType.BANK)
      .flatMap(loan => 
        loan.payments.filter(p => {
          const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
          if (isBorrow) return false;
          const paymentDate = new Date(p.date);
          return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
        })
      );
    const totalLoanPayments = loanPayments.reduce((sum, p) => sum + p.amount, 0);

    // Chi tiêu từ thẻ tín dụng
    const cardPayments = creditCards.flatMap(card =>
      card.payments.filter(p => {
        if (p.id.startsWith('borrow-')) return false;
        const paymentDate = new Date(p.date);
        return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
      })
    );
    const totalCardPayments = cardPayments.reduce((sum, p) => sum + p.amount, 0);

    // Chi tiêu cố định
    const expensePayments = fixedExpenses.flatMap(expense =>
      expense.payments.filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
      })
    );
    const totalExpensePayments = expensePayments.reduce((sum, p) => sum + p.amount, 0);

    // Tổng chi tiêu
    const totalExpenses = totalLoanPayments + totalCardPayments + totalExpensePayments;

    // Số dư
    const balance = totalIncome - totalExpenses;

    // Chi tiết theo loại
    const expensesByType = [
      { name: 'Khoản vay', value: totalLoanPayments, color: '#3B82F6' },
      { name: 'Thẻ tín dụng', value: totalCardPayments, color: '#8B5CF6' },
      { name: 'Chi tiêu cố định', value: totalExpensePayments, color: '#F59E0B' }
    ].filter(item => item.value > 0);

    return {
      totalIncome,
      totalExpenses,
      balance,
      expensesByType,
      totalLoanPayments,
      totalCardPayments,
      totalExpensePayments,
      incomePayments,
      loanPayments,
      cardPayments,
      expensePayments
    };
  }, [loans, creditCards, fixedExpenses, incomes, selectedMonth]);

  // Tính toán thống kê 6 tháng gần nhất
  const last6MonthsStats = useMemo(() => {
    const stats: Array<{
      month: string;
      income: number;
      expenses: number;
      balance: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedMonth);
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();

      // Thu nhập
      const incomePayments = incomes.flatMap(income =>
        income.payments.filter(p => {
          const paymentDate = new Date(p.date);
          return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
        })
      );
      const income = incomePayments.reduce((sum, p) => sum + p.amount, 0);

      // Chi tiêu
      const loanPayments = loans
        .filter(loan => loan.type === LoanType.BANK)
        .flatMap(loan =>
          loan.payments.filter(p => {
            const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
            if (isBorrow) return false;
            const paymentDate = new Date(p.date);
            return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
          })
        );
      const cardPayments = creditCards.flatMap(card =>
        card.payments.filter(p => {
          if (p.id.startsWith('borrow-')) return false;
          const paymentDate = new Date(p.date);
          return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
        })
      );
      const expensePayments = fixedExpenses.flatMap(expense =>
        expense.payments.filter(p => {
          const paymentDate = new Date(p.date);
          return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
        })
      );

      const expenses = loanPayments.reduce((sum, p) => sum + p.amount, 0) +
        cardPayments.reduce((sum, p) => sum + p.amount, 0) +
        expensePayments.reduce((sum, p) => sum + p.amount, 0);

      stats.push({
        month: date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
        income,
        expenses,
        balance: income - expenses
      });
    }

    return stats;
  }, [loans, creditCards, fixedExpenses, incomes, selectedMonth]);

  const monthLabel = selectedMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header với chọn tháng */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            Thống kê chi tiêu & thu nhập
          </h2>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => changeMonth('prev')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Tháng trước"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="text-xl font-semibold text-slate-800 min-w-[200px] text-center">
            {monthLabel}
          </div>
          <button
            onClick={() => changeMonth('next')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Tháng sau"
          >
            <ArrowRight size={20} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Tổng quan tháng */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl shadow-sm border border-emerald-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-emerald-600" size={24} />
            <h3 className="text-lg font-semibold text-slate-800">Tổng thu nhập</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-600">
            <Amount value={monthlyStats.totalIncome} id="stats-total-income" />
          </p>
          <p className="text-sm text-slate-600 mt-2">
            {monthlyStats.incomePayments.length} giao dịch
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl shadow-sm border border-red-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="text-red-600" size={24} />
            <h3 className="text-lg font-semibold text-slate-800">Tổng chi tiêu</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">
            <Amount value={monthlyStats.totalExpenses} id="stats-total-expenses" />
          </p>
          <p className="text-sm text-slate-600 mt-2">
            {monthlyStats.loanPayments.length + monthlyStats.cardPayments.length + monthlyStats.expensePayments.length} giao dịch
          </p>
        </div>

        <div className={`bg-gradient-to-br p-6 rounded-xl shadow-sm border ${
          monthlyStats.balance >= 0
            ? 'from-emerald-50 to-emerald-100 border-emerald-200'
            : 'from-red-50 to-red-100 border-red-200'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className={monthlyStats.balance >= 0 ? 'text-emerald-600' : 'text-red-600'} size={24} />
            <h3 className="text-lg font-semibold text-slate-800">Số dư</h3>
          </div>
          <p className={`text-3xl font-bold ${monthlyStats.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <Amount value={Math.abs(monthlyStats.balance)} id="stats-balance" />
          </p>
          <p className={`text-sm mt-2 ${monthlyStats.balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {monthlyStats.balance >= 0 ? 'Dư' : 'Thiếu'}
          </p>
        </div>
      </div>

      {/* Biểu đồ phân bổ chi tiêu */}
      {monthlyStats.expensesByType.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Phân bổ chi tiêu</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={monthlyStats.expensesByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {monthlyStats.expensesByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatAmount(value, 'stats-pie-chart')} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center gap-4">
              {monthlyStats.expensesByType.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-slate-800">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    <Amount value={item.value} id={`stats-expense-${index}`} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Biểu đồ xu hướng 6 tháng */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Xu hướng 6 tháng gần nhất</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={last6MonthsStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatAmount(value, 'stats-line-chart')} />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Thu nhập" />
            <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Chi tiêu" />
            <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2} name="Số dư" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chi tiết theo loại */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chi tiết thu nhập */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="text-emerald-600" size={20} />
            Chi tiết thu nhập
          </h3>
          {monthlyStats.incomePayments.length === 0 ? (
            <p className="text-slate-500 text-center py-4">Không có giao dịch thu nhập trong tháng này</p>
          ) : (
            <div className="space-y-2">
              {incomes.map(income => {
                const payments = income.payments.filter(p => {
                  const paymentDate = new Date(p.date);
                  return paymentDate.getFullYear() === selectedMonth.getFullYear() &&
                    paymentDate.getMonth() === selectedMonth.getMonth();
                });
                if (payments.length === 0) return null;
                const total = payments.reduce((sum, p) => sum + p.amount, 0);
                return (
                  <div key={income.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <span className="font-medium text-slate-800">{income.name}</span>
                    <span className="font-bold text-emerald-600">
                      <Amount value={total} id={`stats-income-${income.id}`} />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chi tiết chi tiêu */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingDown className="text-red-600" size={20} />
            Chi tiết chi tiêu
          </h3>
          <div className="space-y-4">
            {monthlyStats.totalLoanPayments > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-2">Khoản vay</h4>
                <div className="space-y-2">
                  {loans
                    .filter(loan => loan.type === LoanType.BANK)
                    .map(loan => {
                      const payments = loan.payments.filter(p => {
                        const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
                        if (isBorrow) return false;
                        const paymentDate = new Date(p.date);
                        return paymentDate.getFullYear() === selectedMonth.getFullYear() &&
                          paymentDate.getMonth() === selectedMonth.getMonth();
                      });
                      if (payments.length === 0) return null;
                      const total = payments.reduce((sum, p) => sum + p.amount, 0);
                      return (
                        <div key={loan.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                          <span className="text-sm font-medium text-slate-800">{loan.name}</span>
                          <span className="text-sm font-bold text-blue-600">
                            <Amount value={total} id={`stats-loan-${loan.id}`} />
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {monthlyStats.totalCardPayments > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-2">Thẻ tín dụng</h4>
                <div className="space-y-2">
                  {creditCards.map(card => {
                    const payments = card.payments.filter(p => {
                      if (p.id.startsWith('borrow-')) return false;
                      const paymentDate = new Date(p.date);
                      return paymentDate.getFullYear() === selectedMonth.getFullYear() &&
                        paymentDate.getMonth() === selectedMonth.getMonth();
                    });
                    if (payments.length === 0) return null;
                    const total = payments.reduce((sum, p) => sum + p.amount, 0);
                    return (
                      <div key={card.id} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-800">{card.name}</span>
                        <span className="text-sm font-bold text-purple-600">
                          <Amount value={total} id={`stats-card-${card.id}`} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {monthlyStats.totalExpensePayments > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-2">Chi tiêu cố định</h4>
                <div className="space-y-2">
                  {fixedExpenses.map(expense => {
                    const payments = expense.payments.filter(p => {
                      const paymentDate = new Date(p.date);
                      return paymentDate.getFullYear() === selectedMonth.getFullYear() &&
                        paymentDate.getMonth() === selectedMonth.getMonth();
                    });
                    if (payments.length === 0) return null;
                    const total = payments.reduce((sum, p) => sum + p.amount, 0);
                    return (
                      <div key={expense.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-800">{expense.name}</span>
                        <span className="text-sm font-bold text-orange-600">
                          <Amount value={total} id={`stats-expense-${expense.id}`} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {monthlyStats.totalExpenses === 0 && (
              <p className="text-slate-500 text-center py-4">Không có giao dịch chi tiêu trong tháng này</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;

