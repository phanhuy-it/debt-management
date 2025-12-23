import React, { useState, useMemo, useEffect } from 'react';
import { Loan, LoanType, LoanStatus, Payment } from '../types';
import { formatCurrency } from '../App';
import { generateUUID } from '../utils/uuid';
import { Plus, Trash2, History, Banknote, User, Calendar, DollarSign, Clock, ArrowUpDown, ArrowDownWideNarrow, ArrowUp01, TrendingUp, X, CheckCircle2, Circle, AlertTriangle, Edit2, Archive, CheckCheck } from 'lucide-react';
import { Amount } from './AmountVisibility';

interface LoanListProps {
  loans: Loan[];
  onDeleteLoan: (id: string) => void;
  onAddPayment: (loanId: string, payment: Payment) => void;
  onRemovePayment: (loanId: string, paymentIds: string[]) => void;
  onAddLoanAmount: (loanId: string, amount: number, note?: string) => void;
  onUpdateLoan: (id: string, updatedLoan: Partial<Loan>) => void;
}

type SortOption = 'dueDate' | 'amount';
type LoanTab = 'BANK' | 'PERSONAL';
type StatusFilter = 'ACTIVE' | 'COMPLETED' | 'ALL';

const LoanList: React.FC<LoanListProps> = ({ loans, onDeleteLoan, onAddPayment, onRemovePayment, onAddLoanAmount, onUpdateLoan }) => {
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('dueDate');
  const [activeTab, setActiveTab] = useState<LoanTab>('BANK');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [loanToBorrow, setLoanToBorrow] = useState<string | null>(null);
  const [borrowAmount, setBorrowAmount] = useState('');
  const [borrowNote, setBorrowNote] = useState('');
  const [loanToEdit, setLoanToEdit] = useState<string | null>(null);
  const [editLoanName, setEditLoanName] = useState('');

  const handleQuickPay = (loanId: string, loan: Loan) => {
    if (loan.type === LoanType.BANK && loan.monthlyPayment > 0) {
      // Xác nhận trước khi trả
      if (window.confirm(`Xác nhận trả ${formatCurrency(loan.monthlyPayment)} cho khoản vay "${loan.name}"?`)) {
        // Tự động trả với số tiền trả hàng tháng cho vay ngân hàng
        const newPayment: Payment = {
          id: generateUUID(),
          date: new Date().toISOString(),
          amount: loan.monthlyPayment,
          note: `Thanh toán hàng tháng - ${new Date().toLocaleDateString('vi-VN')}`
        };
        onAddPayment(loanId, newPayment);
      }
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !amount) return;

    // Logic: Ngày thanh toán tự động lấy ngày giờ hiện tại (now)
    const newPayment: Payment = {
      id: generateUUID(),
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      note: note || 'Thanh toán'
    };

    onAddPayment(selectedLoan, newPayment);
    setAmount('');
    setNote('');
    setSelectedLoan(null);
  };

  const handleBorrowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanToBorrow || !borrowAmount) return;

    const additionalAmount = parseFloat(borrowAmount);
    if (additionalAmount <= 0) {
      alert('Số tiền vay thêm phải lớn hơn 0');
      return;
    }

    onAddLoanAmount(loanToBorrow, additionalAmount, borrowNote || undefined);
    setBorrowAmount('');
    setBorrowNote('');
    setLoanToBorrow(null);
  };

  const handleEditLoanName = (loan: Loan) => {
    setLoanToEdit(loan.id);
    setEditLoanName(loan.name);
  };

  const handleUpdateLoanName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanToEdit || !editLoanName.trim()) return;

    onUpdateLoan(loanToEdit, { name: editLoanName.trim() });
    setLoanToEdit(null);
    setEditLoanName('');
  };

  const handleMarkAsCompleted = (loanId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn đánh dấu khoản vay này đã hoàn thành? Khoản vay sẽ được chuyển vào lịch sử.')) {
      onUpdateLoan(loanId, { status: LoanStatus.COMPLETED });
    }
  };

  const handleRestoreLoan = (loanId: string) => {
    if (window.confirm('Bạn có muốn khôi phục khoản vay này về danh sách đang hoạt động không?')) {
      onUpdateLoan(loanId, { status: LoanStatus.ACTIVE });
    }
  };

  const getProgress = (loan: Loan) => {
    // Chỉ tính các payment thực sự (loại bỏ các record vay thêm)
    // Check cả ID và note để hỗ trợ dữ liệu cũ
    const paid = loan.payments
      .filter(p => {
        const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
        return !isBorrow;
      })
      .reduce((sum, p) => sum + p.amount, 0);
    const total = loan.originalAmount > 0 ? loan.originalAmount : 1;
    const percent = Math.min(100, (paid / total) * 100);
    return { paid, remaining: Math.max(0, loan.originalAmount - paid), percent };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }

  // Tính số kỳ đã trả (chỉ cho vay ngân hàng)
  const getPaidPeriods = (loan: Loan): number => {
    if (loan.type !== LoanType.BANK || loan.monthlyPayment === 0) return 0;
    
    const { paid } = getProgress(loan);
    // Tính số kỳ đã trả = số tiền đã trả / số tiền trả hàng tháng
    return Math.floor(paid / loan.monthlyPayment);
  };

  // Tính tháng/năm tất toán dựa trên số kỳ còn lại (chỉ cho vay ngân hàng)
  const calculateFinalPaymentDate = (loan: Loan): string | null => {
    if (loan.type !== LoanType.BANK || loan.monthlyPayment === 0) return null;
    
    const { remaining } = getProgress(loan);
    if (remaining <= 0) return null;
    
    // Tính số kỳ còn lại (làm tròn lên)
    const remainingPeriods = Math.ceil(remaining / loan.monthlyPayment);
    
    // Tính ngày tất toán: từ tháng hiện tại hoặc tháng tiếp theo
    // Nếu đã trả tháng này rồi, thì bắt đầu tính từ tháng sau
    // Nếu chưa trả tháng này, thì tính từ tháng này
    const now = new Date();
    const currentMonthPaid = isCurrentMonthPaid(loan);
    const startMonth = currentMonthPaid ? now.getMonth() + 1 : now.getMonth();
    
    // Tính tháng/năm tất toán
    const finalMonth = startMonth + remainingPeriods - 1;
    const finalYear = now.getFullYear() + Math.floor(finalMonth / 12);
    const finalMonthIndex = finalMonth % 12;
    
    // Format: "Tháng X/YYYY"
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                       'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    return `${monthNames[finalMonthIndex]}/${finalYear}`;
  }

  // Kiểm tra xem tháng hiện tại đã được thanh toán chưa (chỉ cho vay ngân hàng)
  const isCurrentMonthPaid = (loan: Loan): boolean => {
    if (loan.type !== LoanType.BANK || loan.monthlyPayment === 0) return false;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Kiểm tra xem có payment nào trong tháng hiện tại không
    const currentMonthPayments = loan.payments.filter(p => {
      const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
      if (isBorrow) return false;
      const paymentDate = new Date(p.date);
      return paymentDate.getFullYear() === currentYear && 
             paymentDate.getMonth() === currentMonth;
    });
    
    return currentMonthPayments.length > 0;
  };

  // Kiểm tra xem khoản vay có quá hạn không (chỉ cho vay ngân hàng)
  const isOverdue = (loan: Loan): boolean => {
    if (loan.type !== LoanType.BANK || loan.monthlyPayment === 0) return false;
    
    const now = new Date();
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Nếu đã trả rồi thì không quá hạn
    if (isCurrentMonthPaid(loan)) return false;
    
    // Kiểm tra xem ngày hiện tại có vượt quá ngày đến hạn không
    return currentDay > loan.monthlyDueDate;
  };

  // Toggle trạng thái thanh toán tháng hiện tại
  const toggleCurrentMonthPayment = (loan: Loan) => {
    if (loan.type !== LoanType.BANK || loan.monthlyPayment === 0) return;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const isPaid = isCurrentMonthPaid(loan);
    
    if (isPaid) {
      // Xóa payment của tháng hiện tại
      const currentMonthPayments = loan.payments.filter(p => {
        const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
        if (isBorrow) return false;
        const paymentDate = new Date(p.date);
        return paymentDate.getFullYear() === currentYear && 
               paymentDate.getMonth() === currentMonth;
      });
      
      const paymentIds = currentMonthPayments.map(p => p.id);
      onRemovePayment(loan.id, paymentIds);
    } else {
      // Thêm payment cho tháng hiện tại
      const newPayment: Payment = {
        id: generateUUID(),
        date: new Date().toISOString(),
        amount: loan.monthlyPayment,
        note: `Thanh toán hàng tháng - ${now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`
      };
      onAddPayment(loan.id, newPayment);
    }
  };

  // Phân loại và Sắp xếp
  const { bankLoans, personalLoans, completedLoans } = useMemo(() => {
    // Lọc theo status
    let filteredLoans = loans;
    if (statusFilter === 'ACTIVE') {
      filteredLoans = loans.filter(l => l.status === LoanStatus.ACTIVE);
    } else if (statusFilter === 'COMPLETED') {
      filteredLoans = loans.filter(l => l.status === LoanStatus.COMPLETED);
    }
    // statusFilter === 'ALL' thì không lọc

    const bank = filteredLoans.filter(l => l.type === LoanType.BANK);
    const personal = filteredLoans.filter(l => l.type === LoanType.PERSONAL);
    const completed = filteredLoans.filter(l => l.status === LoanStatus.COMPLETED);

    const sortFn = (a: Loan, b: Loan) => {
      if (sortBy === 'amount') {
        // Sắp xếp theo số tiền gốc giảm dần
        return b.originalAmount - a.originalAmount;
      } else {
        // Sắp xếp theo ngày
        if (a.type === LoanType.BANK && b.type === LoanType.BANK) {
          // Ngân hàng: Sắp xếp theo ngày trả  hàng tháng (1-31)
          return a.monthlyDueDate - b.monthlyDueDate;
        } else {
          // Người thân: Sắp xếp theo ngày vay (Cũ nhất lên đầu)
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        }
      }
    };

    return {
      bankLoans: bank.sort(sortFn),
      personalLoans: personal.sort(sortFn),
      completedLoans: completed.sort((a, b) => {
        // Sắp xếp completed loans theo ngày hoàn thành (mới nhất trước)
        const aLastPayment = a.payments.length > 0 ? new Date(a.payments[a.payments.length - 1].date).getTime() : 0;
        const bLastPayment = b.payments.length > 0 ? new Date(b.payments[b.payments.length - 1].date).getTime() : 0;
        return bLastPayment - aLastPayment;
      })
    };
  }, [loans, sortBy, statusFilter]);

  // Set tab mặc định dựa trên loại khoản vay có sẵn
  useEffect(() => {
    if (statusFilter === 'COMPLETED') return; // Không tự động chuyển tab khi xem lịch sử
    if (bankLoans.length > 0 && activeTab === 'BANK') return;
    if (personalLoans.length > 0 && activeTab === 'PERSONAL') return;
    if (bankLoans.length > 0) {
      setActiveTab('BANK');
    } else if (personalLoans.length > 0) {
      setActiveTab('PERSONAL');
    }
  }, [bankLoans.length, personalLoans.length, activeTab, statusFilter]);

  const renderLoanRow = (loan: Loan) => {
    const { paid, remaining, percent } = getProgress(loan);
    const isPayOpen = selectedLoan === loan.id;
    const isBorrowOpen = loanToBorrow === loan.id;
    const isHistoryOpen = showHistory === loan.id;
    const finalPaymentDate = loan.type === LoanType.BANK ? calculateFinalPaymentDate(loan) : null;

    return (
      <div
        key={loan.id}
        onClick={() => setShowHistory(loan.id)}
        className={`bg-white border-b transition-colors ${
          isOverdue(loan) 
            ? 'border-red-200 bg-red-50/30 hover:bg-red-50/50' 
            : 'border-slate-100 hover:bg-slate-50'
        } ${loan.type === LoanType.PERSONAL ? 'cursor-pointer' : ''}`}
      >
        {/* Dòng 1: Thông tin chính */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
          {/* Loại + Tên */}
          <div className="col-span-12 md:col-span-4 flex items-center gap-3">
            <div className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full ${loan.type === LoanType.BANK ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
              {loan.type === LoanType.BANK ? <Banknote size={18} /> : <User size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-slate-900 truncate">{loan.name}</div>
                {loan.type === LoanType.BANK && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditLoanName(loan);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                    title="Chỉnh sửa tên khoản vay"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
              <div className="text-sm text-slate-500 truncate">{loan.provider}</div>
            </div>
          </div>

          {/* Tổng tiền gốc */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tổng gốc</div>
            <div className="font-semibold text-slate-900">
              <Amount value={loan.originalAmount} id={`loan-${loan.id}-original`} />
            </div>
          </div>

          {/* Đã trả */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Đã trả</div>
            <div className="text-emerald-600 font-semibold">
              <Amount value={paid} id={`loan-${loan.id}-paid`} />
            </div>
          </div>

          {/* Còn lại */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Còn lại</div>
            <div className="font-semibold text-rose-600">
              <Amount value={remaining} id={`loan-${loan.id}-remaining`} />
            </div>
          </div>

          {/* Actions */}
          <div className="col-span-6 md:col-span-2 flex flex-wrap items-center justify-end gap-1">
            {loan.type === LoanType.BANK ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickPay(loan.id, loan);
                }}
                className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors font-medium flex items-center gap-1"
                title={`Trả ${formatCurrency(loan.monthlyPayment)}`}
              >
                <Plus size={14} /> Trả
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLoan(isPayOpen ? null : loan.id);
                  setLoanToBorrow(null);
                }}
                className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors font-medium flex items-center gap-1"
                title="Trả nợ"
              >
                <Plus size={14} /> Trả
              </button>
            )}
            {loan.type === LoanType.PERSONAL && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLoanToBorrow(isBorrowOpen ? null : loan.id);
                  setSelectedLoan(null);
                }}
                className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium flex items-center gap-1"
                title="Vay thêm"
              >
                <TrendingUp size={14} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(isHistoryOpen ? null : loan.id);
              }}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Lịch sử"
            >
              <History size={16} />
            </button>
            {loan.status === LoanStatus.ACTIVE && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const { remaining } = getProgress(loan);
                  if (remaining > 0) {
                    if (window.confirm(`Khoản vay này còn nợ ${formatCurrency(remaining)}. Bạn vẫn muốn đánh dấu là đã hoàn thành?`)) {
                      handleMarkAsCompleted(loan.id);
                    }
                  } else {
                    handleMarkAsCompleted(loan.id);
                  }
                }}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                title="Đánh dấu đã hoàn thành"
              >
                <CheckCheck size={16} />
              </button>
            )}
            {loan.status === LoanStatus.COMPLETED && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestoreLoan(loan.id);
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
                onDeleteLoan(loan.id);
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
            {loan.type === LoanType.BANK ? (
              <>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  <span>Đến hạn: <span className="font-semibold text-slate-800">Ngày {loan.monthlyDueDate}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-slate-400" />
                  <span>Số tiền: <span className="font-semibold text-slate-800"><Amount value={loan.monthlyPayment} id={`loan-${loan.id}-monthly`} /></span></span>
                </div>
                {loan.termMonths > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Số kỳ: <span className="font-semibold text-slate-800">{getPaidPeriods(loan)}/{loan.termMonths}</span></span>
                  </div>
                )}
                {finalPaymentDate && (
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" />
                    <span>Tất toán: <span className="font-semibold text-emerald-600">{finalPaymentDate}</span></span>
                  </div>
                )}
                {/* Nút trạng thái thanh toán tháng hiện tại */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCurrentMonthPayment(loan);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isCurrentMonthPaid(loan)
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : isOverdue(loan)
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isCurrentMonthPaid(loan) ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Đã trả tháng này</span>
                    </>
                  ) : (
                    <>
                      <Circle size={14} />
                      <span className={isOverdue(loan) ? 'font-semibold' : ''}>
                        {isOverdue(loan) ? 'Quá hạn - Chưa trả' : 'Chưa trả tháng này'}
                      </span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <span>Ngày vay: <span className="font-semibold text-slate-800">{formatDate(loan.startDate)}</span></span>
              </div>
            )}
          </div>

          {/* Tiến độ */}
          <div className="col-span-12 md:col-span-5">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div 
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" 
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
        <h2 className="text-xl font-bold text-slate-800">Danh sách khoản vay</h2>
        
        {/* Sort Controls */}
        {statusFilter !== 'COMPLETED' && (
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
             <button 
                onClick={() => setSortBy('dueDate')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'dueDate' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <ArrowUp01 size={14} /> Ngày đến hạn
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
          {loans.filter(l => l.status === LoanStatus.ACTIVE).length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-200 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {loans.filter(l => l.status === LoanStatus.ACTIVE).length}
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
          {loans.filter(l => l.status === LoanStatus.COMPLETED).length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              statusFilter === 'COMPLETED'
                ? 'bg-slate-200 text-slate-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {loans.filter(l => l.status === LoanStatus.COMPLETED).length}
            </span>
          )}
        </button>
      </div>
      
      {/* Tab Navigation - Only show for active loans */}
      {statusFilter !== 'COMPLETED' && (
        <>
      {/* Tổng dư nợ còn lại theo loại */}
      {(bankLoans.length > 0 || personalLoans.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankLoans.length > 0 && (() => {
            const totalBankRemaining = bankLoans.reduce((sum, loan) => {
              const { remaining } = getProgress(loan);
              return sum + remaining;
            }, 0);
            return (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote size={20} className="text-blue-600" />
                    <span className="text-sm font-medium text-slate-600">Tổng dư nợ còn lại - Ngân hàng</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">
                    <Amount value={totalBankRemaining} id="total-bank-remaining" />
                  </span>
                </div>
              </div>
            );
          })()}
          
          {personalLoans.length > 0 && (() => {
            const totalPersonalRemaining = personalLoans.reduce((sum, loan) => {
              const { remaining } = getProgress(loan);
              return sum + remaining;
            }, 0);
            return (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User size={20} className="text-purple-600" />
                    <span className="text-sm font-medium text-slate-600">Tổng dư nợ còn lại - Người thân</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">
                    <Amount value={totalPersonalRemaining} id="total-personal-remaining" />
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
      
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={() => setActiveTab('BANK')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'BANK'
              ? 'bg-blue-50 text-blue-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Banknote size={18} />
          <span>Ngân hàng</span>
          {bankLoans.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'BANK'
                ? 'bg-blue-200 text-blue-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {bankLoans.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('PERSONAL')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'PERSONAL'
              ? 'bg-purple-50 text-purple-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <User size={18} />
          <span>Người thân</span>
          {personalLoans.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'PERSONAL'
                ? 'bg-purple-200 text-purple-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {personalLoans.length}
            </span>
          )}
        </button>
      </div>
      </>
      )}

      {/* Completed Loans Section */}
      {statusFilter === 'COMPLETED' && (
        <>
          {completedLoans.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Bạn chưa có khoản vay nào đã hoàn thành.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
                <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoản vay đã hoàn thành</div>
                <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Tổng gốc</div>
                <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Đã trả</div>
                <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Loại</div>
                <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
              </div>
              {/* Body */}
              <div className="divide-y divide-slate-100">
                {completedLoans.map(loan => {
                  const { paid } = getProgress(loan);
                  return (
                    <div
                      key={loan.id}
                      onClick={() => setShowHistory(loan.id)}
                      className="bg-white border-b border-slate-100 hover:bg-slate-50 cursor-pointer opacity-75"
                    >
                      <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                        <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                          <div className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full ${loan.type === LoanType.BANK ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                            {loan.type === LoanType.BANK ? <Banknote size={18} /> : <User size={18} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 truncate">{loan.name}</div>
                            <div className="text-sm text-slate-500 truncate">{loan.provider}</div>
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-2 text-right">
                          <div className="font-semibold text-slate-900">
                            <Amount value={loan.originalAmount} id={`completed-loan-${loan.id}-original`} />
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-2 text-right">
                          <div className="text-emerald-600 font-semibold">
                            <Amount value={paid} id={`completed-loan-${loan.id}-paid`} />
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-2 text-right">
                          <span className={`text-xs px-2 py-1 rounded ${loan.type === LoanType.BANK ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {loan.type === LoanType.BANK ? 'Ngân hàng' : 'Người thân'}
                          </span>
                        </div>
                        <div className="col-span-6 md:col-span-2 flex flex-wrap items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowHistory(showHistory === loan.id ? null : loan.id);
                            }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title="Lịch sử"
                          >
                            <History size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreLoan(loan.id);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Khôi phục"
                          >
                            <Archive size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLoan(loan.id);
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

      {statusFilter !== 'COMPLETED' && loans.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">Bạn chưa có khoản vay nào.</p>
        </div>
      )}

      {/* BANK SECTION */}
      {statusFilter !== 'COMPLETED' && activeTab === 'BANK' && bankLoans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoản vay</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Tổng gốc</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Đã trả</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Còn lại</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
          </div>
          {/* Body */}
          <div className="divide-y divide-slate-100">
            {bankLoans.map(renderLoanRow)}
          </div>
        </div>
      )}

      {/* PERSONAL SECTION */}
      {statusFilter !== 'COMPLETED' && activeTab === 'PERSONAL' && personalLoans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoản vay</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Tổng gốc</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Đã trả</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Còn lại</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
          </div>
          {/* Body */}
          <div className="divide-y divide-slate-100">
            {personalLoans.map(renderLoanRow)}
          </div>
        </div>
      )}

      {/* Empty state for current tab */}
      {statusFilter !== 'COMPLETED' && loans.length > 0 && (
        <>
          {activeTab === 'BANK' && bankLoans.length === 0 && (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Bạn chưa có khoản vay ngân hàng nào.</p>
            </div>
          )}
          {activeTab === 'PERSONAL' && personalLoans.length === 0 && (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Bạn chưa có khoản vay người thân nào.</p>
            </div>
          )}
        </>
      )}

      {/* Modals for Payment, Borrow, History */}
      {/* Payment Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800">Trả nợ</h2>
              <button onClick={() => setSelectedLoan(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Số tiền đã trả (VNĐ)</label>
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
                <button type="button" onClick={() => setSelectedLoan(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium">Xác nhận đã trả</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Borrow Modal */}
      {loanToBorrow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800">Vay thêm</h2>
              <button onClick={() => setLoanToBorrow(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleBorrowSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Số tiền vay thêm (VNĐ)</label>
                <input
                  type="number"
                  placeholder="Nhập số tiền"
                  value={borrowAmount}
                  onChange={(e) => setBorrowAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
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
                  value={borrowNote}
                  onChange={(e) => setBorrowNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              {borrowAmount && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  💡 Số tiền gốc sẽ tăng thêm <Amount value={parseFloat(borrowAmount) || 0} id={`loan-${loanToBorrow}-borrow-preview`} />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setLoanToBorrow(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">Xác nhận vay thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Loan Name Modal */}
      {loanToEdit && (() => {
        const loan = loans.find(l => l.id === loanToEdit);
        if (!loan) return null;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-slate-800">Chỉnh sửa tên khoản vay</h2>
                <button onClick={() => {
                  setLoanToEdit(null);
                  setEditLoanName('');
                }} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateLoanName} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tên khoản vay</label>
                  <input
                    type="text"
                    placeholder="Nhập tên khoản vay"
                    value={editLoanName}
                    onChange={(e) => setEditLoanName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setLoanToEdit(null);
                      setEditLoanName('');
                    }} 
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* History Modal */}
      {showHistory && (() => {
        const loan = loans.find(l => l.id === showHistory);
        if (!loan) return null;
        const { paid, remaining } = getProgress(loan);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-scale-up max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-slate-800">Lịch sử giao dịch - {loan.name}</h2>
                <button onClick={() => setShowHistory(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Tổng gốc</p>
                    <p className="text-lg font-semibold text-slate-900">
                      <Amount value={loan.originalAmount} id={`loan-${loan.id}-history-original`} />
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Đã trả</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      <Amount value={paid} id={`loan-${loan.id}-history-paid`} />
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Còn lại</p>
                    <p className="text-lg font-semibold text-rose-600">
                      <Amount value={remaining} id={`loan-${loan.id}-history-remaining`} />
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                  {loan.provider && (
                    <span>Người cho vay: <span className="font-semibold text-slate-800">{loan.provider}</span></span>
                  )}
                  {loan.type === LoanType.PERSONAL && (
                    <span>Ngày vay: <span className="font-semibold text-slate-800">{formatDate(loan.startDate)}</span></span>
                  )}
                  {loan.type === LoanType.BANK && loan.monthlyPayment > 0 && (
                    <span>Trả hàng tháng: <span className="font-semibold text-slate-800"><Amount value={loan.monthlyPayment} id={`loan-${loan.id}-history-monthly`} /></span></span>
                  )}
                </div>

                {loan.payments.length === 0 ? (
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
                      {loan.payments.slice().reverse().map(p => {
                        const isBorrow = p.id.startsWith('borrow-') || (p.note && p.note.includes('Vay thêm'));
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-600">{new Date(p.date).toLocaleDateString('vi-VN')}</td>
                            <td className="px-4 py-2">
                              {isBorrow ? (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Vay thêm</span>
                              ) : (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Thanh toán</span>
                              )}
                            </td>
                            <td className={`px-4 py-2 text-right font-medium ${isBorrow ? 'text-blue-600' : 'text-emerald-600'}`}>
                              <span className="inline-flex items-center gap-1">
                                <span>{isBorrow ? '+' : '-'}</span>
                                <Amount value={p.amount} id={`loan-${loan.id}-history-${p.id}`} />
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

export default LoanList;