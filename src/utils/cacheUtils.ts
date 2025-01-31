const CACHE_NAME = "nvda-stock-data";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function getCachedData(key: string) {
  try {
    // Try Cache API first
    const cachedResponse = await caches.match(key);
    if (cachedResponse) {
      return await cachedResponse.json();
    }
    // Fallback to localStorage
    const localData = localStorage.getItem(key);
    return localData ? JSON.parse(localData) : null;
  } catch (error) {
    console.error("Error reading cache:", error);
    return null;
  }
}

export async function setCachedData(key: string, data: any) {
  try {
    // Store in Cache API
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      key,
      new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      })
    );
    // Backup to localStorage
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error writing to cache:", error);
  }
}

export function isCacheExpired(timestamp: number): boolean {
  return Date.now() - timestamp > CACHE_DURATION;
}

export function getCacheKey(prefix: string, identifier: string): string {
  return `${prefix}-${identifier}`;
}

export { CACHE_NAME, CACHE_DURATION };
