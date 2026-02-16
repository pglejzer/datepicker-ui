import type { CoreState } from "../../datepicker/CoreState";
import type {
  EventEmitter,
  DatepickerEventMap,
} from "../../utils/EventEmitter";
import { isDocument } from "../../utils/node";
import { TIMINGS } from "../../constants/timings";
import { ICONS } from "../../constants/icons";

export class ModalRenderer {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  render(): void {
    if (isDocument() === false) return;

    const modalTemplate = this.buildModalTemplate();

    const { appendModalSelector } = this.core.options.ui;
    if (!appendModalSelector) {
      document.body.insertAdjacentHTML("beforeend", modalTemplate);
    } else {
      const element = document.querySelector(appendModalSelector);
      element?.insertAdjacentHTML("beforeend", modalTemplate);
    }
  }

  private buildModalTemplate(): string {
    const { instanceId, currentMonth, currentYear, selectedDate } = this.core;
    const { modalLabel, showModalLabel } = this.core.options.ui;
    const { labels } = this.core.options;
    const { customMonths, monthsShort } = labels;

    const label = modalLabel || "Select date";
    const formattedDate = this.formatSelectedDate(selectedDate);

    const months = customMonths || monthsShort || [];
    const monthName = months[currentMonth] || "";
    const capitalizedMonth =
      monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const unifiedPickerLabel = `${capitalizedMonth} ${currentYear}`;

    return `
      <div class="dp-ui__modal" data-owner-id="${instanceId}" role="dialog" aria-modal="true">
        ${this.core.options.ui.backdrop ? '<div class="dp-ui__backdrop"></div>' : ""}
        <div class="dp-ui__wrapper dp-ui__wrapper--modal" tabindex="-1">
          <div class="dp-ui__modal-header">
            ${this.buildHeader(label, formattedDate, showModalLabel)}
          </div>
          <div class="dp-ui__calendar-wrapper">
            <div class="dp-ui__calendar-header">
              <button type="button" class="dp-ui__unified-picker-toggle">
                ${unifiedPickerLabel}
                <span class="dp-ui__dropdown-arrow">${ICONS.arrowDropDown}</span>
              </button>
              <div class="dp-ui__month-nav">
                <button type="button" class="dp-ui__month-nav-btn dp-ui__month-nav-btn--prev" aria-label="Previous month">
                  ${ICONS.keyboardArrowLeft}
                </button>
                <button type="button" class="dp-ui__month-nav-btn dp-ui__month-nav-btn--next" aria-label="Next month">
                  ${ICONS.keyboardArrowRight}
                </button>
              </div>
            </div>
            <div class="dp-ui__calendar">
              <div class="dp-ui__calendar-grid"></div>
            </div>
          </div>
          <div class="dp-ui__footer">
            <div class="dp-ui__footer-right">
              <button type="button" class="dp-ui__cancel-btn">${labels.cancel}</button>
              <button type="button" class="dp-ui__ok-btn">${labels.confirm}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private buildHeader(
    label: string,
    formattedDate: string,
    showLabel?: boolean,
  ): string {
    const hasActiveRange = this.core.tempRangeStartDate !== null;

    if (hasActiveRange) {
      return this.buildRangeHeader();
    }

    const labelHtml =
      showLabel !== false ? `<div class="dp-ui__label">${label}</div>` : "";

    return `
      <div class="dp-ui__header">
        ${labelHtml}
        <div class="dp-ui__selected-date-row">
          <div class="dp-ui__selected-date">${formattedDate}</div>
          <button type="button" class="dp-ui__selected-date-icon" data-mode="calendar" aria-label="Toggle edit mode">
            <span class="dp-ui__icon-pencil is-active">${ICONS.pencil}</span>
            <span class="dp-ui__icon-calendar">${ICONS.calendar}</span>
          </button>
        </div>
      </div>
    `;
  }

  private buildRangeHeader(): string {
    const rangeText = this.formatRangeText();
    const hasActiveRange = this.core.tempRangeStartDate !== null;

    return `
      <div class="dp-ui__header dp-ui__header--range">
        <div class="dp-ui__label">Depart - Return dates</div>
        <div class="dp-ui__selected-date-row">
          <div class="dp-ui__selected-date">${rangeText}</div>
          ${
            hasActiveRange
              ? `<button type="button" class="dp-ui__selected-date-icon dp-ui__range-close-btn" aria-label="Close range selection">
                  ${ICONS.close}
                </button>`
              : ""
          }
        </div>
        ${
          hasActiveRange &&
          this.core.tempRangeStartDate &&
          this.core.tempRangeEndDate
            ? `<button type="button" class="dp-ui__range-save-btn">Save</button>`
            : ""
        }
      </div>
    `;
  }

  private formatRangeText(): string {
    const startDate = this.core.tempRangeStartDate;
    const endDate = this.core.tempRangeEndDate;

    if (!startDate) {
      return "Select dates";
    }

    const startFormatted = this.formatRangeDate(startDate);

    if (!endDate) {
      return startFormatted;
    }

    const endFormatted = this.formatRangeDate(endDate);
    return `${startFormatted} – ${endFormatted}`;
  }

  private formatRangeDate(date: Date): string {
    const locale = this.core.options.calendar.locale || "en-US";

    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  private formatSelectedDate(date: Date | null): string {
    if (!date) {
      const today = new Date();
      return this.formatDate(today);
    }
    return this.formatDate(date);
  }

  private formatDate(date: Date): string {
    const locale = this.core.options.calendar.locale || "en-US";

    const weekday = new Intl.DateTimeFormat(locale, {
      weekday: "short",
    }).format(date);

    const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(
      date,
    );

    const day = date.getDate();

    const capitalizedWeekday =
      weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

    return `${capitalizedWeekday}, ${capitalizedMonth} ${day}`;
  }

  updateRangeHeader(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const header = wrapper.querySelector(".dp-ui__modal-header");
    if (!header) return;

    header.innerHTML = this.buildRangeHeader();
  }

  show(callback?: () => void): void {
    if (this.core.options.ui.backdrop) {
      setTimeout(() => {
        this.core.getModalElement()?.classList.add("show");
        if (callback) callback();
      }, TIMINGS.MODAL_ANIMATION);
    }
  }

  updateSelectedDate(date: Date | null): void {
    const modal = this.core.getModalElement();
    if (!modal) return;

    const selectedDateElement = modal.querySelector(
      ".dp-ui__selected-date",
    ) as HTMLElement;

    if (selectedDateElement) {
      selectedDateElement.textContent = this.formatSelectedDate(date);
    }
  }

  updateUnifiedPickerLabel(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const unifiedPickerToggle = wrapper.querySelector(
      ".dp-ui__unified-picker-toggle",
    ) as HTMLButtonElement | null;

    if (unifiedPickerToggle) {
      const { customMonths, monthsShort } = this.core.options.labels;
      const months = customMonths || monthsShort || [];
      const monthName = months[this.core.currentMonth] || "";
      const capitalizedMonth =
        monthName.charAt(0).toUpperCase() + monthName.slice(1);

      const unifiedPickerLabel = `${capitalizedMonth} ${this.core.currentYear}`;

      const arrow = unifiedPickerToggle.querySelector(".dp-ui__dropdown-arrow");
      unifiedPickerToggle.textContent = unifiedPickerLabel;
      if (arrow) {
        unifiedPickerToggle.appendChild(arrow);
      } else {
        const newArrow = document.createElement("span");
        newArrow.className = "dp-ui__dropdown-arrow";
        newArrow.innerHTML = ICONS.arrowDropDown;
        unifiedPickerToggle.appendChild(newArrow);
      }
    }
  }

  toggleDateIcon(toPencil: boolean): void {
    const modal = this.core.getModalElement();
    if (!modal) return;

    const pencilIcon = modal.querySelector(
      ".dp-ui__icon-pencil",
    ) as HTMLElement;
    const calendarIcon = modal.querySelector(
      ".dp-ui__icon-calendar",
    ) as HTMLElement;

    if (pencilIcon && calendarIcon) {
      if (toPencil) {
        pencilIcon.classList.add("is-active");
        calendarIcon.classList.remove("is-active");
      } else {
        pencilIcon.classList.remove("is-active");
        calendarIcon.classList.add("is-active");
      }
    }
  }

  destroy(): void {}
}
