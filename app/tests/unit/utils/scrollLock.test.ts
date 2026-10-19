import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lockScroll } from "@/utils/scrollLock";

describe("lockScroll", () => {
  const html = document.documentElement;

  beforeEach(() => {
    html.style.overflow = "";
  });

  afterEach(() => {
    html.style.overflow = "";
  });

  it("hides overflow until every lock is released, then restores the previous value", () => {
    html.style.overflow = "auto";

    const releaseA = lockScroll();
    const releaseB = lockScroll();
    expect(html.style.overflow).toBe("hidden");

    releaseA();
    expect(html.style.overflow).toBe("hidden");

    releaseB();
    expect(html.style.overflow).toBe("auto");
  });

  it("restores an empty inline value", () => {
    const release = lockScroll();
    expect(html.style.overflow).toBe("hidden");

    release();
    expect(html.style.overflow).toBe("");
  });

  it("ignores a second call of the same release", () => {
    const releaseA = lockScroll();
    const releaseB = lockScroll();

    releaseA();
    releaseA();
    expect(html.style.overflow).toBe("hidden");

    releaseB();
    expect(html.style.overflow).toBe("");
  });
});
