import { useCallback, useEffect, useRef, useState } from 'react';
import { AppData, emptyData, loadData, saveData } from '../services/fileService';

export const useDataManagement = () => {
  const [data, setData] = useState<AppData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const version = useRef<string | null>(null);
  const saved = useRef('');
  const latest = useRef(data);
  const running = useRef<Promise<void> | null>(null);
  const failed = useRef(false);

  useEffect(() => {
    let active = true;
    loadData().then(result => {
      if (!active) return;
      version.current = result.version;
      saved.current = JSON.stringify(result.data);
      latest.current = result.data;
      setData(result.data);
      setIsLoading(false);
    }).catch(error => {
      if (!active) return;
      console.error('Lỗi khi tải dữ liệu:', error);
      setLoadError(error instanceof Error ? error.message : 'Không thể tải dữ liệu');
      setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const flush = useCallback(async () => {
    if (failed.current) throw new Error('Dữ liệu chưa được lưu. Hãy sao lưu thay đổi và tải lại trang.');
    if (running.current) {
      await running.current;
      return flush();
    }
    const operation = async () => {
      while (version.current !== null && JSON.stringify(latest.current) !== saved.current) {
        const snapshot = JSON.stringify(latest.current);
        const result = await saveData(JSON.parse(snapshot), version.current);
        version.current = result.version;
        saved.current = snapshot;
      }
    };
    running.current = operation();
    try {
      await running.current;
    } catch (error) {
      failed.current = true;
      throw error;
    } finally {
      running.current = null;
    }
  }, []);

  useEffect(() => {
    if (isLoading || loadError) return;
    latest.current = data;
    const timer = window.setTimeout(() => {
      flush().catch(error => {
        console.error('Lỗi khi lưu dữ liệu:', error);
        alert(`Không thể lưu dữ liệu: ${error instanceof Error ? error.message : 'Lỗi không xác định'}. Thay đổi vẫn ở trang này; hãy sao lưu trước khi tải lại.`);
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [data, isLoading, loadError, flush]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (version.current !== null && JSON.stringify(latest.current) !== saved.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const update = useCallback(<K extends keyof AppData>(key: K, value: React.SetStateAction<AppData[K]>) => {
    setData(previous => ({
      ...previous,
      [key]: typeof value === 'function' ? value(previous[key]) : value
    }));
  }, []);

  const replaceData = useCallback(async (next: AppData) => {
    await flush();
    latest.current = next;
    await flush();
    setData(next);
  }, [flush]);

  return {
    ...data, isLoading, loadError, flush, replaceData,
    setLoans: useCallback((value: React.SetStateAction<AppData['loans']>) => update('loans', value), [update]),
    setCreditCards: useCallback((value: React.SetStateAction<AppData['creditCards']>) => update('creditCards', value), [update]),
    setFixedExpenses: useCallback((value: React.SetStateAction<AppData['fixedExpenses']>) => update('fixedExpenses', value), [update]),
    setIncomes: useCallback((value: React.SetStateAction<AppData['incomes']>) => update('incomes', value), [update]),
    setLendings: useCallback((value: React.SetStateAction<AppData['lendings']>) => update('lendings', value), [update]),
    setCompanies: useCallback((value: React.SetStateAction<AppData['companies']>) => update('companies', value), [update]),
    setCompanyIncomeRecords: useCallback((value: React.SetStateAction<AppData['companyIncomeRecords']>) => update('companyIncomeRecords', value), [update]),
    setBhxhAdjustmentIndices: useCallback((value: React.SetStateAction<AppData['bhxhAdjustmentIndices']>) => update('bhxhAdjustmentIndices', value), [update]),
    setInvestmentAccounts: useCallback((value: React.SetStateAction<AppData['investmentAccounts']>) => update('investmentAccounts', value), [update]),
    setInvestmentTransactions: useCallback((value: React.SetStateAction<AppData['investmentTransactions']>) => update('investmentTransactions', value), [update])
  };
};
