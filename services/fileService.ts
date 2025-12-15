import { Loan, CreditCard, FixedExpense, Income, Payment } from '../types';
import { supabase, loanRowToLoan, creditCardRowToCreditCard, fixedExpenseRowToFixedExpense, incomeRowToIncome, loanToLoanRow, creditCardToCreditCardRow, fixedExpenseToFixedExpenseRow, incomeToIncomeRow } from './supabase';
import { generateUUID, isValidUUID } from '../utils/uuid';

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
    let incomes: Income[] = [];
    
    // Ưu tiên lấy từ Supabase
    if (USE_SUPABASE) {
      try {
        const [loansResult, cardsResult, expensesResult, incomesResult] = await Promise.all([
          supabase.from('loans').select('*'),
          supabase.from('credit_cards').select('*'),
          supabase.from('fixed_expenses').select('*'),
          supabase.from('income').select('*')
        ]);

        if (loansResult.data) loans = loansResult.data.map(loanRowToLoan);
        if (cardsResult.data) creditCards = cardsResult.data.map(creditCardRowToCreditCard);
        if (expensesResult.data) fixedExpenses = expensesResult.data.map(fixedExpenseRowToFixedExpense);
        if (incomesResult.data) incomes = incomesResult.data.map(incomeRowToIncome);
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
    if (incomes.length === 0) {
      const saved = localStorage.getItem('debt_income');
      if (saved) incomes = JSON.parse(saved);
    }

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      loans: Array.isArray(loans) ? loans : [],
      creditCards: Array.isArray(creditCards) ? creditCards : [],
      fixedExpenses: Array.isArray(fixedExpenses) ? fixedExpenses : [],
      incomes: Array.isArray(incomes) ? incomes : []
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
 * Helper function to migrate ID from timestamp to UUID format
 */
function migratePaymentIds(payments: Payment[]): Payment[] {
  return payments.map(payment => ({
    ...payment,
    id: isValidUUID(payment.id) ? payment.id : generateUUID()
  }));
}

/**
 * Helper function to migrate Loan IDs from timestamp to UUID
 */
function migrateLoanIds(loans: Loan[]): Loan[] {
  return loans.map(loan => ({
    ...loan,
    id: isValidUUID(loan.id) ? loan.id : generateUUID(),
    payments: migratePaymentIds(loan.payments || [])
  }));
}

/**
 * Helper function to migrate CreditCard IDs from timestamp to UUID
 */
function migrateCreditCardIds(cards: CreditCard[]): CreditCard[] {
  return cards.map(card => ({
    ...card,
    id: isValidUUID(card.id) ? card.id : generateUUID(),
    payments: migratePaymentIds(card.payments || [])
  }));
}

/**
 * Helper function to migrate FixedExpense IDs from timestamp to UUID
 */
function migrateFixedExpenseIds(expenses: FixedExpense[]): FixedExpense[] {
  return expenses.map(expense => ({
    ...expense,
    id: isValidUUID(expense.id) ? expense.id : generateUUID(),
    payments: migratePaymentIds(expense.payments || [])
  }));
}

/**
 * Helper function to migrate Income IDs from timestamp to UUID
 */
function migrateIncomeIds(incomes: Income[]): Income[] {
  return incomes.map(income => ({
    ...income,
    id: isValidUUID(income.id) ? income.id : generateUUID(),
    payments: migratePaymentIds(income.payments || [])
  }));
}

/**
 * Import data from a JSON file (supports both old format - loans only, and new format - all data)
 * Returns all imported data with migrated UUIDs
 */
export interface ImportedData {
  loans: Loan[];
  creditCards: CreditCard[];
  fixedExpenses: FixedExpense[];
  incomes: Income[];
}

export const importDataFromFile = (file: File): Promise<ImportedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('Không thể đọc nội dung file');
        }
        
        const content = e.target.result as string;
        
        if (!content || content.trim().length === 0) {
          throw new Error('File rỗng hoặc không có nội dung');
        }
        
        let data: any;
        try {
          data = JSON.parse(content);
        } catch (parseError) {
          console.error('Lỗi parse JSON:', parseError);
          throw new Error('File không phải định dạng JSON hợp lệ: ' + (parseError instanceof Error ? parseError.message : 'Lỗi không xác định'));
        }
        
        if (!data || typeof data !== 'object') {
          throw new Error('Dữ liệu trong file không hợp lệ');
        }
        
        let loans: Loan[] = [];
        let creditCards: CreditCard[] = [];
        let fixedExpenses: FixedExpense[] = [];
        let incomes: Income[] = [];
        
        try {
          // Check for new format with all data types
          if (data.loans && Array.isArray(data.loans)) {
            loans = data.loans as Loan[];
            console.log(`Tìm thấy ${loans.length} khoản vay`);
            // Migrate IDs from timestamp to UUID
            loans = migrateLoanIds(loans);
          }
          
          if (data.creditCards && Array.isArray(data.creditCards)) {
            creditCards = data.creditCards as CreditCard[];
            console.log(`Tìm thấy ${creditCards.length} thẻ tín dụng`);
            // Migrate IDs from timestamp to UUID
            creditCards = migrateCreditCardIds(creditCards);
          }
          
          if (data.fixedExpenses && Array.isArray(data.fixedExpenses)) {
            fixedExpenses = data.fixedExpenses as FixedExpense[];
            console.log(`Tìm thấy ${fixedExpenses.length} chi tiêu cố định`);
            // Migrate IDs from timestamp to UUID
            fixedExpenses = migrateFixedExpenseIds(fixedExpenses);
          }
          
          if (data.incomes && Array.isArray(data.incomes)) {
            incomes = data.incomes as Income[];
            console.log(`Tìm thấy ${incomes.length} nguồn thu nhập`);
            // Migrate IDs from timestamp to UUID
            incomes = migrateIncomeIds(incomes);
          }
          
          // Handle old format (direct array of loans)
          if (Array.isArray(data) && loans.length === 0) {
            loans = data as Loan[];
            console.log(`Format cũ: Tìm thấy ${loans.length} khoản vay`);
            loans = migrateLoanIds(loans);
          }
        } catch (migrateError) {
          console.error('Lỗi khi migrate ID:', migrateError);
          throw new Error('Lỗi khi chuyển đổi ID: ' + (migrateError instanceof Error ? migrateError.message : 'Lỗi không xác định'));
        }
        
        // Validate data
        if (loans.length === 0 && creditCards.length === 0 && fixedExpenses.length === 0 && incomes.length === 0) {
          throw new Error('File không chứa dữ liệu hợp lệ. Vui lòng kiểm tra định dạng file.');
        }
        
        // Validate each loan has required fields (optional fields allowed)
        const loanRequiredFields = ['id', 'name', 'provider', 'type', 'originalAmount', 'payments', 'status'];
        for (let i = 0; i < loans.length; i++) {
          const loan = loans[i];
          for (const field of loanRequiredFields) {
            if (!(field in loan)) {
              throw new Error(`Dữ liệu không hợp lệ: Khoản vay thứ ${i + 1} thiếu trường "${field}"`);
            }
          }
          // Ensure payments is an array
          if (!Array.isArray(loan.payments)) {
            loan.payments = [];
          }
        }
        
        // Validate credit cards (make fields optional if missing with defaults)
        const cardRequiredFields = ['id', 'name', 'provider', 'creditLimit', 'totalDebt', 'dueDate', 'payments', 'status'];
        for (let i = 0; i < creditCards.length; i++) {
          const card = creditCards[i] as any;
          
          // Check required fields
          for (const field of cardRequiredFields) {
            if (!(field in card)) {
              // Set defaults for missing fields
              if (field === 'creditLimit') card.creditLimit = 0;
              else if (field === 'totalDebt') card.totalDebt = 0;
              else if (field === 'dueDate') card.dueDate = 1;
              else if (field === 'payments') card.payments = [];
              else if (field === 'status') card.status = 'ACTIVE';
              else {
                throw new Error(`Dữ liệu không hợp lệ: Thẻ tín dụng thứ ${i + 1} thiếu trường "${field}"`);
              }
            }
          }
          
          // Ensure optional fields have defaults
          if (!('paymentAmount' in card)) {
            card.paymentAmount = 0;
          }
          
          // Ensure payments is an array
          if (!Array.isArray(card.payments)) {
            card.payments = [];
          }
        }
        
        // Validate fixed expenses (make fields optional if missing with defaults)
        const expenseRequiredFields = ['id', 'name', 'amount', 'dueDate', 'payments', 'status'];
        for (let i = 0; i < fixedExpenses.length; i++) {
          const expense = fixedExpenses[i];
          for (const field of expenseRequiredFields) {
            if (!(field in expense)) {
              // Set defaults for missing fields
              if (field === 'amount') expense.amount = 0;
              else if (field === 'dueDate') expense.dueDate = 1;
              else if (field === 'payments') expense.payments = [];
              else if (field === 'status') expense.status = 'ACTIVE';
              else {
                throw new Error(`Dữ liệu không hợp lệ: Chi tiêu cố định thứ ${i + 1} thiếu trường "${field}"`);
              }
            }
          }
          // Ensure payments is an array
          if (!Array.isArray(expense.payments)) {
            expense.payments = [];
          }
        }
        
        // Validate income (make fields optional if missing with defaults)
        const incomeRequiredFields = ['id', 'name', 'amount', 'receivedDate', 'payments', 'status'];
        for (let i = 0; i < incomes.length; i++) {
          const income = incomes[i] as any;
          for (const field of incomeRequiredFields) {
            if (!(field in income)) {
              // Set defaults for missing fields
              if (field === 'amount') income.amount = 0;
              else if (field === 'receivedDate') income.receivedDate = 1;
              else if (field === 'payments') income.payments = [];
              else if (field === 'status') income.status = 'ACTIVE';
              else {
                throw new Error(`Dữ liệu không hợp lệ: Thu nhập thứ ${i + 1} thiếu trường "${field}"`);
              }
            }
          }
          // Ensure payments is an array
          if (!Array.isArray(income.payments)) {
            income.payments = [];
          }
        }
        
        console.log('Import thành công:', {
          loans: loans.length,
          creditCards: creditCards.length,
          fixedExpenses: fixedExpenses.length,
          incomes: incomes.length
        });
        
        resolve({
          loans,
          creditCards,
          fixedExpenses,
          incomes
        });
      } catch (error) {
        console.error('Lỗi chi tiết khi import:', error);
        if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error('Lỗi không xác định khi import dữ liệu: ' + String(error)));
        }
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error('Không thể đọc file. Vui lòng kiểm tra file có bị hỏng không.'));
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


