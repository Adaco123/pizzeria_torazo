
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { error?: string } } }).response
    return response?.data?.error ?? "Error desconocido"
  }
  return "Error desconocido"
}