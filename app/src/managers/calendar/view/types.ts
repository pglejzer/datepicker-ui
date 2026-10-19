import type { PlainDate } from "@/types/date";
import type { Panel } from "@/types/internal";

export type Layout = "docked" | "modal" | "range";

export type MenuPanel = Exclude<Panel, "days">;

export type PickerPanel = Exclude<MenuPanel, "input">;

export interface DateCell {
  readonly element: HTMLElement;
  readonly date: PlainDate;
}