/**
 * Load income data from Supabase (primary) or localStorage (fallback)
 */
export const loadIncomeFromServer = async (): Promise<Income[]> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('income')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const incomes = data.map(incomeRowToIncome);
        
        try {
          localStorage.setItem('debt_income', JSON.stringify(incomes));
        } catch (e) {
          console.warn('Không thể lưu vào localStorage:', e);
        }
        
        // Migrate từ localStorage nếu database trống
        if (incomes.length === 0) {
          const localSaved = localStorage.getItem('debt_income');
          if (localSaved) {
            try {
              const localIncomes = JSON.parse(localSaved);
              if (Array.isArray(localIncomes) && localIncomes.length > 0) {
                await saveIncomeToServer(localIncomes);
                return localIncomes;
              }
            } catch (e) {
              console.error('Lỗi khi migrate từ localStorage:', e);
            }
          }
        }
        
        return incomes;
      }
    } catch (error) {
      console.error('Lỗi khi tải từ Supabase:', error);
    }
  }

  // Fallback to localStorage
  const saved = localStorage.getItem('debt_income');
  if (saved) {
    try {
      const incomes = JSON.parse(saved);
      if (Array.isArray(incomes)) {
        return incomes;
      }
    } catch (error) {
      console.error('Lỗi khi đọc từ localStorage:', error);
    }
  }

  return [];
};

