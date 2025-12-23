import React, { useState, useMemo } from 'react';
import { Investment, InvestmentType, LoanStatus, Payment } from '../types';
import { formatCurrency } from '../App';
import { generateUUID } from '../utils/uuid';
import { Plus, Trash2, History, TrendingUp, TrendingDown, Calendar, DollarSign, X, Archive, CheckCheck } from 'lucide-react';
import { Amount } from './AmountVisibility';

interface InvestmentListProps {
  investments: Investment[];
  onDeleteInvestment: (id: string) => void;
  onAddInvestment: (investment: Investment) => void;
  onUpdateInvestment: (id: string, updatedInvestment: Partial<Investment>) => void;
}

type SortOption = 'date' | 'amount';
type StatusFilter = 'ACTIVE' | 'COMPLETED';
type InvestmentTab = 'DEPOSIT' | 'WITHDRAW';

const InvestmentList: React.FC<InvestmentListProps> = ({ 
  investments, 
  onDeleteInvestment, 
  onAddInvestment,
  onUpdateInvestment 
}) => {
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [activeTab, setActiveTab] = useState<InvestmentTab>('DEPOSIT');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  
  // Form state
  const [investmentName, setInvestmentName] = useState('');
  const [investmentType, setInvestmentType] = useState<InvestmentType>(InvestmentType.DEPOSIT);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [investmentDate, setInvestmentDate] = useState('');
  const [investmentNote, setInvestmentNote] = useState('');

  // Listen for event from header button
  React.useEffect(() => {
    const handleOpenModal = () => {
      setShowAddModal(true);
      setEditingInvestment(null);
      // Reset form fields
      setInvestmentName('');
      setInvestmentType(InvestmentType.DEPOSIT);
      setInvestmentAmount('');
      setInvestmentDate(new Date().toISOString().split('T')[0]);
      setInvestmentNote('');
    };

    window.addEventListener('openInvestmentModal', handleOpenModal);
    return () => {
      window.removeEventListener('openInvestmentModal', handleOpenModal);
    };
  }, []);

  const handleAddInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newInvestment: Investment = {
      id: generateUUID(),
      name: investmentName,
      type: investmentType,
      amount: parseFloat(investmentAmount) || 0,
      date: investmentDate || new Date().toISOString(),
      note: investmentNote || undefined,
      status: LoanStatus.ACTIVE
    };

    onAddInvestment(newInvestment);
    setShowAddModal(false);
    resetForm();
  };

  const handleEditClick = (investment: Investment) => {
    setEditingInvestment(investment);
    setInvestmentName(investment.name);
    setInvestmentType(investment.type);
    setInvestmentAmount(investment.amount.toString());
    setInvestmentDate(investment.date.split('T')[0]);
    setInvestmentNote(investment.note || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvestment) return;

    onUpdateInvestment(editingInvestment.id, {
      name: investmentName,
      type: investmentType,
      amount: parseFloat(investmentAmount) || 0,
      date: investmentDate || new Date().toISOString(),
      note: investmentNote || undefined
    });

    setEditingInvestment(null);
    resetForm();
  };

  const handleMarkAsCompleted = (investmentId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn đánh dấu khoản đầu tư này đã hoàn thành?')) {
      onUpdateInvestment(investmentId, { status: LoanStatus.COMPLETED });
    }
  };

  const handleRestoreInvestment = (investmentId: string) => {
    if (window.confirm('Bạn có muốn khôi phục khoản đầu tư này về danh sách đang hoạt động không?')) {
      onUpdateInvestment(investmentId, { status: LoanStatus.ACTIVE });
    }
  };

  const resetForm = () => {
    setInvestmentName('');
    setInvestmentType(InvestmentType.DEPOSIT);
    setInvestmentAmount('');
    setInvestmentDate(new Date().toISOString().split('T')[0]);
    setInvestmentNote('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Phân loại và Sắp xếp
  const { depositInvestments, withdrawInvestments } = useMemo(() => {
    let filtered = investments;
    
    if (statusFilter === 'ACTIVE') {
      filtered = investments.filter(i => i.status === LoanStatus.ACTIVE);
    } else if (statusFilter === 'COMPLETED') {
      filtered = investments.filter(i => i.status === LoanStatus.COMPLETED);
    }

    // Phân loại: Nạp và Rút
    const deposits = filtered.filter(i => i.type === InvestmentType.DEPOSIT);
    const withdraws = filtered.filter(i => i.type === InvestmentType.WITHDRAW);

    const sortFn = (a: Investment, b: Investment) => {
      if (sortBy === 'amount') {
        return b.amount - a.amount;
      } else {
        return new Date(b.date).getTime() - new Date(a.date).getTime(); // Mới nhất trước
      }
    };

    return {
      depositInvestments: deposits.sort(sortFn),
      withdrawInvestments: withdraws.sort(sortFn)
    };
  }, [investments, sortBy, statusFilter]);

  // Set tab mặc định
  React.useEffect(() => {
    if (statusFilter === 'COMPLETED') return;
    if (depositInvestments.length > 0 && activeTab === 'DEPOSIT') return;
    if (withdrawInvestments.length > 0 && activeTab === 'WITHDRAW') return;
    if (depositInvestments.length > 0) {
      setActiveTab('DEPOSIT');
    } else if (withdrawInvestments.length > 0) {
      setActiveTab('WITHDRAW');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositInvestments.length, withdrawInvestments.length, statusFilter]);

  const renderInvestmentRow = (investment: Investment) => {
    return (
      <div
        key={investment.id}
        onClick={() => setShowHistory(investment.id)}
        className="bg-white border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
      >
        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
          {/* Tên và loại */}
          <div className="col-span-12 md:col-span-4 flex items-center gap-3">
            <div className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full ${
              investment.type === InvestmentType.DEPOSIT 
                ? 'bg-emerald-100 text-emerald-600' 
                : 'bg-red-100 text-red-600'
            }`}>
              {investment.type === InvestmentType.DEPOSIT ? (
                <TrendingUp size={18} />
              ) : (
                <TrendingDown size={18} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900 truncate">{investment.name}</div>
              <div className="text-sm text-slate-500">
                {investment.type === InvestmentType.DEPOSIT ? 'Nạp tiền' : 'Rút tiền'}
              </div>
            </div>
          </div>

          {/* Số tiền */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Số tiền</div>
            <div className={`font-semibold ${
              investment.type === InvestmentType.DEPOSIT ? 'text-emerald-600' : 'text-red-600'
            }`}>
              <Amount value={investment.amount} id={`investment-${investment.id}-amount`} />
            </div>
          </div>

          {/* Ngày */}
          <div className="col-span-6 md:col-span-2">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ngày</div>
            <div className="text-slate-900 font-medium">{formatDate(investment.date)}</div>
          </div>

          {/* Ghi chú */}
          <div className="col-span-6 md:col-span-2">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ghi chú</div>
            <div className="text-slate-600 text-sm truncate">{investment.note || '-'}</div>
          </div>

          {/* Actions */}
          <div className="col-span-6 md:col-span-2 flex flex-wrap items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(showHistory === investment.id ? null : investment.id);
              }}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Chi tiết"
            >
              <History size={16} />
            </button>
            {investment.status === LoanStatus.ACTIVE && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsCompleted(investment.id);
                }}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                title="Đánh dấu đã hoàn thành"
              >
                <CheckCheck size={16} />
              </button>
            )}
            {investment.status === LoanStatus.COMPLETED && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestoreInvestment(investment.id);
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
                onDeleteInvestment(investment.id);
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
        <h2 className="text-xl font-bold text-slate-800">Quản lý đầu tư</h2>
        
        {/* Sort Controls */}
        {statusFilter !== 'COMPLETED' && (
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
             <button 
                onClick={() => setSortBy('date')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'date' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <Calendar size={14} /> Mới nhất
             </button>
             <button 
                onClick={() => setSortBy('amount')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'amount' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <DollarSign size={14} /> Số tiền lớn nhất
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
          <CheckCheck size={18} />
          <span>Đang hoạt động</span>
          {investments.filter(i => i.status === LoanStatus.ACTIVE).length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-200 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {investments.filter(i => i.status === LoanStatus.ACTIVE).length}
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
          {investments.filter(i => i.status === LoanStatus.COMPLETED).length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              statusFilter === 'COMPLETED'
                ? 'bg-slate-200 text-slate-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {investments.filter(i => i.status === LoanStatus.COMPLETED).length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Navigation - Only show for active investments */}
      {statusFilter !== 'COMPLETED' && (
        <>
          {/* Tổng số tiền theo loại */}
          {(depositInvestments.length > 0 || withdrawInvestments.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {depositInvestments.length > 0 && (() => {
                const totalDeposit = depositInvestments.reduce((sum, inv) => sum + inv.amount, 0);
                return (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-600" />
                        <span className="text-sm font-medium text-slate-600">Tổng nạp tiền</span>
                      </div>
                      <span className="text-xl font-bold text-emerald-600">
                        <Amount value={totalDeposit} id="total-deposit" />
                      </span>
                    </div>
                  </div>
                );
              })()}
              
              {withdrawInvestments.length > 0 && (() => {
                const totalWithdraw = withdrawInvestments.reduce((sum, inv) => sum + inv.amount, 0);
                return (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown size={20} className="text-red-600" />
                        <span className="text-sm font-medium text-slate-600">Tổng rút tiền</span>
                      </div>
                      <span className="text-xl font-bold text-red-600">
                        <Amount value={totalWithdraw} id="total-withdraw" />
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          
          <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setActiveTab('DEPOSIT')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'DEPOSIT'
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TrendingUp size={18} />
              <span>Nạp tiền</span>
              {depositInvestments.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === 'DEPOSIT'
                    ? 'bg-emerald-200 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {depositInvestments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('WITHDRAW')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'WITHDRAW'
                  ? 'bg-red-50 text-red-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TrendingDown size={18} />
              <span>Rút tiền</span>
              {withdrawInvestments.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === 'WITHDRAW'
                    ? 'bg-red-200 text-red-800'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {withdrawInvestments.length}
                </span>
              )}
            </button>
          </div>
        </>
      )}

      {/* Completed Investments Section */}
      {statusFilter === 'COMPLETED' && (
        <>
          {depositInvestments.length === 0 && withdrawInvestments.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Bạn chưa có khoản đầu tư nào đã hoàn thành.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
                <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoản đầu tư đã hoàn thành</div>
                <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Số tiền</div>
                <div className="col-span-6 md:col-span-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Ngày</div>
                <div className="col-span-6 md:col-span-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Loại</div>
                <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
              </div>
              <div className="divide-y divide-slate-100">
                {[...depositInvestments, ...withdrawInvestments].map(investment => (
                  <div
                    key={investment.id}
                    onClick={() => setShowHistory(investment.id)}
                    className="bg-white border-b border-slate-100 hover:bg-slate-50 cursor-pointer opacity-75"
                  >
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                      <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                        <div className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full ${
                          investment.type === InvestmentType.DEPOSIT 
                            ? 'bg-emerald-100 text-emerald-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {investment.type === InvestmentType.DEPOSIT ? (
                            <TrendingUp size={18} />
                          ) : (
                            <TrendingDown size={18} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 truncate">{investment.name}</div>
                          <div className="text-sm text-slate-500">{investment.note || '-'}</div>
                        </div>
                      </div>
                      <div className="col-span-6 md:col-span-2 text-right">
                        <div className={`font-semibold ${
                          investment.type === InvestmentType.DEPOSIT ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          <Amount value={investment.amount} id={`completed-investment-${investment.id}-amount`} />
                        </div>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <div className="text-slate-900 font-medium">{formatDate(investment.date)}</div>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          investment.type === InvestmentType.DEPOSIT 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {investment.type === InvestmentType.DEPOSIT ? 'Nạp tiền' : 'Rút tiền'}
                        </span>
                      </div>
                      <div className="col-span-6 md:col-span-2 flex flex-wrap items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHistory(showHistory === investment.id ? null : investment.id);
                          }}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title="Chi tiết"
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreInvestment(investment.id);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Khôi phục"
                        >
                          <Archive size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteInvestment(investment.id);
                          }}
                          className="p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {statusFilter !== 'COMPLETED' && depositInvestments.length === 0 && withdrawInvestments.length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">Bạn chưa có khoản đầu tư nào.</p>
        </div>
      )}

      {/* DEPOSIT SECTION */}
      {statusFilter !== 'COMPLETED' && activeTab === 'DEPOSIT' && depositInvestments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoản đầu tư</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Số tiền</div>
            <div className="col-span-6 md:col-span-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Ngày</div>
            <div className="col-span-6 md:col-span-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Ghi chú</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
          </div>
          <div className="divide-y divide-slate-100">
            {depositInvestments.map(renderInvestmentRow)}
          </div>
        </div>
      )}

      {/* WITHDRAW SECTION */}
      {statusFilter !== 'COMPLETED' && activeTab === 'WITHDRAW' && withdrawInvestments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoản đầu tư</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Số tiền</div>
            <div className="col-span-6 md:col-span-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Ngày</div>
            <div className="col-span-6 md:col-span-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Ghi chú</div>
            <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</div>
          </div>
          <div className="divide-y divide-slate-100">
            {withdrawInvestments.map(renderInvestmentRow)}
          </div>
        </div>
      )}

      {/* Empty state for current tab */}
      {statusFilter !== 'COMPLETED' && (depositInvestments.length > 0 || withdrawInvestments.length > 0) && (
        <>
          {activeTab === 'DEPOSIT' && depositInvestments.length === 0 && (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Bạn chưa có khoản nạp tiền nào.</p>
            </div>
          )}
          {activeTab === 'WITHDRAW' && withdrawInvestments.length === 0 && (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Bạn chưa có khoản rút tiền nào.</p>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Investment Modal */}
      {(showAddModal || editingInvestment) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800">
                {editingInvestment ? 'Chỉnh sửa khoản đầu tư' : 'Thêm khoản đầu tư mới'}
              </h2>
              <button onClick={() => {
                setShowAddModal(false);
                setEditingInvestment(null);
                resetForm();
              }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={editingInvestment ? handleEditSubmit : handleAddInvestment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên khoản đầu tư
                </label>
                <input 
                  required 
                  type="text" 
                  placeholder="VD: Chứng khoán, Bất động sản, Quỹ đầu tư" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={investmentName} 
                  onChange={e => setInvestmentName(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Loại giao dịch
                </label>
                <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                  <button
                    type="button"
                    onClick={() => setInvestmentType(InvestmentType.DEPOSIT)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                      investmentType === InvestmentType.DEPOSIT 
                        ? 'bg-white shadow-sm text-emerald-600' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Nạp tiền
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvestmentType(InvestmentType.WITHDRAW)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                      investmentType === InvestmentType.WITHDRAW 
                        ? 'bg-white shadow-sm text-red-600' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Rút tiền
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Số tiền (VNĐ)
                </label>
                <input 
                  required 
                  type="number" 
                  min="0" 
                  placeholder="0" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={investmentAmount} 
                  onChange={e => setInvestmentAmount(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ngày giao dịch
                </label>
                <input 
                  required 
                  type="date" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={investmentDate} 
                  onChange={e => setInvestmentDate(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ghi chú (Tùy chọn)
                </label>
                <input 
                  type="text" 
                  placeholder="Ghi chú" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={investmentNote} 
                  onChange={e => setInvestmentNote(e.target.value)} 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-200"
              >
                {editingInvestment ? 'Lưu thay đổi' : 'Thêm khoản đầu tư'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (() => {
        const investment = investments.find(i => i.id === showHistory);
        if (!investment) return null;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-slate-800">Chi tiết - {investment.name}</h2>
                <button onClick={() => setShowHistory(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Loại</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {investment.type === InvestmentType.DEPOSIT ? 'Nạp tiền' : 'Rút tiền'}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Số tiền</p>
                    <p className={`text-lg font-semibold ${
                      investment.type === InvestmentType.DEPOSIT ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      <Amount value={investment.amount} id={`investment-${investment.id}-history-amount`} />
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Ngày giao dịch</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(investment.date)}</p>
                </div>
                {investment.note && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Ghi chú</p>
                    <p className="text-sm text-slate-900">{investment.note}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => {
                      handleEditClick(investment);
                      setShowHistory(null);
                      setShowAddModal(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium"
                  >
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default InvestmentList;

