// ponytail: in-memory per process, resets on restart and is not shared between instances;
// move to Redis or the platform's rate limiter if this runs on more than one server.
const hits = new Map<string, number[]>()

export function allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}
