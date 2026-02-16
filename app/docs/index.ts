/**
 * DatepickerUI Demo Entry Point
 */

import DatepickerUI from "../src/index";

document.addEventListener("DOMContentLoaded", () => {
  const modalInput = document.getElementById(
    "datepicker-modal-test"
  ) as HTMLInputElement;
  if (modalInput) {
    const modalPicker = new DatepickerUI(modalInput, {
      ui: {
        theme: "basic",
        displayMode: "modal",
        backdrop: true,
        modalLabel: "Select date",
        showTodayButton: false,
        showClearButton: false,
      },
      behavior: {
        closeOnSelect: false,
        focusTrap: true,
      },
      calendar: {
        locale: "en-US",
      },
    });
    modalPicker.create();

    modalPicker.on("open", () => {
      console.log("Modal picker opened");
    });

    modalPicker.on("confirm", (data) => {
      console.log("Date confirmed:", data.date);
    });
  }

  const dropdownInput = document.getElementById(
    "datepicker-dropdown"
  ) as HTMLInputElement;
  if (dropdownInput) {
    const dropdownPicker = new DatepickerUI(dropdownInput, {
      ui: {
        theme: "basic",
        displayMode: "dropdown",
        iconSelector: "#calendar-icon",
        showTodayButton: false,
        showClearButton: false,
        enableScrollbar: true,
      },
      behavior: {
        closeOnSelect: true,
      },
    });
    dropdownPicker.create();

    dropdownPicker.on("open", () => {
      console.log("Dropdown picker opened");
    });
  }

  const smartInput = document.getElementById(
    "datepicker-smart"
  ) as HTMLInputElement;
  if (smartInput) {
    const smartPicker = new DatepickerUI(smartInput, {
      ui: {
        theme: "basic",
        format: "dd/mm/yyyy",
        displayMode: "dropdown",
        iconSelector: "#calendar-icon-2",
        showTodayButton: false,
        showClearButton: false,
      },
      behavior: {
        closeOnSelect: true,
      },
    });
    smartPicker.create();

    smartPicker.on("update", (data) => {
      console.log("Smart typing - Date updated:", data.date);
    });

    smartPicker.on("error", (data) => {
      console.log("Smart typing - Validation error:", data.message);
    });
  }

  const readonlyInput = document.getElementById(
    "datepicker-readonly"
  ) as HTMLInputElement;
  if (readonlyInput) {
    const readonlyPicker = new DatepickerUI(readonlyInput, {
      ui: {
        theme: "basic",
        displayMode: "dropdown",
        iconSelector: "#calendar-icon-4",
        showTodayButton: false,
        showClearButton: false,
      },
      behavior: {
        closeOnSelect: true,
      },
    });
    readonlyPicker.create();
  }

  const maskInput = document.getElementById(
    "datepicker-mask"
  ) as HTMLInputElement;
  if (maskInput) {
    const maskPicker = new DatepickerUI(maskInput, {
      ui: {
        theme: "basic",
        format: "dd/mm/yyyy",
        displayMode: "dropdown",
        iconSelector: "#calendar-icon-3",
        showTodayButton: false,
        showClearButton: false,
        maskEnabled: true,
      },
      behavior: {
        closeOnSelect: true,
      },
    });
    maskPicker.create();

    maskPicker.on("update", (data) => {
      console.log("Auto mask - Date updated:", data.date);
    });

    maskPicker.on("mask:input", (data) => {
      console.log("Mask input:", data.value, "Complete:", data.isComplete);
    });

    maskPicker.on("error", (data) => {
      console.log("Auto mask - Validation error:", data.message);
    });
  }

  const rangeInput = document.getElementById(
    "datepicker-range"
  ) as HTMLInputElement;
  if (rangeInput) {
    const rangePicker = new DatepickerUI(rangeInput, {
      ui: {
        theme: "basic",
        displayMode: "modal",
        backdrop: true,
        modalLabel: "Select date",
        rangeSelection: true,
      },
      behavior: {
        closeOnSelect: false,
        focusTrap: true,
      },
      calendar: {
        locale: "en-US",
      },
    });
    rangePicker.create();

    rangePicker.on("range:start", (data) => {
      console.log("Range started:", data.startDate);
    });

    rangePicker.on("range:update", (data) => {
      console.log("Range preview:", data.startDate, "→", data.previewEndDate);
    });

    rangePicker.on("range:end", (data) => {
      console.log("Range selected:", data.startDate, "→", data.endDate);
      const start = data.startDate.toLocaleDateString();
      const end = data.endDate.toLocaleDateString();
      rangeInput.value = `${start} - ${end}`;
    });

    rangePicker.on("range:cancel", () => {
      console.log("Range cancelled");
    });
  }

  console.log("DatepickerUI demos initialized");
});
