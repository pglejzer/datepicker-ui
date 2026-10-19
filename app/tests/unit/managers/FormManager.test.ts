import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoreState } from "@/datepicker/CoreState";
import { FormManager } from "@/managers/FormManager";
import type { PlainDate } from "@/types/date";
import type { DatepickerOptions } from "@/types/options";
import type { Selection } from "@/types/selection";
import { cleanupDom, flush } from "../../helpers/picker";
import { oct } from "../../helpers/selection";

const OCT_17: PlainDate = { year: 2026, month: 10, day: 17 };
const OCT_20: PlainDate = { year: 2026, month: 10, day: 20 };

const single = (date: PlainDate | null): Selection => ({
  mode: "single",
  date,
});
const range = (start: PlainDate | null, end: PlainDate | null): Selection => ({
  mode: "range",
  start,
  end,
});
const multiple = (...dates: PlainDate[]): Selection => ({
  mode: "multiple",
  dates,
});

interface SetupOptions {
  name?: string | null;
  initial?: Selection;
  initialText?: string;
  inForm?: boolean;
  options?: DatepickerOptions;
}

const setup = ({
  name = "when",
  initial = single(OCT_17),
  initialText = "2026-10-17",
  inForm = true,
  options = {},
}: SetupOptions = {}) => {
  const container = inForm
    ? document.createElement("form")
    : document.createElement("div");
  const host = document.createElement("div");
  host.className = "dp-ui";
  const input = document.createElement("input");
  input.type = "text";
  if (name !== null) {
    input.setAttribute("name", name);
  }
  if (initialText !== "") {
    input.setAttribute("value", initialText);
  }
  host.appendChild(input);
  container.appendChild(host);
  document.body.appendChild(container);
  const core = new CoreState(input, host, false, options);
  core.setValue(initial);
  const manager = new FormManager(core);
  const controller = new AbortController();
  manager.bind(controller.signal);
  manager.sync();
  const hidden = (): HTMLInputElement | null =>
    container.querySelector<HTMLInputElement>('input[type="hidden"]');
  return { container, core, host, input, manager, controller, hidden };
};

