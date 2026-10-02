import { useQuery } from '@tanstack/react-query';
import { fetchStatus } from '../api/statusApi';

export const STATUS_QUERY_KEY = ['status'];

export function useStatus() {
  return useQuery({ queryKey: STATUS_QUERY_KEY, queryFn: fetchStatus, refetchInterval: 30000, retry: 0 });
}
