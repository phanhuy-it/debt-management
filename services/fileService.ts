import { Loan, CreditCard, FixedExpense } from '../types';
import { supabase, loanRowToLoan, creditCardRowToCreditCard, fixedExpenseRowToFixedExpense, loanToLoanRow, creditCardToCreditCardRow, fixedExpenseToFixedExpenseRow } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const USE_SUPABASE = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

/**
 * Load loans data from Supabase (primary) or server API/localStorage (fallback)
 */
export const loadLoansFromServer = async (): Promise<Loan[]> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const loans = data.map(loanRowToLoan);
        
        // Sync vào localStorage làm backup
        try {
          localStorage.setItem('debt_loans', JSON.stringify(loans));
        } catch (e) {
          console.warn('Không thể lưu vào localStorage:', e);
        }
        
        // Migrate từ localStorage nếu database trống
        if (loans.length === 0) {
          const localSaved = localStorage.getItem('debt_loans');
          if (localSaved) {
            try {
              const localLoans = JSON.parse(localSaved);
              if (Array.isArray(localLoans) && localLoans.length > 0) {
                await saveLoansToServer(localLoans);
                return localLoans;
              }
            } catch (e) {
              console.error('Lỗi khi migrate từ localStorage:', e);
            }
          }
        }
        
        return loans;
      }
    } catch (error) {
      console.error('Lỗi khi tải từ Supabase:', error);
    }
  }

  // Fallback to server API (file-based database)
  try {
    const response = await fetch(`${API_BASE_URL}/api/loans`);
    if (response.ok) {
      const loans = await response.json();
      if (Array.isArray(loans)) {
        try {
          localStorage.setItem('debt_loans', JSON.stringify(loans));
        } catch (e) {
          console.warn('Không thể lưu vào localStorage:', e);
        }
        return loans;
      }
    }
  } catch (error) {
    console.warn('API không khả dụng, sử dụng localStorage:', error);
  }

  // Fallback to localStorage
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

  return [];
};

/**
 * Save loans data to Supabase (primary) or server API/localStorage (fallback)
 */
