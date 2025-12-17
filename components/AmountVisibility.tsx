import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Override = 'show' | 'hide';

interface AmountVisibilityContextValue {
  globalHidden: boolean;
  toggleGlobal: () => void;
  isHidden: (id?: string) => boolean;
  toggleItem: (id: string) => void;
  formatAmount: (value: number, id?: string) => string;
}

const AmountVisibilityContext = createContext<AmountVisibilityContextValue | undefined>(undefined);

const formatCurrencyLocal = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const AmountVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalHidden, setGlobalHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('debt_app_hide_amounts');
    if (stored === null) return true; // mặc định ẩn
    return stored === 'true';
  });
  const [itemVisibility, setItemVisibility] = useState<Record<string, Override>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('debt_app_hide_amounts', String(globalHidden));
  }, [globalHidden]);

  const isHidden = (id?: string) => {
    if (!id) return globalHidden;
    const override = itemVisibility[id];
    if (override === 'show') return false;
    if (override === 'hide') return true;
    return globalHidden;
  };

  const toggleGlobal = () => {
    setGlobalHidden(prev => {
      const next = !prev;
      // Khi bật hiển thị toàn bộ, xóa các override để đồng bộ
      if (!next) {
        setItemVisibility({});
      }
      return next;
    });
  };

  const toggleItem = (id: string) => {
    setItemVisibility(prev => {
      const currentlyHidden = (() => {
        const ov = prev[id];
        if (ov === 'show') return false;
        if (ov === 'hide') return true;
        return globalHidden;
      })();
      const next: Override = currentlyHidden ? 'show' : 'hide';
      return { ...prev, [id]: next };
    });
  };

  const formatAmount = (value: number, id?: string) => {
    return isHidden(id) ? '••••••' : formatCurrencyLocal(value);
  };

  const value = useMemo(
    () => ({
      globalHidden,
      toggleGlobal,
      isHidden,
      toggleItem,
      formatAmount
    }),
    [globalHidden, itemVisibility]
  );

  return (
    <AmountVisibilityContext.Provider value={value}>
      {children}
    </AmountVisibilityContext.Provider>
  );
};

export const useAmountVisibility = () => {
  const ctx = useContext(AmountVisibilityContext);
  if (!ctx) {
    throw new Error('useAmountVisibility must be used within AmountVisibilityProvider');
  }
  return ctx;
};

type AmountProps = {
  value: number;
  id: string;
  className?: string;
  showToggle?: boolean;
};

export const Amount: React.FC<AmountProps> = ({ value, id, className, showToggle = true }) => {
  const { isHidden, toggleItem, formatAmount } = useAmountVisibility();
  const hidden = isHidden(id);
  const display = formatAmount(value, id);

  return (
    <span className={`inline-flex items-center gap-1 align-middle ${className ?? ''}`}>
      <span>{display}</span>
      {showToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleItem(id);
          }}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
          aria-label={hidden ? 'Hiển thị số tiền' : 'Ẩn số tiền'}
        >
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </span>
  );
};

