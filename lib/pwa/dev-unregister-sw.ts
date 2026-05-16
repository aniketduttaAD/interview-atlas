/**
 * Remove stale service workers and caches in development.
 * A production SW left registered on localhost causes IDB errors during HMR.
 */
export async function unregisterServiceWorkersInDev(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return;

  await Promise.all(
    registrations.map((registration) => registration.unregister()),
  );

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}
