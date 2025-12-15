import { Loan, CreditCard, FixedExpense } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Load loans data from server API
 */
export const loadLoansFromServer = async (): Promise<Loan[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/loans`);
    if (!response.ok) {
      throw new Error('Không thể tải dữ liệu từ server');
    }
    const loans = await response.json();
    return Array.isArray(loans) ? loans : [];
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu từ server:', error);
    // Fallback to localStorage nếu API không khả dụng
    const saved = localStorage.getItem('debt_loans');
    return saved ? JSON.parse(saved) : [];
  }
};

/**
 * Save loans data to server API
 */
export const saveLoansToServer = async (loans: Loan[]): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/loans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ loans }),
    });
    
    if (!response.ok) {
      throw new Error('Không thể lưu dữ liệu lên server');
    }
    
    // Cũng lưu vào localStorage như backup
    localStorage.setItem('debt_loans', JSON.stringify(loans));
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu lên server:', error);
    // Fallback to localStorage nếu API không khả dụng
    localStorage.setItem('debt_loans', JSON.stringify(loans));
    throw error;
  }
};

/**
 * Load credit cards data from server API
 */
export const loadCreditCardsFromServer = async (): Promise<CreditCard[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/credit-cards`);
    if (!response.ok) {
      throw new Error('Không thể tải dữ liệu từ server');
    }
    const cards = await response.json();
    return Array.isArray(cards) ? cards : [];
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu từ server:', error);
    const saved = localStorage.getItem('debt_credit_cards');
    return saved ? JSON.parse(saved) : [];
  }
};

/**
 * Save credit cards data to server API
 */
export const saveCreditCardsToServer = async (creditCards: CreditCard[]): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/credit-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ creditCards }),
    });
    
    if (!response.ok) {
      throw new Error('Không thể lưu dữ liệu lên server');
    }
    
    localStorage.setItem('debt_credit_cards', JSON.stringify(creditCards));
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu lên server:', error);
    localStorage.setItem('debt_credit_cards', JSON.stringify(creditCards));
    throw error;
  }
};

/**
 * Export loans data to a JSON file and trigger download (from server)
 */
export const exportDataToFile = async (): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/export`);
    if (!response.ok) {
      throw new Error('Không thể export dữ liệu từ server');
    }
    
    const data = await response.json();
    const jsonString = JSON.stringify(data, null, 2);
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
 * Import loans data from a JSON file
 */
export const importDataFromFile = (file: File): Promise<Loan[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate data structure
        if (!data || !Array.isArray(data.loans)) {
          // Try to handle old format (direct array)
          if (Array.isArray(data)) {
            resolve(data as Loan[]);
            return;
          }
          throw new Error('Định dạng file không hợp lệ');
        }
        
        // Validate each loan has required fields
        const loans = data.loans as Loan[];
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
 * Load fixed expenses data from server API
 */
export const loadFixedExpensesFromServer = async (): Promise<FixedExpense[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fixed-expenses`);
    if (!response.ok) {
      throw new Error('Không thể tải dữ liệu từ server');
    }
    const expenses = await response.json();
    return Array.isArray(expenses) ? expenses : [];
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu từ server:', error);
    const saved = localStorage.getItem('debt_fixed_expenses');
    return saved ? JSON.parse(saved) : [];
  }
};

/**
 * Save fixed expenses data to server API
 */
export const saveFixedExpensesToServer = async (fixedExpenses: FixedExpense[]): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fixed-expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fixedExpenses }),
    });
    
    if (!response.ok) {
      throw new Error('Không thể lưu dữ liệu lên server');
    }
    
    localStorage.setItem('debt_fixed_expenses', JSON.stringify(fixedExpenses));
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu lên server:', error);
    localStorage.setItem('debt_fixed_expenses', JSON.stringify(fixedExpenses));
    throw error;
  }
};