export const saveLoansToServer = async (loans: Loan[]): Promise<void> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      // Convert loans to database rows
      const rows = loans.map(loan => loanToLoanRow(loan));
      
      // Use upsert to update existing and insert new records
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('loans')
          .upsert(rows, { onConflict: 'id' });

        if (upsertError) throw upsertError;
      }

      // Delete records that are not in the current loans array
      if (loans.length > 0) {
        const currentIds = loans.map(l => l.id);
        const { data: allLoans } = await supabase
          .from('loans')
          .select('id');
        
        if (allLoans) {
          const idsToDelete = allLoans
            .map(l => l.id)
            .filter(id => !currentIds.includes(id));
          
          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('loans')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteError) console.warn('Lỗi khi xóa records cũ:', deleteError);
          }
        }
      } else {
        // Nếu không có loans, xóa tất cả
        const { error: deleteError } = await supabase
          .from('loans')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError) console.warn('Lỗi khi xóa tất cả:', deleteError);
      }

      console.log('✅ Đã lưu vào Supabase database');
      
      // Backup vào localStorage
      try {
        localStorage.setItem('debt_loans', JSON.stringify(loans));
      } catch (e) {
        console.warn('Không thể lưu vào localStorage:', e);
      }
      
      return;
    } catch (error) {
      console.error('❌ Lỗi khi lưu vào Supabase:', error);
      throw error;
    }
  }

  // Fallback to server API (file-based database)
  try {
    const response = await fetch(`${API_BASE_URL}/api/loans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ loans }),
    });
    
    if (response.ok) {
      console.log('Đã lưu vào file database trên server');
      
      try {
        localStorage.setItem('debt_loans', JSON.stringify(loans));
      } catch (e) {
        console.warn('Không thể lưu vào localStorage:', e);
      }
      
      return;
    } else {
      throw new Error(`Server trả về lỗi: ${response.status}`);
    }
  } catch (error) {
    console.error('Lỗi khi lưu lên server:', error);
    
    // Fallback: Lưu vào localStorage
    try {
      localStorage.setItem('debt_loans', JSON.stringify(loans));
      console.warn('Đã lưu vào localStorage (server không khả dụng)');
    } catch (localError) {
      console.error('Lỗi khi lưu vào localStorage:', localError);
      throw new Error('Không thể lưu dữ liệu');
    }
    
    throw error;
  }
};

/**
 * Load credit cards data from Supabase (primary) or server API/localStorage (fallback)
 */
export const loadCreditCardsFromServer = async (): Promise<CreditCard[]> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const cards = data.map(creditCardRowToCreditCard);
        
        try {
          localStorage.setItem('debt_credit_cards', JSON.stringify(cards));
        } catch (e) {
          console.warn('Không thể lưu vào localStorage:', e);
        }
        
        // Migrate từ localStorage nếu database trống
        if (cards.length === 0) {
          const localSaved = localStorage.getItem('debt_credit_cards');
          if (localSaved) {
            try {
              const localCards = JSON.parse(localSaved);
              if (Array.isArray(localCards) && localCards.length > 0) {
                await saveCreditCardsToServer(localCards);
                return localCards;
              }
            } catch (e) {
              console.error('Lỗi khi migrate từ localStorage:', e);
            }
          }
        }
        
        return cards;
      }
    } catch (error) {
      console.error('Lỗi khi tải từ Supabase:', error);
    }
  }

  // Fallback to server API
  try {
    const response = await fetch(`${API_BASE_URL}/api/credit-cards`);
    if (response.ok) {
      const cards = await response.json();
      if (Array.isArray(cards)) {
        try {
          localStorage.setItem('debt_credit_cards', JSON.stringify(cards));
        } catch (e) {
          console.warn('Không thể lưu vào localStorage:', e);
        }
        return cards;
      }
    }
  } catch (error) {
    console.warn('API không khả dụng, sử dụng localStorage:', error);
  }

  // Fallback to localStorage
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

  return [];
};

/**
 * Save credit cards data to Supabase (primary) or server API/localStorage (fallback)
 */
export const saveCreditCardsToServer = async (creditCards: CreditCard[]): Promise<void> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const rows = creditCards.map(card => creditCardToCreditCardRow(card));
      
      // Use upsert to update existing and insert new records
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('credit_cards')
          .upsert(rows, { onConflict: 'id' });

        if (upsertError) throw upsertError;
      }

      // Delete records that are not in the current array
      if (creditCards.length > 0) {
        const currentIds = creditCards.map(c => c.id);
        const { data: allCards } = await supabase
          .from('credit_cards')
          .select('id');
        
        if (allCards) {
          const idsToDelete = allCards
            .map(c => c.id)
            .filter(id => !currentIds.includes(id));
          
          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('credit_cards')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteError) console.warn('Lỗi khi xóa records cũ:', deleteError);
          }
        }
      } else {
        const { error: deleteError } = await supabase
          .from('credit_cards')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError) console.warn('Lỗi khi xóa tất cả:', deleteError);
      }

      console.log('✅ Đã lưu vào Supabase database');
      
      try {
        localStorage.setItem('debt_credit_cards', JSON.stringify(creditCards));
      } catch (e) {
        console.warn('Không thể lưu vào localStorage:', e);
      }
      
      return;
    } catch (error) {
      console.error('❌ Lỗi khi lưu vào Supabase:', error);
      throw error;
    }
  }

  // Fallback to server API
  try {
    const response = await fetch(`${API_BASE_URL}/api/credit-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ creditCards }),
    });
    
    if (response.ok) {
      console.log('Đã lưu vào file database trên server');
      
      try {
        localStorage.setItem('debt_credit_cards', JSON.stringify(creditCards));
      } catch (e) {
        console.warn('Không thể lưu vào localStorage:', e);
      }
      
      return;
    } else {
      throw new Error(`Server trả về lỗi: ${response.status}`);
    }
  } catch (error) {
    console.error('Lỗi khi lưu lên server:', error);
    
    try {
      localStorage.setItem('debt_credit_cards', JSON.stringify(creditCards));
      console.warn('Đã lưu vào localStorage (server không khả dụng)');
    } catch (localError) {
      console.error('Lỗi khi lưu vào localStorage:', localError);
      throw new Error('Không thể lưu dữ liệu');
    }
    
    throw error;
  }
};

/**
 * Export loans data to a JSON file and trigger download (from Supabase/server/localStorage)
 */
