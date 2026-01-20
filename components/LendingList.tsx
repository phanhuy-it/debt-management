import React, { useState, useMemo, useEffect } from 'react';
import { Lending, LoanStatus, Payment } from '../types';
import { formatCurrency } from '../App';
import { generateUUID } from '../utils/uuid';
import { Plus, Trash2, History, HandCoins, Calendar, DollarSign, Clock, ArrowDownWideNarrow, ArrowUp01, TrendingDown, X, CheckCircle2, Circle, AlertTriangle, Archive, CheckCheck, Edit } from 'lucide-react';
import { Amount } from './AmountVisibility';

interface LendingListProps {
  lendings: Lending[];
  onDeleteLending: (id: string) => void;
  onAddPayment: (lendingId: string, payment: Payment) => void;
  onRemovePayment: (lendingId: string, paymentIds: string[]) => void;
  onAddLendingAmount: (lendingId: string, amount: number, note?: string) => void;
  onUpdateLending: (id: string, updatedLending: Partial<Lending>) => void;
}

type SortOption = 'date' | 'amount';
type StatusFilter = 'ACTIVE' | 'COMPLETED' | 'ALL';
type LendingTab = 'INSTALLMENT' | 'OTHER';

const LendingList: React.FC<LendingListProps> = ({ 
  lendings, 
  onDeleteLending, 
  onAddPayment, 
  onRemovePayment, 
  onAddLendingAmount, 
  onUpdateLending 
}) => {
  const [selectedLending, setSelectedLending] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem('lending_sort_by');
      return saved === 'amount' || saved === 'date' ? saved : 'date';
    } catch {
      return 'date';
    }
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [activeTab, setActiveTab] = useState<LendingTab>('INSTALLMENT');
  const [lendingToAdd, setLendingToAdd] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [addNote, setAddNote] = useState('');
  const [editingLending, setEditingLending] = useState<Lending | null>(null);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editOriginalAmount, setEditOriginalAmount] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editMonthlyPayment, setEditMonthlyPayment] = useState('');
  const [editMonthlyDueDate, setEditMonthlyDueDate] = useState<number>(1);
  const [editTermMonths, setEditTermMonths] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('lending_sort_by', sortBy);
    } catch {
      // ignore
    }
  }, [sortBy]);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLending || !amount) return;

    const newPayment: Payment = {
      id: generateUUID(),
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      note: note || 'Nhận tiền trả'
    };

    onAddPayment(selectedLending, newPayment);
    setAmount('');
    setNote('');
    setSelectedLending(null);
  };

  const handleAddAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lendingToAdd || !addAmount) return;

    const additionalAmount = parseFloat(addAmount);
    if (additionalAmount <= 0) {
      alert('Số tiền cho vay thêm phải lớn hơn 0');
      return;
    }

    onAddLendingAmount(lendingToAdd, additionalAmount, addNote || undefined);
    setAddAmount('');
    setAddNote('');
    setLendingToAdd(null);
  };

  const handleMarkAsCompleted = (lendingId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn đánh dấu khoản cho vay này đã hoàn thành? Khoản cho vay sẽ được chuyển vào lịch sử.')) {
      onUpdateLending(lendingId, { status: LoanStatus.COMPLETED });
    }
  };

  const handleRestoreLending = (lendingId: string) => {
    if (window.confirm('Bạn có muốn khôi phục khoản cho vay này về danh sách đang hoạt động không?')) {
      onUpdateLending(lendingId, { status: LoanStatus.ACTIVE });
    }
  };

  const handleEditClick = (lending: Lending) => {
    setEditingLending(lending);
    setEditName(lending.name);
    setEditOriginalAmount(lending.originalAmount.toString());
    setEditStartDate(lending.startDate.split('T')[0]);
    setEditMonthlyPayment(lending.monthlyPayment?.toString() || '');
    setEditMonthlyDueDate(lending.monthlyDueDate || 1);
    setEditTermMonths(lending.termMonths?.toString() || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLending) return;

    onUpdateLending(editingLending.id, {
      name: editName,
      borrower: editName, // Tự động set borrower = name
      originalAmount: parseFloat(editOriginalAmount) || 0,
      startDate: editStartDate || new Date().toISOString(),
      monthlyPayment: editMonthlyPayment ? parseFloat(editMonthlyPayment) : undefined,
      monthlyDueDate: editMonthlyPayment ? editMonthlyDueDate : undefined,
      termMonths: editTermMonths ? parseInt(editTermMonths) : undefined
    });

    setEditingLending(null);
    setEditName('');
    setEditOriginalAmount('');
    setEditStartDate('');
    setEditMonthlyPayment('');
    setEditMonthlyDueDate(1);
    setEditTermMonths('');
  };

  const getProgress = (lending: Lending) => {
    const received = lending.payments
      .filter(p => !p.id.startsWith('lend-'))
      .reduce((sum, p) => sum + p.amount, 0);
    const total = lending.originalAmount > 0 ? lending.originalAmount : 1;
    const percent = Math.min(100, (received / total) * 100);
    return { received, remaining: Math.max(0, lending.originalAmount - received), percent };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Handle ESC key to close modals
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedLending) setSelectedLending(null);
        if (lendingToAdd) setLendingToAdd(null);
        if (editingLending) setEditingLending(null);
        if (showHistory) setShowHistory(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedLending, lendingToAdd, editingLending, showHistory]);

  // Kiểm tra xem tháng hiện tại đã được nhận tiền chưa
  const isCurrentMonthReceived = (lending: Lending): boolean => {
    if (!lending.monthlyPayment || lending.monthlyPayment === 0) return false;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const currentMonthPayments = lending.payments.filter(p => {
      const isLend = p.id.startsWith('lend-');
      if (isLend) return false;
      const paymentDate = new Date(p.date);
      return paymentDate.getFullYear() === currentYear && 
             paymentDate.getMonth() === currentMonth;
    });
    
    return currentMonthPayments.length > 0;
  };

  // Kiểm tra xem khoản cho vay có quá hạn không
  const isOverdue = (lending: Lending): boolean => {
    if (!lending.monthlyPayment || lending.monthlyPayment === 0 || !lending.monthlyDueDate) return false;
    
    const now = new Date();
    const currentDay = now.getDate();
    
    if (isCurrentMonthReceived(lending)) return false;
    
    return currentDay > lending.monthlyDueDate;
  };

  // Toggle trạng thái nhận tiền tháng hiện tại
  const toggleCurrentMonthPayment = (lending: Lending) => {
    if (!lending.monthlyPayment || lending.monthlyPayment === 0) return;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const isReceived = isCurrentMonthReceived(lending);
    
    if (isReceived) {
      const currentMonthPayments = lending.payments.filter(p => {
        const isLend = p.id.startsWith('lend-');
        if (isLend) return false;
        const paymentDate = new Date(p.date);
        return paymentDate.getFullYear() === currentYear && 
               paymentDate.getMonth() === currentMonth;
      });
      
      const paymentIds = currentMonthPayments.map(p => p.id);
      onRemovePayment(lending.id, paymentIds);
    } else {
      const newPayment: Payment = {
        id: generateUUID(),
        date: new Date().toISOString(),
        amount: lending.monthlyPayment,
        note: `Nhận tiền hàng tháng - ${now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`
      };
      onAddPayment(lending.id, newPayment);
    }
  };

  // Phân loại và Sắp xếp
  const { installmentLendings, otherLendings } = useMemo(() => {
    let filtered = lendings;
    
    if (statusFilter === 'ACTIVE') {
      filtered = lendings.filter(l => l.status === LoanStatus.ACTIVE);
    } else if (statusFilter === 'COMPLETED') {
      filtered = lendings.filter(l => l.status === LoanStatus.COMPLETED);
    }

    // Phân loại: trả góp (có monthlyPayment) và không trả góp
    const installment = filtered.filter(l => l.monthlyPayment && l.monthlyPayment > 0);
    const other = filtered.filter(l => !l.monthlyPayment || l.monthlyPayment === 0);

    const sortFn = (a: Lending, b: Lending) => {
      if (sortBy === 'amount') {
        return b.originalAmount - a.originalAmount;
      } else {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
    };

    return {
      installmentLendings: installment.sort(sortFn),
      otherLendings: other.sort(sortFn)
    };
  }, [lendings, sortBy, statusFilter]);

  // Set tab mặc định dựa trên loại khoản cho vay có sẵn
  React.useEffect(() => {
    if (statusFilter === 'COMPLETED') return; // Không tự động chuyển tab khi xem lịch sử
    if (installmentLendings.length > 0 && activeTab === 'INSTALLMENT') return;
    if (otherLendings.length > 0 && activeTab === 'OTHER') return;
    if (installmentLendings.length > 0) {
      setActiveTab('INSTALLMENT');
    } else if (otherLendings.length > 0) {
      setActiveTab('OTHER');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installmentLendings.length, otherLendings.length, statusFilter]);

  const completedLendings = useMemo(() => {
    const allCompleted = [...installmentLendings, ...otherLendings].filter(l => l.status === LoanStatus.COMPLETED);
    return allCompleted.sort((a, b) => {
      const aLastPayment = a.payments.length > 0 ? new Date(a.payments[a.payments.length - 1].date).getTime() : 0;
      const bLastPayment = b.payments.length > 0 ? new Date(b.payments[b.payments.length - 1].date).getTime() : 0;
      return bLastPayment - aLastPayment;
    });
  }, [installmentLendings, otherLendings]);

  const renderLendingRow = (lending: Lending) => {
    const { received, remaining, percent } = getProgress(lending);
    const isPayOpen = selectedLending === lending.id;
    const isAddOpen = lendingToAdd === lending.id;
    const isHistoryOpen = showHistory === lending.id;

    return (
      <div
        key={lending.id}
        onClick={() => setShowHistory(lending.id)}
        className={`bg-white border-b transition-colors ${
          isOverdue(lending) 
            ? 'border-orange-200 bg-orange-50/30 hover:bg-orange-50/50' 
            : 'border-slate-100 hover:bg-slate-50'
        } cursor-pointer`}
      >
        {/* Dòng 1: Thông tin chính */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
          {/* Tên người vay */}
          <div className="col-span-12 md:col-span-4 flex items-center gap-3">
            <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600">
              <HandCoins size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900 truncate">{lending.name}</div>
              <div className="text-sm text-slate-500 truncate">{lending.borrower}</div>
            </div>
          </div>

          {/* Tổng tiền cho vay */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tổng cho vay</div>
            <div className="font-semibold text-slate-900">
              <Amount value={lending.originalAmount} id={`lending-${lending.id}-original`} />
            </div>
          </div>

          {/* Đã nhận */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Đã nhận</div>
            <div className="text-emerald-600 font-semibold">
              <Amount value={received} id={`lending-${lending.id}-received`} />
            </div>
          </div>

          {/* Còn lại */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Còn lại</div>
            <div className="font-semibold text-amber-600">
              <Amount value={remaining} id={`lending-${lending.id}-remaining`} />
            </div>
          </div>

          {/* Actions */}
          <div className="col-span-6 md:col-span-2 flex flex-wrap items-center justify-end gap-1">
            {lending.monthlyPayment && lending.monthlyPayment > 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Xác nhận nhận ${formatCurrency(lending.monthlyPayment)} từ "${lending.name}"?`)) {
                    const newPayment: Payment = {
                      id: generateUUID(),
                      date: new Date().toISOString(),
                      amount: lending.monthlyPayment,
                      note: `Nhận tiền hàng tháng - ${new Date().toLocaleDateString('vi-VN')}`
                    };
                    onAddPayment(lending.id, newPayment);
                  }
                }}
                className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors font-medium flex items-center gap-1"
                title={`Nhận ${formatCurrency(lending.monthlyPayment)}`}
              >
                <Plus size={14} /> Nhận
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLending(isPayOpen ? null : lending.id);
                  setLendingToAdd(null);
                }}
                className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors font-medium flex items-center gap-1"
                title="Nhận tiền trả"
              >
                <Plus size={14} /> Nhận
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLendingToAdd(isAddOpen ? null : lending.id);
                setSelectedLending(null);
              }}
              className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors font-medium flex items-center gap-1"
              title="Cho vay thêm"
            >
              <TrendingDown size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(lending);
              }}
              className="p-1.5 text-slate-600 hover:bg-amber-50 hover:text-amber-600 rounded transition-colors"
              title="Chỉnh sửa"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(isHistoryOpen ? null : lending.id);
              }}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Lịch sử"
            >
              <History size={16} />
            </button>
            {lending.status === LoanStatus.ACTIVE && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const { remaining } = getProgress(lending);
                  if (remaining > 0) {
                    if (window.confirm(`Khoản cho vay này còn ${formatCurrency(remaining)} chưa trả. Bạn vẫn muốn đánh dấu là đã hoàn thành?`)) {
                      handleMarkAsCompleted(lending.id);
                    }
                  } else {
                    handleMarkAsCompleted(lending.id);
                  }
                }}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                title="Đánh dấu đã hoàn thành"
              >
                <CheckCheck size={16} />
              </button>
            )}
            {lending.status === LoanStatus.COMPLETED && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestoreLending(lending.id);
                }}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Khôi phục"
              >
                <Archive size={16} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLending(lending.id);
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
          <div className="col-span-12 md:col-span-7 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              <span>Ngày cho vay: <span className="font-semibold text-slate-800">{formatDate(lending.startDate)}</span></span>
            </div>
            {lending.monthlyPayment && lending.monthlyPayment > 0 && (
              <>
                {lending.monthlyDueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span>Ngày nhận: <span className="font-semibold text-slate-800">Ngày {lending.monthlyDueDate}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-slate-400" />
                  <span>Số tiền: <span className="font-semibold text-slate-800"><Amount value={lending.monthlyPayment} id={`lending-${lending.id}-monthly`} /></span></span>
                </div>
                {/* Nút trạng thái nhận tiền tháng hiện tại */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCurrentMonthPayment(lending);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isCurrentMonthReceived(lending)
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : isOverdue(lending)
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isCurrentMonthReceived(lending) ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Đã nhận tháng này</span>
                    </>
                  ) : (
                    <>
                      <Circle size={14} />
                      <span className={isOverdue(lending) ? 'font-semibold' : ''}>
                        {isOverdue(lending) ? 'Quá hạn - Chưa nhận' : 'Chưa nhận tháng này'}
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Tiến độ */}
          <div className="col-span-12 md:col-span-5">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div 
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium min-w-[3rem] text-right">
                {Math.round(percent)}%
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
        <h2 className="text-xl font-bold text-slate-800">Quản lý cho vay</h2>
        
        {/* Sort Controls */}
        {statusFilter !== 'COMPLETED' && (
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
             <button 
                onClick={() => setSortBy('date')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'date' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <ArrowUp01 size={14} /> Ngày cho vay
             </button>
             <button 
                onClick={() => setSortBy('amount')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'amount' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <ArrowDownWideNarrow size={14} /> Số tiền lớn nhất
             </button>
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={() => setStatusFilter('ACTIVE')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            statusFilter === 'ACTIVE'
              ? 'bg-emerald-50 text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 size={18} />
          <span>Đang hoạt động</span>
          {lendings.filter(l => l.status === LoanStatus.ACTIVE).length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-200 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {lendings.filter(l => l.status === LoanStatus.ACTIVE).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setStatusFilter('COMPLETED')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            statusFilter === 'COMPLETED'
              ? 'bg-slate-100 text-slate-800 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Archive size={18} />
          <span>Lịch sử</span>
          {lendings.filter(l => l.status === LoanStatus.COMPLETED).length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              statusFilter === 'COMPLETED'
                ? 'bg-slate-200 text-slate-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {lendings.filter(l => l.status === LoanStatus.COMPLETED).length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Navigation - Only show for active loans */}
      {statusFilter !== 'COMPLETED' && (
        <>
          {/* Tổng số tiền cho vay theo loại */}
          {(installmentLendings.length > 0 || otherLendings.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {installmentLendings.length > 0 && (() => {
                const totalInstallmentAmount = installmentLendings.reduce((sum, lending) => {
                  return sum + lending.originalAmount;
                }, 0);
                return (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-blue-600" />
                        <span className="text-sm font-medium text-slate-600">Tổng số tiền cho vay - Trả góp</span>
                      </div>
                      <span className="text-xl font-bold text-amber-600">
                        <Amount value={totalInstallmentAmount} id="total-installment-lending" />
                      </span>
                    </div>
                  </div>
                );
              })()}
              
              {otherLendings.length > 0 && (() => {
                const totalOtherAmount = otherLendings.reduce((sum, lending) => {
                  return sum + lending.originalAmount;
                }, 0);
                return (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HandCoins size={20} className="text-purple-600" />
                        <span className="text-sm font-medium text-slate-600">Tổng số tiền cho vay - Khác</span>
                      </div>
                      <span className="text-xl font-bold text-amber-600">
                        <Amount value={totalOtherAmount} id="total-other-lending" />
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          
          <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setActiveTab('INSTALLMENT')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'INSTALLMENT'
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar size={18} />
              <span>Trả góp</span>
              {installmentLendings.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === 'INSTALLMENT'
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {installmentLendings.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('OTHER')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'OTHER'
                  ? 'bg-purple-50 text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <HandCoins size={18} />
              <span>Khác</span>
              {otherLendings.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === 'OTHER'
                    ? 'bg-purple-200 text-purple-800'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {otherLendings.length}
                </span>
              )}
            </button>
          </div>
        </>
      )}

      {/* Completed Lendings Section */}
      {statusFilter === 'COMPLETED' && (
        <>
          {completedLendings.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Bạn chưa có khoản cho vay nào đã hoàn thành.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
                <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoản cho vay đã hoàn thành</div>
                <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Tổng cho vay</div>
                <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Đã nhận</div>
                <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Còn lại</div>
                <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
              </div>
              <div className="divide-y divide-slate-100">
                {completedLendings.map(lending => {
                  const { received } = getProgress(lending);
                  return (
                    <div
                      key={lending.id}
                      onClick={() => setShowHistory(lending.id)}
                      className="bg-white border-b border-slate-100 hover:bg-slate-50 cursor-pointer opacity-75"
                    >
                      <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                        <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                          <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600">
                            <HandCoins size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 truncate">{lending.name}</div>
                            <div className="text-sm text-slate-500 truncate">{lending.borrower}</div>
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-2 text-right">
                          <div className="font-semibold text-slate-900">
                            <Amount value={lending.originalAmount} id={`completed-lending-${lending.id}-original`} />
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-2 text-right">
                          <div className="text-emerald-600 font-semibold">
                            <Amount value={received} id={`completed-lending-${lending.id}-received`} />
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-2 text-right">
                          <div className="font-semibold text-amber-600">
                            <Amount value={lending.originalAmount - received} id={`completed-lending-${lending.id}-remaining`} />
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-2 flex flex-wrap items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowHistory(showHistory === lending.id ? null : lending.id);
                            }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title="Lịch sử"
                          >
                            <History size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreLending(lending.id);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Khôi phục"
                          >
                            <Archive size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLending(lending.id);
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
                })}
              </div>
            </div>
          )}
        </>
      )}

      {statusFilter !== 'COMPLETED' && installmentLendings.length === 0 && otherLendings.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">Bạn chưa có khoản cho vay nào.</p>
        </div>
      )}

      {/* INSTALLMENT SECTION */}
      {statusFilter !== 'COMPLETED' && activeTab === 'INSTALLMENT' && installmentLendings.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoản cho vay</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Tổng cho vay</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Đã nhận</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Còn lại</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
          </div>
          <div className="divide-y divide-slate-100">
            {installmentLendings.map(renderLendingRow)}
          </div>
        </div>
      )}

      {/* OTHER SECTION */}
      {statusFilter !== 'COMPLETED' && activeTab === 'OTHER' && otherLendings.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoản cho vay</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Tổng cho vay</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Đã nhận</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Còn lại</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
          </div>
          <div className="divide-y divide-slate-100">
            {otherLendings.map(renderLendingRow)}
          </div>
        </div>
      )}

      {/* Empty state for current tab */}
      {statusFilter !== 'COMPLETED' && (installmentLendings.length > 0 || otherLendings.length > 0) && (
        <>
          {activeTab === 'INSTALLMENT' && installmentLendings.length === 0 && (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Bạn chưa có khoản cho vay trả góp nào.</p>
            </div>
          )}
          {activeTab === 'OTHER' && otherLendings.length === 0 && (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Bạn chưa có khoản cho vay khác nào.</p>
            </div>
          )}
        </>
      )}

      {/* Payment Modal */}
      {selectedLending && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0"
          onClick={() => setSelectedLending(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800">Nhận tiền trả</h2>
              <button onClick={() => setSelectedLending(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Số tiền đã nhận (VNĐ)</label>
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
                <button type="button" onClick={() => setSelectedLending(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium">Xác nhận đã nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Amount Modal */}
      {lendingToAdd && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0"
          onClick={() => setLendingToAdd(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800">Cho vay thêm</h2>
              <button onClick={() => setLendingToAdd(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddAmountSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Số tiền cho vay thêm (VNĐ)</label>
                <input
                  type="number"
                  placeholder="Nhập số tiền"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                  required
                  min="1000"
                  step="1000"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ghi chú"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              {addAmount && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  💡 Tổng số tiền cho vay sẽ tăng thêm <Amount value={parseFloat(addAmount) || 0} id={`lending-${lendingToAdd}-add-preview`} />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setLendingToAdd(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 font-medium">Xác nhận cho vay thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lending Modal */}
      {editingLending && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in"
          onClick={() => setEditingLending(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Chỉnh sửa khoản cho vay</h2>
              <button onClick={() => setEditingLending(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên người vay
                </label>
                <input required type="text" placeholder="VD: Anh Ba, Chị Tư" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tổng số tiền cho vay (VNĐ)
                </label>
                <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={editOriginalAmount} onChange={e => setEditOriginalAmount(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày cho vay</label>
                <input required type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800 mb-2">Tùy chọn: Cho vay có kỳ hạn</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Số tiền nhận hàng tháng (VNĐ) - Tùy chọn
                    </label>
                    <input type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={editMonthlyPayment} onChange={e => setEditMonthlyPayment(e.target.value)} />
                  </div>
                  {editMonthlyPayment && parseFloat(editMonthlyPayment) > 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ngày nhận tiền hàng tháng</label>
                        <select 
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                          value={editMonthlyDueDate}
                          onChange={e => setEditMonthlyDueDate(parseInt(e.target.value))}
                        >
                          {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>Ngày {d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Tổng số tháng - Tùy chọn
                        </label>
                        <input type="number" min="1" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={editTermMonths} onChange={e => setEditTermMonths(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button type="submit" className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-transform active:scale-95 shadow-lg shadow-amber-200">
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (() => {
        const lending = lendings.find(l => l.id === showHistory);
        if (!lending) return null;
        const { received, remaining } = getProgress(lending);
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
                <h2 className="font-bold text-lg text-slate-800">Lịch sử giao dịch - {lending.name}</h2>
                <button onClick={() => setShowHistory(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Tổng cho vay</p>
                    <p className="text-lg font-semibold text-slate-900">
                      <Amount value={lending.originalAmount} id={`lending-${lending.id}-history-original`} />
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Đã nhận</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      <Amount value={received} id={`lending-${lending.id}-history-received`} />
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Còn lại</p>
                    <p className="text-lg font-semibold text-amber-600">
                      <Amount value={remaining} id={`lending-${lending.id}-history-remaining`} />
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                  <span>Người vay: <span className="font-semibold text-slate-800">{lending.borrower}</span></span>
                  <span>Ngày cho vay: <span className="font-semibold text-slate-800">{formatDate(lending.startDate)}</span></span>
                  {lending.monthlyPayment && lending.monthlyPayment > 0 && (
                    <span>Nhận hàng tháng: <span className="font-semibold text-slate-800"><Amount value={lending.monthlyPayment} id={`lending-${lending.id}-history-monthly`} /></span></span>
                  )}
                </div>

                {lending.payments.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Chưa có lịch sử giao dịch</p>
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
                      {lending.payments.slice().reverse().map(p => {
                        const isLend = p.id.startsWith('lend-');
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-600">{new Date(p.date).toLocaleDateString('vi-VN')}</td>
                            <td className="px-4 py-2">
                              {isLend ? (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Cho vay thêm</span>
                              ) : (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded inline-block text-center">Nhận tiền</span>
                              )}
                            </td>
                            <td className={`px-4 py-2 text-right font-medium ${isLend ? 'text-amber-600' : 'text-emerald-600'}`}>
                              <span className="inline-flex items-center gap-1">
                                <span>{isLend ? '+' : '-'}</span>
                                <Amount value={p.amount} id={`lending-${lending.id}-history-${p.id}`} />
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

export default LendingList;


