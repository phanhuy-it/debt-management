import { CompanyIncomeRecord, BhxhAdjustmentIndex } from '../types';
import { parseMonthYear, toMonthStart } from './dateUtils';

export type BhxhRoundingMode = 'LAW' | 'EXACT';

export interface BhxhOneTimeEstimate {
  totalMonths: number;
  monthsBefore2014: number;
  monthsFrom2014: number;
  yearsBefore2014: number;
  yearsFrom2014: number;
  averageBhxhBase: number;
  totalBhxhBaseSum: number;
  estimatedPayout: number;
  totalAdjustedBhxhBaseSum: number;
  averageAdjustedBhxhBase: number;
  notes: string[];
}

function uniqueByMonth(records: CompanyIncomeRecord[]): CompanyIncomeRecord[] {
  const map = new Map<string, CompanyIncomeRecord>();
  for (const r of records) {
    if (!r?.month) continue;
    // Keep the last occurrence (assume latest user edit)
    map.set(r.month, r);
  }
  return Array.from(map.values());
}

function monthStartDate(month: string): Date | null {
  const parsed = parseMonthYear(month);
  if (!parsed) return null;
  return toMonthStart(parsed.year, parsed.month);
}

function monthsToYears(months: number, mode: BhxhRoundingMode): number {
  if (months <= 0) return 0;
  if (mode === 'EXACT') return months / 12;

  const fullYears = Math.floor(months / 12);
  const remainder = months % 12;

  let partial = 0;
  if (remainder >= 1 && remainder <= 6) partial = 0.5;
  else if (remainder >= 7) partial = 1;

  return fullYears + partial;
}

