import React, { useState, useMemo } from 'react';
import { Income, Payment } from '../types';
import { formatCurrency } from '../App';
import { generateUUID } from '../utils/uuid';
import { Trash2, History, Wallet, Calendar, DollarSign, X, Edit, CheckCircle2, Circle, TrendingUp } from 'lucide-react';

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
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editReceivedDate, setEditReceivedDate] = useState<number>(1);

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

  // Kiểm tra xem tháng hiện tại đã nhận tiền chưa
  const isCurrentMonthReceived = (income: Income): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const currentMonthPayments = income.payments.filter(p => {
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
          {/* Tên nguồn thu nhập */}
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
            <div className="font-semibold text-emerald-600">{formatCurrency(income.amount)}</div>
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
                  // Xóa payment của tháng hiện tại
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth();
                  const currentMonthPayments = income.payments.filter(p => {
                    const paymentDate = new Date(p.date);
                    return paymentDate.getFullYear() === currentYear && 
                           paymentDate.getMonth() === currentMonth;
                  });
                  const paymentIds = currentMonthPayments.map(p => p.id);
                  onRemovePayment(income.id, paymentIds);
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

      {incomes.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">Bạn chưa có nguồn thu nhập nào.</p>
        </div>
      )}

      {sortedIncomes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Nguồn thu nhập</div>
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

      {/* Payment Modal */}
      {selectedIncome && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
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
                  Tên nguồn thu nhập
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
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
                            {formatCurrency(p.amount)}
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

