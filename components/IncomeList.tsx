import React, { useState, useMemo, useEffect } from 'react';
import { Income, Payment, LoanStatus, Company, CompanyIncomeRecord, BhxhAdjustmentIndex } from '../types';
import { formatCurrency } from '../App';
import { generateUUID } from '../utils/uuid';
import { Trash2, History, Wallet, Calendar, DollarSign, X, Edit, CheckCircle2, Circle, TrendingUp, Archive, Building2, PlusCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Amount } from './AmountVisibility';
import { BhxhRoundingMode, calculateBhxhOneTimeEstimate } from '../utils/bhxhUtils';

interface IncomeListProps {
  incomes: Income[];
  companies: Company[];
  companyIncomeRecords: CompanyIncomeRecord[];
  bhxhAdjustmentIndices: BhxhAdjustmentIndex[];
  onDeleteIncome: (id: string) => void;
  onAddPayment: (incomeId: string, payment: Payment) => void;
  onRemovePayment: (incomeId: string, paymentIds: string[]) => void;
  onUpdateIncome: (id: string, updatedIncome: Partial<Income>) => void;
  onAddIncome: (income: Income) => void;
  onAddCompany: (company: Company) => void;
  onUpdateCompany: (id: string, updatedCompany: Partial<Company>) => void;
  onDeleteCompany: (id: string) => void;
  onAddCompanyIncomeRecord: (record: CompanyIncomeRecord) => void;
  onUpdateCompanyIncomeRecord: (id: string, updatedRecord: Partial<CompanyIncomeRecord>) => void;
  onDeleteCompanyIncomeRecord: (id: string) => void;
  onUpsertBhxhAdjustmentIndex: (year: number, factor: number, note?: string) => void;
  onDeleteBhxhAdjustmentIndex: (id: string) => void;
}

type SortOption = 'receivedDate' | 'amount' | 'name';
type IncomeTab = 'ACTIVE' | 'HISTORY';
type CompanyIncomeRecordRowView = CompanyIncomeRecord & { companyName: string };