export function calculateBhxhOneTimeEstimate(
  records: CompanyIncomeRecord[],
  options?: {
    averageBaseOverride?: number;
    roundingMode?: BhxhRoundingMode;
    adjustmentIndices?: BhxhAdjustmentIndex[];
  }
): BhxhOneTimeEstimate {
  const roundingMode: BhxhRoundingMode = options?.roundingMode || 'LAW';
  const adjustmentIndices = options?.adjustmentIndices || [];
  const factorByYear = new Map<number, number>();
  for (const idx of adjustmentIndices) {
    if (!idx) continue;
    const y = Number(idx.year);
    const f = Number(idx.factor);
    if (Number.isFinite(y) && Number.isFinite(f) && f > 0) {
      factorByYear.set(y, f);
    }
  }

  const getBase = (r: CompanyIncomeRecord): { base: number; usedFallbackNet: boolean } => {
    const rawBase = Number((r as any).bhxhBase);
    if (Number.isFinite(rawBase) && rawBase > 0) return { base: rawBase, usedFallbackNet: false };

    // Fallback: if user hasn't entered BHXH base, use net salary (common default in this app's UI auto-fill).
    const rawNet = Number((r as any).netSalary);
    if (Number.isFinite(rawNet) && rawNet > 0) return { base: rawNet, usedFallbackNet: true };

    return { base: 0, usedFallbackNet: false };
  };

  const effective = uniqueByMonth(records)
    .map(r => ({ r, d: monthStartDate(r.month) }))
    .filter(x => !!x.d)
    .map(x => x.r)
    .filter(r => !r.excludeBhxh)
    // Be tolerant of numeric strings (e.g. Supabase DECIMAL/NUMERIC)
    .filter(r => {
      const { base } = getBase(r);
      return base > 0;
    });

  // Sort by month asc for deterministic
  effective.sort((a, b) => {
    const da = monthStartDate(a.month)!.getTime();
    const db = monthStartDate(b.month)!.getTime();
    return da - db;
  });

  const totalMonths = effective.length;
  const notes: string[] = [];

  if (totalMonths === 0) {
    return {
      totalMonths: 0,
      monthsBefore2014: 0,
      monthsFrom2014: 0,
      yearsBefore2014: 0,
      yearsFrom2014: 0,
      averageBhxhBase: 0,
      totalBhxhBaseSum: 0,
      estimatedPayout: 0,
      totalAdjustedBhxhBaseSum: 0,
      averageAdjustedBhxhBase: 0,
      notes: ['Chưa có dữ liệu mức lương đóng BHXH theo tháng.']
    };
  }

  let fallbackNetCount = 0;
  const totalBhxhBaseSum = effective.reduce((sum, r) => {
    const { base, usedFallbackNet } = getBase(r);
    if (usedFallbackNet) fallbackNetCount += 1;
    return sum + base;
  }, 0);
  const computedAverage = totalBhxhBaseSum / totalMonths;

  // Apply adjustment factor by year (if provided)
  const missingYears = new Set<number>();
  const adjustedSum = effective.reduce((sum, r) => {
    const y = Number((r.month || '').slice(0, 4));
    const factor = factorByYear.get(y);
    const { base } = getBase(r);
    if (!factor) {
      missingYears.add(y);
      return sum + base;
    }
    return sum + base * factor;
  }, 0);
  const adjustedAvg = adjustedSum / totalMonths;

  const averageBhxhBase =
    typeof options?.averageBaseOverride === 'number' && Number.isFinite(options.averageBaseOverride) && options.averageBaseOverride > 0
      ? options.averageBaseOverride
      : computedAverage;

  const averageAdjustedBhxhBase =
    typeof options?.averageBaseOverride === 'number' && Number.isFinite(options.averageBaseOverride) && options.averageBaseOverride > 0
      ? options.averageBaseOverride
      : adjustedAvg;

  if (averageBhxhBase !== computedAverage) {
    notes.push('Đang dùng mức bình quân BHXH do bạn nhập (override), không phải bình quân từ bảng tháng.');
  } else {
    notes.push('Mức bình quân BHXH đang tính theo trung bình đơn giản từ các tháng bạn đã nhập.');
  }

  if (fallbackNetCount > 0) {
    notes.push(
      `Có ${fallbackNetCount}/${totalMonths} tháng chưa nhập "Mức đóng BHXH" → tạm lấy theo "Lương thực nhận" để ước tính.`
    );
  }

  if (factorByYear.size > 0) {
    if (missingYears.size > 0) {
      const years = Array.from(missingYears).filter(y => Number.isFinite(y)).sort((a, b) => a - b);
      notes.push(`Đã áp dụng hệ số trượt giá theo năm. Các năm chưa có hệ số sẽ mặc định = 1: ${years.join(', ')}`);
    } else {
      notes.push('Đã áp dụng hệ số trượt giá theo năm cho tất cả các tháng có dữ liệu.');
    }
  } else {
    notes.push('Chưa nhập hệ số trượt giá theo năm (đang mặc định hệ số = 1).');
  }

  const monthsBefore2014 = effective.filter(r => {
    const d = monthStartDate(r.month)!;
    return d.getFullYear() < 2014;
  }).length;
  const monthsFrom2014 = totalMonths - monthsBefore2014;

  // Rule for < 12 months participation
  if (totalMonths < 12) {
    const by22Percent = 0.22 * adjustedSum;
    const capBy2Months = 2 * averageAdjustedBhxhBase;
    const estimatedPayout = Math.min(by22Percent, capBy2Months);

    notes.push('Thời gian đóng < 12 tháng: ước tính theo 22% tổng mức lương đóng, tối đa 2 tháng bình quân (xấp xỉ).');
    notes.push('Lưu ý: Đây là ước tính đơn giản; hệ số trượt giá (nếu có) được áp dụng theo năm bạn nhập.');

    return {
      totalMonths,
      monthsBefore2014,
      monthsFrom2014,
      yearsBefore2014: monthsToYears(monthsBefore2014, roundingMode),
      yearsFrom2014: monthsToYears(monthsFrom2014, roundingMode),
      averageBhxhBase,
      totalBhxhBaseSum,
      estimatedPayout,
      totalAdjustedBhxhBaseSum: adjustedSum,
      averageAdjustedBhxhBase,
      notes
    };
  }

  const yearsBefore2014 = monthsToYears(monthsBefore2014, roundingMode);
  const yearsFrom2014 = monthsToYears(monthsFrom2014, roundingMode);

  if (roundingMode === 'LAW') {
    notes.push('Làm tròn theo quy định thường dùng: 1–6 tháng = 0.5 năm; 7–11 tháng = 1 năm (mỗi giai đoạn).');
  } else {
    notes.push('Không làm tròn: tính năm = số tháng / 12.');
  }

  const estimatedPayout = averageAdjustedBhxhBase * (1.5 * yearsBefore2014 + 2 * yearsFrom2014);
  notes.push('Công thức đang dùng (xấp xỉ BHXH một lần): trước 2014 = 1.5 tháng bình quân/năm; từ 2014 = 2 tháng bình quân/năm.');
  notes.push('Lưu ý: Đây là ước tính đơn giản; hệ số trượt giá (nếu có) được áp dụng theo năm bạn nhập.');

  return {
    totalMonths,
    monthsBefore2014,
    monthsFrom2014,
    yearsBefore2014,
    yearsFrom2014,
    averageBhxhBase,
    totalBhxhBaseSum,
    estimatedPayout,
    totalAdjustedBhxhBaseSum: adjustedSum,
    averageAdjustedBhxhBase,
    notes
  };
}

