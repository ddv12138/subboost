export async function register(): Promise<void> {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startLocalScheduler } = await import("./src/lib/local-scheduler");
  startLocalScheduler();
}
