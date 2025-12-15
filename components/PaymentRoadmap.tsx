import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { Loan, LoanType, LoanStatus } from '../types';
import { formatCurrency } from '../App';
import { Calendar, Wallet, TrendingDown, CheckCircle2, X, Plus, Trash2 } from 'lucide-react';

interface PaymentRoadmapProps {
  loans: Loan[];
}

interface MonthlyPayment {
  month: number;
  year: number;
  totalAmount: number;
  monthLabel: string;
  loans: Array<{
    loan: Loan;
    amount: number;
    remainingAfter: number;
  }>;
}

interface EarlySettlement {
  loanId: string;
  settleMonth: number; // 0-11 (tháng thực tế)
  settleYear: number;  // năm thực tế
}

const PaymentRoadmap: React.FC<PaymentRoadmapProps> = ({ loans }) => {
  const [selectedMonth, setSelectedMonth] = useState<MonthlyPayment | null>(null);
  const [earlySettlements, setEarlySettlements] = useState<EarlySettlement[]>([]);
  const [newSettlementLoanId, setNewSettlementLoanId] = useState<string>('');
  // input type="month", giá trị dạng "YYYY-MM"
  const [newSettlementMonthYear, setNewSettlementMonthYear] = useState<string>('');
  
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const activeBankLoans = useMemo(
    () =>
      loans.filter(
        (loan) =>
          loan.type === LoanType.BANK &&
          loan.status === 'ACTIVE' &&
          loan.monthlyPayment > 0
      ),
    [loans]
  );

  // Tính toán lộ trình thanh toán (có xét mô phỏng nếu có)
  const roadmap = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const bankLoans = activeBankLoans;

    if (bankLoans.length === 0) {
      return [];
    }

    // Tạo map để tra cứu nhanh tháng/năm tất toán sớm của mỗi khoản vay
    const earlySettlementMap = new Map<
      string,
      { settleMonth: number; settleYear: number }
    >();
    earlySettlements.forEach((settlement) => {
      earlySettlementMap.set(settlement.loanId, {
        settleMonth: settlement.settleMonth,
        settleYear: settlement.settleYear,
      });
    });

    // Trạng thái từng khoản vay dùng cho việc chạy lộ trình
    const loanStatuses = bankLoans.map((loan) => {
      const paid = loan.payments
        .filter((p) => {
          const isBorrow =
            p.id.startsWith('borrow-') ||
            (p.note && p.note.includes('Vay thêm'));
          return !isBorrow;
        })
        .reduce((acc, p) => acc + p.amount, 0);

      const remaining = Math.max(0, loan.originalAmount - paid);

      const status = {
        loan,
        paid,
        remaining,
        remainingForSchedule: remaining,
        willSettleEarly: false as boolean,
        settleEarlyMonth: null as number | null,
        settleEarlyYear: null as number | null,
      };

      const s = earlySettlementMap.get(loan.id);
      if (s) {
        status.willSettleEarly = true;
        status.settleEarlyMonth = s.settleMonth;
        status.settleEarlyYear = s.settleYear;
      }

      return status;
    });

    const monthlyPayments: MonthlyPayment[] = [];

    // Chạy tối đa 600 tháng, dừng sớm nếu tất cả khoản vay đã trả hết
    for (let monthOffset = 0; monthOffset < 600; monthOffset++) {
      const allDone = loanStatuses.every(
        (status) => status.remainingForSchedule <= 0
      );
      if (allDone) break;

      const targetMonth = (currentMonth + monthOffset) % 12;
      const targetYear =
        currentYear + Math.floor((currentMonth + monthOffset) / 12);

      const monthLoans: Array<{
        loan: Loan;
        amount: number;
        remainingAfter: number;
      }> = [];

      let totalAmount = 0;

      loanStatuses.forEach((status) => {
        // Nếu khoản vay đã hoàn thành (bao gồm đã tất toán sớm), bỏ qua
        if (status.remainingForSchedule <= 0) {
          return;
        }

        // Nếu khoản vay được set tất toán sớm ở đúng tháng/năm này,
        // thanh toán toàn bộ phần còn lại trong tháng này rồi dừng các tháng sau
        let effectivePayment: number;
        if (
          status.willSettleEarly &&
          status.settleEarlyMonth !== null &&
          status.settleEarlyYear !== null &&
          targetMonth === status.settleEarlyMonth &&
          targetYear === status.settleEarlyYear
        ) {
          effectivePayment = status.remainingForSchedule;
        } else {
          const paymentThisMonth = status.loan.monthlyPayment;
          effectivePayment = Math.min(
            status.remainingForSchedule,
            paymentThisMonth
          );
        }

        if (effectivePayment <= 0) return;

        status.remainingForSchedule = Math.max(
          0,
          status.remainingForSchedule - effectivePayment
        );

        monthLoans.push({
          loan: status.loan,
          amount: effectivePayment,
          remainingAfter: status.remainingForSchedule,
        });
        totalAmount += effectivePayment;
      });

      if (totalAmount > 0) {
        monthlyPayments.push({
          month: targetMonth,
          year: targetYear,
          totalAmount,
          monthLabel: `${monthNames[targetMonth]} ${targetYear}`,
          loans: monthLoans,
        });
      }
    }

    return monthlyPayments;
  }, [activeBankLoans, monthNames, earlySettlements]);

  // Tính tổng số tiền phải trả
  const totalAmount = useMemo(() => {
    return roadmap.reduce((sum, month) => sum + month.totalAmount, 0);
  }, [roadmap]);

  // Tính số tháng còn lại
  const monthsRemaining = roadmap.length;

  if (roadmap.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="text-center py-12">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Không có khoản vay ngân hàng nào
            </h3>
            <p className="text-slate-500">
              Tất cả các khoản vay ngân hàng đã được thanh toán hoặc không có khoản vay nào đang hoạt động.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="text-blue-600" size={24} />
            <p className="text-sm text-slate-600">Tổng số tiền còn lại</p>
          </div>
          <h3 className="text-2xl font-bold text-blue-600">
            {formatCurrency(totalAmount)}
          </h3>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl shadow-sm border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-purple-600" size={24} />
            <p className="text-sm text-slate-600">Số tháng còn lại</p>
          </div>
          <h3 className="text-2xl font-bold text-purple-600">
            {monthsRemaining} tháng
          </h3>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl shadow-sm border border-emerald-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="text-emerald-600" size={24} />
            <p className="text-sm text-slate-600">Số khoản vay</p>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600">
            {loans.filter(
              (l) =>
                l.type === LoanType.BANK &&
                l.status === LoanStatus.ACTIVE &&
                l.monthlyPayment > 0
            ).length}
          </h3>
        </div>
      </div>

      {/* Mô phỏng tất toán sớm (chỉ mô phỏng, không lưu DB) */}
      <div className="bg-white rounded-xl shadow-sm border border-dashed border-amber-300 p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-amber-700 mb-1">
            Mô phỏng tất toán sớm (không lưu vào dữ liệu thật)
          </h3>
          <p className="text-xs text-slate-500">
            Chọn các khoản vay sẽ tất toán sớm ở các tháng khác nhau để xem lộ trình thay đổi. 
            Khi một khoản vay được tất toán sớm, từ tháng sau nó sẽ không còn trong lộ trình nữa.
          </p>
        </div>

        {/* Form thêm khoản vay tất toán sớm */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-amber-50 rounded-lg">
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[180px]"
            value={newSettlementLoanId}
            onChange={(e) => setNewSettlementLoanId(e.target.value)}
          >
            <option value="">Chọn khoản vay</option>
            {activeBankLoans
              .filter(loan => !earlySettlements.some(s => s.loanId === loan.id))
              .map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.name} - {loan.provider}
                </option>
              ))}
          </select>
          <input
            type="month"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={newSettlementMonthYear}
            onChange={(e) => setNewSettlementMonthYear(e.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              if (newSettlementLoanId && newSettlementMonthYear) {
                const [yearStr, monthStr] = newSettlementMonthYear.split('-');
                const year = parseInt(yearStr, 10);
                const month = parseInt(monthStr, 10) - 1; // 0-11

                if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
                  setEarlySettlements([
                    ...earlySettlements,
                    {
                      loanId: newSettlementLoanId,
                      settleMonth: month,
                      settleYear: year,
                    },
                  ]);
                  setNewSettlementLoanId('');
                  setNewSettlementMonthYear('');
                }
              }
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Thêm
          </button>
        </div>

        {/* Danh sách các khoản vay sẽ tất toán sớm */}
        {earlySettlements.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600 mb-2">
              Các khoản vay sẽ tất toán sớm:
            </p>
            {earlySettlements.map((settlement, index) => {
              const loan = activeBankLoans.find(l => l.id === settlement.loanId);
              if (!loan) return null;
              
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white border border-amber-200 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{loan.name}</p>
                    <p className="text-xs text-slate-500">
                      Tất toán sớm vào {monthNames[settlement.settleMonth]} {settlement.settleYear}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEarlySettlements(earlySettlements.filter((_, i) => i !== index));
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setEarlySettlements([])}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Xóa tất cả mô phỏng
            </button>
          </div>
        )}
      </div>

      {/* Biểu đồ lộ trình thanh toán */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            Lộ trình thanh toán
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Số tiền phải thanh toán từng tháng cho đến khi tất cả các khoản vay
            được thanh toán hết
          </p>
        </div>

        <div className="p-6">
          {roadmap.length > 0 ? (
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={roadmap}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="monthLabel"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) {
                        return `${(value / 1000000).toFixed(1)}M`;
                      } else if (value >= 1000) {
                        return `${(value / 1000).toFixed(0)}K`;
                      }
                      return value.toString();
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px',
                    }}
                  />
                  <Bar
                    dataKey="totalAmount"
                    fill="#ef4444"
                    radius={[8, 8, 0, 0]}
                    name="Số tiền cần thanh toán"
                    onClick={(data: MonthlyPayment) => {
                      if (data) {
                        setSelectedMonth(data);
                      }
                    }}
                    cursor="pointer"
                  >
                    {roadmap.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          selectedMonth?.month === entry.month &&
                          selectedMonth?.year === entry.year
                            ? '#dc2626'
                            : '#ef4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">Không có dữ liệu để hiển thị</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal chi tiết tháng được chọn */}
      {selectedMonth && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          style={{ marginTop: 0 }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">
                  Chi tiết thanh toán {selectedMonth.monthLabel}
                </h3>
                <button
                  onClick={() => setSelectedMonth(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* Tổng số tiền */}
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-4 rounded-lg border border-rose-200 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-rose-800">
                    Tổng số tiền cần thanh toán
                  </span>
                  <span className="text-2xl font-bold text-rose-600">
                    {formatCurrency(selectedMonth.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Thông báo kỳ thanh toán cuối cùng */}
              {selectedMonth.loans.some(({ remainingAfter }) => remainingAfter <= 0) && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200 mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-emerald-800 mb-1">
                        Kỳ thanh toán cuối cùng
                      </p>
                      <p className="text-xs text-emerald-700">
                        Trong tháng này có {selectedMonth.loans.filter(({ remainingAfter }) => remainingAfter <= 0).length} khoản vay sẽ được thanh toán hoàn tất.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Danh sách các khoản vay */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Các khoản vay cần thanh toán ({selectedMonth.loans.length})
                </h4>
                {selectedMonth.loans.map(({ loan, amount, remainingAfter }) => {
                  const paid = loan.payments
                    .filter((p) => {
                      const isBorrow =
                        p.id.startsWith('borrow-') ||
                        (p.note && p.note.includes('Vay thêm'));
                      return !isBorrow;
                    })
                    .reduce((acc, p) => acc + p.amount, 0);
                  const currentRemaining = Math.max(
                    0,
                    loan.originalAmount - paid
                  );

                  const isLastPayment = remainingAfter <= 0;

                  return (
                    <div
                      key={loan.id}
                      className={`bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow ${
                        isLastPayment
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Wallet
                              size={16}
                              className="text-blue-600 flex-shrink-0"
                            />
                            <p className="font-semibold text-slate-900 truncate">
                              {loan.name}
                            </p>
                            {isLastPayment && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium whitespace-nowrap">
                                ⭐ Kỳ thanh toán cuối cùng
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mb-2">
                            {loan.provider}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <span>
                              Đã trả:{' '}
                              <strong className="text-emerald-600">
                                {formatCurrency(paid)}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Còn lại (trước tháng này):{' '}
                              <strong className="text-rose-600">
                                {formatCurrency(currentRemaining)}
                              </strong>
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-bold text-orange-600 text-lg">
                            {formatCurrency(amount)}
                          </p>
                          {remainingAfter > 0 && (
                            <p className="text-xs text-slate-400 mt-1">
                              Sau tháng này: {formatCurrency(remainingAfter)}
                            </p>
                          )}
                          {remainingAfter <= 0 && (
                            <p className="text-xs text-emerald-600 mt-1 font-medium">
                              Hoàn thành
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentRoadmap;

