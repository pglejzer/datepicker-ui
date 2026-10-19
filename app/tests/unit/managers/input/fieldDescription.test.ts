import { beforeEach, describe, expect, it } from "vitest";
import { describeField } from "@/managers/input/fieldDescription";

const setup = (describedBy?: string) => {
  const host = document.createElement("div");
  const field = document.createElement("input");
  if (describedBy !== undefined) {
    field.setAttribute("aria-describedby", describedBy);
  }
  host.append(field);
  document.body.append(host);
  const description = describeField(field, host, "dp-ui-x-desc", "mm/dd/yyyy");
  const element = (): HTMLElement | null =>
    host.querySelector<HTMLElement>("#dp-ui-x-desc");
  const live = (): HTMLElement | null =>
    host.querySelector<HTMLElement>("#dp-ui-x-desc [aria-live]");
  return { host, field, description, element, live };
};

describe("describeField", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("adds a visually hidden element under the host holding the hint", () => {
    const { host, element } = setup();
    const node = element();
    expect(node).not.toBeNull();
    expect(node?.parentElement).toBe(host);
    expect(node).toHaveClass("dp-ui__visually-hidden");
    expect(node).toHaveTextContent("mm/dd/yyyy");
  });

  it("points aria-describedby at the element", () => {
    const { field } = setup();
    expect(field).toHaveAttribute("aria-describedby", "dp-ui-x-desc");
  });

  it("appends its id and keeps the ids the page set", () => {
    const { field } = setup("help-a  help-b");
    expect(field.getAttribute("aria-describedby")).toBe(
      "help-a help-b dp-ui-x-desc",
    );
  });

  it("puts the error in a polite live span before the hint", () => {
    const { live, element, description } = setup();
    expect(live()).toHaveAttribute("aria-live", "polite");
    expect(live()?.textContent).toBe("");

    description.setError("Enter a valid date");

    expect(live()).toHaveTextContent("Enter a valid date");
    expect(element()).toHaveTextContent("Enter a valid date mm/dd/yyyy");
  });

  it("clears the error with null and keeps the hint", () => {
    const { live, element, description } = setup();
    description.setError("Bad");
    description.setError(null);
    expect(live()?.textContent).toBe("");
    expect(element()?.textContent.trim()).toBe("mm/dd/yyyy");
  });

  it("updates the hint", () => {
    const { element, description } = setup();
    description.setHint("mm/yyyy");
    expect(element()?.textContent.trim()).toBe("mm/yyyy");
  });

  it("does not rewrite the live text when the error is unchanged", () => {
    const { live, description } = setup();
    description.setError("Bad");
    const node = live()?.firstChild;
    description.setError("Bad");
    expect(live()?.firstChild).toBe(node);
  });

  it("does not rewrite the hint text when unchanged", () => {
    const { element, description } = setup();
    const hintNode = element()?.lastElementChild?.firstChild;
    description.setHint("mm/dd/yyyy");
    expect(element()?.lastElementChild?.firstChild).toBe(hintNode);
  });

  describe("destroy", () => {
    it("removes the element and drops the attribute when nothing is left", () => {
      const { field, element, description } = setup();
      description.destroy();
      expect(element()).toBeNull();
      expect(field).not.toHaveAttribute("aria-describedby");
    });

    it("removes only its own token and keeps the user's ids", () => {
      const { field, element, description } = setup("help-a help-b");
      description.destroy();
      expect(element()).toBeNull();
      expect(field).toHaveAttribute("aria-describedby", "help-a help-b");
    });

    it("keeps an id the page added after creation", () => {
      const { field, description } = setup("help-a");
      field.setAttribute(
        "aria-describedby",
        `${field.getAttribute("aria-describedby") ?? ""} late`,
      );
      description.destroy();
      expect(field).toHaveAttribute("aria-describedby", "help-a late");
    });
  });
});