export const exportDataToFile = async (): Promise<void> => {
  try {
    let loans: Loan[] = [];
    let creditCards: CreditCard[] = [];
    let fixedExpenses: FixedExpense[] = [];
    
    // Ưu tiên lấy từ Supabase
    if (USE_SUPABASE) {
      try {
        const [loansResult, cardsResult, expensesResult] = await Promise.all([
          supabase.from('loans').select('*'),
          supabase.from('credit_cards').select('*'),
          supabase.from('fixed_expenses').select('*')
        ]);

        if (loansResult.data) loans = loansResult.data.map(loanRowToLoan);
        if (cardsResult.data) creditCards = cardsResult.data.map(creditCardRowToCreditCard);
        if (expensesResult.data) fixedExpenses = expensesResult.data.map(fixedExpenseRowToFixedExpense);
      } catch (error) {
        console.warn('Lỗi khi lấy từ Supabase, thử fallback:', error);
      }
    }

    // Nếu không có dữ liệu từ Supabase, thử server API
    if ((loans.length === 0 && creditCards.length === 0 && fixedExpenses.length === 0) || !USE_SUPABASE) {
      try {
        const [loansResponse, cardsResponse, expensesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/loans`).catch(() => null),
          fetch(`${API_BASE_URL}/api/credit-cards`).catch(() => null),
          fetch(`${API_BASE_URL}/api/fixed-expenses`).catch(() => null)
        ]);
        
        if (loansResponse?.ok) {
          loans = await loansResponse.json();
        }
        
        if (cardsResponse?.ok) {
          creditCards = await cardsResponse.json();
        }
        
        if (expensesResponse?.ok) {
          fixedExpenses = await expensesResponse.json();
        }
      } catch (error) {
        console.warn('Lỗi khi lấy từ server:', error);
      }
    }

    // Fallback to localStorage
    if (loans.length === 0) {
      const saved = localStorage.getItem('debt_loans');
      if (saved) loans = JSON.parse(saved);
    }
    if (creditCards.length === 0) {
      const saved = localStorage.getItem('debt_credit_cards');
      if (saved) creditCards = JSON.parse(saved);
    }
    if (fixedExpenses.length === 0) {
      const saved = localStorage.getItem('debt_fixed_expenses');
      if (saved) fixedExpenses = JSON.parse(saved);
    }

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      loans: Array.isArray(loans) ? loans : [],
      creditCards: Array.isArray(creditCards) ? creditCards : [],
      fixedExpenses: Array.isArray(fixedExpenses) ? fixedExpenses : []
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
 * Load fixed expenses data from Supabase (primary) or server API/localStorage (fallback)
 */
export const loadFixedExpensesFromServer = async (): Promise<FixedExpense[]> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const expenses = data.map(fixedExpenseRowToFixedExpense);
        
        try {
          localStorage.setItem('debt_fixed_expenses', JSON.stringify(expenses));
        } catch (e) {
          console.warn('Không thể lưu vào localStorage:', e);
        }
        
        // Migrate từ localStorage nếu database trống
        if (expenses.length === 0) {
          const localSaved = localStorage.getItem('debt_fixed_expenses');
          if (localSaved) {
            try {
              const localExpenses = JSON.parse(localSaved);
              if (Array.isArray(localExpenses) && localExpenses.length > 0) {
                await saveFixedExpensesToServer(localExpenses);
                return localExpenses;
              }
            } catch (e) {
              console.error('Lỗi khi migrate từ localStorage:', e);
            }
          }
        }
        
        return expenses;
      }
    } catch (error) {
      console.error('Lỗi khi tải từ Supabase:', error);
    }
  }

  // Fallback to server API
  try {
    const response = await fetch(`${API_BASE_URL}/api/fixed-expenses`);
    if (response.ok) {
      const expenses = await response.json();
      if (Array.isArray(expenses)) {
        try {
          localStorage.setItem('debt_fixed_expenses', JSON.stringify(expenses));
        } catch (e) {
          console.warn('Không thể lưu vào localStorage:', e);
        }
        return expenses;
      }
    }
  } catch (error) {
    console.warn('API không khả dụng, sử dụng localStorage:', error);
  }

  // Fallback to localStorage
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

  return [];
};

/**
 * Save fixed expenses data to Supabase (primary) or server API/localStorage (fallback)
 */
export const saveFixedExpensesToServer = async (fixedExpenses: FixedExpense[]): Promise<void> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const rows = fixedExpenses.map(expense => fixedExpenseToFixedExpenseRow(expense));
      
      // Use upsert to update existing and insert new records
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('fixed_expenses')
          .upsert(rows, { onConflict: 'id' });

        if (upsertError) throw upsertError;
      }

      // Delete records that are not in the current array
      if (fixedExpenses.length > 0) {
        const currentIds = fixedExpenses.map(e => e.id);
        const { data: allExpenses } = await supabase
          .from('fixed_expenses')
          .select('id');
        
        if (allExpenses) {
          const idsToDelete = allExpenses
            .map(e => e.id)
            .filter(id => !currentIds.includes(id));
          
          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('fixed_expenses')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteError) console.warn('Lỗi khi xóa records cũ:', deleteError);
          }
        }
      } else {
        const { error: deleteError } = await supabase
          .from('fixed_expenses')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError) console.warn('Lỗi khi xóa tất cả:', deleteError);
      }

      console.log('✅ Đã lưu vào Supabase database');
      
      try {
        localStorage.setItem('debt_fixed_expenses', JSON.stringify(fixedExpenses));
      } catch (e) {
        console.warn('Không thể lưu vào localStorage:', e);
      }
      
      return;
    } catch (error) {
      console.error('❌ Lỗi khi lưu vào Supabase:', error);
      throw error;
    }
  }

  // Fallback to server API
  try {
    const response = await fetch(`${API_BASE_URL}/api/fixed-expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fixedExpenses }),
    });
    
    if (response.ok) {
      console.log('Đã lưu vào file database trên server');
      
      try {
        localStorage.setItem('debt_fixed_expenses', JSON.stringify(fixedExpenses));
      } catch (e) {
        console.warn('Không thể lưu vào localStorage:', e);
      }
      
      return;
    } else {
      throw new Error(`Server trả về lỗi: ${response.status}`);
    }
  } catch (error) {
    console.error('Lỗi khi lưu lên server:', error);
    
    try {
      localStorage.setItem('debt_fixed_expenses', JSON.stringify(fixedExpenses));
      console.warn('Đã lưu vào localStorage (server không khả dụng)');
    } catch (localError) {
      console.error('Lỗi khi lưu vào localStorage:', localError);
      throw new Error('Không thể lưu dữ liệu');
    }
    
    throw error;
  }
};

