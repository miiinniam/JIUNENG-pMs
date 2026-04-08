import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeToDb } from '../lib/supabase';

export interface UseQueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useQuery<T>(
  queryKey: string,
  fetcher: () => Promise<T>
): UseQueryResult<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const d = await fetcherRef.current();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
    return subscribeToDb(() => {
      void refetch();
    });
  }, [queryKey, refetch]);

  return { data, error, isLoading, refetch };
}
