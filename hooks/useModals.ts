import { useState, useEffect, useCallback } from 'react';

interface UseModalsReturn {
  showAddModal: boolean;
  showAddCardModal: boolean;
  showAddExpenseModal: boolean;
  showAddIncomeModal: boolean;
  showAddLendingModal: boolean;
  showImportModal: boolean;
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAddCardModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAddExpenseModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAddIncomeModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAddLendingModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowImportModal: React.Dispatch<React.SetStateAction<boolean>>;
  closeAllModals: () => void;
}

/**
 * Custom hook to manage all modal states with ESC key support
 */
export const useModals = (): UseModalsReturn => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showAddLendingModal, setShowAddLendingModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const closeAllModals = useCallback(() => {
    setShowAddModal(false);
    setShowAddCardModal(false);
    setShowAddExpenseModal(false);
    setShowAddIncomeModal(false);
    setShowAddLendingModal(false);
    setShowImportModal(false);
  }, []);

  // Handle ESC key to close all modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        if (showAddCardModal) setShowAddCardModal(false);
        if (showAddExpenseModal) setShowAddExpenseModal(false);
        if (showAddIncomeModal) setShowAddIncomeModal(false);
        if (showAddLendingModal) setShowAddLendingModal(false);
        if (showImportModal) setShowImportModal(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showAddModal, showAddCardModal, showAddExpenseModal, showAddIncomeModal, showAddLendingModal, showImportModal]);

  return {
    showAddModal,
    showAddCardModal,
    showAddExpenseModal,
    showAddIncomeModal,
    showAddLendingModal,
    showImportModal,
    setShowAddModal,
    setShowAddCardModal,
    setShowAddExpenseModal,
    setShowAddIncomeModal,
    setShowAddLendingModal,
    setShowImportModal,
    closeAllModals
  };
};
