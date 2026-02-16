import type { DatepickerOptions } from "../types/options";
import { ICONS } from "../constants/icons";

export function getModalTemplate(
  options: Required<DatepickerOptions>,
  instanceId: string,
  currentMonth: number,
  currentYear: number,
): string {
  const { labels, ui } = options;
  const { customMonths, monthsShort, monthLetters = 3 } = labels;
  const months = customMonths || monthsShort || [];
  let monthName = months[currentMonth] || "";

  if (monthLetters && monthLetters > 0) {
    monthName = monthName.substring(0, monthLetters);
  }

  monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return `
    <div class="dp-ui dp-ui__modal" data-owner-id="${instanceId}" role="dialog" aria-modal="true">
      <div class="dp-ui__backdrop"></div>
      <div class="dp-ui__wrapper" tabindex="-1">
        <div class="dp-ui__calendar-header">
          <div class="dp-ui__month-control">
            <button type="button" class="dp-ui__month-prev-btn" aria-label="Previous month">
              ${ICONS.keyboardArrowLeft}
            </button>
            <button type="button" class="dp-ui__month-select">
              ${monthName}
              <span class="dp-ui__dropdown-arrow">${ICONS.arrowDropDown}</span>
            </button>
            <button type="button" class="dp-ui__month-next-btn" aria-label="Next month">
              ${ICONS.keyboardArrowRight}
            </button>
          </div>
          <div class="dp-ui__year-control">
            <button type="button" class="dp-ui__year-prev-btn" aria-label="Previous year">
              ${ICONS.keyboardArrowLeft}
            </button>
            <button type="button" class="dp-ui__year-select">
              ${currentYear}
              <span class="dp-ui__dropdown-arrow">${ICONS.arrowDropDown}</span>
            </button>
            <button type="button" class="dp-ui__year-next-btn" aria-label="Next year">
              ${ICONS.keyboardArrowRight}
            </button>
          </div>
        </div>
        <div class="dp-ui__calendar">
          <div class="dp-ui__calendar-grid"></div>
        </div>
        <div class="dp-ui__footer">
          ${
            ui.showTodayButton || ui.showClearButton
              ? `
          <div class="dp-ui__footer-left">
            ${ui.showTodayButton ? `<button type="button" class="dp-ui__today-btn">${labels.today}</button>` : ""}
            ${ui.showClearButton ? `<button type="button" class="dp-ui__clear-btn">${labels.clear}</button>` : ""}
          </div>
          `
              : ""
          }
          <div class="dp-ui__footer-right">
            <button type="button" class="dp-ui__cancel-btn">${labels.cancel}</button>
            <button type="button" class="dp-ui__ok-btn">${labels.confirm}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
