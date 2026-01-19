export enum LoanType {
  BANK = 'BANK',
  APP = 'APP',
  PERSONAL = 'PERSONAL'
}

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED'
}

export type PaymentMeta =
  | {
      type: 'SALARY';
      companyId: string;
      month: string; // "YYYY-MM"
    }
  | {
      type: string;
      [key: string]: any;
    };

export interface Payment {
  id: string;
  date: string;
  amount: number;
  note?: string;
  meta?: PaymentMeta;
}

export interface Loan {
  id: string;
  name: string; // Tên khoản vay (VD: Vay mua nhà, Vay chú Ba)
  provider: string; // Tên ngân hàng hoặc người cho vay
  type: LoanType;
  originalAmount: number; // Tổng  (Được tính bằng: Trả hàng tháng * Số tháng)
  // interestRate removed
  // maturityDate removed
  monthlyDueDate: number; // Ngày thanh toán hàng tháng (1-31)
  monthlyPayment: number; // Số tiền phải trả hàng tháng
  startDate: string;
  /**
   * Kỳ thanh toán đầu tiên (tháng/năm) cho khoản vay trả góp.
   * Dùng để thống kê theo đúng tháng thực tế. Format: "YYYY-MM".
   * Nếu không có, sẽ fallback theo tháng của startDate.
   */
  firstPaymentMonthYear?: string;
  termMonths: number; // Kỳ hạn (tháng)
  payments: Payment[];
  status: LoanStatus;
  notes?: string;
  interestOnly?: boolean; // Nếu true: chỉ trả lãi, các payment không làm giảm gốc
}

export interface CreditCard {
  id: string;
  name: string; // Tên thẻ (VD: Thẻ Vietcombank, Thẻ Techcombank)
  provider: string; // Tên ngân hàng phát hành
  creditLimit: number; // Hạn mức thẻ
  totalDebt: number; // Tổng dư nợ hiện tại
  paymentAmount: number; // Khoản thanh toán tối thiểu hàng tháng (nếu có)
  dueDate: number; // Ngày đến hạn thanh toán hàng tháng (1-31)
  payments: Payment[]; // Lịch sử thanh toán
  status: LoanStatus;
  notes?: string;
}

export interface FixedExpense {
  id: string;
  name: string; // Tên chi tiêu (VD: Tiền thuê nhà, Tiền điện, Tiền internet)
  amount: number; // Số tiền cố định hàng tháng
  dueDate: number; // Ngày thanh toán hàng tháng (1-31)
  payments: Payment[]; // Lịch sử thanh toán
  status: LoanStatus;
  notes?: string;
}

export interface Income {
  id: string;
  name: string; // Tên nguồn thu nhập (VD: Lương, Freelance, Đầu tư)
  amount: number; // Số tiền thu nhập hàng tháng
  receivedDate: number; // Ngày nhận tiền hàng tháng (1-31)
  payments: Payment[]; // Lịch sử nhận tiền
  status: LoanStatus;
  notes?: string;
  /**
   * Optional: gắn thu nhập với công ty (dùng cho UI/ghi nhận).
   * Lưu trữ bền vững: sẽ được encode vào notes khi lưu (không yêu cầu migrate DB).
   */
  companyId?: string;
  /**
   * Optional: không tính thu nhập này vào BHXH (dùng cho UI/ghi nhận).
   * Lưu trữ bền vững: sẽ được encode vào notes khi lưu (không yêu cầu migrate DB).
   */
  excludeBhxh?: boolean;
}

export interface Lending {
  id: string;
  name: string; // Tên người vay (VD: Anh Ba, Chị Tư)
  borrower: string; // Tên người vay (tương tự provider trong Loan)
  originalAmount: number; // Tổng số tiền cho vay
  startDate: string; // Ngày cho vay
  payments: Payment[]; // Lịch sử nhận tiền trả lại
  status: LoanStatus; // ACTIVE hoặc COMPLETED
  notes?: string; // Ghi chú
  monthlyDueDate?: number; // Ngày nhận tiền hàng tháng (nếu có, 1-31)
  monthlyPayment?: number; // Số tiền nhận hàng tháng (nếu có)
  termMonths?: number; // Kỳ hạn (tháng) - nếu có
}

export enum InvestmentType {
  DEPOSIT = 'DEPOSIT', // Nạp tiền
  WITHDRAW = 'WITHDRAW' // Rút tiền
}

// Khoản đầu tư (Account/Portfolio)
export interface InvestmentAccount {
  id: string;
  name: string; // Tên khoản đầu tư (VD: Chứng khoán, Bất động sản, Quỹ đầu tư)
  status: LoanStatus; // ACTIVE hoặc COMPLETED
  notes?: string; // Ghi chú
  startDate?: string; // Ngày mở khoản đầu tư
  endDate?: string; // Ngày kết thúc khoản đầu tư
}

// Giao dịch đầu tư (Transaction)
export interface InvestmentTransaction {
  id: string;
  accountId: string; // ID của khoản đầu tư
  type: InvestmentType; // DEPOSIT hoặc WITHDRAW
  amount: number; // Số tiền nạp/rút
  date: string; // Ngày nạp/rút
  note?: string; // Ghi chú
  status: LoanStatus; // ACTIVE hoặc COMPLETED
}

// Giữ lại Investment interface cũ để backward compatibility (sẽ deprecated)
export interface Investment {
  id: string;
  name: string; // Tên khoản đầu tư (VD: Chứng khoán, Bất động sản, Quỹ đầu tư)
  type: InvestmentType; // DEPOSIT hoặc WITHDRAW
  amount: number; // Số tiền nạp/rút
  date: string; // Ngày nạp/rút
  note?: string; // Ghi chú
  status: LoanStatus; // ACTIVE hoặc COMPLETED
}

export interface DashboardStats {
  totalOriginal: number;
  totalPaid: number;
  totalRemaining: number;
  countActive: number;
  countCompleted: number;
}

/**
 * Company & BHXH (Social Insurance) tracking
 * Used in /income page to track salary history and BHXH contribution base.
 */
export interface Company {
  id: string;
  name: string; // Tên công ty
  notes?: string;
  createdAt?: string; // ISO string
}

/**
 * Monthly salary/BHXH record for a company.
 * month format: "YYYY-MM"
 */
export interface CompanyIncomeRecord {
  id: string;
  companyId: string;
  month: string; // "YYYY-MM"
  /**
   * Thực nhận (lương net) trong tháng (tùy chọn)
   */
  netSalary?: number;
  /**
   * Mức lương đóng BHXH trong tháng (tùy chọn)
   */
  bhxhBase?: number;
  /**
   * Nếu true: tháng này không tính vào quá trình BHXH (bỏ qua khi tính ước tính BHXH).
   */
  excludeBhxh?: boolean;
  note?: string;
  createdAt?: string; // ISO string
}

/**
 * BHXH adjustment / inflation index by year (hệ số trượt giá / hệ số điều chỉnh).
 * factor is a multiplier (e.g. 1.12).
 */
export interface BhxhAdjustmentIndex {
  id: string;
  year: number;
  factor: number;
  note?: string;
  createdAt?: string; // ISO string
}