import type { YearMonth } from "@/types/date";
import { formatNumber, monthNames } from "@/utils/date/intl";
import { createOptionGrid } from "./optionGrid";

export const createMonthGrid = (ctx: {
  year: number;
  selected: number | null;
  focused: number;
  current: YearMonth;
  locale: string;
  label: string;
  isDisabled(month: number): boolean;
  onPick(month: number): void;
}): HTMLDivElement => {
  const shortNames = monthNames(ctx.locale, "short");
  const longNames = monthNames(ctx.locale, "long");
  const year = formatNumber(ctx.year, ctx.locale);
  return createOptionGrid({
    className: "dp-ui__month-selection",
    itemClass: "dp-ui__month-selection-item",
    label: ctx.label,
    focused: ctx.focused - 1,
    items: shortNames.map((name, index) => {
      const month = index + 1;
      return {
        label: name,
        name: `${longNames[index] ?? name} ${year}`,
        selected: month === ctx.selected,
        current: ctx.current.year === ctx.year && ctx.current.month === month,
        disabled: ctx.isDisabled(month),
        onPick: () => {
          ctx.onPick(month);
        },
      };
    }),
  });
};
