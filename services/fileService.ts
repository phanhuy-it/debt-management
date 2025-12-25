import { Loan, CreditCard, FixedExpense, Income, Lending, Investment, Payment, InvestmentAccount, InvestmentTransaction } from '../types';
import { supabase, loanRowToLoan, creditCardRowToCreditCard, fixedExpenseRowToFixedExpense, incomeRowToIncome, lendingRowToLending, investmentRowToInvestment, loanToLoanRow, creditCardToCreditCardRow, fixedExpenseToFixedExpenseRow, incomeToIncomeRow, lendingToLendingRow, investmentToInvestmentRow, investmentAccountRowToInvestmentAccount, investmentAccountToInvestmentAccountRow, investmentTransactionRowToInvestmentTransaction, investmentTransactionToInvestmentTransactionRow } from './supabase';
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
        const [loansResult, cardsResult, expensesResult, incomesResult, lendingsResult] = await Promise.all([
          supabase.from('loans').select('*'),
          supabase.from('credit_cards').select('*'),
          supabase.from('fixed_expenses').select('*'),
          supabase.from('income').select('*'),
          supabase.from('lendings').select('*')
        ]);

        if (loansResult.data) loans = loansResult.data.map(loanRowToLoan);
        if (cardsResult.data) creditCards = cardsResult.data.map(creditCardRowToCreditCard);
        if (expensesResult.data) fixedExpenses = expensesResult.data.map(fixedExpenseRowToFixedExpense);
        if (incomesResult.data) incomes = incomesResult.data.map(incomeRowToIncome);
        if (lendingsResult.data) lendings = lendingsResult.data.map(lendingRowToLending);
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

    let lendings: Lending[] = [];
    const savedLendings = localStorage.getItem('debt_lendings');
    if (savedLendings) {
      try {
        lendings = JSON.parse(savedLendings);
      } catch (e) {
        console.warn('Lỗi khi đọc lendings từ localStorage:', e);
      }
    }

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      loans: Array.isArray(loans) ? loans : [],
      creditCards: Array.isArray(creditCards) ? creditCards : [],
      fixedExpenses: Array.isArray(fixedExpenses) ? fixedExpenses : [],
      incomes: Array.isArray(incomes) ? incomes : [],
      lendings: Array.isArray(lendings) ? lendings : [],
      investments: []
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
  lendings: Lending[];
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
        let lendings: Lending[] = [];
        
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
          
          if (data.lendings && Array.isArray(data.lendings)) {
            lendings = data.lendings as Lending[];
            console.log(`Tìm thấy ${lendings.length} khoản cho vay`);
            // Migrate IDs from timestamp to UUID
            lendings = lendings.map(lending => ({
              ...lending,
              id: isValidUUID(lending.id) ? lending.id : generateUUID(),
              payments: migratePaymentIds(lending.payments || [])
            }));
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
        if (loans.length === 0 && creditCards.length === 0 && fixedExpenses.length === 0 && incomes.length === 0 && lendings.length === 0) {
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
          incomes,
          lendings
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

/**
 * Load lendings data from Supabase (primary) or localStorage (fallback)
 */
export const loadLendingsFromServer = async (): Promise<Lending[]> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('lendings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const lendings = data.map(lendingRowToLending);
        
        try {
          localStorage.setItem('debt_lendings', JSON.stringify(lendings));
        } catch (e) {
          console.warn('Không thể lưu vào localStorage:', e);
        }
        
        // Migrate từ localStorage nếu database trống
        if (lendings.length === 0) {
          const localSaved = localStorage.getItem('debt_lendings');
          if (localSaved) {
            try {
              const localLendings = JSON.parse(localSaved);
              if (Array.isArray(localLendings) && localLendings.length > 0) {
                await saveLendingsToServer(localLendings);
                return localLendings;
              }
            } catch (e) {
              console.error('Lỗi khi migrate từ localStorage:', e);
            }
          }
        }
        
        return lendings;
      }
    } catch (error) {
      console.error('Lỗi khi tải từ Supabase:', error);
    }
  }

  // Fallback to localStorage
  const saved = localStorage.getItem('debt_lendings');
  if (saved) {
    try {
      const lendings = JSON.parse(saved);
      if (Array.isArray(lendings)) {
        return lendings;
      }
    } catch (error) {
      console.error('Lỗi khi đọc từ localStorage:', error);
    }
  }

  return [];
};

