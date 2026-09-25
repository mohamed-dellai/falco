const attempts = new Map<string, number>();

export function allowSubmission(key: string, cooldownMs = 15_000) {
  const now = Date.now();
  const previous = attempts.get(key) ?? 0;

  if (now - previous < cooldownMs) {
    return false;
  }

  attempts.set(key, now);

  if (attempts.size > 500) {
    for (const [entry, timestamp] of attempts) {
      if (now - timestamp > cooldownMs * 4) attempts.delete(entry);
    }
  }

  return true;
}
