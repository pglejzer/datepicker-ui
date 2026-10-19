import type { PlainDate, YearMonth } from "@/types/date";
import type { NavigateSource } from "@/types/internal";

export interface RangeDays {
  readonly element: HTMLElement;
  cellAt(target: EventTarget | null): HTMLElement | null;
  focusCell(date: PlainDate): void;
  refresh(): void;
  reveal(view: YearMonth): void;
  present(view: YearMonth, delta: number, source: NavigateSource): void;
  destroy(): void;
}
