import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@local/lib/local-cron-jobs", () => ({
  runLocalSubscriptionAutoUpdate: vi.fn(),
  refreshLocalRuleIndex: vi.fn(),
}));

import { createLocalScheduler } from "./local-scheduler";

describe("local scheduler", () => {
  afterEach(() => vi.useRealTimers());

  it("runs both jobs immediately and then sweeps subscriptions every six minutes", async () => {
    vi.useFakeTimers();
    const runRuleIndexRefresh = vi.fn().mockResolvedValue({ status: "skipped" });
    const runSubscriptionUpdate = vi.fn().mockResolvedValue({ updated: 0 });
    const logger = { info: vi.fn(), error: vi.fn() };
    const stop = createLocalScheduler({ runRuleIndexRefresh, runSubscriptionUpdate, logger });

    await vi.runOnlyPendingTimersAsync();
    expect(runRuleIndexRefresh).toHaveBeenCalledTimes(1);
    expect(runSubscriptionUpdate).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
    expect(runSubscriptionUpdate).toHaveBeenCalledTimes(2);
    expect(runRuleIndexRefresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(54 * 60 * 1000);
    expect(runSubscriptionUpdate).toHaveBeenCalledTimes(11);
    expect(runRuleIndexRefresh).toHaveBeenCalledTimes(2);

    stop();
  });

  it("keeps scheduling after one job fails and stops cleanly", async () => {
    vi.useFakeTimers();
    const runRuleIndexRefresh = vi.fn().mockRejectedValueOnce(new Error("index unavailable")).mockResolvedValue({});
    const runSubscriptionUpdate = vi.fn().mockResolvedValue({});
    const logger = { info: vi.fn(), error: vi.fn() };
    const stop = createLocalScheduler({ runRuleIndexRefresh, runSubscriptionUpdate, logger });

    await vi.runOnlyPendingTimersAsync();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(runSubscriptionUpdate).toHaveBeenCalledTimes(1);

    stop();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(runSubscriptionUpdate).toHaveBeenCalledTimes(1);
  });
});
