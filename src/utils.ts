export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sortKeysRecursively<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(sortKeysRecursively) as T;
  } else if (obj && typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => [key, sortKeysRecursively(value)]),
    ) as T;
  }
  return obj;
}

export function abortIf(condition: boolean, message: string): void {
  if (condition) {
    console.error('abortIf', condition, message);
    process.exit(1);
  }
}

export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
