import { useMemo } from 'react';
import { computeSchedule } from '../lib/format';

export function usePaymentSchedule(amount, term, percent, startDate, downPayment = 0) {
  return useMemo(() => {
    if (!amount || !term || !percent) return { total: 0, monthly: 0, payments: [] };
    return computeSchedule(amount, term, percent, startDate, downPayment);
  }, [amount, term, percent, startDate, downPayment]);
}
