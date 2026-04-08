import { useSyncExternalStore } from 'react';

/**
 * 订阅模块级单例 store（getSnapshot 在数据未变时应保持同一引用）
 */
export function useExternalStore<T>(
  subscribe: (cb: () => void) => () => void,
  getSnapshot: () => T
): T {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
