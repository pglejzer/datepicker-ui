import { formatNumber } from "@/utils/date/intl";
import { createOptionGrid } from "./optionGrid";

export const createYearGrid = (ctx: {
  selected: number | null;
  focused: number;
  years: readonly number[];
  currentYear: number;
  label: string;
  locale: string;
  onPick(year: number): void;
}): HTMLDivElement =>
  createOptionGrid({
    className: "dp-ui__year-selection",
    itemClass: "dp-ui__year-selection-item",
    label: ctx.label,
    focused: ctx.years.indexOf(ctx.focused),
    items: ctx.years.map((year) => {
      const text = formatNumber(year, ctx.locale);
      return {
        label: text,
        name: text,
        selected: year === ctx.selected,
        current: year === ctx.currentYear,
        disabled: false,
        onPick: () => {
          ctx.onPick(year);
        },
      };
    }),
  });
