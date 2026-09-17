/**
 * Plastic detection → UAV automation policy.
 * Replace `plasticPollutionSeverityScore` with your model output (0–100) when you plug in real inference.
 *
 * Offline trainer (HOG + LinearSVM, Roboflow, sliding window): `ml/plastic_hog_svm/`
 * Export: `ml/plastic_hog_svm/models/hog_svm_plastic.joblib` — load in a small API and map scores here.
 */
import type { PollutionReport } from "@/lib/citizen-store";

/** When computed water / plastic severity exceeds this, an autonomous UAV is routed to the report coordinates. */
export const UAV_SEVERITY_AUTO_DISPATCH_THRESHOLD_PERCENT = 50;

/**
 * Minimum AI severity (0–100) to treat plastic as a “plastic in water” alert for UAV routing
 * (in addition to authority-submitted reports).
 */
export const UAV_PLASTIC_WATER_ALERT_MIN_PERCENT = 18;

/** Map a stored report (or future frame features) to a single severity score for policy decisions. */
export function plasticPollutionSeverityScore(report: PollutionReport): number {
  return report.severityPercent;
}

export function shouldDispatchUavForPollution(severityPercent: number): boolean {
  return severityPercent > UAV_SEVERITY_AUTO_DISPATCH_THRESHOLD_PERCENT;
}

/** True when plastic is indicated and severity is at least the water-alert floor. */
export function isPlasticInWaterUavAlert(report: PollutionReport): boolean {
  const score = plasticPollutionSeverityScore(report);
  return report.plasticDetected && score >= UAV_PLASTIC_WATER_ALERT_MIN_PERCENT;
}

/**
 * UAV goes airborne when:
 * - the report is in the authority review queue (`pending_review`), or
 * - a plastic-in-water alert fires (plastic + severity floor), or
 * - the report is approved (or legacy undecided) and severity is above the auto-dispatch threshold.
 */
export function shouldDispatchUavForReport(report: PollutionReport): boolean {
  if (report.authorityStatus === "rejected") return false;
  if (report.authorityStatus === "pending_review") return true;
  if (isPlasticInWaterUavAlert(report)) return true;
  const score = plasticPollutionSeverityScore(report);
  const postAuthority =
    report.authorityStatus === "approved" || report.authorityStatus === undefined;
  if (postAuthority && shouldDispatchUavForPollution(score)) return true;
  return false;
}
