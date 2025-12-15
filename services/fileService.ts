import { Loan, CreditCard, FixedExpense } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Load loans data from localStorage (primary) or server API (fallback)
 */
export const loadLoansFromServer = async (): Promise<Loan[]> => {
  // Ưu tiên localStorage cho frontend-only deployment
  const saved = localStorage.getItem('debt_loans');
  if (saved) {
    try {
      const loans = JSON.parse(saved);
      if (Array.isArray(loans)) {
        return loans;
      }
    } catch (error) {
      console.error('Lỗi khi đọc từ localStorage:', error);
    }
  }

  // Fallback to server API nếu localStorage trống
  try {
    const response = await fetch(`${API_BASE_URL}/api/loans`);
    if (response.ok) {
      const loans = await response.json();
      if (Array.isArray(loans) && loans.length > 0) {
        // Sync từ server vào localStorage
        localStorage.setItem('debt_loans', JSON.stringify(loans));
        return loans;
      }
    }
  } catch (error) {
    console.error('API không khả dụng, sử dụng localStorage:', error);
  }

  return [];
};

/**
 * Save loans data to localStorage (primary) and server API (optional)
 */
export const saveLoansToServer = async (loans: Loan[]): Promise<void> => {
  // Luôn lưu vào localStorage trước
  try {
    localStorage.setItem('debt_loans', JSON.stringify(loans));
  } catch (error) {
    console.error('Lỗi khi lưu vào localStorage:', error);
    throw error;
  }

  // Thử lưu lên server nếu có (không bắt buộc)
  try {
    const response = await fetch(`${API_BASE_URL}/api/loans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ loans }),
    });
    
    if (response.ok) {
      console.log('Đã đồng bộ lên server');
    }
  } catch (error) {
    // Không throw error, chỉ log vì localStorage đã lưu thành công
    console.log('Server không khả dụng, chỉ lưu vào localStorage');
  }
};

/**
 * Load credit cards data from localStorage (primary) or server API (fallback)
 */
export const loadCreditCardsFromServer = async (): Promise<CreditCard[]> => {
  // Ưu tiên localStorage
  const saved = localStorage.getItem('debt_credit_cards');
  if (saved) {
    try {
      const cards = JSON.parse(saved);
      if (Array.isArray(cards)) {
        return cards;
      }
    } catch (error) {
      console.error('Lỗi khi đọc từ localStorage:', error);
    }
  }

  // Fallback to server API
  try {
    const response = await fetch(`${API_BASE_URL}/api/credit-cards`);
    if (response.ok) {
      const cards = await response.json();
      if (Array.isArray(cards) && cards.length > 0) {
        localStorage.setItem('debt_credit_cards', JSON.stringify(cards));
        return cards;
      }
    }
  } catch (error) {
    console.error('API không khả dụng, sử dụng localStorage:', error);
  }

  return [];
};

/**
 * Save credit cards data to localStorage (primary) and server API (optional)
 */
export const saveCreditCardsToServer = async (creditCards: CreditCard[]): Promise<void> => {
  // Luôn lưu vào localStorage trước
  try {
    localStorage.setItem('debt_credit_cards', JSON.stringify(creditCards));
  } catch (error) {
    console.error('Lỗi khi lưu vào localStorage:', error);
    throw error;
  }

  // Thử lưu lên server nếu có
  try {
    const response = await fetch(`${API_BASE_URL}/api/credit-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ creditCards }),
    });
    
    if (response.ok) {
      console.log('Đã đồng bộ lên server');
    }
  } catch (error) {
    console.log('Server không khả dụng, chỉ lưu vào localStorage');
  }
};

/**
 * Export loans data to a JSON file and trigger download (from localStorage)
 */
export const exportDataToFile = async (): Promise<void> => {
  try {
    // Lấy dữ liệu từ localStorage
    const loans = JSON.parse(localStorage.getItem('debt_loans') || '[]');
    const creditCards = JSON.parse(localStorage.getItem('debt_credit_cards') || '[]');
    const fixedExpenses = JSON.parse(localStorage.getItem('debt_fixed_expenses') || '[]');

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      loans,
      creditCards,
      fixedExpenses
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `debt-management-backup-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Lỗi khi export dữ liệu:', error);
    throw new Error('Không thể xuất dữ liệu ra file');
  }
};

/**
 * Import data from a JSON file (supports both old format - loans only, and new format - all data)
 */
export const importDataFromFile = (file: File): Promise<Loan[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        let loans: Loan[] = [];
        
        // Check for new format with all data types
        if (data.loans && Array.isArray(data.loans)) {
          loans = data.loans as Loan[];
          
          // Also import credit cards and fixed expenses if present
          if (data.creditCards && Array.isArray(data.creditCards)) {
            try {
              await saveCreditCardsToServer(data.creditCards);
            } catch (error) {
              console.error('Lỗi khi import credit cards:', error);
            }
          }
          
          if (data.fixedExpenses && Array.isArray(data.fixedExpenses)) {
            try {
              await saveFixedExpensesToServer(data.fixedExpenses);
            } catch (error) {
              console.error('Lỗi khi import fixed expenses:', error);
            }
          }
        } 
        // Handle old format (direct array of loans)
        else if (Array.isArray(data)) {
          loans = data as Loan[];
        } 
        else {
          throw new Error('Định dạng file không hợp lệ');
        }
        
        // Validate each loan has required fields
        const requiredFields = ['id', 'name', 'provider', 'type', 'originalAmount', 'payments', 'status'];
        
        for (const loan of loans) {
          for (const field of requiredFields) {
            if (!(field in loan)) {
              throw new Error(`Dữ liệu không hợp lệ: thiếu trường ${field}`);
            }
          }
        }
        
        resolve(loans);
      } catch (error) {
        console.error('Lỗi khi import dữ liệu:', error);
        reject(error instanceof Error ? error : new Error('Không thể đọc file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Không thể đọc file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Load fixed expenses data from localStorage (primary) or server API (fallback)
 */
export const loadFixedExpensesFromServer = async (): Promise<FixedExpense[]> => {
  // Ưu tiên localStorage
  const saved = localStorage.getItem('debt_fixed_expenses');
  if (saved) {
    try {
      const expenses = JSON.parse(saved);
      if (Array.isArray(expenses)) {
        return expenses;
      }
    } catch (error) {
      console.error('Lỗi khi đọc từ localStorage:', error);
    }
  }

  // Fallback to server API
  try {
    const response = await fetch(`${API_BASE_URL}/api/fixed-expenses`);
    if (response.ok) {
      const expenses = await response.json();
      if (Array.isArray(expenses) && expenses.length > 0) {
        localStorage.setItem('debt_fixed_expenses', JSON.stringify(expenses));
        return expenses;
      }
    }
  } catch (error) {
    console.error('API không khả dụng, sử dụng localStorage:', error);
  }

  return [];
};

/**
 * Save fixed expenses data to localStorage (primary) and server API (optional)
 */
export const saveFixedExpensesToServer = async (fixedExpenses: FixedExpense[]): Promise<void> => {
  // Luôn lưu vào localStorage trước
  try {
    localStorage.setItem('debt_fixed_expenses', JSON.stringify(fixedExpenses));
  } catch (error) {
    console.error('Lỗi khi lưu vào localStorage:', error);
    throw error;
  }

  // Thử lưu lên server nếu có
  try {
    const response = await fetch(`${API_BASE_URL}/api/fixed-expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fixedExpenses }),
    });
    
    if (response.ok) {
      console.log('Đã đồng bộ lên server');
    }
  } catch (error) {
    console.log('Server không khả dụng, chỉ lưu vào localStorage');
  }
};

