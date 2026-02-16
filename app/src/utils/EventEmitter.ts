/**
 * EventEmitter - Typed event system
 *
 * Architecture: Type-safe event handling
 * Every event has a dedicated typed payload
 */

import type {
  OpenEventData,
  CancelEventData,
  ConfirmEventData,
  ShowEventData,
  HideEventData,
  UpdateEventData,
  SelectDayEventData,
  SelectMonthEventData,
  SelectYearEventData,
  ChangeViewEventData,
  ErrorEventData,
  RangeStartEventData,
  RangeUpdateEventData,
  RangeEndEventData,
  RangeCancelEventData,
  CalendarRenderedEventData,
  SwipeStartEventData,
  SwipeMoveEventData,
  SwipeEndEventData,
  SwipeCancelEventData,
} from "../types/types";

type EventHandler<T = unknown> = (data: T) => void;

/**
 * Complete event map for DatepickerUI
 * Every event must be typed
 */
export interface DatepickerEventMap {
  open: OpenEventData;
  close: Record<string, never>;
  cancel: CancelEventData;
  confirm: ConfirmEventData;
  show: ShowEventData;
  hide: HideEventData;
  update: UpdateEventData;
  "select:day": SelectDayEventData;
  "select:month": SelectMonthEventData;
  "select:year": SelectYearEventData;
  "change:view": ChangeViewEventData;
  "view:toggle": { mode: "input" | "calendar" };
  "animation:calendar": Record<string, never>;
  "mask:input": { value: string; isComplete: boolean };
  "range:start": RangeStartEventData;
  "range:update": RangeUpdateEventData;
  "range:end": RangeEndEventData;
  "range:cancel": RangeCancelEventData;
  "range:header-update": Record<string, never>;
  "navigate:prev": Record<string, never>;
  "navigate:next": Record<string, never>;
  "navigate:jump": { months: number };
  "navigate:swipe-complete": {
    month: number;
    year: number;
    direction: "left" | "right";
  };
  "calendar:rendered": CalendarRenderedEventData;
  "swipe:start": SwipeStartEventData;
  "swipe:move": SwipeMoveEventData;
  "swipe:end": SwipeEndEventData;
  "swipe:cancel": SwipeCancelEventData;
  error: ErrorEventData;
  ready: Record<string, never>;
  [key: string]: unknown;
}

export class EventEmitter<
  EventMap extends Record<string, unknown> = DatepickerEventMap,
> {
  private events = new Map<keyof EventMap, Set<EventHandler<unknown>>>();

  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler as EventHandler<unknown>);
  }

  once<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): void {
    const wrappedHandler = (data: EventMap[K]) => {
      handler(data);
      this.off(event, wrappedHandler);
    };
    this.on(event, wrappedHandler);
  }

  off<K extends keyof EventMap>(
    event: K,
    handler?: EventHandler<EventMap[K]>,
  ): void {
    if (!handler) {
      this.events.delete(event);
    } else {
      this.events.get(event)?.delete(handler as EventHandler<unknown>);
    }
  }

  emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): void {
    this.events.get(event)?.forEach((handler) => {
      handler(data as EventMap[K]);
    });
  }

  clear(): void {
    this.events.clear();
  }

  hasListeners<K extends keyof EventMap>(event: K): boolean {
    return (this.events.get(event)?.size ?? 0) > 0;
  }
}
