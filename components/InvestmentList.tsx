import React, { useState, useMemo } from 'react';
import { InvestmentAccount, InvestmentTransaction, InvestmentType, LoanStatus } from '../types';
import { formatCurrency } from '../App';
import { generateUUID } from '../utils/uuid';
import { Plus, Trash2, History, TrendingUp, TrendingDown, Calendar, DollarSign, X, Archive, CheckCheck, Edit2 } from 'lucide-react';
import { Amount } from './AmountVisibility';

interface InvestmentListProps {
  accounts: InvestmentAccount[];
  transactions: InvestmentTransaction[];
  onAddAccount: (account: InvestmentAccount) => void;
  onUpdateAccount: (id: string, updatedAccount: Partial<InvestmentAccount>) => void;
  onDeleteAccount: (id: string) => void;
  onAddTransaction: (transaction: InvestmentTransaction) => void;
  onUpdateTransaction: (id: string, updatedTransaction: Partial<InvestmentTransaction>) => void;
  onDeleteTransaction: (id: string) => void;
}

type StatusFilter = 'ACTIVE' | 'COMPLETED';

const InvestmentList: React.FC<InvestmentListProps> = ({ 
  accounts, 
  transactions,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<InvestmentAccount | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<InvestmentTransaction | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  // Form state for account
  const [accountName, setAccountName] = useState('');
  const [accountNotes, setAccountNotes] = useState('');
  const [accountStartDate, setAccountStartDate] = useState('');
  const [accountEndDate, setAccountEndDate] = useState('');
  
  // Form state for transaction
  const [transactionAccountId, setTransactionAccountId] = useState('');
  const [transactionType, setTransactionType] = useState<InvestmentType>(InvestmentType.DEPOSIT);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [transactionNote, setTransactionNote] = useState('');

  // Listen for event from header button
  React.useEffect(() => {
    const handleOpenModal = () => {
      setShowAddAccountModal(true);
      setAccountName('');
      setAccountNotes('');
      setAccountStartDate('');
      setAccountEndDate('');
    };

    window.addEventListener('openInvestmentModal', handleOpenModal);
    return () => {
      window.removeEventListener('openInvestmentModal', handleOpenModal);
    };
  }, []);

  // Handle ESC key to close modals
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddAccountModal) {
          setShowAddAccountModal(false);
          setEditingAccount(null);
          setAccountName('');
          setAccountNotes('');
          setAccountStartDate('');
          setAccountEndDate('');
        }
        if (showAddTransactionModal) {
          setShowAddTransactionModal(false);
          setEditingTransaction(null);
          setSelectedAccountId('');
          resetTransactionForm();
        }
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showAddAccountModal, showAddTransactionModal]);

  const handleCloseAccountModal = () => {
    setShowAddAccountModal(false);
    setEditingAccount(null);
    setAccountName('');
    setAccountNotes('');
    setAccountStartDate('');
    setAccountEndDate('');
  };

  const handleCloseTransactionModal = () => {
    setShowAddTransactionModal(false);
    setEditingTransaction(null);
    setSelectedAccountId('');
    resetTransactionForm();
  };

  // Filter accounts by status
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => acc.status === statusFilter);
  }, [accounts, statusFilter]);

  // Get transactions for each account
  const getAccountTransactions = (accountId: string) => {
    return transactions.filter(t => t.accountId === accountId && t.status === statusFilter);
  };

  // Calculate stats for an account
  const getAccountStats = (accountId: string) => {
    const accountTransactions = getAccountTransactions(accountId);
    const deposits = accountTransactions.filter(t => t.type === InvestmentType.DEPOSIT);
    const withdraws = accountTransactions.filter(t => t.type === InvestmentType.WITHDRAW);
    
    const totalDeposit = deposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdraw = withdraws.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalDeposit - totalWithdraw;
    
    return { totalDeposit, totalWithdraw, balance, depositCount: deposits.length, withdrawCount: withdraws.length };
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newAccount: InvestmentAccount = {
      id: generateUUID(),
      name: accountName,
      status: LoanStatus.ACTIVE,
      notes: accountNotes || undefined,
      startDate: accountStartDate || undefined,
      endDate: accountEndDate || undefined
    };

    onAddAccount(newAccount);
    setShowAddAccountModal(false);
    setAccountName('');
    setAccountNotes('');
    setAccountStartDate('');
    setAccountEndDate('');
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionAccountId) {
      alert('Vui lòng chọn khoản đầu tư');
      return;
    }
    
    const newTransaction: InvestmentTransaction = {
      id: generateUUID(),
      accountId: transactionAccountId,
      type: transactionType,
      amount: parseFloat(transactionAmount) || 0,
      date: transactionDate || new Date().toISOString(),
      note: transactionNote || undefined,
      status: LoanStatus.ACTIVE
    };

    onAddTransaction(newTransaction);
    setShowAddTransactionModal(false);
    resetTransactionForm();
  };

  const handleEditAccount = (account: InvestmentAccount) => {
    setEditingAccount(account);
    setAccountName(account.name);
    setAccountNotes(account.notes || '');
    setAccountStartDate(account.startDate || '');
    setAccountEndDate(account.endDate || '');
    setShowAddAccountModal(true);
  };

  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    onUpdateAccount(editingAccount.id, {
      name: accountName,
      notes: accountNotes || undefined,
      startDate: accountStartDate || undefined,
      endDate: accountEndDate || undefined
    });

    setEditingAccount(null);
    setShowAddAccountModal(false);
    setAccountName('');
    setAccountNotes('');
    setAccountStartDate('');
    setAccountEndDate('');
  };

  const handleEditTransaction = (transaction: InvestmentTransaction) => {
    setEditingTransaction(transaction);
    setTransactionAccountId(transaction.accountId);
    setTransactionType(transaction.type);
    setTransactionAmount(transaction.amount.toString());
    setTransactionDate(transaction.date.split('T')[0]);
    setTransactionNote(transaction.note || '');
    setShowAddTransactionModal(true);
  };

  const handleUpdateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    onUpdateTransaction(editingTransaction.id, {
      accountId: transactionAccountId,
      type: transactionType,
      amount: parseFloat(transactionAmount) || 0,
      date: transactionDate || new Date().toISOString(),
      note: transactionNote || undefined
    });

    setEditingTransaction(null);
    setShowAddTransactionModal(false);
    resetTransactionForm();
  };

  const handleMarkAsCompleted = (accountId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn đánh dấu khoản đầu tư này đã hoàn thành?')) {
      onUpdateAccount(accountId, { status: LoanStatus.COMPLETED });
      // Also mark all transactions as completed
      transactions.filter(t => t.accountId === accountId).forEach(t => {
        onUpdateTransaction(t.id, { status: LoanStatus.COMPLETED });
      });
    }
  };

  const handleRestoreAccount = (accountId: string) => {
    if (window.confirm('Bạn có muốn khôi phục khoản đầu tư này về danh sách đang hoạt động không?')) {
      onUpdateAccount(accountId, { status: LoanStatus.ACTIVE });
      // Also restore all transactions
      transactions.filter(t => t.accountId === accountId).forEach(t => {
        onUpdateTransaction(t.id, { status: LoanStatus.ACTIVE });
      });
    }
  };

  const resetTransactionForm = () => {
    setTransactionAccountId('');
    setTransactionType(InvestmentType.DEPOSIT);
    setTransactionAmount('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setTransactionNote('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Get active accounts for transaction dropdown
  const activeAccounts = useMemo(() => {
    return accounts.filter(acc => acc.status === LoanStatus.ACTIVE);
  }, [accounts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">Quản lý đầu tư</h2>
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
          {accounts.filter(a => a.status === LoanStatus.ACTIVE).length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-200 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {accounts.filter(a => a.status === LoanStatus.ACTIVE).length}
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
          {accounts.filter(a => a.status === LoanStatus.COMPLETED).length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              statusFilter === 'COMPLETED'
                ? 'bg-slate-200 text-slate-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {accounts.filter(a => a.status === LoanStatus.COMPLETED).length}
            </span>
          )}
        </button>
      </div>

      {/* Accounts List */}
      {filteredAccounts.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">
            {statusFilter === 'ACTIVE' 
              ? 'Bạn chưa có khoản đầu tư nào. Hãy tạo khoản đầu tư mới để bắt đầu.' 
              : 'Bạn chưa có khoản đầu tư nào đã hoàn thành.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map(account => {
            const accountTransactions = getAccountTransactions(account.id);
            const stats = getAccountStats(account.id);
            const isExpanded = expandedAccount === account.id;
            
            return (
              <div key={account.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Account Header */}
                <div 
                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600">
                        <DollarSign size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 text-lg">{account.name}</div>
                        <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                          {account.startDate && (
                            <div>Ngày mở: {formatDate(account.startDate)}</div>
                          )}
                          {account.endDate && (
                            <div>Ngày kết thúc: {formatDate(account.endDate)}</div>
                          )}
                          {account.notes && (
                            <div className="mt-1">{account.notes}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Stats */}
                      <div className="hidden md:flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Tổng nạp</div>
                          <div className="font-semibold text-emerald-600">
                            <Amount value={stats.totalDeposit} id={`account-${account.id}-deposit`} />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Tổng rút</div>
                          <div className="font-semibold text-red-600">
                            <Amount value={stats.totalWithdraw} id={`account-${account.id}-withdraw`} />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Số dư</div>
                          <div className={`font-semibold ${stats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            <Amount value={Math.abs(stats.balance)} id={`account-${account.id}-balance`} />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedAccount(isExpanded ? null : account.id);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {isExpanded ? <X size={20} /> : <History size={20} />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Mobile Stats */}
                  <div className="md:hidden grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Tổng nạp</div>
                      <div className="font-semibold text-emerald-600 text-sm">
                        <Amount value={stats.totalDeposit} id={`account-${account.id}-deposit-mobile`} />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Tổng rút</div>
                      <div className="font-semibold text-red-600 text-sm">
                        <Amount value={stats.totalWithdraw} id={`account-${account.id}-withdraw-mobile`} />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Số dư</div>
                      <div className={`font-semibold text-sm ${stats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        <Amount value={Math.abs(stats.balance)} id={`account-${account.id}-balance-mobile`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Transactions */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50">
                    <div className="p-4 space-y-3">
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedAccountId(account.id);
                            setTransactionAccountId(account.id);
                            setTransactionType(InvestmentType.DEPOSIT);
                            setTransactionAmount('');
                            setTransactionDate(new Date().toISOString().split('T')[0]);
                            setTransactionNote('');
                            setShowAddTransactionModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                        >
                          <TrendingUp size={16} />
                          Nạp tiền
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAccountId(account.id);
                            setTransactionAccountId(account.id);
                            setTransactionType(InvestmentType.WITHDRAW);
                            setTransactionAmount('');
                            setTransactionDate(new Date().toISOString().split('T')[0]);
                            setTransactionNote('');
                            setShowAddTransactionModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          <TrendingDown size={16} />
                          Rút tiền
                        </button>
                        {account.status === LoanStatus.ACTIVE && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAccount(account);
                              }}
                              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsCompleted(account.id);
                              }}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                              title="Đánh dấu hoàn thành"
                            >
                              <CheckCheck size={16} />
                            </button>
                          </>
                        )}
                        {account.status === LoanStatus.COMPLETED && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreAccount(account.id);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            title="Khôi phục"
                          >
                            <Archive size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Bạn có chắc chắn muốn xóa khoản đầu tư "${account.name}"? Tất cả giao dịch liên quan cũng sẽ bị xóa.`)) {
                              // Delete all transactions first
                              accountTransactions.forEach(t => onDeleteTransaction(t.id));
                              onDeleteAccount(account.id);
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Transactions List */}
                      {accountTransactions.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm">
                          Chưa có giao dịch nào. Hãy thêm giao dịch nạp hoặc rút tiền.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {accountTransactions
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(transaction => (
                              <div
                                key={transaction.id}
                                className="bg-white rounded-lg p-3 border border-slate-200 hover:border-slate-300 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full ${
                                      transaction.type === InvestmentType.DEPOSIT 
                                        ? 'bg-emerald-100 text-emerald-600' 
                                        : 'bg-red-100 text-red-600'
                                    }`}>
                                      {transaction.type === InvestmentType.DEPOSIT ? (
                                        <TrendingUp size={14} />
                                      ) : (
                                        <TrendingDown size={14} />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`font-semibold ${
                                          transaction.type === InvestmentType.DEPOSIT ? 'text-emerald-600' : 'text-red-600'
                                        }`}>
                                          <Amount value={transaction.amount} id={`transaction-${transaction.id}-amount`} />
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          {transaction.type === InvestmentType.DEPOSIT ? 'Nạp' : 'Rút'}
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-500 mt-1">
                                        {formatDate(transaction.date)}
                                        {transaction.note && ` • ${transaction.note}`}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditTransaction(transaction);
                                      }}
                                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                      title="Chỉnh sửa"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
                                          onDeleteTransaction(transaction.id);
                                        }
                                      }}
                                      className="p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                                      title="Xóa"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0"
          onClick={handleCloseAccountModal}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800">
                {editingAccount ? 'Chỉnh sửa khoản đầu tư' : 'Tạo khoản đầu tư mới'}
              </h2>
              <button onClick={handleCloseAccountModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={editingAccount ? handleUpdateAccount : handleAddAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên khoản đầu tư *
                </label>
                <input 
                  required 
                  type="text" 
                  placeholder="VD: Chứng khoán, Bất động sản, Quỹ đầu tư" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={accountName} 
                  onChange={e => setAccountName(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ngày mở khoản đầu tư (Tùy chọn)
                </label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={accountStartDate} 
                  onChange={e => setAccountStartDate(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ngày kết thúc (Tùy chọn)
                </label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={accountEndDate} 
                  onChange={e => setAccountEndDate(e.target.value)} 
                />
                <p className="text-xs text-slate-500 mt-1">
                  Để trống nếu khoản đầu tư vẫn đang hoạt động
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ghi chú (Tùy chọn)
                </label>
                <textarea 
                  placeholder="Ghi chú về khoản đầu tư này" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none" 
                  rows={3}
                  value={accountNotes} 
                  onChange={e => setAccountNotes(e.target.value)} 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-200"
              >
                {editingAccount ? 'Lưu thay đổi' : 'Tạo khoản đầu tư'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      {showAddTransactionModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0"
          onClick={handleCloseTransactionModal}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800">
                {editingTransaction ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch'}
              </h2>
              <button onClick={handleCloseTransactionModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={editingTransaction ? handleUpdateTransaction : handleAddTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Khoản đầu tư *
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={transactionAccountId}
                  onChange={e => setTransactionAccountId(e.target.value)}
                  disabled={!!selectedAccountId}
                >
                  <option value="">Chọn khoản đầu tư</option>
                  {activeAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Loại giao dịch
                </label>
                <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTransactionType(InvestmentType.DEPOSIT)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                      transactionType === InvestmentType.DEPOSIT 
                        ? 'bg-white shadow-sm text-emerald-600' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Nạp tiền
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionType(InvestmentType.WITHDRAW)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                      transactionType === InvestmentType.WITHDRAW 
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
                  Số tiền (VNĐ) *
                </label>
                <input 
                  required 
                  type="number" 
                  min="0" 
                  placeholder="0" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={transactionAmount} 
                  onChange={e => setTransactionAmount(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ngày giao dịch *
                </label>
                <input 
                  required 
                  type="date" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={transactionDate} 
                  onChange={e => setTransactionDate(e.target.value)} 
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
                  value={transactionNote} 
                  onChange={e => setTransactionNote(e.target.value)} 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-200"
              >
                {editingTransaction ? 'Lưu thay đổi' : 'Thêm giao dịch'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentList;