const IncomeList: React.FC<IncomeListProps> = ({
  incomes,
  companies,
  companyIncomeRecords,
  bhxhAdjustmentIndices,
  onDeleteIncome,
  onAddPayment,
  onRemovePayment,
  onUpdateIncome,
  onAddIncome,
  onAddCompany,
  onUpdateCompany,
  onDeleteCompany,
  onAddCompanyIncomeRecord,
  onUpdateCompanyIncomeRecord,
  onDeleteCompanyIncomeRecord,
  onUpsertBhxhAdjustmentIndex,
  onDeleteBhxhAdjustmentIndex
}) => {
  const [selectedIncome, setSelectedIncome] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem('income_sort_by');
      return saved === 'amount' || saved === 'name' || saved === 'receivedDate' ? saved : 'receivedDate';
    } catch {
      return 'receivedDate';
    }
  });
  const [activeTab, setActiveTab] = useState<IncomeTab>('ACTIVE');
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [extraAmount, setExtraAmount] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [extraDate, setExtraDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [extraSourceName, setExtraSourceName] = useState('');

  // Company & BHXH state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyNotes, setNewCompanyNotes] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCompanyNotes, setEditCompanyNotes] = useState('');

  const [recordMonth, setRecordMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [recordNetSalary, setRecordNetSalary] = useState('');
  const [recordBhxhBase, setRecordBhxhBase] = useState('');
  const [recordNote, setRecordNote] = useState('');
  const [recordBhxhAuto, setRecordBhxhAuto] = useState(true);
  const [recordExcludeBhxh, setRecordExcludeBhxh] = useState(false);
  const [editingCompanyIncomeRecord, setEditingCompanyIncomeRecord] = useState<CompanyIncomeRecord | null>(null);
  const [editRecordMonth, setEditRecordMonth] = useState('');
  const [editRecordNetSalary, setEditRecordNetSalary] = useState('');
  const [editRecordBhxhBase, setEditRecordBhxhBase] = useState('');
  const [editRecordNote, setEditRecordNote] = useState('');
  const [editRecordBhxhAuto, setEditRecordBhxhAuto] = useState(true);
  const [editRecordExcludeBhxh, setEditRecordExcludeBhxh] = useState(false);

  const [bhxhRoundingMode, setBhxhRoundingMode] = useState<BhxhRoundingMode>('LAW');
  const [bhxhAverageOverride, setBhxhAverageOverride] = useState('');
  const [newBhxhIndexYear, setNewBhxhIndexYear] = useState<number>(() => new Date().getFullYear());
  const [newBhxhIndexFactor, setNewBhxhIndexFactor] = useState<string>('1');
  const [newBhxhIndexNote, setNewBhxhIndexNote] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem('income_sort_by', sortBy);
    } catch {
      // ignore
    }
  }, [sortBy]);
  const BHXH_INDEX_PAGE_SIZE = 5;
  const [bhxhIndexPage, setBhxhIndexPage] = useState<number>(1);

  // Pagination for income history
  const INCOME_HISTORY_PAGE_SIZE = 5;
  const [incomeHistoryPage, setIncomeHistoryPage] = useState<number>(1);
  const [incomeHistorySearch, setIncomeHistorySearch] = useState<string>('');
  const [incomeHistoryCompanyFilter, setIncomeHistoryCompanyFilter] = useState<string>('ALL');
  const INCOME_HISTORY_NO_COMPANY = '__NO_COMPANY__';

  // Pagination for monthly income stats
  const MONTHLY_STATS_PAGE_SIZE = 5;
  const [monthlyStatsPage, setMonthlyStatsPage] = useState<number>(1);

  // Pagination for yearly income stats
  const YEARLY_STATS_PAGE_SIZE = 5;
  const [yearlyStatsPage, setYearlyStatsPage] = useState<number>(1);

  // Pagination for company monthly records
  const COMPANY_RECORDS_PAGE_SIZE = 12;
  const [companyRecordsPage, setCompanyRecordsPage] = useState<number>(1);
  const [companyRecordsYear, setCompanyRecordsYear] = useState<string>('ALL');
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editReceivedDate, setEditReceivedDate] = useState<number>(1);
  const [editCompanyId, setEditCompanyId] = useState<string>('');
  const [editExcludeBhxh, setEditExcludeBhxh] = useState<boolean>(false);

  React.useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // Tổng hợp lịch sử thu nhập
  const deriveExtraName = (note?: string) => {
    if (!note) return 'Thu nhập đột xuất';
    const colonIdx = note.indexOf(':');
    if (colonIdx !== -1) {
      return note.slice(colonIdx + 1).split('-')[0].trim() || 'Thu nhập đột xuất';
    }
    const dashIdx = note.indexOf('-');
    if (dashIdx !== -1) {
      return note.slice(0, dashIdx).trim() || 'Thu nhập đột xuất';
    }
    return note.trim() || 'Thu nhập đột xuất';
  };

  const allPayments = useMemo(() => {
    const companyNameById = new Map<string, string>(companies.map(c => [c.id, c.name]));

    return incomes.flatMap(income =>
      income.payments.map(p => {
        const isExtra = p.id.startsWith('extra-');
        const displayName = isExtra ? deriveExtraName(p.note) : income.name;

        const metaCompanyId = (p as any)?.meta?.companyId as string | undefined;
        const resolvedCompanyId = metaCompanyId || income.companyId || undefined;
        const resolvedCompanyName = resolvedCompanyId ? (companyNameById.get(resolvedCompanyId) || '—') : '—';

        return {
          ...p,
          incomeId: income.id,
          incomeName: displayName,
          companyId: resolvedCompanyId,
          companyName: resolvedCompanyName
        };
      })
    );
  }, [incomes, companies]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalAll = useMemo(() => {
    return allPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  const totalThisYear = useMemo(() => {
    return allPayments
      .filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments, currentYear]);

  const totalThisMonth = useMemo(() => {
    return allPayments
      .filter(p => {
        const d = new Date(p.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments, currentMonth, currentYear]);

  const allPaymentsSorted = useMemo(() => {
    return [...allPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allPayments]);

  const filteredIncomeHistory = useMemo(() => {
    const q = incomeHistorySearch.trim().toLowerCase();
    const companyFilter = incomeHistoryCompanyFilter;

    return allPaymentsSorted.filter(p => {
      // Company filter
      if (companyFilter !== 'ALL') {
        if (companyFilter === INCOME_HISTORY_NO_COMPANY) {
          if (p.companyId) return false;
        } else {
          if (p.companyId !== companyFilter) return false;
        }
      }

      // Text search
      if (!q) return true;
      const haystack = `${p.incomeName ?? ''} ${p.companyName ?? ''} ${p.note ?? ''} ${String(p.amount ?? '')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [allPaymentsSorted, incomeHistorySearch, incomeHistoryCompanyFilter, INCOME_HISTORY_NO_COMPANY]);

  const filteredIncomeHistoryTotal = useMemo(() => {
    return filteredIncomeHistory.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredIncomeHistory]);

  const incomeHistoryTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredIncomeHistory.length / INCOME_HISTORY_PAGE_SIZE));
  }, [filteredIncomeHistory.length]);

  React.useEffect(() => {
    setIncomeHistoryPage(prev => Math.min(Math.max(1, prev), incomeHistoryTotalPages));
  }, [incomeHistoryTotalPages]);

  React.useEffect(() => {
    setIncomeHistoryPage(1);
  }, [incomeHistorySearch, incomeHistoryCompanyFilter]);

  const pagedIncomeHistory = useMemo(() => {
    const start = (incomeHistoryPage - 1) * INCOME_HISTORY_PAGE_SIZE;
    return filteredIncomeHistory.slice(start, start + INCOME_HISTORY_PAGE_SIZE);
  }, [filteredIncomeHistory, incomeHistoryPage]);

  const incomeHistoryPageItems = useMemo(() => {
    const total = incomeHistoryTotalPages;
    const current = incomeHistoryPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1) as Array<number | null>;
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let p = current - 1; p <= current + 1; p++) {
      if (p > 1 && p < total) pages.add(p);
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const out: Array<number | null> = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) out.push(null);
      out.push(p);
      prev = p;
    }
    return out;
  }, [incomeHistoryTotalPages, incomeHistoryPage]);

  const monthlyTotals = useMemo(() => {
    const map = new Map<string, { year: number; month: number; total: number }>();
    allPayments.forEach(p => {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = map.get(key);
      const total = (existing?.total || 0) + p.amount;
      map.set(key, { year: d.getFullYear(), month: d.getMonth(), total });
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.year === b.year) return b.month - a.month;
      return b.year - a.year;
    });
  }, [allPayments]);

  const monthlyStatsTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(monthlyTotals.length / MONTHLY_STATS_PAGE_SIZE));
  }, [monthlyTotals.length]);

  React.useEffect(() => {
    setMonthlyStatsPage(prev => Math.min(Math.max(1, prev), monthlyStatsTotalPages));
  }, [monthlyStatsTotalPages]);

  const pagedMonthlyTotals = useMemo(() => {
    const start = (monthlyStatsPage - 1) * MONTHLY_STATS_PAGE_SIZE;
    return monthlyTotals.slice(start, start + MONTHLY_STATS_PAGE_SIZE);
  }, [monthlyTotals, monthlyStatsPage]);

  const monthlyStatsPageItems = useMemo(() => {
    const total = monthlyStatsTotalPages;
    const current = monthlyStatsPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1) as Array<number | null>;
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let p = current - 1; p <= current + 1; p++) {
      if (p > 1 && p < total) pages.add(p);
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const out: Array<number | null> = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) out.push(null);
      out.push(p);
      prev = p;
    }
    return out;
  }, [monthlyStatsTotalPages, monthlyStatsPage]);

  const yearlyTotals = useMemo(() => {
    const map = new Map<number, number>();
    allPayments.forEach(p => {
      const d = new Date(p.date);
      map.set(d.getFullYear(), (map.get(d.getFullYear()) || 0) + p.amount);
    });
    return Array.from(map.entries())
      .map(([year, total]) => ({ year, total }))
      .sort((a, b) => b.year - a.year);
  }, [allPayments]);

  const sortedBhxhAdjustmentIndices = useMemo(() => {
    return [...bhxhAdjustmentIndices].sort((a, b) => b.year - a.year);
  }, [bhxhAdjustmentIndices]);

  const bhxhIndexTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedBhxhAdjustmentIndices.length / BHXH_INDEX_PAGE_SIZE));
  }, [sortedBhxhAdjustmentIndices.length]);

  React.useEffect(() => {
    setBhxhIndexPage(prev => Math.min(Math.max(1, prev), bhxhIndexTotalPages));
  }, [bhxhIndexTotalPages]);

  const pagedBhxhAdjustmentIndices = useMemo(() => {
    const start = (bhxhIndexPage - 1) * BHXH_INDEX_PAGE_SIZE;
    return sortedBhxhAdjustmentIndices.slice(start, start + BHXH_INDEX_PAGE_SIZE);
  }, [sortedBhxhAdjustmentIndices, bhxhIndexPage]);

  const bhxhIndexPageItems = useMemo(() => {
    const total = bhxhIndexTotalPages;
    const current = bhxhIndexPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1) as Array<number | null>;
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let p = current - 1; p <= current + 1; p++) {
      if (p > 1 && p < total) pages.add(p);
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const out: Array<number | null> = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) out.push(null);
      out.push(p);
      prev = p;
    }
    return out;
  }, [bhxhIndexTotalPages, bhxhIndexPage]);

  const yearlyStatsTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(yearlyTotals.length / YEARLY_STATS_PAGE_SIZE));
  }, [yearlyTotals.length]);

  React.useEffect(() => {
    setYearlyStatsPage(prev => Math.min(Math.max(1, prev), yearlyStatsTotalPages));
  }, [yearlyStatsTotalPages]);

  const pagedYearlyTotals = useMemo(() => {
    const start = (yearlyStatsPage - 1) * YEARLY_STATS_PAGE_SIZE;
    return yearlyTotals.slice(start, start + YEARLY_STATS_PAGE_SIZE);
  }, [yearlyTotals, yearlyStatsPage]);

  const formatCompactMoneyTick = (value: number): string => {
    const v = Number(value) || 0;
    const abs = Math.abs(v);
    if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `${(v / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
    return `${Math.round(v)}`;
  };

  const yearlyChartData = useMemo(() => {
    // Full timeline: render left-to-right by ascending year
    return [...yearlyTotals]
      .slice()
      .sort((a, b) => a.year - b.year)
      .map(i => ({ year: String(i.year), total: i.total }));
  }, [yearlyTotals]);

  const yearlyChartWidth = useMemo(() => {
    // Give each year enough width so the chart stays readable; allow horizontal scroll if needed.
    return Math.max(640, yearlyChartData.length * 84);
  }, [yearlyChartData.length]);

  const YearlyIncomeTooltip = (props: {
    active?: boolean;
    payload?: Array<{ value?: number }>;
    label?: string;
  }) => {
    const { active, payload, label } = props;
    if (!active || !payload || payload.length === 0) return null;
    const total = Number(payload[0]?.value) || 0;
    const safeLabel = label || '';

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3">
        <div className="text-xs text-slate-500">Năm</div>
        <div className="font-semibold text-slate-900">{safeLabel}</div>
        <div className="mt-2 text-xs text-slate-500">Tổng thu</div>
        <div className="font-semibold text-emerald-600">
          <Amount value={total} id={`income-yearly-chart-${safeLabel}`} />
        </div>
      </div>
    );
  };

  const yearlyStatsPageItems = useMemo(() => {
    const total = yearlyStatsTotalPages;
    const current = yearlyStatsPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1) as Array<number | null>;
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let p = current - 1; p <= current + 1; p++) {
      if (p > 1 && p < total) pages.add(p);
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const out: Array<number | null> = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) out.push(null);
      out.push(p);
      prev = p;
    }
    return out;
  }, [yearlyStatsTotalPages, yearlyStatsPage]);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncome || !amount) return;

    const newPayment: Payment = {
      id: generateUUID(),
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      note: note || 'Nhận tiền thu nhập'
    };

    onAddPayment(selectedIncome, newPayment);
    setAmount('');
    setNote('');
    setSelectedIncome(null);
  };

  const handleEditClick = (income: Income) => {
    setEditingIncome(income);
    setEditName(income.name);
    setEditAmount(income.amount.toString());
    setEditReceivedDate(income.receivedDate);
    setEditCompanyId(income.companyId || '');
    setEditExcludeBhxh(!!income.excludeBhxh);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncome) return;

    onUpdateIncome(editingIncome.id, {
      name: editName,
      amount: parseFloat(editAmount) || 0,
      receivedDate: editReceivedDate,
      companyId: editCompanyId || undefined,
      excludeBhxh: editExcludeBhxh || undefined
    });

    setEditingIncome(null);
    setEditName('');
    setEditAmount('');
    setEditReceivedDate(1);
    setEditCompanyId('');
    setEditExcludeBhxh(false);
  };

  const handleExtraIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraAmount || !extraSourceName.trim()) return;

    const sourceLabel = extraSourceName.trim();
    
    // Tạo một income mới cho thu nhập đột xuất
    const newIncome: Income = {
      id: generateUUID(),
      name: sourceLabel,
      amount: 0, // Thu nhập đột xuất không có số tiền cố định hàng tháng
      receivedDate: new Date(extraDate).getDate() || new Date().getDate(),
      payments: [{
        id: generateUUID(),
        date: extraDate ? new Date(extraDate).toISOString() : new Date().toISOString(),
        amount: parseFloat(extraAmount),
        note: extraNote || `Thu nhập đột xuất: ${sourceLabel}`
      }],
      status: LoanStatus.ACTIVE,
      notes: extraNote || undefined
    };

    onAddIncome(newIncome);
    setExtraAmount('');
    setExtraNote('');
    setExtraDate(new Date().toISOString().split('T')[0]);
    setExtraSourceName('');
  };

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => a.name.localeCompare(b.name));
  }, [companies]);

  const selectedCompany = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  const selectedCompanyRecords = useMemo(() => {
    // Per-company view (used for editing / viewing only)
    const items = companyIncomeRecords.filter(r => r.companyId === selectedCompanyId);
    return items.sort((a, b) => (b.month || '').localeCompare(a.month || ''));
  }, [companyIncomeRecords, selectedCompanyId]);

  // BHXH estimate should NOT depend on selected company:
  // aggregate across all companies, prefer the latest record if duplicate months exist.
  const bhxhEstimateRecords = useMemo(() => {
    const items = [...companyIncomeRecords];
    items.sort((a, b) => {
      // Sort by month asc, then createdAt asc so the "latest" ends up last for the same month.
      const monthCmp = (a.month || '').localeCompare(b.month || '');
      if (monthCmp !== 0) return monthCmp;
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return (a.companyId || '').localeCompare(b.companyId || '');
    });
    return items;
  }, [companyIncomeRecords]);

  const allCompanyRecords = useMemo<CompanyIncomeRecordRowView[]>(() => {
    const nameById = new Map<string, string>(companies.map(c => [c.id, c.name]));
    return companyIncomeRecords
      .map(r => ({
        ...r,
        companyName: nameById.get(r.companyId) || '—'
      }))
      .sort((a, b) => {
        const monthCmp = (b.month || '').localeCompare(a.month || '');
        if (monthCmp !== 0) return monthCmp;
        return (a.companyName || '').localeCompare(b.companyName || '');
      });
  }, [companyIncomeRecords, companies]);

  const availableCompanyRecordYears = useMemo(() => {
    const years = new Set<number>();
    for (const r of allCompanyRecords) {
      const y = parseInt((r.month || '').slice(0, 4), 10);
      if (Number.isFinite(y)) years.add(y);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [allCompanyRecords]);

  const filteredCompanyRecords = useMemo(() => {
    if (companyRecordsYear === 'ALL') return allCompanyRecords;
    const y = parseInt(companyRecordsYear, 10);
    if (!Number.isFinite(y)) return allCompanyRecords;
    return allCompanyRecords.filter(r => parseInt((r.month || '').slice(0, 4), 10) === y);
  }, [allCompanyRecords, companyRecordsYear]);

  const companyRecordsTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredCompanyRecords.length / COMPANY_RECORDS_PAGE_SIZE));
  }, [filteredCompanyRecords.length]);

  // Note: list below is global (all companies), so we don't reset page/year when switching selected company.

  React.useEffect(() => {
    // Reset page when switching year filter
    setCompanyRecordsPage(1);
  }, [companyRecordsYear]);

  React.useEffect(() => {
    // Clamp page when data changes
    setCompanyRecordsPage(prev => Math.min(Math.max(1, prev), companyRecordsTotalPages));
  }, [companyRecordsTotalPages]);

  const pagedCompanyRecords = useMemo(() => {
    const start = (companyRecordsPage - 1) * COMPANY_RECORDS_PAGE_SIZE;
    return filteredCompanyRecords.slice(start, start + COMPANY_RECORDS_PAGE_SIZE);
  }, [filteredCompanyRecords, companyRecordsPage]);

  const companyRecordsPageItems = useMemo(() => {
    const total = companyRecordsTotalPages;
    const current = companyRecordsPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1) as Array<number | null>;
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let p = current - 1; p <= current + 1; p++) {
      if (p > 1 && p < total) pages.add(p);
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const out: Array<number | null> = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) out.push(null);
      out.push(p);
      prev = p;
    }
    return out;
  }, [companyRecordsTotalPages, companyRecordsPage]);

  const bhxhEstimate = useMemo(() => {
    const override = parseFloat(bhxhAverageOverride);
    return calculateBhxhOneTimeEstimate(bhxhEstimateRecords, {
      roundingMode: bhxhRoundingMode,
      averageBaseOverride: Number.isFinite(override) && override > 0 ? override : undefined,
      adjustmentIndices: bhxhAdjustmentIndices
    });
  }, [bhxhEstimateRecords, bhxhRoundingMode, bhxhAverageOverride, bhxhAdjustmentIndices]);

  const salaryIncomeNoteKey = (companyId: string) => `salary-income:${companyId}`;
  const monthToIsoDate = (month: string) => {
    const m = /^(\d{4})-(\d{2})$/.exec(month);
    if (!m) return new Date().toISOString();
    const year = parseInt(m[1], 10);
    const monthIndex = parseInt(m[2], 10) - 1;
    // Use last day of month at noon to reduce timezone day shift issues
    const d = new Date(year, monthIndex + 1, 0, 12, 0, 0);
    return d.toISOString();
  };

  const findSalaryIncome = (companyId: string) => incomes.find(i => i.notes === salaryIncomeNoteKey(companyId));

  const buildSalaryPayment = (params: { companyId: string; month: string; netSalary: number; note?: string }): Payment => {
    const { companyId, month, netSalary, note } = params;
    const companyName = companies.find(c => c.id === companyId)?.name || 'Công ty';
    return {
      id: generateUUID(),
      date: monthToIsoDate(month),
      amount: netSalary,
      note: note || `Lương ${companyName} (${month})`,
      meta: { type: 'SALARY', companyId, month }
    };
  };

  const isSalaryPayment = (p: Payment, companyId: string, month?: string) => {
    const meta = (p as any).meta;
    const ok = meta?.type === 'SALARY' && meta?.companyId === companyId;
    if (!ok) return false;
    if (month) return meta?.month === month;
    return true;
  };

  const upsertSalaryPaymentForCompanyMonth = (params: {
    companyId: string;
    month: string;
    netSalary?: number;
    note?: string;
    removeMonthIfDifferent?: string;
  }) => {
    const { companyId, month, netSalary, note, removeMonthIfDifferent } = params;
    const companyName = companies.find(c => c.id === companyId)?.name || 'Công ty';
    const key = salaryIncomeNoteKey(companyId);
    const existingIncome = incomes.find(i => i.notes === key);

    // If income doesn't exist yet, create it with initial payment(s) (avoid race with addPayment)
    if (!existingIncome) {
      if (typeof netSalary !== 'number' || !Number.isFinite(netSalary) || netSalary <= 0) return;
      const newIncome: Income = {
        id: generateUUID(),
        name: `Lương - ${companyName}`,
        amount: 0,
        receivedDate: 1,
        payments: [buildSalaryPayment({ companyId, month, netSalary, note })],
        status: LoanStatus.ACTIVE,
        notes: key
      };
      onAddIncome(newIncome);
      return;
    }

    // Build next payments array in one update
    const prevPayments = Array.isArray(existingIncome.payments) ? existingIncome.payments : [];
    const paymentsWithoutThisCompany = prevPayments.filter(p => !isSalaryPayment(p, companyId));
    const salaryPaymentsThisCompany = prevPayments.filter(p => isSalaryPayment(p, companyId));

    const desiredByMonth = new Map<string, Payment>();
    for (const p of salaryPaymentsThisCompany) {
      const meta = (p as any).meta;
      if (meta?.month) desiredByMonth.set(meta.month, p);
    }

    if (removeMonthIfDifferent && removeMonthIfDifferent !== month) {
      desiredByMonth.delete(removeMonthIfDifferent);
    }

    // Replace current month
    desiredByMonth.delete(month);
    if (typeof netSalary === 'number' && Number.isFinite(netSalary) && netSalary > 0) {
      desiredByMonth.set(month, buildSalaryPayment({ companyId, month, netSalary, note }));
    }

    const nextSalaryPayments = Array.from(desiredByMonth.values());
    const nextPayments = [...paymentsWithoutThisCompany, ...nextSalaryPayments];

    onUpdateIncome(existingIncome.id, {
      name: `Lương - ${companyName}`,
      payments: nextPayments
    });
  };

  // One-time (and idempotent) sync: ensure all existing "Lương thực nhận" records appear in Income history/statistics
  React.useEffect(() => {
    if (!companies.length) return;

    const companyNameById = new Map<string, string>(companies.map(c => [c.id, c.name]));
    const desiredByCompany = new Map<string, Map<string, { amount: number; note?: string }>>();

    for (const r of companyIncomeRecords) {
      const amount = typeof r.netSalary === 'number' ? r.netSalary : undefined;
      if (!amount || amount <= 0) continue;
      const month = r.month;
      if (!/^\d{4}-\d{2}$/.test(month)) continue;

      if (!desiredByCompany.has(r.companyId)) desiredByCompany.set(r.companyId, new Map());
      desiredByCompany.get(r.companyId)!.set(month, {
        amount,
        note: r.note ? `${r.note} (${month})` : undefined
      });
    }

    desiredByCompany.forEach((monthMap, companyId) => {
      const key = salaryIncomeNoteKey(companyId);
      const companyName = companyNameById.get(companyId) || 'Công ty';
      const income = incomes.find(i => i.notes === key);

      const desiredMonths = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

      const desiredSalaryPayments: Payment[] = desiredMonths.map(([month, data]) =>
        buildSalaryPayment({ companyId, month, netSalary: data.amount, note: data.note })
      );

      if (!income) {
        if (desiredSalaryPayments.length === 0) return;
        onAddIncome({
          id: generateUUID(),
          name: `Lương - ${companyName}`,
          amount: 0,
          receivedDate: 1,
          payments: desiredSalaryPayments,
          status: LoanStatus.ACTIVE,
          notes: key
        });
        return;
      }

      const prevPayments = Array.isArray(income.payments) ? income.payments : [];
      const keep = prevPayments.filter(p => !isSalaryPayment(p, companyId));
      const existingSalary = prevPayments.filter(p => isSalaryPayment(p, companyId));

      const existingByMonth = new Map<string, Payment>();
      for (const p of existingSalary) {
        const meta = (p as any).meta;
        if (meta?.month) existingByMonth.set(meta.month, p);
      }

      let changed = income.name !== `Lương - ${companyName}`;
      const nextSalary: Payment[] = [];
      for (const [month, data] of desiredMonths) {
        const old = existingByMonth.get(month);
        const desiredAmount = data.amount;
        const desiredNote = data.note || `Lương ${companyName} (${month})`;
        if (old && old.amount === desiredAmount && (old.note || '') === desiredNote) {
          nextSalary.push(old);
        } else {
          nextSalary.push(buildSalaryPayment({ companyId, month, netSalary: desiredAmount, note: desiredNote }));
          changed = true;
        }
      }

      // Remove salary payments that no longer exist in company records
      if (existingByMonth.size !== desiredMonths.length) {
        changed = true;
      }

      const nextPayments = [...keep, ...nextSalary];
      if (!changed) return;

      onUpdateIncome(income.id, {
        name: `Lương - ${companyName}`,
        payments: nextPayments
      });
    });
  }, [companies, companyIncomeRecords, incomes]);

  const handleAddCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCompanyName.trim();
    if (!name) return;

    const newCompany: Company = {
      id: generateUUID(),
      name,
      notes: newCompanyNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onAddCompany(newCompany);
    setSelectedCompanyId(newCompany.id);
    setNewCompanyName('');
    setNewCompanyNotes('');
  };

  const handleAddCompanyIncomeRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;
    const month = (recordMonth || '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) return;

    const net = recordNetSalary ? parseFloat(recordNetSalary) : undefined;
    const base = recordExcludeBhxh ? undefined : (recordBhxhBase ? parseFloat(recordBhxhBase) : undefined);
    if ((!net || net <= 0) && (!base || base <= 0)) return;

    const existing = companyIncomeRecords.find(r => r.companyId === selectedCompanyId && r.month === month);
    if (existing) {
      if (!window.confirm(`Tháng ${month} đã có dữ liệu. Bạn muốn cập nhật (ghi đè) không?`)) return;
      onUpdateCompanyIncomeRecord(existing.id, {
        netSalary: net && net > 0 ? net : undefined,
        bhxhBase: base && base > 0 ? base : undefined,
        excludeBhxh: recordExcludeBhxh || undefined,
        note: recordNote.trim() || undefined
      });
    } else {
      const record: CompanyIncomeRecord = {
        id: generateUUID(),
        companyId: selectedCompanyId,
        month,
        netSalary: net && net > 0 ? net : undefined,
        bhxhBase: base && base > 0 ? base : undefined,
        excludeBhxh: recordExcludeBhxh || undefined,
        note: recordNote.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      onAddCompanyIncomeRecord(record);
    }

    // Also sync into Income history/statistics as a SALARY payment (using netSalary)
    upsertSalaryPaymentForCompanyMonth({
      companyId: selectedCompanyId,
      month,
      netSalary: net && net > 0 ? net : undefined,
      note: recordNote.trim() ? `${recordNote.trim()} (${month})` : undefined
    });

    setRecordNetSalary('');
    setRecordBhxhBase('');
    setRecordNote('');
    setRecordBhxhAuto(true);
    setRecordExcludeBhxh(false);
  };

  const openEditCompany = (company: Company) => {
    setEditingCompany(company);
    setEditCompanyName(company.name);
    setEditCompanyNotes(company.notes || '');
  };

  const handleEditCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    const name = editCompanyName.trim();
    if (!name) return;

    onUpdateCompany(editingCompany.id, {
      name,
      notes: editCompanyNotes.trim() || undefined
    });

    // Keep corresponding salary income name in sync (if exists)
    const salaryIncome = findSalaryIncome(editingCompany.id);
    if (salaryIncome) {
      onUpdateIncome(salaryIncome.id, { name: `Lương - ${name}` });
    }

    setEditingCompany(null);
    setEditCompanyName('');
    setEditCompanyNotes('');
  };

  const openEditCompanyIncomeRecord = (record: CompanyIncomeRecord) => {
    setEditingCompanyIncomeRecord(record);
    setEditRecordMonth(record.month);
    const net = record.netSalary != null ? String(record.netSalary) : '';
    const base = record.bhxhBase != null ? String(record.bhxhBase) : '';
    const exclude = !!record.excludeBhxh;
    setEditRecordNetSalary(net);
    setEditRecordBhxhBase(base);
    // Default auto: base equals net (or base empty)
    setEditRecordBhxhAuto(base === '' || base === net);
    setEditRecordExcludeBhxh(exclude);
    setEditRecordNote(record.note || '');
  };

  const handleEditCompanyIncomeRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompanyIncomeRecord) return;

    const month = (editRecordMonth || '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) return;

    const net = editRecordNetSalary ? parseFloat(editRecordNetSalary) : undefined;
    const base = editRecordExcludeBhxh ? undefined : (editRecordBhxhBase ? parseFloat(editRecordBhxhBase) : undefined);
    if ((!net || net <= 0) && (!base || base <= 0)) return;

    const existing = companyIncomeRecords.find(
      r => r.companyId === editingCompanyIncomeRecord.companyId && r.month === month && r.id !== editingCompanyIncomeRecord.id
    );
    if (existing) {
      if (!window.confirm(`Tháng ${month} đã có dữ liệu. Bạn muốn cập nhật dòng hiện tại sang tháng này (trùng) không?`)) return;
    }

    onUpdateCompanyIncomeRecord(editingCompanyIncomeRecord.id, {
      month,
      netSalary: net && net > 0 ? net : undefined,
      bhxhBase: base && base > 0 ? base : undefined,
      excludeBhxh: editRecordExcludeBhxh || undefined,
      note: editRecordNote.trim() || undefined
    });

    // Also sync into Income history/statistics as a SALARY payment (using netSalary)
    upsertSalaryPaymentForCompanyMonth({
      companyId: editingCompanyIncomeRecord.companyId,
      month,
      netSalary: net && net > 0 ? net : undefined,
      note: editRecordNote.trim() ? `${editRecordNote.trim()} (${month})` : undefined,
      removeMonthIfDifferent: editingCompanyIncomeRecord.month
    });

    setEditingCompanyIncomeRecord(null);
    setEditRecordMonth('');
    setEditRecordNetSalary('');
    setEditRecordBhxhBase('');
    setEditRecordNote('');
    setEditRecordBhxhAuto(true);
    setEditRecordExcludeBhxh(false);
  };

  const isExtraPayment = (p: Payment) => p.id.startsWith('extra-');

  // Kiểm tra xem tháng hiện tại đã nhận tiền chưa (chỉ tính khoản cố định, bỏ qua đột xuất)
  const isCurrentMonthReceived = (income: Income): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const currentMonthPayments = income.payments.filter(p => {
      if (isExtraPayment(p)) return false;
      const paymentDate = new Date(p.date);
      return paymentDate.getFullYear() === currentYear && 
             paymentDate.getMonth() === currentMonth;
    });
    
    return currentMonthPayments.length > 0;
  };

  // Kiểm tra xem đã đến ngày nhận tiền chưa
  const isReceivedDatePassed = (income: Income): boolean => {
    const now = new Date();
    const currentDay = now.getDate();
    
    if (isCurrentMonthReceived(income)) return false;
    
    return currentDay >= income.receivedDate;
  };

  // Lọc và sắp xếp thu nhập
  const sortedIncomes = useMemo(() => {
    // Lọc theo tab hiện tại và loại bỏ thu nhập đột xuất (amount === 0)
    let filtered = incomes.filter(i => i.amount > 0); // Chỉ hiển thị thu nhập cố định
    if (activeTab === 'ACTIVE') {
      filtered = filtered.filter(i => i.status === LoanStatus.ACTIVE);
    } else if (activeTab === 'HISTORY') {
      filtered = filtered.filter(i => i.status === LoanStatus.COMPLETED);
    }
    
    const sorted = [...filtered];
    const sortFn = (a: Income, b: Income) => {
      if (activeTab === 'HISTORY') {
        // Sắp xếp theo ngày payment cuối cùng (mới nhất trước)
        const aLastPayment = a.payments.length > 0 ? new Date(a.payments[a.payments.length - 1].date).getTime() : 0;
        const bLastPayment = b.payments.length > 0 ? new Date(b.payments[b.payments.length - 1].date).getTime() : 0;
        return bLastPayment - aLastPayment;
      }
      
      // Sắp xếp cho tab ACTIVE
      if (sortBy === 'amount') {
        return b.amount - a.amount;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return a.receivedDate - b.receivedDate;
      }
    };
    return sorted.sort(sortFn);
  }, [incomes, sortBy, activeTab]);

  // Handle ESC key to close modals
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedIncome) setSelectedIncome(null);
        if (editingIncome) setEditingIncome(null);
        if (showHistory) setShowHistory(null);
        if (editingCompany) setEditingCompany(null);
        if (editingCompanyIncomeRecord) setEditingCompanyIncomeRecord(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedIncome, editingIncome, showHistory, editingCompany, editingCompanyIncomeRecord]);

  const renderIncomeRow = (income: Income) => {
    const isReceived = isCurrentMonthReceived(income);
    const datePassed = isReceivedDatePassed(income);
    // Thu nhập đột xuất là những income có amount = 0 (không có số tiền cố định hàng tháng)
    const isOneTimeIncome = income.amount === 0;

    return (
      <div key={income.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
        {/* Dòng 1: Thông tin chính */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
          {/* Tên khoản thu nhập */}
          <div className="col-span-12 md:col-span-4 flex items-center gap-3">
            <div className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full ${
              isOneTimeIncome ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              <Wallet size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold text-slate-900 truncate">{income.name}</div>
                {isOneTimeIncome && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium whitespace-nowrap">
                    Đột xuất
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Số tiền */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              {isOneTimeIncome ? 'Đã nhận' : 'Số tiền/tháng'}
            </div>
            {isOneTimeIncome ? (
              <div className="font-semibold text-emerald-600">
                <Amount 
                  value={income.payments.reduce((sum, p) => sum + p.amount, 0)} 
                  id={`income-${income.id}-total`} 
                />
              </div>
            ) : (
              <div className="font-semibold text-emerald-600">
                <Amount value={income.amount} id={`income-${income.id}-amount`} />
              </div>
            )}
          </div>

          {/* Ngày nhận tiền */}
          <div className="col-span-6 md:col-span-2 text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              {isOneTimeIncome ? 'Ngày nhận' : 'Ngày nhận/tháng'}
            </div>
            {isOneTimeIncome ? (
              <div className="font-semibold text-slate-900">
                {income.payments.length > 0 
                  ? new Date(income.payments[0].date).toLocaleDateString('vi-VN')
                  : '-'}
              </div>
            ) : (
              <div className="font-semibold text-slate-900">Ngày {income.receivedDate}</div>
            )}
          </div>

          {/* Trạng thái - chỉ hiển thị khi tab ACTIVE và không phải đột xuất */}
          {activeTab === 'ACTIVE' && !isOneTimeIncome && (
            <div className="col-span-6 md:col-span-2 text-right">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trạng thái</div>
              <div className={`font-semibold ${isReceived ? 'text-emerald-600' : datePassed ? 'text-orange-600' : 'text-slate-600'}`}>
                {isReceived ? 'Đã nhận' : datePassed ? 'Đã đến ngày' : 'Chưa đến ngày'}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={`col-span-6 md:col-span-2 flex flex-wrap items-center justify-end gap-1 ${activeTab === 'HISTORY' || isOneTimeIncome ? 'md:col-span-4' : ''}`}>
            {activeTab === 'ACTIVE' && !isOneTimeIncome && (
              <>
                <button
                  onClick={() => {
                    if (window.confirm(`Xác nhận kết thúc khoản thu nhập "${income.name}"?`)) {
                      onUpdateIncome(income.id, { status: LoanStatus.COMPLETED });
                    }
                  }}
                  className="p-1.5 text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded transition-colors"
                  title="Kết thúc"
                >
                  <Archive size={16} />
                </button>
                <button
                  onClick={() => {
                    if (!isReceived) {
                      // Tự động nhận với số tiền thu nhập
                      if (window.confirm(`Xác nhận đã nhận ${formatCurrency(income.amount)} từ "${income.name}"?`)) {
                        const newPayment: Payment = {
                          id: generateUUID(),
                          date: new Date().toISOString(),
                          amount: income.amount,
                          note: `Nhận tiền tháng ${new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`
                        };
                        onAddPayment(income.id, newPayment);
                      }
                    } else {
                      // Xóa payment cố định của tháng hiện tại
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const currentMonth = now.getMonth();
                      const currentMonthPayments = income.payments.filter(p => {
                        if (isExtraPayment(p)) return false;
                        const paymentDate = new Date(p.date);
                        return paymentDate.getFullYear() === currentYear && 
                               paymentDate.getMonth() === currentMonth;
                      });
                      const paymentIds = currentMonthPayments.map(p => p.id);
                      if (paymentIds.length > 0) {
                        onRemovePayment(income.id, paymentIds);
                      }
                    }
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium flex items-center gap-1 ${
                    isReceived
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : datePassed
                      ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title={isReceived ? 'Hủy nhận tiền' : 'Nhận tiền'}
                >
                  {isReceived ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  {isReceived ? 'Đã nhận' : 'Nhận'}
                </button>
              </>
            )}
            <button
              onClick={() => handleEditClick(income)}
              className="p-1.5 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded transition-colors"
              title="Chỉnh sửa"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => setShowHistory(showHistory === income.id ? null : income.id)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Lịch sử"
            >
              <History size={16} />
            </button>
            <button
              onClick={() => onDeleteIncome(income.id)}
              className="p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
              title="Xóa"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">Thu nhập hàng tháng</h2>
        
        <div className="flex gap-2">
          {/* Tab Controls */}
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
              onClick={() => setActiveTab('ACTIVE')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Wallet size={14} /> Đang hoạt động
            </button>
            <button 
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'HISTORY' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Archive size={14} /> Lịch sử
            </button>
          </div>
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Tổng thu đã nhận</p>
          <p className="text-2xl font-bold text-emerald-600">
            <Amount value={totalAll} id="income-total-all" />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Năm {currentYear}</p>
          <p className="text-2xl font-bold text-blue-600">
            <Amount value={totalThisYear} id="income-total-year" />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Tháng này</p>
          <p className="text-2xl font-bold text-purple-600">
            <Amount value={totalThisMonth} id="income-total-month" />
          </p>
        </div>
      </div>

      {activeTab === 'ACTIVE' && incomes.filter(i => i.status === LoanStatus.ACTIVE && i.amount > 0).length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">Bạn chưa có nguồn thu nhập đang hoạt động nào.</p>
        </div>
      )}
      
      {activeTab === 'HISTORY' && incomes.filter(i => i.status === LoanStatus.COMPLETED && i.amount > 0).length === 0 && (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">Chưa có khoản thu nhập nào đã kết thúc.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-0">
        {/* Sort Controls */}
        {activeTab === 'ACTIVE' && (
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
              onClick={() => setSortBy('receivedDate')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'receivedDate' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Calendar size={14} /> Ngày nhận
            </button>
            <button 
              onClick={() => setSortBy('amount')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'amount' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <DollarSign size={14} /> Số tiền cao nhất
            </button>
            <button 
              onClick={() => setSortBy('name')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortBy === 'name' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <TrendingUp size={14} /> Tên A-Z
            </button>
          </div>
        )}
      </div>
      {sortedIncomes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden !mt-2">
          {/* Header */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Khoản thu nhập cố định</div>
              <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Số tiền</div>
              <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Ngày nhận</div>
              {activeTab === 'ACTIVE' && (
                <div className="col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Trạng thái</div>
              )}
              <div className={`col-span-6 md:col-span-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider ${activeTab === 'HISTORY' ? 'md:col-span-4' : ''}`}>Thao tác</div>
            </div>
          </div>
          {/* Body */}
          <div className="divide-y divide-slate-100">
            {sortedIncomes.map(renderIncomeRow)}
          </div>
        </div>
      )}

      {/* Thêm thu nhập đột xuất - chỉ hiển thị khi tab ACTIVE */}
      {activeTab === 'ACTIVE' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Thêm thu nhập đột xuất</h3>
            <span className="text-xs text-slate-500">Tạo khoản thu nhập mới riêng biệt</span>
          </div>
        <form className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end" onSubmit={handleExtraIncomeSubmit}>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Tên khoản thu nhập *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="VD: Thưởng dự án, Freelance..."
              value={extraSourceName}
              onChange={e => setExtraSourceName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Số tiền *</label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="0"
              value={extraAmount}
              onChange={e => setExtraAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ngày nhận</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={extraDate}
              onChange={e => setExtraDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="VD: Thưởng, freelance..."
              value={extraNote}
              onChange={e => setExtraNote(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium"
            >
              Xác nhận thu nhập
            </button>
          </div>
        </form>
        </div>
      )}

      {/* Lịch sử thu nhập */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Lịch sử thu nhập</h3>
          <span className="text-xs text-slate-500">Sắp xếp mới nhất → cũ nhất</span>
        </div>
        {allPaymentsSorted.length === 0 ? (
          <div className="p-6 text-slate-500 text-sm">Chưa có khoản thu nào trong lịch sử.</div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-slate-200 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-6">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tìm kiếm</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Tên khoản thu / ghi chú / công ty / số tiền..."
                    value={incomeHistorySearch}
                    onChange={(e) => setIncomeHistorySearch(e.target.value)}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Lọc theo công ty</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    value={incomeHistoryCompanyFilter}
                    onChange={(e) => setIncomeHistoryCompanyFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả</option>
                    <option value={INCOME_HISTORY_NO_COMPANY}>— (Không có công ty)</option>
                    {sortedCompanies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 md:text-right">
                  <div className="text-xs text-slate-500 mb-1">Tổng thu (kết quả)</div>
                  <div className="font-semibold text-emerald-600 whitespace-nowrap">
                    <Amount value={filteredIncomeHistoryTotal} id="income-history-total-filtered" />
                  </div>
                </div>
              </div>
            </div>

            {filteredIncomeHistory.length === 0 ? (
              <div className="p-6 text-slate-500 text-sm">Không có kết quả phù hợp.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Ngày</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Khoản thu nhập</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Công ty</th>
                      <th className="px-4 py-2 text-right font-semibold text-slate-600">Số tiền</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Ghi chú</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-600 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedIncomeHistory.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700 whitespace-nowrap">
                          {new Date(p.date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-2 text-slate-700">{p.incomeName}</td>
                        <td className="px-4 py-2 text-slate-700 max-w-[220px] truncate">{p.companyName || '—'}</td>
                        <td className="px-4 py-2 text-right font-semibold text-emerald-600 whitespace-nowrap">
                          <Amount value={p.amount} id={`income-history-${p.id}`} />
                        </td>
                        <td className="px-4 py-2 text-slate-500 max-w-[240px] truncate">{p.note || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                            title="Xóa dòng lịch sử này"
                            onClick={() => {
                              if (!p.incomeId) return;

                              const meta = (p as any)?.meta;
                              // Salary lines are derived from company monthly records; deleting the payment alone will be re-synced back.
                              if (meta?.type === 'SALARY' && meta?.companyId && meta?.month) {
                                const companyName = companies.find(c => c.id === meta.companyId)?.name || 'Công ty';
                                const msg =
                                  `Dòng này là lương từ "${companyName}" (${meta.month}).\n` +
                                  `Xóa ở đây sẽ xóa "Lương thực nhận" của tháng này trong dữ liệu công ty (BHXH giữ nguyên).\n` +
                                  `Bạn có chắc chắn muốn xóa không?`;

                                if (!window.confirm(msg)) return;

                                const record = companyIncomeRecords.find(
                                  r => r.companyId === meta.companyId && r.month === meta.month
                                );

                                if (record) {
                                  // Clear only netSalary; keep BHXH base / exclude flag as-is
                                  onUpdateCompanyIncomeRecord(record.id, { netSalary: undefined });
                                  return;
                                }
                                // Fallback: remove payment if the source record cannot be found
                                onRemovePayment(p.incomeId, [p.id]);
                                return;
                              }

                              if (window.confirm('Xóa dòng lịch sử thu nhập này?')) onRemovePayment(p.incomeId, [p.id]);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {filteredIncomeHistory.length > INCOME_HISTORY_PAGE_SIZE && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-3 border-t border-slate-200 bg-white rounded-b-xl">
            <div className="text-xs text-slate-500">
              {(() => {
                const total = filteredIncomeHistory.length;
                const start = (incomeHistoryPage - 1) * INCOME_HISTORY_PAGE_SIZE + 1;
                const end = Math.min(total, incomeHistoryPage * INCOME_HISTORY_PAGE_SIZE);
                return `Hiển thị ${start}-${end} / ${total} (5 dòng/trang)`;
              })()}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={incomeHistoryPage <= 1}
                onClick={() => setIncomeHistoryPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>

              <div className="flex items-center gap-1">
                {incomeHistoryPageItems.map((p, idx) =>
                  p === null ? (
                    <span key={`ellipsis-income-${idx}`} className="px-1 text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setIncomeHistoryPage(p)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                        p === incomeHistoryPage
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                disabled={incomeHistoryPage >= incomeHistoryTotalPages}
                onClick={() => setIncomeHistoryPage(p => Math.min(incomeHistoryTotalPages, p + 1))}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Thống kê theo tháng */}
        {monthlyTotals.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Thống kê thu nhập theo tháng</h3>
              <span className="text-xs text-slate-500">Mỗi trang 5 tháng</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Tháng</th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600">Tổng thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedMonthlyTotals.map(item => (
                    <tr key={`${item.year}-${item.month}`} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700">
                        Tháng {item.month + 1}/{item.year}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                        <Amount value={item.total} id={`income-month-${item.year}-${item.month}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {monthlyTotals.length > MONTHLY_STATS_PAGE_SIZE && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-3 border-t border-slate-200 bg-white rounded-b-xl">
                <div className="text-xs text-slate-500">
                  {(() => {
                    const total = monthlyTotals.length;
                    const start = (monthlyStatsPage - 1) * MONTHLY_STATS_PAGE_SIZE + 1;
                    const end = Math.min(total, monthlyStatsPage * MONTHLY_STATS_PAGE_SIZE);
                    return `Hiển thị ${start}-${end} / ${total} (5 dòng/trang)`;
                  })()}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={monthlyStatsPage <= 1}
                    onClick={() => setMonthlyStatsPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trước
                  </button>

                  <div className="flex items-center gap-1">
                    {monthlyStatsPageItems.map((p, idx) =>
                      p === null ? (
                        <span key={`ellipsis-monthly-${idx}`} className="px-1 text-slate-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setMonthlyStatsPage(p)}
                          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                            p === monthlyStatsPage
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={monthlyStatsPage >= monthlyStatsTotalPages}
                    onClick={() => setMonthlyStatsPage(p => Math.min(monthlyStatsTotalPages, p + 1))}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Thống kê theo năm */}
        {yearlyTotals.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Thống kê thu nhập theo năm</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Năm</th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600">Tổng thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedYearlyTotals.map(item => (
                    <tr key={item.year} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700">{item.year}</td>
                      <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                        <Amount value={item.total} id={`income-year-${item.year}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {yearlyTotals.length > YEARLY_STATS_PAGE_SIZE && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-3 border-t border-slate-200 bg-white rounded-b-xl">
                <div className="text-xs text-slate-500">
                  {(() => {
                    const total = yearlyTotals.length;
                    const start = (yearlyStatsPage - 1) * YEARLY_STATS_PAGE_SIZE + 1;
                    const end = Math.min(total, yearlyStatsPage * YEARLY_STATS_PAGE_SIZE);
                    return `Hiển thị ${start}-${end} / ${total} (5 dòng/trang)`;
                  })()}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={yearlyStatsPage <= 1}
                    onClick={() => setYearlyStatsPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Trước
                  </button>

                  <div className="flex items-center gap-1">
                    {yearlyStatsPageItems.map((p, idx) =>
                      p === null ? (
                        <span key={`ellipsis-yearly-${idx}`} className="px-1 text-slate-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setYearlyStatsPage(p)}
                          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                            p === yearlyStatsPage
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={yearlyStatsPage >= yearlyStatsTotalPages}
                    onClick={() => setYearlyStatsPage(p => Math.min(yearlyStatsTotalPages, p + 1))}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Biểu đồ theo năm (full width) */}
      {yearlyTotals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Biểu đồ thu nhập theo năm</h3>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs text-slate-500">Tổng thu theo năm (toàn bộ quá trình).</p>
              <p className="text-xs text-slate-500">
                {yearlyChartData.length > 0
                  ? `Năm ${yearlyChartData[0].year} → ${yearlyChartData[yearlyChartData.length - 1].year}`
                  : ''}
              </p>
            </div>
            <div className="w-full overflow-x-auto">
              <div className="h-72" style={{ width: yearlyChartWidth }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyChartData} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={{ stroke: '#E2E8F0' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={{ stroke: '#E2E8F0' }}
                      tickFormatter={(v) => formatCompactMoneyTick(Number(v))}
                    />
                    <Tooltip content={<YearlyIncomeTooltip />} />
                    <Bar dataKey="total" fill="#10B981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Công ty & BHXH */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-700">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-800">Công ty & BHXH</h3>
              <p className="text-xs text-slate-500">
                Nhập lương (thực nhận) & mức lương đóng BHXH theo tháng để ước tính số tiền lãnh BHXH.
              </p>
            </div>
          </div>
        </div>

        {/* Thêm công ty */}
        <form className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end" onSubmit={handleAddCompanySubmit}>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Tên công ty *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="VD: ABC Company"
              value={newCompanyName}
              onChange={e => setNewCompanyName(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="VD: Phòng ban, vị trí..."
              value={newCompanyNotes}
              onChange={e => setNewCompanyNotes(e.target.value)}
            />
          </div>
          <div className="md:col-span-1 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 font-medium flex items-center gap-2"
            >
              <PlusCircle size={16} /> Thêm
            </button>
          </div>
        </form>

        {/* Chọn công ty */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Chọn công ty</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
            >
              <option value="">-- Chọn công ty --</option>
              {sortedCompanies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1 flex gap-2 justify-start">
            <button
              type="button"
              disabled={!selectedCompany}
              onClick={() => selectedCompany && openEditCompany(selectedCompany)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sửa
            </button>
            <button
              type="button"
              disabled={!selectedCompany}
              onClick={() => {
                if (!selectedCompany) return;
                if (window.confirm(`Xóa công ty "${selectedCompany.name}" và toàn bộ lịch sử lương/BHXH của công ty này?`)) {
                  onDeleteCompany(selectedCompany.id);
                  setSelectedCompanyId('');
                }
              }}
              className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xóa
            </button>
          </div>
        </div>

        {!selectedCompanyId ? (
          <div className="text-sm text-slate-500">
            Hãy tạo hoặc chọn công ty để nhập lịch sử lương/BHXH theo tháng.
          </div>
        ) : (
          <>
            {/* Thêm lịch sử theo tháng */}
            <form className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end" onSubmit={handleAddCompanyIncomeRecordSubmit}>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tháng *</label>
                <input
                  type="month"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  value={recordMonth}
                  onChange={e => setRecordMonth(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lương thực nhận</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="0"
                  value={recordNetSalary}
                  onChange={e => {
                    const v = e.target.value;
                    setRecordNetSalary(v);
                    if (recordBhxhAuto && !recordExcludeBhxh) {
                      setRecordBhxhBase(v);
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mức đóng BHXH</label>
                <input
                  type="number"
                  min="0"
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm ${recordExcludeBhxh ? 'bg-slate-100 text-slate-500' : ''}`}
                  placeholder={recordExcludeBhxh ? 'Đang tắt BHXH' : '0'}
                  value={recordExcludeBhxh ? '' : recordBhxhBase}
                  disabled={recordExcludeBhxh}
                  onChange={e => {
                    const v = e.target.value;
                    setRecordBhxhBase(v);
                    if (v === '' || v === recordNetSalary) {
                      setRecordBhxhAuto(true);
                    } else {
                      setRecordBhxhAuto(false);
                    }
                  }}
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">BHXH</label>
                <label className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white select-none">
                  <input
                    type="checkbox"
                    checked={recordExcludeBhxh}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRecordExcludeBhxh(checked);
                      if (checked) {
                        setRecordBhxhBase('');
                        setRecordBhxhAuto(false);
                      } else {
                        // Re-enable auto-fill if user hasn't customized
                        setRecordBhxhAuto(true);
                        setRecordBhxhBase(recordNetSalary);
                      }
                    }}
                  />
                  <span>Không tính BHXH</span>
                </label>
              </div>
              <div className="flex justify-start">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium"
                >
                  Lưu tháng
                </button>
              </div>
            </form>

            {/* Đã bỏ bảng danh sách lương theo tháng theo yêu cầu */}

            {/* BHXH calculator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-sm font-semibold text-slate-800">Thiết lập tính BHXH</div>

                {/* Year adjustment indices */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
                  <div className="text-xs font-semibold text-slate-700">Chỉ số trượt giá theo năm</div>

                  <form
                    className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const year = Number(newBhxhIndexYear);
                      const factor = parseFloat(newBhxhIndexFactor);
                      if (!Number.isFinite(year) || year < 1900 || year > 2100) return;
                      if (!Number.isFinite(factor) || factor <= 0) return;
                      onUpsertBhxhAdjustmentIndex(year, factor, newBhxhIndexNote.trim() || undefined);
                      setNewBhxhIndexNote('');
                    }}
                  >
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Năm</label>
                      <input
                        type="number"
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm"
                        value={newBhxhIndexYear}
                        onChange={(e) => setNewBhxhIndexYear(parseInt(e.target.value || '0', 10))}
                        min={1900}
                        max={2100}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Hệ số (VD: 1.12)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm"
                        value={newBhxhIndexFactor}
                        onChange={(e) => setNewBhxhIndexFactor(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="submit"
                        className="px-3 py-2 bg-slate-900 text-white text-xs rounded-lg hover:bg-slate-800 font-semibold"
                      >
                        Lưu
                      </button>
                    </div>
                  </form>

                  {bhxhAdjustmentIndices.length === 0 ? (
                    <div className="text-[11px] text-slate-500">Chưa có dữ liệu hệ số. Mặc định hệ số = 1 cho mọi năm.</div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-2 py-1.5 text-left font-semibold text-slate-600">Năm</th>
                              <th className="px-2 py-1.5 text-right font-semibold text-slate-600">Hệ số</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-slate-600">Ghi chú</th>
                              <th className="px-2 py-1.5 text-right font-semibold text-slate-600 w-16">Xóa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {pagedBhxhAdjustmentIndices.map((idx) => (
                              <tr key={idx.id}>
                                <td className="px-2 py-1.5 text-slate-700 whitespace-nowrap">{idx.year}</td>
                                <td className="px-2 py-1.5 text-right font-semibold text-slate-900 whitespace-nowrap">{idx.factor}</td>
                                <td className="px-2 py-1.5 text-slate-500 max-w-[160px] truncate">{idx.note || '-'}</td>
                                <td className="px-2 py-1.5 text-right">
                                  <button
                                    type="button"
                                    className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      if (window.confirm(`Xóa hệ số năm ${idx.year}?`)) {
                                        onDeleteBhxhAdjustmentIndex(idx.id);
                                      }
                                    }}
                                  >
                                    Xóa
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {sortedBhxhAdjustmentIndices.length > BHXH_INDEX_PAGE_SIZE && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 border-t border-slate-200 bg-white">
                          <div className="text-[11px] text-slate-500">
                            {(() => {
                              const total = sortedBhxhAdjustmentIndices.length;
                              const start = (bhxhIndexPage - 1) * BHXH_INDEX_PAGE_SIZE + 1;
                              const end = Math.min(total, bhxhIndexPage * BHXH_INDEX_PAGE_SIZE);
                              return `Hiển thị ${start}-${end} / ${total} (5 dòng/trang)`;
                            })()}
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={bhxhIndexPage <= 1}
                              onClick={() => setBhxhIndexPage(p => Math.max(1, p - 1))}
                              className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Trước
                            </button>

                            <div className="flex items-center gap-1">
                              {bhxhIndexPageItems.map((p, i) =>
                                p === null ? (
                                  <span key={`ellipsis-bhxh-${i}`} className="px-1 text-slate-400">
                                    …
                                  </span>
                                ) : (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => setBhxhIndexPage(p)}
                                    className={`px-2 py-1 text-[11px] rounded-lg border transition-colors ${
                                      p === bhxhIndexPage
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    {p}
                                  </button>
                                )
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={bhxhIndexPage >= bhxhIndexTotalPages}
                              onClick={() => setBhxhIndexPage(p => Math.min(bhxhIndexTotalPages, p + 1))}
                              className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Sau
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Làm tròn thời gian</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    value={bhxhRoundingMode}
                    onChange={e => setBhxhRoundingMode(e.target.value as BhxhRoundingMode)}
                  >
                    <option value="LAW">Theo quy định (1–6 tháng = 0.5 năm; 7–11 tháng = 1 năm)</option>
                    <option value="EXACT">Không làm tròn (tháng/12)</option>
                  </select>
                </div>

                <div className="text-xs text-slate-500">
                  Tip: Nếu bạn có “mức bình quân tiền lương tháng đóng BHXH” từ VSSID/bảng kê, hãy nhập vào để ước tính sát hơn.
                </div>
              </div>

              <div className="bg-white border border-emerald-200 rounded-xl p-4 lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Ước tính BHXH (một lần)</div>
                    <div className="text-xs text-slate-500">Theo dữ liệu mức đóng BHXH bạn nhập (tất cả công ty)</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Số tiền ước tính</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      <Amount value={bhxhEstimate.estimatedPayout} id="bhxh-estimate-all" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Tổng tháng</div>
                    <div className="font-semibold text-slate-900">{bhxhEstimate.totalMonths}</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Trước 2014</div>
                    <div className="font-semibold text-slate-900">{bhxhEstimate.monthsBefore2014} tháng</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Từ 2014</div>
                    <div className="font-semibold text-slate-900">{bhxhEstimate.monthsFrom2014} tháng</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Bình quân BHXH</div>
                    <div className="font-semibold text-slate-900">
                      <Amount value={bhxhEstimate.averageBhxhBase} id="bhxh-avg-all" />
                    </div>
                  </div>
                </div>

                {bhxhEstimate.notes.length > 0 && (
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                    {bhxhEstimate.notes.map((n, idx) => (
                      <div key={idx}>- {n}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Company Modal */}
      {editingCompany && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in"
          onClick={() => setEditingCompany(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Chỉnh sửa công ty</h2>
              <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditCompanySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên công ty</label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  value={editCompanyName}
                  onChange={e => setEditCompanyName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  value={editCompanyNotes}
                  onChange={e => setEditCompanyNotes(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-transform active:scale-95"
              >
                Lưu công ty
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Income Record Modal */}
      {editingCompanyIncomeRecord && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in"
          onClick={() => setEditingCompanyIncomeRecord(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Chỉnh sửa dữ liệu tháng</h2>
              <button onClick={() => setEditingCompanyIncomeRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditCompanyIncomeRecordSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tháng</label>
                <input
                  required
                  type="month"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={editRecordMonth}
                  onChange={e => setEditRecordMonth(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lương thực nhận</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={editRecordNetSalary}
                  onChange={e => {
                    const v = e.target.value;
                    setEditRecordNetSalary(v);
                    if (editRecordBhxhAuto && !editRecordExcludeBhxh) {
                      setEditRecordBhxhBase(v);
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">BHXH</label>
                <label className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white select-none">
                  <input
                    type="checkbox"
                    checked={editRecordExcludeBhxh}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEditRecordExcludeBhxh(checked);
                      if (checked) {
                        setEditRecordBhxhBase('');
                        setEditRecordBhxhAuto(false);
                      } else {
                        setEditRecordBhxhAuto(true);
                        setEditRecordBhxhBase(editRecordNetSalary);
                      }
                    }}
                  />
                  <span>Không tính BHXH</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mức đóng BHXH</label>
                <input
                  type="number"
                  min="0"
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none ${editRecordExcludeBhxh ? 'bg-slate-100 text-slate-500' : ''}`}
                  value={editRecordExcludeBhxh ? '' : editRecordBhxhBase}
                  disabled={editRecordExcludeBhxh}
                  onChange={e => {
                    const v = e.target.value;
                    setEditRecordBhxhBase(v);
                    if (v === '' || v === editRecordNetSalary) {
                      setEditRecordBhxhAuto(true);
                    } else {
                      setEditRecordBhxhAuto(false);
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={editRecordNote}
                  onChange={e => setEditRecordNote(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-200"
              >
                Lưu tháng
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedIncome && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0"
          onClick={() => setSelectedIncome(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800">Nhận tiền thu nhập</h2>
              <button onClick={() => setSelectedIncome(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Số tiền nhận được (VNĐ)</label>
                <input
                  type="number"
                  placeholder="Nhập số tiền"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  required
                  min="0"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ghi chú"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelectedIncome(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium">Xác nhận nhận tiền</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Income Modal */}
      {editingIncome && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0 animate-fade-in"
          onClick={() => setEditingIncome(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Chỉnh sửa thu nhập</h2>
              <button onClick={() => setEditingIncome(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên khoản thu nhập
                </label>
                <input required type="text" placeholder="VD: Lương, Freelance" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Công ty (tùy chọn)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Building2 size={16} />
                  </div>
                  <select
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    value={editCompanyId}
                    onChange={e => setEditCompanyId(e.target.value)}
                  >
                    <option value="">— Không chọn —</option>
                    {sortedCompanies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  BHXH
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editExcludeBhxh}
                    onChange={(e) => setEditExcludeBhxh(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">Không tính BHXH</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Số tiền hàng tháng (VNĐ)
                </label>
                <input required type="number" min="0" placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày nhận tiền hàng tháng</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  value={editReceivedDate}
                  onChange={e => setEditReceivedDate(parseInt(e.target.value))}
                >
                  {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>Ngày {d}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-200">
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (() => {
        const income = incomes.find(i => i.id === showHistory);
        if (!income) return null;
        return (
          <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-top-0"
            onClick={() => setShowHistory(null)}
          >
            <div 
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-scale-up max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-slate-800">Lịch sử nhận tiền - {income.name}</h2>
                <button onClick={() => setShowHistory(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                {income.payments.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Chưa có lịch sử nhận tiền</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Ngày</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-600">Số tiền</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-600">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {income.payments.slice().reverse().map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-600">{new Date(p.date).toLocaleDateString('vi-VN')}</td>
                          <td className="px-4 py-2 text-right font-medium text-emerald-600">
                            <Amount value={p.amount} id={`income-${income.id}-history-${p.id}`} />
                          </td>
                          <td className="px-4 py-2 text-slate-500">{p.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default IncomeList;

