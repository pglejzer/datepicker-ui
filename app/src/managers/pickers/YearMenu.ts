import type { YearMonth } from "@/types/date";
import { formatNumber } from "@/utils/date/intl";
import { buildMenu } from "./MonthMenu";

export const createYearMenu = (ctx: {
  view: YearMonth;
  years: readonly number[];
  label: string;
  locale: string;
  onPick(year: number): void;
}): HTMLUListElement =>
  buildMenu(
    "year",
    ctx.label,
    ctx.years.map((year) => ({
      label: formatNumber(year, ctx.locale),
      selected: year === ctx.view.year,
      disabled: false,
      onPick: () => {
        ctx.onPick(year);
      },
    })),
  );
