import { useStore } from "@/contexts/store.cntxt";

/**
 * Returns a `refreshControl` prop-set ready to spread onto
 * any <ScrollView>, <FlatList>, or <SectionList>.
 *
 * Usage:
 *   const { refreshControl } = useRefresh();
 *   <ScrollView refreshControl={refreshControl}>…</ScrollView>
 */
export function useRefresh() {
  const { refresh, loading } = useStore();
  return { refresh, refreshing: loading };
}
