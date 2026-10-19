import { afterEach, describe, expect, it } from "vitest";
import { createButton, createElement, resolveElement } from "@/utils/dom";

describe("dom utils", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("resolveElement", () => {
    it("prefers the element inside the scope when two exist", () => {
      document.body.innerHTML =
        '<div id="a"><span class="x" id="xa"></span></div><div id="b"><span class="x" id="xb"></span></div>';
      const hostB = document.getElementById("b");

      expect(resolveElement(".x", hostB ?? document)?.id).toBe("xb");
    });

    it("falls back to the document when the scope has no match", () => {
      document.body.innerHTML =
        '<div id="a"></div><span class="y" id="y1"></span>';
      const hostA = document.getElementById("a");

      expect(resolveElement(".y", hostA ?? document)?.id).toBe("y1");
    });

    it("returns an element as given and null for null or no match", () => {
      const el = document.createElement("div");

      expect(resolveElement(el)).toBe(el);
      expect(resolveElement(null)).toBeNull();
      expect(resolveElement(".missing")).toBeNull();
    });
  });

  describe("createElement", () => {
    it("applies class name and attributes", () => {
      const el = createElement("div", "dp-ui__x", { "data-a": "1" });

      expect(el.tagName).toBe("DIV");
      expect(el).toHaveClass("dp-ui__x");
      expect(el.getAttribute("data-a")).toBe("1");
    });
  });

  describe("createButton", () => {
    it('creates a type="button" with the class and label', () => {
      const button = createButton("dp-ui__btn", "OK");

      expect(button.type).toBe("button");
      expect(button).toHaveClass("dp-ui__btn");
      expect(button.textContent).toContain("OK");
    });

    it("never interprets the label as markup", () => {
      const button = createButton("dp-ui__btn", "<b>x</b>");

      expect(button.querySelector("b")).toBeNull();
    });
  });
});
