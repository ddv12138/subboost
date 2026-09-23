import { runLocalSubscriptionAutoUpdate, refreshLocalRuleIndex } from "@local/lib/local-cron-jobs";

const SUBSCRIPTION_SWEEP_INTERVAL_MS = 6 * 60 * 1000;
const RULE_INDEX_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export type LocalSchedulerDependencies = {
  runRuleIndexRefresh: () => Promise<unknown>;
  runSubscriptionUpdate: () => Promise<unknown>;
  now?: () => number;
  logger?: Pick<Console, "info" | "error">;
};

export function createLocalScheduler(dependencies: LocalSchedulerDependencies): () => void {
  const now = dependencies.now ?? Date.now;
  const logger = dependencies.logger ?? console;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastRuleIndexCheckAt: number | undefined;

  async function runCycle(): Promise<void> {
    if (stopped) return;

    const cycleStartedAt = now();
    if (lastRuleIndexCheckAt === undefined || cycleStartedAt - lastRuleIndexCheckAt >= RULE_INDEX_CHECK_INTERVAL_MS) {
      lastRuleIndexCheckAt = cycleStartedAt;
      try {
        const result = await dependencies.runRuleIndexRefresh();
        logger.info("[local-scheduler] rule index check completed", result);
      } catch (error) {
        logger.error("[local-scheduler] rule index check failed", error);
      }
    }

    if (stopped) return;
    try {
      const result = await dependencies.runSubscriptionUpdate();
      logger.info("[local-scheduler] subscription sweep completed", result);
    } catch (error) {
      logger.error("[local-scheduler] subscription sweep failed", error);
    }

    if (!stopped) {
      timer = setTimeout(() => void runCycle(), SUBSCRIPTION_SWEEP_INTERVAL_MS);
      timer.unref?.();
    }
  }

  logger.info("[local-scheduler] started", {
    subscriptionSweepIntervalMinutes: SUBSCRIPTION_SWEEP_INTERVAL_MS / 60_000,
    ruleIndexCheckIntervalMinutes: RULE_INDEX_CHECK_INTERVAL_MS / 60_000,
  });
  timer = setTimeout(() => void runCycle(), 0);
  timer.unref?.();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

let stopScheduler: (() => void) | undefined;

export function startLocalScheduler(): void {
  if (stopScheduler) return;
  stopScheduler = createLocalScheduler({
    runRuleIndexRefresh: refreshLocalRuleIndex,
    runSubscriptionUpdate: runLocalSubscriptionAutoUpdate,
  });
}
