import { runLocalSubscriptionAutoUpdateCron } from "@local/lib/auto-update-service";
import { refreshRuleIndex } from "@local/lib/rule-catalog";

type RuleIndexResult = Awaited<ReturnType<typeof refreshRuleIndex>>;
type SubscriptionUpdateResult = Awaited<ReturnType<typeof runLocalSubscriptionAutoUpdateCron>>;

let ruleIndexInFlight: Promise<RuleIndexResult> | null = null;
let ruleIndexInFlightIsForced = false;
let subscriptionsInFlight: Promise<SubscriptionUpdateResult> | null = null;

export function refreshLocalRuleIndex(force = false): Promise<RuleIndexResult> {
  if (ruleIndexInFlight) {
    if (!force || ruleIndexInFlightIsForced) return ruleIndexInFlight;

    const currentFlight = ruleIndexInFlight;
    const forcedFlight = currentFlight.then(
      () => refreshRuleIndex({ force: true }),
      () => refreshRuleIndex({ force: true })
    );
    ruleIndexInFlight = forcedFlight;
    ruleIndexInFlightIsForced = true;
    const clearForcedFlight = () => {
      if (ruleIndexInFlight === forcedFlight) {
        ruleIndexInFlight = null;
        ruleIndexInFlightIsForced = false;
      }
    };
    void forcedFlight.then(clearForcedFlight, clearForcedFlight);
    return forcedFlight;
  }

  const flight = refreshRuleIndex({ force });
  ruleIndexInFlight = flight;
  ruleIndexInFlightIsForced = force;
  const clearFlight = () => {
    if (ruleIndexInFlight === flight) {
      ruleIndexInFlight = null;
      ruleIndexInFlightIsForced = false;
    }
  };
  void flight.then(clearFlight, clearFlight);
  return flight;
}

export function runLocalSubscriptionAutoUpdate(): Promise<SubscriptionUpdateResult> {
  if (subscriptionsInFlight) return subscriptionsInFlight;

  const flight = runLocalSubscriptionAutoUpdateCron();
  subscriptionsInFlight = flight;
  const clearFlight = () => {
    if (subscriptionsInFlight === flight) subscriptionsInFlight = null;
  };
  void flight.then(clearFlight, clearFlight);
  return flight;
}
