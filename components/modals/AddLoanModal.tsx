import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { LoanType } from '../../types';
import { formatCurrency } from '../../utils/constants';
import { getTodayISO } from '../../utils/constants';

interface AddLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (loan: {
    name: string;
    provider: string;
    type: LoanType;
    monthlyDueDate: number;
    monthlyPayment: number;
    term: number;
    paidTerms: number;
    amount: number;
    startDate: string;
    interestOnly: boolean;
  }) => void;
}

const AddLoanModal: React.FC<AddLoanModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [newName, setNewName] = useState('');
  const [newProvider, setNewProvider] = useState('');
  const [newType, setNewType] = useState<LoanType>(LoanType.BANK);
  const [newMonthlyDueDate, setNewMonthlyDueDate] = useState<number>(1);
  const [newMonthlyPayment, setNewMonthlyPayment] = useState('');
  const [newTerm, setNewTerm] = useState('');
  const [newPaidTerms, setNewPaidTerms] = useState('');
  const [newInterestOnly, setNewInterestOnly] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newStartDate, setNewStartDate] = useState(getTodayISO());

  useEffect(() => {
    if (isOpen && !newStartDate) {
      setNewStartDate(getTodayISO());
    }
  }, [isOpen, newStartDate]);

  const resetForm = () => {
    setNewName('');
    setNewProvider('');
    setNewType(LoanType.BANK);
    setNewMonthlyDueDate(1);
    setNewMonthlyPayment('');
    setNewTerm('');
    setNewPaidTerms('');
    setNewAmount('');
    setNewStartDate(getTodayISO());
    setNewInterestOnly(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: newName,
      provider: newProvider,
      type: newType,
      monthlyDueDate: newMonthlyDueDate,
      monthlyPayment: parseFloat(newMonthlyPayment) || 0,
      term: parseInt(newTerm) || 0,
      paidTerms: parseInt(newPaidTerms) || 0,
      amount: parseFloat(newAmount) || 0,
      startDate: newStartDate,
      interestOnly: newInterestOnly
    });
    resetForm();
    onClose();
  };

  const previewBankTotal = (parseFloat(newMonthlyPayment) || 0) * (parseInt(newTerm) || 0);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">Thêm khoản vay mới</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1 mb-4">
            <button
              type="button"
              onClick={() => setNewType(LoanType.BANK)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newType === LoanType.BANK ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Vay Ngân Hàng
            </button>
            <button
              type="button"
              onClick={() => setNewType(LoanType.APP)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newType === LoanType.APP ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Vay App
            </button>
            <button
              type="button"
              onClick={() => setNewType(LoanType.PERSONAL)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newType === LoanType.PERSONAL ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Vay Người Thân
            </button>
          </div>

          {(newType === LoanType.BANK || newType === LoanType.APP) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tên khoản vay (Mục đích)
              </label>
              <input 
                required 
                type="text" 
                placeholder="VD: Vay mua xe" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {newType === LoanType.BANK ? 'Tên ngân hàng / Tổ chức' : newType === LoanType.APP ? 'Tên app / Ứng dụng' : 'Tên người cho vay'}
            </label>
            <input 
              required 
              type="text" 
              placeholder={newType === LoanType.BANK ? "VD: Vietcombank" : newType === LoanType.APP ? "VD: Tiki, Shopee, MoMo" : "VD: Anh Ba, Chị Tư"} 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
              value={newProvider} 
              onChange={e => setNewProvider(e.target.value)} 
            />
          </div>

          {(newType === LoanType.BANK || newType === LoanType.APP) && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <input 
                  type="checkbox" 
                  id="interestOnly"
                  checked={newInterestOnly}
                  onChange={e => setNewInterestOnly(e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="interestOnly" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Chỉ trả lãi (số tiền trả hàng tháng không làm giảm gốc)
                </label>
              </div>

              {newInterestOnly && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền gốc (VNĐ) *</label>
                  <input 
                    required={newInterestOnly}
                    type="number" 
                    min="0" 
                    placeholder="VD: 1000000000" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white" 
                    value={newAmount} 
                    onChange={e => setNewAmount(e.target.value)} 
                  />
                  <p className="text-xs text-amber-700 mt-1">Với khoản vay chỉ trả lãi, bạn cần nhập số tiền gốc riêng</p>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {newInterestOnly ? 'Số tiền lãi trả hàng tháng (VNĐ)' : 'Số tiền trả hàng tháng (VNĐ)'}
                </label>
                <input 
                  required 
                  type="number" 
                  min="0" 
                  placeholder="0" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white" 
                  value={newMonthlyPayment} 
                  onChange={e => setNewMonthlyPayment(e.target.value)} 
                />
              </div>

              {!newInterestOnly && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tổng số tháng</label>
                    <input 
                      required 
                      type="number" 
                      min="1" 
                      placeholder="12" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                      value={newTerm} 
                      onChange={e => setNewTerm(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số kỳ đã trả</label>
                    <input 
                      type="number" 
                      min="0" 
                      max={newTerm} 
                      placeholder="0" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                      value={newPaidTerms} 
                      onChange={e => setNewPaidTerms(e.target.value)} 
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày thanh toán hàng tháng</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  value={newMonthlyDueDate}
                  onChange={e => setNewMonthlyDueDate(parseInt(e.target.value))}
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Ngày {d}</option>
                  ))}
                </select>
              </div>

              {!newInterestOnly && (
                <div className="pt-2">
                  <div className="flex justify-between items-center text-sm font-medium text-slate-600 bg-slate-100 p-3 rounded-lg">
                    <span>Tổng dự tính:</span>
                    <span className="text-emerald-600 font-bold text-lg">{formatCurrency(previewBankTotal)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 text-center">*Tổng = Tiền trả hàng tháng x Số tháng</p>
                </div>
              )}

              {newInterestOnly && (
                <div className="pt-2">
                  <div className="flex justify-between items-center text-sm font-medium text-slate-600 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <span>Số tiền gốc:</span>
                    <span className="text-amber-700 font-bold text-lg">{formatCurrency(parseFloat(newAmount) || 0)}</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1 text-center">*Khoản vay này chỉ trả lãi, gốc không giảm theo thời gian</p>
                </div>
              )}
            </div>
          )}

          {newType === LoanType.PERSONAL && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền vay (VNĐ)</label>
                <input 
                  required 
                  type="number" 
                  min="0" 
                  placeholder="0" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={newAmount} 
                  onChange={e => setNewAmount(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày vay</label>
                <input 
                  required 
                  type="date" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={newStartDate} 
                  onChange={e => setNewStartDate(e.target.value)} 
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-200"
          >
            Lưu khoản vay
          </button>
        </form>
      </div>
    </div>
  );
};

export default React.memo(AddLoanModal);
