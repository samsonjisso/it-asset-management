import { useCallback, useState } from 'react';
import type { PingResult } from '../../../../lib/api';
import { pingIp } from '../../../../lib/api';
import { useToast } from '../../../../components/Toast';
import { isValidIPv4 } from '../utils/ipValidation';

export function useIPAvailability() {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<PingResult | null>(null);

  const check = useCallback(
    async (value: string): Promise<PingResult | null> => {
      const ip = value.trim();
      if (!isValidIPv4(ip)) {
        toast('Enter a valid IPv4 address, e.g. 10.6.1.50', 'error');
        return null;
      }

      setChecking(true);
      setResult(null);

      try {
        const { data, error } = await pingIp(ip);
        if (error || !data) {
          toast(error?.message ?? 'Could not check that IP', 'error');
          return null;
        }

        setResult(data);
        return data;
      } finally {
        setChecking(false);
      }
    },
    [toast],
  );

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return { checking, result, check, reset };
}
