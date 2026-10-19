import {
  column,
  field,
  inlineBox,
  inlineUi,
  row,
  isoInDays,
} from "./combinations-shared";
import type { CombinationDemo } from "./combinations-shared";

const docked = { displayMode: "docked" } as const;

export const MONTHS_DEMOS: readonly CombinationDemo[] = [
  {
    id: "cmb-months-modes",
    title: "Several months · single, multiple, range (docked)",
    description:
      "calendar.months: 2 in a docked popover for every selection mode. Narrow windows fall back to one month.",
    html: row(
      field("cmb-months-single", "Single, 2 months"),
      field("cmb-months-multiple", "Multiple, 2 months"),
      field("cmb-months-range", "Range, 2 months"),
    ),
    pickers: [
      {
        target: "#cmb-months-single",
        options: { calendar: { months: 2 }, ui: docked },
      },
      {
        target: "#cmb-months-multiple",
        options: { calendar: { mode: "multiple", months: 2 }, ui: docked },
      },
      {
        target: "#cmb-months-range",
        options: { calendar: { mode: "range", months: 2 }, ui: docked },
      },
    ],
  },
  {
    id: "cmb-months-three",
    title: "Three months · docked",
    description:
      "calendar.months: 3 shows as many months as fit the window, up to three.",
    html: row(
      field("cmb-months3-single", "Single, 3 months"),
      field("cmb-months3-range", "Range, 3 months"),
    ),
    pickers: [
      {
        target: "#cmb-months3-single",
        options: { calendar: { months: 3 }, ui: docked },
      },
      {
        target: "#cmb-months3-range",
        options: { calendar: { mode: "range", months: 3 }, ui: docked },
      },
    ],
  },
  {
    id: "cmb-months-inline",
    title: "Several months · inline",
    description:
      "Two months inline for single selection and three months inline for a range.",
    html: row(
      inlineBox("cmb-months-inline-single", "Single, 2 months"),
      inlineBox("cmb-months-inline-range", "Range, 3 months"),
    ),
    pickers: [
      {
        target: "#cmb-months-inline-single",
        options: {
          calendar: { months: 2 },
          ui: { inline: inlineUi("cmb-months-inline-single") },
        },
      },
      {
        target: "#cmb-months-inline-range",
        options: {
          calendar: { mode: "range", months: 3 },
          ui: { inline: inlineUi("cmb-months-inline-range") },
        },
      },
    ],
  },
  {
    id: "cmb-months-week-paging",
    title: "Several months · week numbers and pageBy",
    description:
      'Two months with ui.weekNumbers. pageBy: "month" moves one month per arrow, "view" (default) moves two.',
    html: row(
      field("cmb-months-weeks-view", "pageBy: view"),
      field("cmb-months-weeks-month", "pageBy: month"),
      field("cmb-months-weeks-range", "Range, pageBy: month"),
    ),
    pickers: [
      {
        target: "#cmb-months-weeks-view",
        options: {
          calendar: { months: 2, pageBy: "view" },
          ui: { weekNumbers: true },
        },
      },
      {
        target: "#cmb-months-weeks-month",
        options: {
          calendar: { months: 2, pageBy: "month" },
          ui: { weekNumbers: true },
        },
      },
      {
        target: "#cmb-months-weeks-range",
        options: {
          calendar: { mode: "range", months: 2, pageBy: "month" },
          ui: { weekNumbers: true },
        },
      },
    ],
  },
  {
    id: "cmb-months-bounds",
    title: "Several months · narrow minDate / maxDate",
    description:
      "minDate and maxDate about five weeks apart: the window cannot page past them, with 2 months and 3 months.",
    html: row(
      field("cmb-months-bounds-two", "2 months, ~5 weeks"),
      field("cmb-months-bounds-three", "3 months, ~5 weeks"),
      field("cmb-months-bounds-range", "Range, 2 months"),
    ),
    pickers: [
      {
        target: "#cmb-months-bounds-two",
        options: {
          calendar: {
            months: 2,
            minDate: isoInDays(0),
            maxDate: isoInDays(35),
          },
        },
      },
      {
        target: "#cmb-months-bounds-three",
        options: {
          calendar: {
            months: 3,
            minDate: isoInDays(0),
            maxDate: isoInDays(35),
          },
        },
      },
      {
        target: "#cmb-months-bounds-range",
        options: {
          calendar: {
            mode: "range",
            months: 2,
            minDate: isoInDays(0),
            maxDate: isoInDays(35),
          },
        },
      },
    ],
  },
  {
    id: "cmb-months-fixed-outside",
    title: "Several months · fixed weeks and outside days",
    description:
      "Two months with ui.fixedWeeks (six rows each) and neighbouring days, selectable or inert, Monday or Sunday first.",
    html: row(
      field("cmb-months-fixed", "fixedWeeks, Monday"),
      field("cmb-months-outside", "outsideDays, Sunday"),
      field("cmb-months-outside-inert", "outsideDays inert + fixed"),
    ),
    pickers: [
      {
        target: "#cmb-months-fixed",
        options: {
          calendar: { months: 2, weekStart: "monday" },
          ui: { fixedWeeks: true },
        },
      },
      {
        target: "#cmb-months-outside",
        options: {
          calendar: { months: 2, weekStart: "sunday" },
          ui: { outsideDays: true },
        },
      },
      {
        target: "#cmb-months-outside-inert",
        options: {
          calendar: { months: 2, weekStart: "monday" },
          ui: {
            outsideDays: { selectable: false },
            fixedWeeks: true,
          },
        },
      },
    ],
  },
  {
    id: "cmb-months-rtl",
    title: "Several months · right-to-left locales",
    description:
      'calendar.locale "ar-EG" and "he-IL" mirror the layout; two months in single and range mode.',
    html: row(
      field("cmb-months-ar", "ar-EG, 2 months"),
      field("cmb-months-he", "he-IL, range, 2 months"),
    ),
    pickers: [
      {
        target: "#cmb-months-ar",
        options: { calendar: { locale: "ar-EG", months: 2 } },
      },
      {
        target: "#cmb-months-he",
        options: {
          calendar: { locale: "he-IL", mode: "range", months: 2 },
        },
      },
    ],
  },
  {
    id: "cmb-months-themes",
    title: "Several months · dark and themes",
    description:
      "Two months with a forced dark scheme and with the m3-green, crane and cyberpunk themes (these cards ignore the page dark-mode switch).",
    html: column(
      row(
        field("cmb-months-dark", "Dark"),
        field("cmb-months-green", "m3-green"),
      ),
      row(
        field("cmb-months-crane", "crane, range"),
        field("cmb-months-cyber", "cyberpunk, range"),
      ),
    ),
    fixedScheme: true,
    pickers: [
      {
        target: "#cmb-months-dark",
        options: {
          calendar: { months: 2 },
          ui: { colorScheme: "dark" },
        },
      },
      {
        target: "#cmb-months-green",
        options: {
          calendar: { months: 2 },
          ui: { theme: "m3-green", colorScheme: "light" },
        },
      },
      {
        target: "#cmb-months-crane",
        options: {
          calendar: { mode: "range", months: 2 },
          ui: { theme: "crane" },
        },
      },
      {
        target: "#cmb-months-cyber",
        options: {
          calendar: { mode: "range", months: 2 },
          ui: { theme: "cyberpunk" },
        },
      },
    ],
  },
];
