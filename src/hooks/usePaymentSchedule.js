import { useMemo } from 'react';
import { computeSchedule } from '../lib/format';

export function usePaymentSchedule(amount, term, percent, startDate) {
  return useMemo(() => {
    if (!amount || !term || !percent) return { total: 0, monthly: 0, payments: [] };
    return computeSchedule(amount, term, percent, startDate);
  }, [amount, term, percent, startDate]);
}
