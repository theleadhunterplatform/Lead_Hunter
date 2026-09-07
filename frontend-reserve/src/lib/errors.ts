export function getApiError(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };
  return (
    err.response?.data?.error ||
    err.response?.data?.message ||
    (typeof err.message === "string" && err.message.trim() ? err.message : null) ||
    fallback
  );
}
