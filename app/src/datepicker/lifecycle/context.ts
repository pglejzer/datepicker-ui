import type { DatepickerEventMap } from "../../types/types";
import type { EventEmitter } from "../../utils/EventEmitter";
import type { CoreState } from "../CoreState";
import type { Managers } from "../Managers";

export interface LifecycleStatus {
  created: boolean;
  destroyed: boolean;
}

export interface LifecycleContext {
  readonly core: CoreState;
  readonly emitter: EventEmitter<DatepickerEventMap>;
  readonly managers: Managers;
  readonly status: LifecycleStatus;
}
