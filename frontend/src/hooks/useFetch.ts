import { useState, useEffect } from 'react';
import axios, { AxiosRequestConfig } from 'axios';

export function useFetch<T = any>(url: string, options?: AxiosRequestConfig) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios(url, {
          ...options,
          signal: controller.signal
        });
        setData(res.data);
        setError(null);
      } catch (err: any) {
        if (!axios.isCancel(err)) {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [url]);

  return { data, loading, error };
}
