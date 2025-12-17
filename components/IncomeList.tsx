import React, { useState, useMemo } from 'react';
import { Income, Payment } from '../types';
import { formatCurrency } from '../App';
import { generateUUID } from '../utils/uuid';
import { Trash2, History, Wallet, Calendar, DollarSign, X, Edit, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { Amount } from './AmountVisibility';

interface IncomeListProps {
  incomes: Income[];
  onDeleteIncome: (id: string) => void;
  onAddPayment: (incomeId: string, payment: Payment) => void;
  onRemovePayment: (incomeId: string, paymentIds: string[]) => void;
  onUpdateIncome: (id: string, updatedIncome: Partial<Income>) => void;
}

type SortOption = 'receivedDate' | 'amount' | 'name';

const IncomeList: React.FC<IncomeListProps> = ({ 
  incomes, 
  onDeleteIncome, 
  onAddPayment,
  onRemovePayment,
  onUpdateIncome
}) => {
  const [selectedIncome, setSelectedIncome] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('receivedDate');
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [extraIncomeId, setExtraIncomeId] = useState<string>('');
  const [extraAmount, setExtraAmount] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [extraDate, setExtraDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [extraSourceName, setExtraSourceName] = useState('');
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editReceivedDate, setEditReceivedDate] = useState<number>(1);

  // Đồng bộ income mặc định cho thu nhập đột xuất khi danh sách thay đổi
  React.useEffect(() => {
    if (incomes.length === 0) {
      setExtraIncomeId('');
    } else if (!extraIncomeId) {
      setExtraIncomeId(incomes[0].id);
    } else if (!incomes.find(i => i.id === extraIncomeId)) {
      setExtraIncomeId(incomes[0].id);
    }
  }, [incomes, extraIncomeId]);

  // Tổng hợp lịch sử thu nhập
  const deriveExtraName = (note?: string) => {
    if (!note) return 'Thu nhập đột xuất';
    const colonIdx = note.indexOf(':');
    if (colonIdx !== -1) {
      return note.slice(colonIdx + 1).split('-')[0].trim() || 'Thu nhập đột xuất';
    }
    const dashIdx = note.indexOf('-');
    if (dashIdx !== -1) {
      return note.slice(0, dashIdx).trim() || 'Thu nhập đột xuất';
    }
    return note.trim() || 'Thu nhập đột xuất';
  };

  const allPayments = useMemo(() => {
    return incomes.flatMap(income =>
      income.payments.map(p => {
        const isExtra = p.id.startsWith('extra-');
        const displayName = isExtra ? deriveExtraName(p.note) : income.name;
        return {
          ...p,
          incomeId: income.id,
          incomeName: displayName
        };
      })
    );
  }, [incomes]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalAll = useMemo(() => {
    return allPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  const totalThisYear = useMemo(() => {
    return allPayments
      .filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments, currentYear]);

  const totalThisMonth = useMemo(() => {
    return allPayments
      .filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments, currentMonth, currentYear]);

  const allPaymentsSorted = useMemo(() => {
    return [...allPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allPayments]);

  const monthlyTotals = useMemo(() => {
    const map = new Map<string, { year: number; month: number; total: number }>();
    allPayments.forEach(p => {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = map.get(key);
      const total = (existing?.total || 0) + p.amount;
      map.set(key, { year: d.getFullYear(), month: d.getMonth(), total });
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.year === b.year) return b.month - a.month;
      return b.year - a.year;
    });
  }, [allPayments]);

  const yearlyTotals = useMemo(() => {
    const map = new Map<number, number>();
    allPayments.forEach(p => {
      const d = new Date(p.date);
      map.set(d.getFullYear(), (map.get(d.getFullYear()) || 0) + p.amount);
    });
    return Array.from(map.entries())
      .map(([year, total]) => ({ year, total }))
      .sort((a, b) => b.year - a.year);
  }, [allPayments]);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncome || !amount) return;

    const newPayment: Payment = {
      id: generateUUID(),
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      note: note || 'Nhận tiền thu nhập'
    };

    onAddPayment(selectedIncome, newPayment);
    setAmount('');
    setNote('');
    setSelectedIncome(null);
  };

  const handleEditClick = (income: Income) => {
    setEditingIncome(income);
    setEditName(income.name);
    setEditAmount(income.amount.toString());
    setEditReceivedDate(income.receivedDate);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncome) return;

    onUpdateIncome(editingIncome.id, {
      name: editName,
      amount: parseFloat(editAmount) || 0,
      receivedDate: editReceivedDate
    });

    setEditingIncome(null);
    setEditName('');
    setEditAmount('');
    setEditReceivedDate(1);
  };

  const handleExtraIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraIncomeId || !extraAmount || !extraSourceName.trim()) return;

    const sourceLabel = extraSourceName.trim();
    const payment: Payment = {
      id: `extra-${generateUUID()}`,
      date: extraDate ? new Date(extraDate).toISOString() : new Date().toISOString(),
      amount: parseFloat(extraAmount),
      note: extraNote ? `${sourceLabel} - ${extraNote}` : `Thu nhập đột xuất: ${sourceLabel}`
    };

    onAddPayment(extraIncomeId, payment);
    setExtraAmount('');
    setExtraNote('');
    setExtraDate(new Date().toISOString().split('T')[0]);
    setExtraSourceName('');
  };

  const isExtraPayment = (p: Payment) => p.id.startsWith('extra-');

  // Kiểm tra xem tháng hiện tại đã nhận tiền chưa (chỉ tính khoản cố định, bỏ qua đột xuất)
  const isCurrentMonthReceived = (income: Income): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const currentMonthPayments = income.payments.filter(p => {
      if (isExtraPayment(p)) return false;
      const paymentDate = new Date(p.date);
      return paymentDate.getFullYear() === currentYear && 
             paymentDate.getMonth() === currentMonth;
    });
    
    return currentMonthPayments.length > 0;
  };

  // Kiểm tra xem đã đến ngày nhận tiền chưa
  const isReceivedDatePassed = (income: Income): boolean => {
    const now = new Date();
    const currentDay = now.getDate();
    
    if (isCurrentMonthReceived(income)) return false;
    
    return currentDay >= income.receivedDate;
  };

  // Sắp xếp thu nhập
  const sortedIncomes = useMemo(() => {
    const sorted = [...incomes];
    const sortFn = (a: Income, b: Income) => {
      if (sortBy === 'amount') {
        return b.amount - a.amount;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return a.receivedDate - b.receivedDate;
      }
    };
    return sorted.sort(sortFn);
  }, [incomes, sortBy]);

  const renderIncomeRow = (income: Income) => {
    const isReceived = isCurrentMonthReceived(income);
    const datePassed = isReceivedDatePassed(income);

    return (
      <div key={income.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
        {/* Dòng 1: Thông tin chính */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
          {/* Tên khoản thu nhập */}
          <div className="col-span-12 md:col-span-4 flex items-center gap-3">
            <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600">
              <Wallet size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900 truncate">{income.name}</div>
            </div>
          </div>

          {/* Số tiền */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Số tiền</div>
            <div className="font-semibold text-emerald-600">
              <Amount value={income.amount} id={`income-${income.id}-amount`} />
            </div>
          </div>

          {/* Ngày nhận tiền */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ngày nhận</div>
            <div className="font-semibold text-slate-900">Ngày {income.receivedDate}</div>
          </div>

          {/* Trạng thái */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trạng thái</div>
            <div className={`font-semibold ${isReceived ? 'text-emerald-600' : datePassed ? 'text-orange-600' : 'text-slate-600'}`}>
              {isReceived ? 'Đã nhận' : datePassed ? 'Đã đến ngày' : 'Chưa đến ngày'}
            </div>
          </div>

          {/* Actions */}
          <div className="col-span-6 md:col-span-2 flex flex-wrap items-center justify-end gap-1">
            <button
              onClick={() => {
                if (!isReceived) {
                  // Tự động nhận với số tiền thu nhập
                  if (window.confirm(`Xác nhận đã nhận ${formatCurrency(income.amount)} từ "${income.name}"?`)) {
                    const newPayment: Payment = {
                      id: generateUUID(),
                      date: new Date().toISOString(),
                      amount: income.amount,
                      note: `Nhận tiền tháng ${new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`
                    };
                    onAddPayment(income.id, newPayment);
                  }
                } else {
                  // Xóa payment cố định của tháng hiện tại (không xóa thu nhập đột xuất)
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth();
                  const currentMonthPayments = income.payments.filter(p => {
                    if (isExtraPayment(p)) return false;
                    const paymentDate = new Date(p.date);
                    return paymentDate.getFullYear() === currentYear && 
                           paymentDate.getMonth() === currentMonth;
                  });
                  const paymentIds = currentMonthPayments.map(p => p.id);
                  if (paymentIds.length > 0) {
                    onRemovePayment(income.id, paymentIds);
                  }
                }
              }}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium flex items-center gap-1 ${
                isReceived
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : datePassed
                  ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
              title={isReceived ? 'Hủy nhận tiền' : 'Nhận tiền'}
            >
              {isReceived ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              {isReceived ? 'Đã nhận' : 'Nhận'}
            </button>
            <button
              onClick={() => handleEditClick(income)}
              className="p-1.5 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded transition-colors"
              title="Chỉnh sửa"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => setShowHistory(showHistory === income.id ? null : income.id)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Lịch sử"
            >
              <History size={16} />
            </button>
            <button
              onClick={() => onDeleteIncome(income.id)}
              className="p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
              title="Xóa"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">Thu nhập hàng tháng</h2>
        
        {/* Sort Controls */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <button 
            onClick={() => setSortBy('receivedDate')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'receivedDate' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calendar size={14} /> Ngày nhận
          </button>
          <button 
            onClick={() => setSortBy('amount')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'amount' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <DollarSign size={14} /> Số tiền cao nhất
          </button>
          <button 
            onClick={() => setSortBy('name')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'name' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <TrendingUp size={14} /> Tên A-Z
          </button>
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Tổng thu đã nhận</p>
          <p className="text-2xl font-bold text-emerald-600">
            <Amount value={totalAll} id="income-total-all" />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Năm {currentYear}</p>
          <p className="text-2xl font-bold text-blue-600">
            <Amount value={totalThisYear} id="income-total-year" />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Tháng này</p>
          <p className="text-2xl font-bold text-purple-600">
            <Amount value={totalThisMonth} id="income-total-month" />
          </p>
        </div>
      </div>

      {/* Thêm thu nhập đột xuất */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Thêm thu nhập đột xuất</h3>
          {incomes.length === 0 && (
            <span className="text-xs text-rose-500">Vui lòng thêm nguồn thu nhập cố định trước</span>
          )}
        </div>
        <form className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end" onSubmit={handleExtraIncomeSubmit}>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Tên khoản thu nhập</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="VD: Thưởng dự án, Freelance..."
              value={extraSourceName}
              onChange={e => setExtraSourceName(e.target.value)}
              required
              disabled={incomes.length === 0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Số tiền</label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="0"
              value={extraAmount}
              onChange={e => setExtraAmount(e.target.value)}
              required
              disabled={incomes.length === 0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ngày nhận</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={extraDate}
              onChange={e => setExtraDate(e.target.value)}
              disabled={incomes.length === 0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="VD: Thưởng, freelance..."
              value={extraNote}
              onChange={e => setExtraNote(e.target.value)}
              disabled={incomes.length === 0}
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-60"
              disabled={incomes.length === 0}
            >
              Thêm vào lịch sử
            </button>
          </div>
        </form>
      </div>

      {incomes.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">Bạn chưa có nguồn thu nhập nào.</p>
        </div>
      )}

      {sortedIncomes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoản thu nhập</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Số tiền</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Ngày nhận</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Trạng thái</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
          </div>
          {/* Body */}
          <div className="divide-y divide-slate-100">
            {sortedIncomes.map(renderIncomeRow)}
          </div>
        </div>
      )}

      {/* Thống kê theo tháng */}
      {monthlyTotals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Thống kê thu nhập theo tháng</h3>
            <span className="text-xs text-slate-500">Tối đa 12 tháng gần nhất</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Tháng</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">Tổng thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyTotals.slice(0, 12).map(item => (
                  <tr key={`${item.year}-${item.month}`} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">
                      Tháng {item.month + 1}/{item.year}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                      <Amount value={item.total} id={`income-month-${item.year}-${item.month}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Thống kê theo năm */}
      {yearlyTotals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Thống kê thu nhập theo năm</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Năm</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">Tổng thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {yearlyTotals.map(item => (
                  <tr key={item.year} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">{item.year}</td>
                    <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                      <Amount value={item.total} id={`income-year-${item.year}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lịch sử thu nhập */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Lịch sử thu nhập</h3>
          <span className="text-xs text-slate-500">Sắp xếp mới nhất → cũ nhất</span>
        </div>
        {allPaymentsSorted.length === 0 ? (
          <div className="p-6 text-slate-500 text-sm">Chưa có khoản thu nào trong lịch sử.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Ngày</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Khoản thu nhập</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">Số tiền</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Ghi chú</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-600 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allPaymentsSorted.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700 whitespace-nowrap">
                      {new Date(p.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{p.incomeName}</td>
                    <td className="px-4 py-2 text-right font-semibold text-emerald-600 whitespace-nowrap">
                      <Amount value={p.amount} id={`income-history-${p.id}`} />
                    </td>
                    <td className="px-4 py-2 text-slate-500 max-w-[240px] truncate">{p.note || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                        title="Xóa dòng lịch sử này"
                        onClick={() => {
                          if (!p.incomeId) return;
                          if (window.confirm('Xóa dòng lịch sử thu nhập này?')) {
                            onRemovePayment(p.incomeId, [p.id]);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedIncome && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800">Nhận tiền thu nhập</h2>
              <button onClick={() => setSelectedIncome(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Số tiền nhận được (VNĐ)</label>
                <input
                  type="number"
                  placeholder="Nhập số tiền"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  required
                  min="0"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ghi chú"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelectedIncome(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium">Xác nhận nhận tiền</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Income Modal */}
      {editingIncome && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Chỉnh sửa thu nhập</h2>
              <button onClick={() => setEditingIncome(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên khoản thu nhập
                </label>
                <input required type="text" placeholder="VD: Lương, Freelance" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Số tiền hàng tháng (VNĐ)
                </label>
                <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày nhận tiền hàng tháng</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  value={editReceivedDate}
                  onChange={e => setEditReceivedDate(parseInt(e.target.value))}
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Ngày {d}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-200">
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (() => {
        const income = incomes.find(i => i.id === showHistory);
        if (!income) return null;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-scale-up max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-slate-800">Lịch sử nhận tiền - {income.name}</h2>
                <button onClick={() => setShowHistory(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                {income.payments.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Chưa có lịch sử nhận tiền</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Ngày</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-600">Số tiền</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {income.payments.slice().reverse().map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-600">{new Date(p.date).toLocaleDateString('vi-VN')}</td>
                          <td className="px-4 py-2 text-right font-medium text-emerald-600">
                            <Amount value={p.amount} id={`income-${income.id}-history-${p.id}`} />
                          </td>
                          <td className="px-4 py-2 text-slate-500">{p.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default IncomeList;

