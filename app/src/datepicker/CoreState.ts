import { INSTANCE_ID_PREFIX } from "../constants/constants";
import type { PlainDate, YearMonth } from "../types/date";
import type { DatepickerOptions } from "../types/options";
import type { RangeEnd, Selection } from "../types/selection";
import { EventEmitter } from "../utils/EventEmitter";
import { monthsBetween, todayDate } from "../utils/date/plainDate";
import { homePanel } from "../utils/surface";
import type { ViewLayout } from "../utils/surface";
import { anchorDate, emptySelection } from "../utils/selection/model";
import type {
  InternalEventMap,
  NavigateSource,
  Panel,
  SurfaceMode,
} from "../types/internal";
import { mergeOptions } from "./options/merge";
import { resolveOptions } from "./options/resolve";
import type { ResolvedOptions } from "./options/types";

const INVALID_ID_CHARACTERS = /[^\w-]/g;

let instanceCounter = 0;

export function sanitizeInstanceId(id: string): string {
  return id.replace(INVALID_ID_CHARACTERS, "-");
}

function monthOf(date: YearMonth): YearMonth {
  return { year: date.year, month: date.month };
}

export class CoreState {
  readonly instanceId: string;
  readonly events = new EventEmitter<InternalEventMap>();
  private raw: DatepickerOptions;
  private resolved: ResolvedOptions;
  private currentValue: Selection;
  private currentDraft: Selection;
  private currentView: YearMonth;
  private currentFocus: PlainDate;
  private currentPanel: Panel;
  private currentMode: SurfaceMode | null = null;
  private currentLayout: ViewLayout = { months: 1, presets: "none" };
  private currentActiveEnd: RangeEnd = "start";
  private currentEndInput: HTMLInputElement | null = null;
  private activeEndControlled = false;

  constructor(
    readonly input: HTMLInputElement,
    readonly host: HTMLElement,
    readonly createdHost: boolean,
    options: DatepickerOptions | undefined,
  ) {
    this.raw = mergeOptions({}, options ?? {});
    this.resolved = resolveOptions(this.raw);
    instanceCounter += 1;
    const customId = this.resolved.behavior.id;
    this.instanceId =
      customId === null
        ? `${INSTANCE_ID_PREFIX}${String(instanceCounter)}`
        : sanitizeInstanceId(customId);
    this.currentPanel = homePanel(this.resolved.precision);
    this.currentValue = emptySelection(this.resolved.mode);
    this.currentDraft = this.currentValue;
    const today = todayDate();
    this.currentFocus = today;
    this.currentView = monthOf(today);
  }

  get options(): ResolvedOptions {
    return this.resolved;
  }

  get rawOptions(): DatepickerOptions {
    return this.raw;
  }

  setOptions(patch: DatepickerOptions): void {
    this.raw = mergeOptions(this.raw, patch);
    this.resolved = resolveOptions(this.raw);
    this.events.emit("change:options", {});
  }

  get value(): Selection {
    return this.currentValue;
  }

  setValue(value: Selection): void {
    this.currentValue = value;
    this.events.emit("change:value", { value });
  }

  get draft(): Selection {
    return this.currentDraft;
  }

  setDraft(draft: Selection): void {
    this.currentDraft = draft;
    this.events.emit("change:draft", { draft });
  }

  get view(): YearMonth {
    return this.currentView;
  }

  setView(view: YearMonth, delta: number, source: NavigateSource): void {
    const next = monthOf(view);
    this.currentView = next;
    this.events.emit("change:view", { view: next, delta, source });
  }

  get focus(): PlainDate {
    return this.currentFocus;
  }

  setFocus(date: PlainDate): void {
    this.currentFocus = date;
    this.events.emit("change:focus", { focus: date });
  }

  get panel(): Panel {
    return this.currentPanel;
  }

  setPanel(panel: Panel): void {
    if (panel === this.currentPanel) {
      return;
    }
    this.currentPanel = panel;
    this.events.emit("change:panel", { panel });
  }

  get mode(): SurfaceMode | null {
    return this.currentMode;
  }

  setMode(mode: SurfaceMode | null): void {
    this.currentMode = mode;
  }

  get layout(): ViewLayout {
    return this.currentLayout;
  }

  setLayout(layout: ViewLayout): void {
    this.currentLayout = layout;
  }

  get activeEnd(): RangeEnd {
    return this.currentActiveEnd;
  }

  setActiveEnd(end: RangeEnd): void {
    if (end === this.currentActiveEnd) {
      return;
    }
    this.currentActiveEnd = end;
    this.events.emit("change:active-end", { end });
  }

  controlActiveEnd(): void {
    this.activeEndControlled = true;
  }

  get followsActiveEnd(): boolean {
    return this.currentEndInput !== null || this.activeEndControlled;
  }

  get endInput(): HTMLInputElement | null {
    return this.currentEndInput;
  }

  setEndInput(input: HTMLInputElement | null): void {
    this.currentEndInput = input;
  }

  resetSession(): void {
    const focus = anchorDate(this.currentValue) ?? todayDate();
    const view = monthOf(focus);
    this.setPanel(homePanel(this.resolved.precision));
    this.setDraft(this.currentValue);
    this.setView(view, monthsBetween(this.currentView, view), "api");
    this.setFocus(focus);
  }
}
