import type { ResolvedOptions } from "../../datepicker/options/types";
import type { UnavailableReason } from "../../types/types";
import { formatPeriod } from "../date/period";

type MessageOptions = Pick<
  ResolvedOptions,
  "labels" | "minDate" | "maxDate" | "pattern" | "precision"
>;

export function unavailableMessage(
  reason: UnavailableReason,
  options: MessageOptions,
): string {
  const { labels, minDate, maxDate, pattern, precision } = options;
  if (reason === "min" && minDate !== null) {
    return labels.beforeMinDate.replace(
      "{date}",
      formatPeriod(minDate, pattern, precision),
    );
  }
  if (reason === "max" && maxDate !== null) {
    return labels.afterMaxDate.replace(
      "{date}",
      formatPeriod(maxDate, pattern, precision),
    );
  }
  if (reason === "range-length") return labels.invalidRange;
  return labels.unavailableDate;
}
