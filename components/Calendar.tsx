import React, { useState, useMemo } from 'react';
import { Loan, LoanType, CreditCard, FixedExpense } from '../types';
import { formatCurrency } from '../App';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign, CreditCard as CreditCardIcon, Home, X } from 'lucide-react';

interface CalendarProps {
  loans: Loan[];
  creditCards: CreditCard[];
  fixedExpenses: FixedExpense[];
}

interface DayInfo {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dueAmount: number;
  dueLoans: Loan[];
  dueCards: CreditCard[];
  dueExpenses: FixedExpense[];
  cardPaymentAmount: number;
  expenseAmount: number;
}

const Calendar: React.FC<CalendarProps> = ({ loans, creditCards, fixedExpenses }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Tính toán các ngày trong tháng và số tiền đến hạn
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const firstDayOfWeek = firstDay.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
    const daysInMonth = lastDay.getDate();
    
    const days: DayInfo[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Thêm các ngày của tháng trước (để làm đầy tuần đầu, bắt đầu từ thứ 2)
    // Nếu ngày 1 là CN (0), cần thêm 6 ngày. Nếu là T2 (1), không cần. Nếu là T3 (2), cần 1 ngày, ...
    const daysToAdd = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = daysToAdd - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      days.push({
        date,
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: false,
        dueAmount: 0,
        dueLoans: [],
        dueCards: [],
        dueExpenses: [],
        cardPaymentAmount: 0,
        expenseAmount: 0
      });
    }

    // Thêm các ngày trong tháng hiện tại
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = date.getTime() === today.getTime();
      
      // Tìm các khoản vay đến hạn vào ngày này (chỉ tính Bank loans)
      const dueLoans = loans.filter(loan => 
        loan.type === LoanType.BANK && 
        loan.status === 'ACTIVE' &&
        loan.monthlyDueDate === day
      );
      
      // Tìm các thẻ tín dụng đến hạn vào ngày này
      const dueCards = creditCards.filter(card => 
        card.status === 'ACTIVE' &&
        card.dueDate === day
      );
      
      // Tìm các chi tiêu cố định đến hạn vào ngày này
      const dueExpenses = fixedExpenses.filter(expense => 
        expense.status === 'ACTIVE' &&
        expense.dueDate === day
      );
      
      const loanAmount = dueLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
      const cardAmount = dueCards.reduce((sum, card) => sum + (card.paymentAmount > 0 ? card.paymentAmount : 0), 0);
      const expenseAmount = dueExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const dueAmount = loanAmount + cardAmount + expenseAmount;

      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday,
        dueAmount,
        dueLoans,
        dueCards,
        dueExpenses,
        cardPaymentAmount: cardAmount,
        expenseAmount: expenseAmount
      });
    }

    // Thêm các ngày của tháng sau (để làm đầy tuần cuối)
    const totalCells = 42; // 6 tuần * 7 ngày
    const remainingCells = totalCells - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false,
        dueAmount: 0,
        dueLoans: [],
        dueCards: [],
        dueExpenses: [],
        cardPaymentAmount: 0,
        expenseAmount: 0
      });
    }

    return days;
  }, [currentYear, currentMonth, loans, creditCards, fixedExpenses]);

  // Tính tổng tiền đến hạn trong tháng
  const totalDueThisMonth = useMemo(() => {
    const loanAmount = loans
      .filter(loan => loan.type === LoanType.BANK && loan.status === 'ACTIVE')
      .reduce((sum, loan) => sum + loan.monthlyPayment, 0);
    
    const cardAmount = creditCards
      .filter(card => card.status === 'ACTIVE' && card.paymentAmount > 0)
      .reduce((sum, card) => sum + card.paymentAmount, 0);
    
    const expenseAmount = fixedExpenses
      .filter(expense => expense.status === 'ACTIVE')
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    return loanAmount + cardAmount + expenseAmount;
  }, [loans, creditCards, fixedExpenses]);

  // Tính tổng tiền đến hạn trong tuần hiện tại (tuần bắt đầu từ thứ 2)
  const totalDueThisWeek = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const dayOfWeek = today.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
    // Nếu là CN (0), tính từ T2 tuần trước. Nếu là T2-T7, tính từ T2 tuần này
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = currentDay - daysFromMonday;
    const weekEnd = weekStart + 6;

    const loanAmount = loans
      .filter(loan => 
        loan.type === LoanType.BANK && 
        loan.status === 'ACTIVE' &&
        loan.monthlyDueDate >= weekStart && 
        loan.monthlyDueDate <= weekEnd &&
        loan.monthlyDueDate >= currentDay
      )
      .reduce((sum, loan) => sum + loan.monthlyPayment, 0);
    
    const cardAmount = creditCards
      .filter(card => 
        card.status === 'ACTIVE' &&
        card.dueDate >= weekStart && 
        card.dueDate <= weekEnd &&
        card.dueDate >= currentDay &&
        card.paymentAmount > 0
      )
      .reduce((sum, card) => sum + card.paymentAmount, 0);
    
    const expenseAmount = fixedExpenses
      .filter(expense => 
        expense.status === 'ACTIVE' &&
        expense.dueDate >= weekStart && 
        expense.dueDate <= weekEnd &&
        expense.dueDate >= currentDay
      )
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    return loanAmount + cardAmount + expenseAmount;
  }, [loans, creditCards, fixedExpenses]);

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header với thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Tổng tiền đến hạn tháng này</p>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalDueThisMonth)}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Tuần này còn lại</p>
          <h3 className="text-2xl font-bold text-blue-600">{formatCurrency(totalDueThisWeek)}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">Số khoản đến hạn</p>
          <h3 className="text-2xl font-bold text-purple-600">
            {loans.filter(l => l.type === LoanType.BANK && l.status === 'ACTIVE').length + creditCards.filter(c => c.status === 'ACTIVE').length + fixedExpenses.filter(e => e.status === 'ACTIVE').length}
          </h3>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-slate-600" />
              </button>
              <h2 className="text-xl font-bold text-slate-800">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-slate-600" />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Hôm nay
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((day, index) => (
                  <div
                    key={index}
                    className="text-center text-sm font-semibold text-slate-600 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((dayInfo, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedDay(dayInfo)}
                    className={`
                      min-h-[100px] border rounded-lg p-2 transition-all
                      ${dayInfo.isCurrentMonth ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-50'}
                      ${dayInfo.isToday ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : ''}
                      ${dayInfo.dueAmount > 0 ? 'border-orange-300 bg-orange-50' : ''}
                      hover:shadow-md cursor-pointer
                    `}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span
                        className={`
                          text-sm font-medium
                          ${dayInfo.isToday ? 'text-blue-700 font-bold' : 'text-slate-700'}
                          ${!dayInfo.isCurrentMonth ? 'text-slate-400' : ''}
                        `}
                      >
                        {dayInfo.day}
                      </span>
                      <div className="flex items-center gap-1">
                        {dayInfo.dueLoans.length > 0 && (
                          <DollarSign size={14} className="text-orange-600 flex-shrink-0" />
                        )}
                        {dayInfo.dueCards.length > 0 && (
                          <CreditCardIcon size={14} className="text-indigo-600 flex-shrink-0" />
                        )}
                        {dayInfo.dueExpenses.length > 0 && (
                          <Home size={14} className="text-purple-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                    
                    {dayInfo.dueAmount > 0 && dayInfo.isCurrentMonth && (
                      <div className="mt-1 space-y-1">
                        <div className="text-xs font-semibold text-orange-700">
                          {formatCurrency(dayInfo.dueAmount)}
                        </div>
                        {(dayInfo.dueLoans.length > 0 || dayInfo.dueCards.length > 0) && (
                          <div className="space-y-0.5">
                            {/* Hiển thị khoản vay */}
                            {dayInfo.dueLoans.slice(0, 2).map(loan => (
                              <div
                                key={loan.id}
                                className="text-[10px] text-orange-600 truncate bg-orange-100 px-1 py-0.5 rounded"
                                title={loan.name}
                              >
                                {loan.provider}
                              </div>
                            ))}
                            {/* Hiển thị thẻ tín dụng */}
                            {dayInfo.dueCards.slice(0, Math.max(0, 2 - dayInfo.dueLoans.length)).map(card => (
                              <div
                                key={card.id}
                                className="text-[10px] text-indigo-600 truncate bg-indigo-100 px-1 py-0.5 rounded"
                                title={card.name}
                              >
                                {card.provider}
                              </div>
                            ))}
                            {/* Hiển thị chi tiêu cố định */}
                            {dayInfo.dueExpenses.slice(0, Math.max(0, 2 - dayInfo.dueLoans.length - dayInfo.dueCards.length)).map(expense => (
                              <div
                                key={expense.id}
                                className="text-[10px] text-purple-600 truncate bg-purple-100 px-1 py-0.5 rounded"
                                title={expense.name}
                              >
                                {expense.name}
                              </div>
                            ))}
                            {(dayInfo.dueLoans.length + dayInfo.dueCards.length + dayInfo.dueExpenses.length) > 2 && (
                              <div className="text-[10px] text-orange-500">
                                +{(dayInfo.dueLoans.length + dayInfo.dueCards.length + dayInfo.dueExpenses.length) - 2} khoản
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 bg-blue-50 rounded"></div>
            <span className="text-slate-600">Hôm nay</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-orange-300 bg-orange-50 rounded"></div>
            <span className="text-slate-600">Có tiền đến hạn</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-orange-600" />
            <span className="text-slate-600">Khoản vay</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCardIcon size={14} className="text-indigo-600" />
            <span className="text-slate-600">Thẻ tín dụng</span>
          </div>
          <div className="flex items-center gap-2">
            <Home size={14} className="text-purple-600" />
            <span className="text-slate-600">Chi tiêu cố định</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-slate-200 bg-white rounded"></div>
            <span className="text-slate-600">Ngày bình thường</span>
          </div>
        </div>
      </div>

      {/* Modal hiển thị chi tiết ngày được chọn */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">
                Ngày {selectedDay.day} {selectedDay.isCurrentMonth ? '' : `(tháng ${selectedDay.date.getMonth() + 1})`}
              </h2>
              <button 
                onClick={() => setSelectedDay(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              {selectedDay.dueAmount > 0 ? (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-orange-800">Tổng tiền đến hạn</span>
                      <span className="text-lg font-bold text-orange-600">{formatCurrency(selectedDay.dueAmount)}</span>
                    </div>
                  </div>

                  {/* Khoản vay ngân hàng */}
                  {selectedDay.dueLoans.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <DollarSign size={16} className="text-orange-600" />
                        Khoản vay ngân hàng ({selectedDay.dueLoans.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedDay.dueLoans.map(loan => (
                          <div key={loan.id} className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{loan.name}</p>
                                <p className="text-xs text-slate-500 truncate">{loan.provider}</p>
                              </div>
                              <div className="text-right ml-3">
                                <p className="font-bold text-orange-600">{formatCurrency(loan.monthlyPayment)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thẻ tín dụng */}
                  {selectedDay.dueCards.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <CreditCardIcon size={16} className="text-indigo-600" />
                        Thẻ tín dụng ({selectedDay.dueCards.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedDay.dueCards.map(card => (
                          <div key={card.id} className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{card.name}</p>
                                <p className="text-xs text-slate-500 truncate">{card.provider}</p>
                                {card.paymentAmount > 0 && (
                                  <p className="text-xs text-slate-400 mt-1">Thanh toán tối thiểu</p>
                                )}
                              </div>
                              <div className="text-right ml-3">
                                {card.paymentAmount > 0 ? (
                                  <p className="font-bold text-indigo-600">{formatCurrency(card.paymentAmount)}</p>
                                ) : (
                                  <p className="text-xs text-slate-400">Không có</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chi tiêu cố định */}
                  {selectedDay.dueExpenses.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Home size={16} className="text-purple-600" />
                        Chi tiêu cố định ({selectedDay.dueExpenses.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedDay.dueExpenses.map(expense => (
                          <div key={expense.id} className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{expense.name}</p>
                              </div>
                              <div className="text-right ml-3">
                                <p className="font-bold text-purple-600">{formatCurrency(expense.amount)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">Không có khoản thanh toán nào trong ngày này</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;

