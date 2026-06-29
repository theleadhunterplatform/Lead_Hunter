export function getApiError(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { error?: string; message?: string } } };
  return err.response?.data?.error || err.response?.data?.message || fallback;
}
