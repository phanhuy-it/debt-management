export enum LoanType {
  BANK = 'BANK',
  PERSONAL = 'PERSONAL'
}

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED'
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  note?: string;
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
  termMonths: number; // Kỳ hạn (tháng)
  payments: Payment[];
  status: LoanStatus;
  notes?: string;
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
}

export interface DashboardStats {
  totalOriginal: number;
  totalPaid: number;
  totalRemaining: number;
  countActive: number;
  countCompleted: number;
}