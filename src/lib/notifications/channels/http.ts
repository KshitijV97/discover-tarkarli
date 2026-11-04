/** fetch with a timeout and a readable error on non-2xx. */
export async function postJson(url: string, init: { headers?: Record<string, string>; body: unknown; form?: boolean; timeoutMs?: number }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 10_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": init.form ? "application/x-www-form-urlencoded" : "application/json", ...init.headers },
      body: init.form ? new URLSearchParams(init.body as Record<string, string>).toString() : JSON.stringify(init.body),
    });
    const text = await res.text();
    let data: unknown = text;
    try { data = JSON.parse(text); } catch { /* keep text */ }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    return data as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}
