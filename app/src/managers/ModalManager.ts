import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";
import { isDocument, isNode } from "../utils/node";
import { TIMINGS } from "../constants/timings";
import { getScrollbarWidth } from "../utils/config";
import { DropdownRenderer } from "./renderers/DropdownRenderer";
import { ModalRenderer } from "./renderers/ModalRenderer";

export class ModalManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private originalOverflow?: string;
  private originalPaddingRight?: string;
  private dropdownRenderer: DropdownRenderer;
  private modalRenderer: ModalRenderer;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
    this.dropdownRenderer = new DropdownRenderer(core, emitter);
    this.modalRenderer = new ModalRenderer(core, emitter);
  }

  private runWithTimeout(
    cb: () => void,
    delay: number = TIMINGS.DEFAULT_DELAY
  ): void {
    const t = setTimeout(cb, delay);
    this.timeouts.push(t);
  }

  private clearAllTimeouts(): void {
    this.timeouts.forEach(clearTimeout);
    this.timeouts = [];
  }

  private clearExistingModal(): void {
    if (isDocument() === false) return;

    const existing = document.querySelector(".dp-ui__modal");
    if (existing) existing.remove();
  }

  setModalTemplate(): void {
    if (isDocument() === false) return;

    this.clearExistingModal();

    if (this.core.options.ui.inline?.enabled) {
      this.renderInline();
      return;
    }

    const mode = this.core.displayMode;
    if (mode === "dropdown") {
      this.dropdownRenderer.render();
    } else {
      this.modalRenderer.render();
    }
  }

  private renderInline(): void {
    const containerId = this.core.options.ui.inline?.containerId;
    if (!containerId) return;

    const containerElement = document.getElementById(containerId);
    if (!containerElement) return;

    containerElement.innerHTML = "";

    this.dropdownRenderer.render();

    const modalElement = containerElement.querySelector(
      ".dp-ui__modal"
    ) as HTMLDivElement;
    if (modalElement) {
      modalElement.classList.add("dp-ui--inline");

      const showButtons = this.core.options.ui.inline?.showButtons;
      if (showButtons === false || showButtons === undefined) {
        modalElement
          .querySelectorAll(".dp-ui__footer")
          .forEach((btn) => ((btn as HTMLElement).style.display = "none"));
      }
    }
  }

  setScrollbarOrNot(): void {
    if (isDocument() === false) return;
    if (this.core.options.ui.inline?.enabled) return;

    if (!this.core.options.ui.enableScrollbar) {
      this.originalOverflow = document.body.style.overflowY;
      this.originalPaddingRight = document.body.style.paddingRight;

      document.body.style.paddingRight = `${getScrollbarWidth()}px`;
      document.body.style.overflowY = "hidden";
    } else {
      this.runWithTimeout(() => {
        if (!isNode()) {
          this.runWithTimeout(() => {
            if (typeof document !== "undefined") {
              document.body.style.overflowY = this.originalOverflow || "";
              document.body.style.paddingRight =
                this.originalPaddingRight || "";
            }
          }, TIMINGS.SCROLLBAR_RESTORE);
        }
      }, 400);
    }
  }

  removeBackdrop(): void {
    const mode = this.core.displayMode;

    if (this.core.options.ui.inline?.enabled) return;

    if (mode === "dropdown") {
      return;
    }

    if (this.core.options.ui.backdrop) return;

    const modal = this.core.getModalElement();
    const input = this.core.getInput();

    modal?.classList.add("removed");
    if (input) {
      input.classList.add("disabled");
    }
  }

  setNormalizeClass(): void {
    const modal = this.core.getModalElement();
    if (!modal) return;

    modal.classList.add("dp-ui-normalize");
    const divs = modal.querySelectorAll(
      ":scope > div"
    ) as NodeListOf<HTMLDivElement>;
    divs.forEach((div: HTMLDivElement) => div.classList.add("dp-ui-normalize"));
  }

  setShowClassToBackdrop(): void {
    const mode = this.core.displayMode;

    if (this.core.options.ui.inline?.enabled) {
      this.core.getModalElement()?.classList.add("show");
      this.setInitialFocus();
      return;
    }

    if (mode === "dropdown") {
      this.dropdownRenderer.show(() => this.setInitialFocus());
      return;
    }

    this.modalRenderer.show(() => this.setInitialFocus());
  }

  private positionDropdown(): void {
    return;
  }

  private setInitialFocus(): void {
    if (!this.core.options.behavior.focusTrap) return;

    const mode = this.core.displayMode;
    if (mode === "dropdown") return;

    const wrapper = this.core.getWrapper();
    if (wrapper && typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => {
        wrapper.focus();
      });
    }
  }

  init(): void {
    if (typeof window === "undefined") return;

    this.emitter.on("range:header-update", () => {
      this.modalRenderer.updateRangeHeader();
    });
  }

  updateUnifiedPickerLabel(): void {
    this.modalRenderer.updateUnifiedPickerLabel();
  }

  updateSelectedDate(date: Date | null): void {
    this.modalRenderer.updateSelectedDate(date);
  }

  toggleDateIcon(toPencil: boolean): void {
    this.modalRenderer.toggleDateIcon(toPencil);
  }

  destroy(): void {
    this.clearAllTimeouts();

    this.dropdownRenderer.destroy();
    this.modalRenderer.destroy();

    if (!isNode() && !this.core.options.ui.inline?.enabled) {
      document.body.style.overflowY = this.originalOverflow || "";
      document.body.style.paddingRight = this.originalPaddingRight || "";
    }

    this.clearExistingModal();
  }
}
