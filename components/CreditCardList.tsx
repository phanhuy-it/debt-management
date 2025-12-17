import React, { useState, useMemo } from 'react';
import { CreditCard, Payment } from '../types';
import { formatCurrency } from '../App';
import { generateUUID } from '../utils/uuid';
import { Trash2, History, CreditCard as CreditCardIcon, Calendar, DollarSign, TrendingDown, X, AlertTriangle, Edit } from 'lucide-react';
import { Amount } from './AmountVisibility';

interface CreditCardListProps {
  creditCards: CreditCard[];
  onDeleteCard: (id: string) => void;
  onAddPayment: (cardId: string, payment: Payment) => void;
  onRemovePayment: (cardId: string, paymentIds: string[]) => void;
  onUpdateCard: (id: string, updatedCard: Partial<CreditCard>) => void;
}

type SortOption = 'dueDate' | 'debt' | 'limit';

const CreditCardList: React.FC<CreditCardListProps> = ({ 
  creditCards, 
  onDeleteCard, 
  onAddPayment,
  onRemovePayment,
  onUpdateCard
}) => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('dueDate');
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editDebt, setEditDebt] = useState('');
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState<number>(1);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard || !amount) return;

    const newPayment: Payment = {
      id: generateUUID(),
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      note: note || 'Thanh toán thẻ tín dụng'
    };

    onAddPayment(selectedCard, newPayment);
    setAmount('');
    setNote('');
    setSelectedCard(null);
  };

  const handleEditClick = (card: CreditCard) => {
    setEditingCard(card);
    setEditName(card.name);
    setEditProvider(card.provider);
    setEditLimit(card.creditLimit.toString());
    setEditDebt(card.totalDebt.toString());
    setEditPaymentAmount(card.paymentAmount.toString());
    setEditDueDate(card.dueDate);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    onUpdateCard(editingCard.id, {
      name: editName,
      provider: editProvider,
      creditLimit: parseFloat(editLimit) || 0,
      totalDebt: parseFloat(editDebt) || 0,
      paymentAmount: parseFloat(editPaymentAmount) || 0,
      dueDate: editDueDate
    });

    setEditingCard(null);
    setEditName('');
    setEditProvider('');
    setEditLimit('');
    setEditDebt('');
    setEditPaymentAmount('');
    setEditDueDate(1);
  };

  // Tính hạn mức khả dụng
  const getAvailableCredit = (card: CreditCard) => {
    return Math.max(0, card.creditLimit - card.totalDebt);
  };

  // Tính tổng đã thanh toán
  const getTotalPaid = (card: CreditCard) => {
    return card.payments
      .filter(p => !p.id.startsWith('borrow-'))
      .reduce((sum, p) => sum + p.amount, 0);
  };

  // Kiểm tra xem tháng hiện tại đã được thanh toán chưa
  const isCurrentMonthPaid = (card: CreditCard): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const currentMonthPayments = card.payments.filter(p => {
      if (p.id.startsWith('borrow-')) return false;
      const paymentDate = new Date(p.date);
      return paymentDate.getFullYear() === currentYear && 
             paymentDate.getMonth() === currentMonth;
    });
    
    return currentMonthPayments.length > 0;
  };

  // Kiểm tra xem thẻ có quá hạn không
  const isOverdue = (card: CreditCard): boolean => {
    const now = new Date();
    const currentDay = now.getDate();
    
    if (isCurrentMonthPaid(card)) return false;
    if (card.totalDebt === 0) return false;
    
    return currentDay > card.dueDate;
  };

  // Kiểm tra sắp hết hạn mức (trên 80% hạn mức)
  const isNearLimit = (card: CreditCard): boolean => {
    if (card.creditLimit === 0) return false;
    const usagePercent = (card.totalDebt / card.creditLimit) * 100;
    return usagePercent >= 80;
  };

  // Sắp xếp thẻ tín dụng
  const sortedCards = useMemo(() => {
    const sorted = [...creditCards];
    const sortFn = (a: CreditCard, b: CreditCard) => {
      if (sortBy === 'debt') {
        return b.totalDebt - a.totalDebt;
      } else if (sortBy === 'limit') {
        return b.creditLimit - a.creditLimit;
      } else {
        return a.dueDate - b.dueDate;
      }
    };
    return sorted.sort(sortFn);
  }, [creditCards, sortBy]);

  const renderCardRow = (card: CreditCard) => {
    const availableCredit = getAvailableCredit(card);
    const totalPaid = getTotalPaid(card);
    const usagePercent = card.creditLimit > 0 ? (card.totalDebt / card.creditLimit) * 100 : 0;
    const isPaid = isCurrentMonthPaid(card);
    const overdue = isOverdue(card);
    const nearLimit = isNearLimit(card);

    return (
      <div
        key={card.id}
        onClick={() => setShowHistory(card.id)}
        className={`bg-white border-b transition-colors ${
          overdue
            ? 'border-red-200 bg-red-50/30 hover:bg-red-50/50'
            : nearLimit
            ? 'border-orange-200 bg-orange-50/30 hover:bg-orange-50/50'
            : 'border-slate-100 hover:bg-slate-50'
        } cursor-pointer`}
      >
        {/* Dòng 1: Thông tin chính */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
          {/* Tên thẻ */}
          <div className="col-span-12 md:col-span-4 flex items-center gap-3">
            <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600">
              <CreditCardIcon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-slate-900 truncate">{card.name}</div>
                {overdue && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                    <AlertTriangle size={12} />
                    <span>Quá hạn</span>
                  </div>
                )}
              </div>
              <div className="text-sm text-slate-500 truncate">{card.provider}</div>
            </div>
          </div>

          {/* Hạn mức thẻ */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Hạn mức</div>
            <div className="font-semibold text-slate-900">
              <Amount value={card.creditLimit} id={`card-${card.id}-limit`} />
            </div>
          </div>

          {/* Tổng dư nợ */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dư nợ</div>
            <div className="font-semibold text-rose-600">
              <Amount value={card.totalDebt} id={`card-${card.id}-debt`} />
            </div>
          </div>

          {/* Hạn mức khả dụng */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Khả dụng</div>
            <div className={`font-semibold ${nearLimit ? 'text-orange-600' : 'text-emerald-600'}`}>
              <Amount value={availableCredit} id={`card-${card.id}-available`} />
            </div>
          </div>

          {/* Actions */}
          <div className="col-span-6 md:col-span-2 flex flex-wrap items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCard(selectedCard === card.id ? null : card.id);
              }}
              className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors font-medium flex items-center gap-1"
              title="Thanh toán"
            >
              <TrendingDown size={14} /> Trả
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(card);
              }}
              className="p-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded transition-colors"
              title="Chỉnh sửa"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(showHistory === card.id ? null : card.id);
              }}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Lịch sử"
            >
              <History size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCard(card.id);
              }}
              className="p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
              title="Xóa"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Dòng 2: Thông tin chi tiết + Tiến độ */}
        <div className="grid grid-cols-12 gap-4 px-6 pb-4 items-center">
          {/* Thông tin chi tiết */}
          <div className="col-span-12 md:col-span-6 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <span>Đến hạn: <span className="font-semibold text-slate-800">Ngày {card.dueDate}</span></span>
            </div>
            {card.paymentAmount > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-slate-400" />
                <span>Thanh toán tối thiểu: <span className="font-semibold text-slate-800"><Amount value={card.paymentAmount} id={`card-${card.id}-payment`} /></span></span>
              </div>
            )}
            {/* Nút trạng thái thanh toán */}
            <button
              onClick={() => {
                if (!isPaid) {
                  // Tự động thanh toán với số tiền thanh toán tối thiểu
                  if (card.paymentAmount > 0) {
                    if (window.confirm(`Xác nhận thanh toán ${formatCurrency(card.paymentAmount)} cho thẻ "${card.name}"?`)) {
                      const newPayment: Payment = {
                        id: generateUUID(),
                        date: new Date().toISOString(),
                        amount: card.paymentAmount,
                        note: `Thanh toán tối thiểu - ${new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`
                      };
                      onAddPayment(card.id, newPayment);
                    }
                  } else {
                    setSelectedCard(card.id);
                  }
                } else {
                  // Xóa payment của tháng hiện tại
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth();
                  const currentMonthPayments = card.payments.filter(p => {
                    if (p.id.startsWith('borrow-')) return false;
                    const paymentDate = new Date(p.date);
                    return paymentDate.getFullYear() === currentYear && 
                           paymentDate.getMonth() === currentMonth;
                  });
                  const paymentIds = currentMonthPayments.map(p => p.id);
                  onRemovePayment(card.id, paymentIds);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : overdue
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isPaid ? (
                <>
                  <span>✓ Đã trả tháng này</span>
                </>
              ) : (
                <>
                  <span className={overdue ? 'font-semibold' : ''}>
                    {overdue ? '⚠ Quá hạn - Chưa trả' : '○ Chưa trả tháng này'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Tiến độ sử dụng hạn mức */}
          <div className="col-span-12 md:col-span-6">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      nearLimit ? 'bg-orange-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, usagePercent)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium min-w-[3rem] text-right">
                {Math.round(usagePercent)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">Quản lý thẻ tín dụng</h2>
        
        {/* Sort Controls */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <button 
            onClick={() => setSortBy('dueDate')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'dueDate' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calendar size={14} /> Ngày đến hạn
          </button>
          <button 
            onClick={() => setSortBy('debt')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'debt' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <DollarSign size={14} /> Dư nợ cao nhất
          </button>
          <button 
            onClick={() => setSortBy('limit')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'limit' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <CreditCardIcon size={14} /> Hạn mức lớn nhất
          </button>
        </div>
      </div>

      {creditCards.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">Bạn chưa có thẻ tín dụng nào.</p>
        </div>
      )}

      {sortedCards.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Thẻ tín dụng</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Hạn mức</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Tổng dư nợ</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Khả dụng</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
          </div>
          {/* Body */}
          <div className="divide-y divide-slate-100">
            {sortedCards.map(renderCardRow)}
          </div>
        </div>
      )}

      {/* Payment Modal */}
        {selectedCard && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 modal-top-0">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800">Thanh toán thẻ tín dụng</h2>
              <button onClick={() => setSelectedCard(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Số tiền thanh toán (VNĐ)</label>
                <input
                  type="number"
                  placeholder="Nhập số tiền"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  required
                  min="1000"
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
                <button type="button" onClick={() => setSelectedCard(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium">Xác nhận thanh toán</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
        {editingCard && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in modal-top-0">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Chỉnh sửa thẻ tín dụng</h2>
              <button onClick={() => setEditingCard(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên thẻ
                </label>
                <input required type="text" placeholder="VD: Thẻ vàng Visa" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ngân hàng phát hành
                </label>
                <input required type="text" placeholder="VD: Vietcombank" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editProvider} onChange={e => setEditProvider(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hạn mức thẻ (VNĐ)
                </label>
                <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editLimit} onChange={e => setEditLimit(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tổng dư nợ hiện tại (VNĐ)
                </label>
                <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editDebt} onChange={e => setEditDebt(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Khoản thanh toán tối thiểu hàng tháng (VNĐ) - Tùy chọn
                </label>
                <input type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={editPaymentAmount} onChange={e => setEditPaymentAmount(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày đến hạn thanh toán hàng tháng</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  value={editDueDate}
                  onChange={e => setEditDueDate(parseInt(e.target.value))}
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Ngày {d}</option>
                  ))}
                </select>
              </div>

              {editLimit && editDebt && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <div className="text-sm text-indigo-800">
                    <div className="font-semibold mb-1">Thông tin tính toán:</div>
                    <div>Hạn mức khả dụng: <span className="font-bold"><Amount value={Math.max(0, parseFloat(editLimit) - parseFloat(editDebt))} id="card-edit-available-preview" /></span></div>
                    {parseFloat(editLimit) > 0 && (
                      <div className="mt-1">Tỷ lệ sử dụng: <span className="font-bold">{Math.round((parseFloat(editDebt) / parseFloat(editLimit)) * 100)}%</span></div>
                    )}
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-transform active:scale-95 shadow-lg shadow-indigo-200">
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (() => {
        const card = creditCards.find(c => c.id === showHistory);
        if (!card) return null;
        const availableCredit = getAvailableCredit(card);
        const totalPaid = getTotalPaid(card);
        const usagePercent = card.creditLimit > 0 ? Math.round((card.totalDebt / card.creditLimit) * 100) : 0;
        return (
           <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 modal-top-0">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-scale-up max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-slate-800">Lịch sử thanh toán - {card.name}</h2>
                <button onClick={() => setShowHistory(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Hạn mức</p>
                    <p className="text-lg font-semibold text-slate-900">
                      <Amount value={card.creditLimit} id={`card-${card.id}-history-limit`} />
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Đã trả</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      <Amount value={totalPaid} id={`card-${card.id}-history-paid`} />
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Dư nợ</p>
                    <p className="text-lg font-semibold text-rose-600">
                      <Amount value={card.totalDebt} id={`card-${card.id}-history-debt`} />
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Khả dụng</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      <Amount value={availableCredit} id={`card-${card.id}-history-available`} />
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                  {card.provider && (
                    <span>Ngân hàng: <span className="font-semibold text-slate-800">{card.provider}</span></span>
                  )}
                  <span>Ngày đến hạn: <span className="font-semibold text-slate-800">Ngày {card.dueDate}</span></span>
                  <span>Thanh toán tối thiểu: <span className="font-semibold text-slate-800"><Amount value={card.paymentAmount} id={`card-${card.id}-history-min`} /></span></span>
                  {card.creditLimit > 0 && (
                    <span>Tỷ lệ sử dụng: <span className="font-semibold text-slate-800">{usagePercent}%</span></span>
                  )}
                </div>

                {card.payments.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Chưa có lịch sử thanh toán</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Ngày</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Loại</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-600">Số tiền</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {card.payments.slice().reverse().map(p => {
                        const isBorrow = p.id.startsWith('borrow-');
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-600">{new Date(p.date).toLocaleDateString('vi-VN')}</td>
                            <td className="px-4 py-2">
                              {isBorrow ? (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Chi tiêu</span>
                              ) : (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Thanh toán</span>
                              )}
                            </td>
                            <td className={`px-4 py-2 text-right font-medium ${isBorrow ? 'text-blue-600' : 'text-emerald-600'}`}>
                              <span className="inline-flex items-center gap-1">
                                <span>{isBorrow ? '+' : '-'}</span>
                                <Amount value={p.amount} id={`card-${card.id}-history-${p.id}`} />
                              </span>
                            </td>
                            <td className="px-4 py-2 text-slate-500">{p.note || '-'}</td>
                          </tr>
                        );
                      })}
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

export default CreditCardList;