/**
 * Save lendings data to Supabase (primary) or localStorage (fallback)
 */
export const saveLendingsToServer = async (lendings: Lending[]): Promise<void> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const rows = lendings.map(lending => lendingToLendingRow(lending));
      
      // Use upsert to update existing and insert new records
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('lendings')
          .upsert(rows, { onConflict: 'id' });

        if (upsertError) throw upsertError;
      }

      // Delete records that are not in the current array
      if (lendings.length > 0) {
        const currentIds = lendings.map(l => l.id);
        const { data: allLendings } = await supabase
          .from('lendings')
          .select('id');
        
        if (allLendings) {
          const idsToDelete = allLendings
            .map(l => l.id)
            .filter(id => !currentIds.includes(id));
          
          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('lendings')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteError) console.warn('Lỗi khi xóa records cũ:', deleteError);
          }
        }
      } else {
        const { error: deleteError } = await supabase
          .from('lendings')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError) console.warn('Lỗi khi xóa tất cả:', deleteError);
      }

      console.log('✅ Đã lưu vào Supabase database');
      
      try {
        localStorage.setItem('debt_lendings', JSON.stringify(lendings));
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
    localStorage.setItem('debt_lendings', JSON.stringify(lendings));
    console.warn('Đã lưu vào localStorage (Supabase không khả dụng)');
  } catch (localError) {
    console.error('Lỗi khi lưu vào localStorage:', localError);
    throw new Error('Không thể lưu dữ liệu');
  }
};

/**
 * Load investment accounts from Supabase (primary) or localStorage (fallback)
 */
export const loadInvestmentAccountsFromServer = async (): Promise<InvestmentAccount[]> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      // Try new structure first
      const { data: accountsData, error: accountsError } = await supabase
        .from('investment_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!accountsError && accountsData && accountsData.length > 0) {
        const accounts = accountsData.map(investmentAccountRowToInvestmentAccount);
        
        try {
          localStorage.setItem('debt_investment_accounts', JSON.stringify(accounts));
        } catch (e) {
          console.warn('Không thể lưu vào localStorage:', e);
        }
        
        return accounts;
      }

      // Fallback to old structure if new tables don't exist
      const { data: oldData, error: oldError } = await supabase
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!oldError && oldData && oldData.length > 0) {
        // Migrate old data to new structure
        const accountsMap = new Map<string, InvestmentAccount>();
        oldData.forEach((row: any) => {
          if (!accountsMap.has(row.name)) {
            accountsMap.set(row.name, {
              id: row.id, // Use first investment's ID as account ID (will be regenerated)
              name: row.name,
              status: row.status as 'ACTIVE' | 'COMPLETED',
              notes: undefined
            });
          }
        });
        return Array.from(accountsMap.values());
      }
    } catch (error) {
      console.error('Lỗi khi tải từ Supabase:', error);
    }
  }

  // Fallback to localStorage
  const saved = localStorage.getItem('debt_investment_accounts');
  if (saved) {
    try {
      const accounts = JSON.parse(saved);
      if (Array.isArray(accounts)) {
        return accounts;
      }
    } catch (error) {
      console.error('Lỗi khi đọc từ localStorage:', error);
    }
  }

  return [];
};

/**
 * Load investment transactions from Supabase (primary) or localStorage (fallback)
 */
export const loadInvestmentTransactionsFromServer = async (): Promise<InvestmentTransaction[]> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      // Try new structure first
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('investment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!transactionsError && transactionsData) {
        const transactions = transactionsData.map(investmentTransactionRowToInvestmentTransaction);
        
        try {
          localStorage.setItem('debt_investment_transactions', JSON.stringify(transactions));
        } catch (e) {
          console.warn('Không thể lưu vào localStorage:', e);
        }
        
        return transactions;
      }

      // Fallback to old structure if new tables don't exist
      const { data: oldData, error: oldError } = await supabase
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!oldError && oldData && oldData.length > 0) {
        // This will be handled by App.tsx migration logic
        return [];
      }
    } catch (error) {
      console.error('Lỗi khi tải từ Supabase:', error);
    }
  }

  // Fallback to localStorage
  const saved = localStorage.getItem('debt_investment_transactions');
  if (saved) {
    try {
      const transactions = JSON.parse(saved);
      if (Array.isArray(transactions)) {
        return transactions;
      }
    } catch (error) {
      console.error('Lỗi khi đọc từ localStorage:', error);
    }
  }

  return [];
};