describe("FormManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupDom();
  });

  it("moves the name to a hidden input holding the ISO value", () => {
    const { input, hidden } = setup();
    expect(input).not.toHaveAttribute("name");
    const field = hidden();
    expect(field).not.toBeNull();
    expect(field?.getAttribute("name")).toBe("when");
    expect(field?.value).toBe("2026-10-17");
    expect(field).toHaveClass("dp-ui__form-value");
  });

  it("sync follows the value and empties for null", () => {
    const { core, manager, hidden } = setup();
    core.setValue(single(OCT_20));
    manager.sync();
    expect(hidden()?.value).toBe("2026-10-20");
    core.setValue(single(null));
    manager.sync();
    expect(hidden()?.value).toBe("");
  });

  it("serializes a complete range as start/end ISO", () => {
    const { core, manager, hidden } = setup({
      initial: range(oct(20), oct(28)),
      initialText: "2026-10-20/2026-10-28",
      options: { calendar: { mode: "range" } },
    });
    expect(hidden()?.value).toBe("2026-10-20/2026-10-28");
    core.setValue(range(oct(20), null));
    manager.sync();
    expect(hidden()?.value).toBe("");
  });

  it("serializes multiple dates as comma separated ISO", () => {
    const { hidden } = setup({
      initial: multiple(oct(5), oct(20)),
      initialText: "2026-10-05,2026-10-20",
      options: { calendar: { mode: "multiple" } },
    });
    expect(hidden()?.value).toBe("2026-10-05,2026-10-20");
  });

  it("FormData carries the committed ISO value under the original name", () => {
    const { container, core, manager } = setup();
    core.setValue(single(OCT_20));
    manager.sync();
    if (!(container instanceof HTMLFormElement)) {
      throw new Error("expected a form");
    }
    expect(new FormData(container).get("when")).toBe("2026-10-20");
  });

  it("dispatchCommit fires one input and one change on the visible input", () => {
    const { container, input, manager } = setup();
    const inputEvents: Event[] = [];
    const changeEvents: Event[] = [];
    const bubbledInput = vi.fn();
    const bubbledChange = vi.fn();
    input.addEventListener("input", (event) => inputEvents.push(event));
    input.addEventListener("change", (event) => changeEvents.push(event));
    container.addEventListener("input", bubbledInput);
    container.addEventListener("change", bubbledChange);
    manager.dispatchCommit();
    expect(inputEvents).toHaveLength(1);
    expect(changeEvents).toHaveLength(1);
    expect(bubbledInput).toHaveBeenCalledTimes(1);
    expect(bubbledChange).toHaveBeenCalledTimes(1);
  });

  it("does not fire change when only the value is set and synced", () => {
    const { container, core, manager } = setup();
    const onChange = vi.fn();
    container.addEventListener("change", onChange);
    core.setValue(single({ year: 2026, month: 1, day: 1 }));
    manager.sync();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("resets the value and the hidden input to the initial value", async () => {
    const { container, core, manager, hidden } = setup();
    core.setValue(single(OCT_20));
    manager.sync();
    if (!(container instanceof HTMLFormElement)) {
      throw new Error("expected a form");
    }
    container.reset();
    await flush();
    expect(core.value).toEqual(single(OCT_17));
    expect(hidden()?.value).toBe("2026-10-17");
  });

  it("resets to empty when the initial value was empty", async () => {
    const { container, core, manager, hidden } = setup({
      initial: single(null),
      initialText: "",
    });
    core.setValue(single(OCT_20));
    manager.sync();
    if (!(container instanceof HTMLFormElement)) {
      throw new Error("expected a form");
    }
    container.reset();
    await flush();
    expect(core.value).toEqual(single(null));
    expect(hidden()?.value).toBe("");
  });

  it("resets a range to the initial range and rewrites the visible text", async () => {
    const { container, core, input, manager, hidden } = setup({
      initial: range(oct(20), oct(28)),
      initialText: "2026-10-20/2026-10-28",
      options: { calendar: { mode: "range", locale: "en-US" } },
    });
    core.setValue(range(oct(1), oct(2)));
    manager.sync();
    expect(hidden()?.value).toBe("2026-10-01/2026-10-02");
    if (!(container instanceof HTMLFormElement)) {
      throw new Error("expected a form");
    }
    container.reset();
    await flush();
    expect(core.value).toEqual(range(oct(20), oct(28)));
    expect(hidden()?.value).toBe("2026-10-20/2026-10-28");
    expect(input.value).toBe("10/20/2026 – 10/28/2026");
  });

  it("resets multiple dates to the initial dates", async () => {
    const { container, core, manager, hidden } = setup({
      initial: multiple(oct(5), oct(20)),
      initialText: "2026-10-05,2026-10-20",
      options: { calendar: { mode: "multiple" } },
    });
    core.setValue(multiple(oct(7)));
    manager.sync();
    if (!(container instanceof HTMLFormElement)) {
      throw new Error("expected a form");
    }
    container.reset();
    await flush();
    expect(core.value).toEqual(multiple(oct(5), oct(20)));
    expect(hidden()?.value).toBe("2026-10-05,2026-10-20");
  });

  it("restore puts the name back and removes the hidden input", () => {
    const { input, manager, hidden } = setup();
    manager.restore();
    expect(input).toHaveAttribute("name", "when");
    expect(hidden()).toBeNull();
  });

  it("ignores form reset after the signal is aborted", async () => {
    const { container, core, manager, controller } = setup();
    core.setValue(single(OCT_20));
    manager.sync();
    controller.abort();
    manager.restore();
    if (!(container instanceof HTMLFormElement)) {
      throw new Error("expected a form");
    }
    container.reset();
    await flush();
    expect(core.value).toEqual(single(OCT_20));
  });

  it("creates no hidden input for an input without a name", () => {
    const { input, manager, hidden } = setup({ name: null });
    expect(hidden()).toBeNull();
    manager.sync();
    manager.restore();
    expect(hidden()).toBeNull();
    expect(input).not.toHaveAttribute("name");
  });

  describe("split range fields", () => {
    const setupSplit = (initial: Selection = range(oct(20), oct(28))) => {
      const form = document.createElement("form");
      const host = document.createElement("div");
      host.className = "dp-ui";
      const start = document.createElement("input");
      start.type = "text";
      start.setAttribute("name", "trip-start");
      const end = document.createElement("input");
      end.type = "text";
      end.setAttribute("name", "trip-end");
      host.appendChild(start);
      form.append(host, end);
      document.body.appendChild(form);
      const core = new CoreState(start, host, false, {
        calendar: { mode: "range", locale: "en-US" },
      });
      core.setEndInput(end);
      core.setValue(initial);
      const manager = new FormManager(core);
      manager.bind(new AbortController().signal);
      manager.sync();
      const hidden = (): HTMLInputElement[] =>
        Array.from(
          form.querySelectorAll<HTMLInputElement>('input[type="hidden"]'),
        );
      return { form, core, start, end, manager, hidden };
    };

    it("creates one hidden ISO input per field name after its field", () => {
      const { start, end, hidden } = setupSplit();
      expect(start).not.toHaveAttribute("name");
      expect(end).not.toHaveAttribute("name");
      expect(hidden().map((field) => field.name)).toEqual([
        "trip-start",
        "trip-end",
      ]);
      expect(hidden().map((field) => field.value)).toEqual([
        "2026-10-20",
        "2026-10-28",
      ]);
      expect(start.nextElementSibling).toBe(hidden()[0]);
      expect(end.nextElementSibling).toBe(hidden()[1]);
    });

    it("sync follows each end and empties the end of a start-only range", () => {
      const { core, manager, hidden } = setupSplit();
      core.setValue(range(oct(3), null));
      manager.sync();
      expect(hidden().map((field) => field.value)).toEqual(["2026-10-03", ""]);
      core.setValue(range(null, null));
      manager.sync();
      expect(hidden().map((field) => field.value)).toEqual(["", ""]);
    });

    it("FormData carries both dates under the original names", () => {
      const { form } = setupSplit();
      const data = new FormData(form);
      expect(data.get("trip-start")).toBe("2026-10-20");
      expect(data.get("trip-end")).toBe("2026-10-28");
    });

    it("form reset restores both fields and both hidden inputs", async () => {
      const { form, core, start, end, manager, hidden } = setupSplit();
      core.setValue(range(oct(1), oct(2)));
      manager.sync();
      start.value = "10/01/2026";
      end.value = "garbage";
      expect(hidden().map((field) => field.value)).toEqual([
        "2026-10-01",
        "2026-10-02",
      ]);

      form.reset();
      await flush();

      expect(core.value).toEqual(range(oct(20), oct(28)));
      expect(start.value).toBe("10/20/2026");
      expect(end.value).toBe("10/28/2026");
      expect(hidden().map((field) => field.value)).toEqual([
        "2026-10-20",
        "2026-10-28",
      ]);
    });

    it("form reset empties both fields when the initial range was empty", async () => {
      const { form, core, start, end, manager, hidden } = setupSplit(
        range(null, null),
      );
      core.setValue(range(oct(1), oct(2)));
      manager.sync();
      start.value = "10/01/2026";
      end.value = "10/02/2026";

      form.reset();
      await flush();

      expect(core.value).toEqual(range(null, null));
      expect(start.value).toBe("");
      expect(end.value).toBe("");
      expect(hidden().map((field) => field.value)).toEqual(["", ""]);
    });

    it("restore puts both names back and removes both hidden inputs", () => {
      const { start, end, manager, hidden } = setupSplit();
      manager.restore();
      expect(start).toHaveAttribute("name", "trip-start");
      expect(end).toHaveAttribute("name", "trip-end");
      expect(hidden()).toHaveLength(0);
    });
  });

  it("restore before bind does not throw", () => {
    const host = document.createElement("div");
    const input = document.createElement("input");
    input.setAttribute("name", "when");
    host.appendChild(input);
    document.body.appendChild(host);
    const core = new CoreState(input, host, false, {});
    const manager = new FormManager(core);
    expect(() => {
      manager.restore();
    }).not.toThrow();
    expect(input).toHaveAttribute("name", "when");
  });
});
