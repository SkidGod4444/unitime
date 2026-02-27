export const getDynamicCacheTag = (prefix: string, rawTag: string): string => {
  const sanitized = rawTag.replace(/[^a-zA-Z0-9_]/g, "");
  return `${prefix}_${sanitized}`;
};