/**
 * Load investments data from Supabase (primary) or localStorage (fallback)
 * @deprecated Use loadInvestmentAccountsFromServer and loadInvestmentTransactionsFromServer instead
 */
export const loadInvestmentsFromServer = async (): Promise<Investment[]> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const investments = data.map(investmentRowToInvestment);
        
        try {
          localStorage.setItem('debt_investments', JSON.stringify(investments));
        } catch (e) {
          console.warn('Không thể lưu vào localStorage:', e);
        }
        
        // Migrate từ localStorage nếu database trống
        if (investments.length === 0) {
          const localSaved = localStorage.getItem('debt_investments');
          if (localSaved) {
            try {
              const localInvestments = JSON.parse(localSaved);
              if (Array.isArray(localInvestments) && localInvestments.length > 0) {
                await saveInvestmentsToServer(localInvestments);
                return localInvestments;
              }
            } catch (e) {
              console.error('Lỗi khi migrate từ localStorage:', e);
            }
          }
        }
        
        return investments;
      }
    } catch (error) {
      console.error('Lỗi khi tải từ Supabase:', error);
    }
  }

  // Fallback to localStorage
  const saved = localStorage.getItem('debt_investments');
  if (saved) {
    try {
      const investments = JSON.parse(saved);
      if (Array.isArray(investments)) {
        return investments;
      }
    } catch (error) {
      console.error('Lỗi khi đọc từ localStorage:', error);
    }
  }

  return [];
};

/**
 * Save investment accounts to Supabase (primary) or localStorage (fallback)
 */
export const saveInvestmentAccountsToServer = async (accounts: InvestmentAccount[]): Promise<void> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const rows = accounts.map(account => investmentAccountToInvestmentAccountRow(account));
      
      // Use upsert to update existing and insert new records
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('investment_accounts')
          .upsert(rows, { onConflict: 'id' });

        if (upsertError) {
          // Check if table doesn't exist
          if (upsertError.message && upsertError.message.includes('does not exist')) {
            console.warn('⚠️ Bảng investment_accounts chưa tồn tại. Vui lòng chạy migration SQL. Lưu vào localStorage...');
            throw upsertError;
          }
          throw upsertError;
        }
      }

      // Delete records that are not in the current array
      if (accounts.length > 0) {
        const currentIds = accounts.map(a => a.id);
        const { data: allAccounts, error: selectError } = await supabase
          .from('investment_accounts')
          .select('id');
        
        if (selectError && selectError.message && selectError.message.includes('does not exist')) {
          console.warn('⚠️ Bảng investment_accounts chưa tồn tại. Bỏ qua xóa records.');
        } else if (allAccounts) {
          const idsToDelete = allAccounts
            .map(a => a.id)
            .filter(id => !currentIds.includes(id));
          
          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('investment_accounts')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteError) console.warn('Lỗi khi xóa records cũ:', deleteError);
          }
        }
      } else {
        const { error: deleteError } = await supabase
          .from('investment_accounts')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError && !deleteError.message?.includes('does not exist')) {
          console.warn('Lỗi khi xóa tất cả records:', deleteError);
        }
      }

      console.log('✅ Đã lưu investment accounts vào Supabase database');
      
      // Backup to localStorage
      try {
        localStorage.setItem('debt_investment_accounts', JSON.stringify(accounts));
      } catch (e) {
        console.warn('Không thể lưu vào localStorage:', e);
      }
      
      return;
    } catch (error: any) {
      console.error('❌ Lỗi khi lưu vào Supabase:', error);
      // Fallback to localStorage if table doesn't exist or other error
      if (error?.message?.includes('does not exist')) {
        console.warn('⚠️ Bảng chưa tồn tại. Lưu vào localStorage. Vui lòng chạy migration SQL trong Supabase.');
      }
    }
  }

  // Fallback to localStorage
  try {
    localStorage.setItem('debt_investment_accounts', JSON.stringify(accounts));
    console.log('✅ Đã lưu investment accounts vào localStorage');
  } catch (localError) {
    console.error('Lỗi khi lưu vào localStorage:', localError);
    throw new Error('Không thể lưu dữ liệu');
  }
};

