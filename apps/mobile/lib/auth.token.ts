let provider: (() => string | null | undefined) | null = null;

export const setAuthTokenProvider = (fn: () => string | null | undefined) => {
  provider = fn;
};

export const getAuthToken = (): string | null => {
  try {
    const val = provider?.();
    return (val ?? null) as string | null;
  } catch {
    return null;
  }
};

