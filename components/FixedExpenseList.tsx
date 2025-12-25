import React, { useState, useMemo } from 'react';
import { FixedExpense, Payment } from '../types';
import { formatCurrency } from '../App';
import { generateUUID } from '../utils/uuid';
import { Trash2, History, Home, Calendar, DollarSign, X, Edit, CheckCircle2, Circle } from 'lucide-react';
import { Amount } from './AmountVisibility';

interface FixedExpenseListProps {
  fixedExpenses: FixedExpense[];
  onDeleteExpense: (id: string) => void;
  onAddPayment: (expenseId: string, payment: Payment) => void;
  onRemovePayment: (expenseId: string, paymentIds: string[]) => void;
  onUpdateExpense: (id: string, updatedExpense: Partial<FixedExpense>) => void;
}

type SortOption = 'dueDate' | 'amount' | 'name';

const FixedExpenseList: React.FC<FixedExpenseListProps> = ({ 
  fixedExpenses, 
  onDeleteExpense, 
  onAddPayment,
  onRemovePayment,
  onUpdateExpense
}) => {
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('dueDate');
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState<number>(1);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense || !amount) return;

    const newPayment: Payment = {
      id: generateUUID(),
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      note: note || 'Thanh toán chi tiêu cố định'
    };

    onAddPayment(selectedExpense, newPayment);
    setAmount('');
    setNote('');
    setSelectedExpense(null);
  };

  const handleEditClick = (expense: FixedExpense) => {
    setEditingExpense(expense);
    setEditName(expense.name);
    setEditAmount(expense.amount.toString());
    setEditDueDate(expense.dueDate);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    onUpdateExpense(editingExpense.id, {
      name: editName,
      amount: parseFloat(editAmount) || 0,
      dueDate: editDueDate
    });

    setEditingExpense(null);
    setEditName('');
    setEditAmount('');
    setEditDueDate(1);
  };

  // Kiểm tra xem tháng hiện tại đã được thanh toán chưa
  const isCurrentMonthPaid = (expense: FixedExpense): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const currentMonthPayments = expense.payments.filter(p => {
      const paymentDate = new Date(p.date);
      return paymentDate.getFullYear() === currentYear && 
             paymentDate.getMonth() === currentMonth;
    });
    
    return currentMonthPayments.length > 0;
  };

  // Kiểm tra xem có quá hạn không
  const isOverdue = (expense: FixedExpense): boolean => {
    const now = new Date();
    const currentDay = now.getDate();
    
    if (isCurrentMonthPaid(expense)) return false;
    
    return currentDay > expense.dueDate;
  };

  // Sắp xếp chi tiêu
  const sortedExpenses = useMemo(() => {
    const sorted = [...fixedExpenses];
    const sortFn = (a: FixedExpense, b: FixedExpense) => {
      if (sortBy === 'amount') {
        return b.amount - a.amount;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return a.dueDate - b.dueDate;
      }
    };
    return sorted.sort(sortFn);
  }, [fixedExpenses, sortBy]);

  // Handle ESC key to close modals
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedExpense) setSelectedExpense(null);
        if (editingExpense) setEditingExpense(null);
        if (showHistory) setShowHistory(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedExpense, editingExpense, showHistory]);

  const renderExpenseRow = (expense: FixedExpense) => {
    const isPaid = isCurrentMonthPaid(expense);
    const overdue = isOverdue(expense);

    return (
      <div
        key={expense.id}
        onClick={() => setShowHistory(expense.id)}
        className={`bg-white border-b transition-colors ${
          overdue
            ? 'border-red-200 bg-red-50/30 hover:bg-red-50/50'
            : 'border-slate-100 hover:bg-slate-50'
        } cursor-pointer`}
      >
        {/* Dòng 1: Thông tin chính */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
          {/* Tên chi tiêu */}
          <div className="col-span-12 md:col-span-4 flex items-center gap-3">
            <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600">
              <Home size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900 truncate">{expense.name}</div>
            </div>
          </div>

          {/* Số tiền */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Số tiền</div>
            <div className="font-semibold text-slate-900">
              <Amount value={expense.amount} id={`expense-${expense.id}-amount`} />
            </div>
          </div>

          {/* Ngày đến hạn */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ngày đến hạn</div>
            <div className="font-semibold text-slate-900">Ngày {expense.dueDate}</div>
          </div>

          {/* Trạng thái */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trạng thái</div>
            <div className={`font-semibold ${isPaid ? 'text-emerald-600' : overdue ? 'text-red-600' : 'text-slate-600'}`}>
              {isPaid ? 'Đã trả' : overdue ? 'Quá hạn' : 'Chưa trả'}
            </div>
          </div>

          {/* Actions */}
          <div className="col-span-6 md:col-span-2 flex flex-wrap items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isPaid) {
                  // Tự động thanh toán với số tiền cố định
                  if (window.confirm(`Xác nhận thanh toán ${formatCurrency(expense.amount)} cho "${expense.name}"?`)) {
                    const newPayment: Payment = {
                      id: generateUUID(),
                      date: new Date().toISOString(),
                      amount: expense.amount,
                      note: `Thanh toán tháng ${new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`
                    };
                    onAddPayment(expense.id, newPayment);
                  }
                } else {
                  // Xóa payment của tháng hiện tại
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth();
                  const currentMonthPayments = expense.payments.filter(p => {
                    const paymentDate = new Date(p.date);
                    return paymentDate.getFullYear() === currentYear && 
                           paymentDate.getMonth() === currentMonth;
                  });
                  const paymentIds = currentMonthPayments.map(p => p.id);
                  onRemovePayment(expense.id, paymentIds);
                }
              }}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium flex items-center gap-1 ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : overdue
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
              title={isPaid ? 'Hủy thanh toán' : 'Thanh toán'}
            >
              {isPaid ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              {isPaid ? 'Đã trả' : 'Trả'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(expense);
              }}
              className="p-1.5 text-slate-600 hover:bg-purple-50 hover:text-purple-600 rounded transition-colors"
              title="Chỉnh sửa"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(showHistory === expense.id ? null : expense.id);
              }}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Lịch sử"
            >
              <History size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteExpense(expense.id);
              }}
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
        <h2 className="text-xl font-bold text-slate-800">Chi tiêu cố định hàng tháng</h2>
        
        {/* Sort Controls */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <button 
            onClick={() => setSortBy('dueDate')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'dueDate' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calendar size={14} /> Ngày đến hạn
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
            <Home size={14} /> Tên A-Z
          </button>
        </div>
      </div>

      {fixedExpenses.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">Bạn chưa có chi tiêu cố định nào.</p>
        </div>
      )}

      {sortedExpenses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Chi tiêu</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Số tiền</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Ngày đến hạn</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Trạng thái</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
          </div>
          {/* Body */}
          <div className="divide-y divide-slate-100">
            {sortedExpenses.map(renderExpenseRow)}
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in"
          onClick={() => setEditingExpense(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Chỉnh sửa chi tiêu cố định</h2>
              <button onClick={() => setEditingExpense(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên chi tiêu
                </label>
                <input required type="text" placeholder="VD: Tiền thuê nhà" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Số tiền hàng tháng (VNĐ)
                </label>
                <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày thanh toán hàng tháng</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  value={editDueDate}
                  onChange={e => setEditDueDate(parseInt(e.target.value))}
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Ngày {d}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-transform active:scale-95 shadow-lg shadow-purple-200">
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (() => {
        const expense = fixedExpenses.find(e => e.id === showHistory);
        if (!expense) return null;
        const totalPaid = expense.payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, expense.amount - totalPaid);
        return (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0"
            onClick={() => setShowHistory(null)}
          >
            <div 
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-scale-up max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-slate-800">Lịch sử thanh toán - {expense.name}</h2>
                <button onClick={() => setShowHistory(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Số tiền mỗi kỳ</p>
                    <p className="text-lg font-semibold text-slate-900">
                      <Amount value={expense.amount} id={`expense-${expense.id}-history-amount`} />
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Đã trả</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      <Amount value={totalPaid} id={`expense-${expense.id}-history-paid`} />
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Còn lại (kỳ này)</p>
                    <p className="text-lg font-semibold text-rose-600">
                      <Amount value={remaining} id={`expense-${expense.id}-history-remaining`} />
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                  <span>Ngày đến hạn: <span className="font-semibold text-slate-800">Ngày {expense.dueDate}</span></span>
                </div>

                {expense.payments.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Chưa có lịch sử thanh toán</p>
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
                      {expense.payments.slice().reverse().map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-600">{new Date(p.date).toLocaleDateString('vi-VN')}</td>
                          <td className="px-4 py-2 text-right font-medium text-purple-600">
                            <Amount value={p.amount} id={`expense-${expense.id}-history-${p.id}`} />
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

export default FixedExpenseList;