/**
 * Save investment transactions to Supabase (primary) or localStorage (fallback)
 */
export const saveInvestmentTransactionsToServer = async (transactions: InvestmentTransaction[]): Promise<void> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const rows = transactions.map(transaction => investmentTransactionToInvestmentTransactionRow(transaction));
      
      // Use upsert to update existing and insert new records
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('investment_transactions')
          .upsert(rows, { onConflict: 'id' });

        if (upsertError) {
          // Check if table doesn't exist
          if (upsertError.message && upsertError.message.includes('does not exist')) {
            console.warn('⚠️ Bảng investment_transactions chưa tồn tại. Vui lòng chạy migration SQL. Lưu vào localStorage...');
            throw upsertError;
          }
          throw upsertError;
        }
      }

      // Delete records that are not in the current array
      if (transactions.length > 0) {
        const currentIds = transactions.map(t => t.id);
        const { data: allTransactions, error: selectError } = await supabase
          .from('investment_transactions')
          .select('id');
        
        if (selectError && selectError.message && selectError.message.includes('does not exist')) {
          console.warn('⚠️ Bảng investment_transactions chưa tồn tại. Bỏ qua xóa records.');
        } else if (allTransactions) {
          const idsToDelete = allTransactions
            .map(t => t.id)
            .filter(id => !currentIds.includes(id));
          
          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('investment_transactions')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteError) console.warn('Lỗi khi xóa records cũ:', deleteError);
          }
        }
      } else {
        const { error: deleteError } = await supabase
          .from('investment_transactions')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError && !deleteError.message?.includes('does not exist')) {
          console.warn('Lỗi khi xóa tất cả records:', deleteError);
        }
      }

      console.log('✅ Đã lưu investment transactions vào Supabase database');
      
      // Backup to localStorage
      try {
        localStorage.setItem('debt_investment_transactions', JSON.stringify(transactions));
      } catch (e) {
        console.warn('Không thể lưu vào localStorage:', e);
      }
      
      return;
    } catch (error: any) {
      console.error('❌ Lỗi khi lưu vào Supabase:', error);
      // Fallback to localStorage if table doesn't exist or other error
      if (error?.message?.includes('does not exist')) {
        console.warn('⚠️ Bảng chưa tồn tại. Lưu vào localStorage. Vui lòng chạy migration SQL trong Supabase.');
      }
    }
  }

  // Fallback to localStorage
  try {
    localStorage.setItem('debt_investment_transactions', JSON.stringify(transactions));
    console.log('✅ Đã lưu investment transactions vào localStorage');
  } catch (localError) {
    console.error('Lỗi khi lưu vào localStorage:', localError);
    throw new Error('Không thể lưu dữ liệu');
  }
};

/**
 * Save investments data to Supabase (primary) or localStorage (fallback)
 * @deprecated Use saveInvestmentAccountsToServer and saveInvestmentTransactionsToServer instead
 */
export const saveInvestmentsToServer = async (investments: Investment[]): Promise<void> => {
  // Ưu tiên Supabase nếu được cấu hình
  if (USE_SUPABASE) {
    try {
      const rows = investments.map(investment => investmentToInvestmentRow(investment));
      
      // Use upsert to update existing and insert new records
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from('investments')
          .upsert(rows, { onConflict: 'id' });

        if (upsertError) throw upsertError;
      }

      // Delete records that are not in the current array
      if (investments.length > 0) {
        const currentIds = investments.map(i => i.id);
        const { data: allInvestments } = await supabase
          .from('investments')
          .select('id');
        
        if (allInvestments) {
          const idsToDelete = allInvestments
            .map(i => i.id)
            .filter(id => !currentIds.includes(id));
          
          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('investments')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteError) console.warn('Lỗi khi xóa records cũ:', deleteError);
          }
        }
      } else {
        const { error: deleteError } = await supabase
          .from('investments')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (deleteError) console.warn('Lỗi khi xóa tất cả records:', deleteError);
      }

      // Backup to localStorage
      try {
        localStorage.setItem('debt_investments', JSON.stringify(investments));
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
    localStorage.setItem('debt_investments', JSON.stringify(investments));
    console.warn('Đã lưu vào localStorage (Supabase không khả dụng)');
  } catch (localError) {
    console.error('Lỗi khi lưu vào localStorage:', localError);
    throw new Error('Không thể lưu dữ liệu');
  }
};