/**
 * Save income data to Supabase (primary) or localStorage (fallback)
 */
export const saveIncomeToServer = async (incomes: Income[]): Promise<void> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const rows = incomes.map(income => incomeToIncomeRow(income));
      
      // Use upsert to update existing and insert new records
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('income')
          .upsert(rows, { onConflict: 'id' });

        if (upsertError) throw upsertError;
      }

      // Delete records that are not in the current array
      if (incomes.length > 0) {
        const currentIds = incomes.map(i => i.id);
        const { data: allIncomes } = await supabase
          .from('income')
          .select('id');
        
        if (allIncomes) {
          const idsToDelete = allIncomes
            .map(i => i.id)
            .filter(id => !currentIds.includes(id));
          
          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('income')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteError) console.warn('Lỗi khi xóa records cũ:', deleteError);
          }
        }
      } else {
        const { error: deleteError } = await supabase
          .from('income')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError) console.warn('Lỗi khi xóa tất cả:', deleteError);
      }

      console.log('✅ Đã lưu vào Supabase database');
      
      try {
        localStorage.setItem('debt_income', JSON.stringify(incomes));
      } catch (e) {
        console.warn('Không thể lưu vào localStorage:', e);
      }
      
      return;
    } catch (error) {
      console.error('❌ Lỗi khi lưu vào Supabase:', error);
      throw error;
    }
  }

  // Fallback to localStorage
  try {
    localStorage.setItem('debt_income', JSON.stringify(incomes));
    console.warn('Đã lưu vào localStorage (Supabase không khả dụng)');
  } catch (localError) {
    console.error('Lỗi khi lưu vào localStorage:', localError);
    throw new Error('Không thể lưu dữ liệu');
  }
};
