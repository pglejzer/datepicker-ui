export interface DropdownPosition {
  top: string;
  left: string;
  width: string;
  maxHeight: string;
  transformOrigin: string;
}

export function calculateDropdownPosition(
  input: HTMLElement,
  dropdownHeight: number = 456,
): DropdownPosition {
  const rect = input.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;
  const availableWidth = viewportWidth - rect.left;

  const minWidth = 280;
  const gap = 8;
  const preferBelow = spaceBelow >= dropdownHeight + gap;
  const canFitAbove = spaceAbove >= dropdownHeight + gap;

  let top: number;
  let transformOrigin: string;
  let maxHeight: number;

  if (preferBelow) {
    top = rect.bottom + gap;
    transformOrigin = "top";
    maxHeight = Math.min(dropdownHeight, spaceBelow - gap);
  } else if (canFitAbove) {
    top = rect.top - dropdownHeight - gap;
    transformOrigin = "bottom";
    maxHeight = Math.min(dropdownHeight, spaceAbove - gap);
  } else {
    if (spaceBelow > spaceAbove) {
      top = rect.bottom + gap;
      transformOrigin = "top";
      maxHeight = spaceBelow - gap;
    } else {
      top = gap;
      transformOrigin = "top";
      maxHeight = rect.top - gap;
    }
  }

  const width = Math.max(rect.width, minWidth);
  let left = rect.left;

  if (left + width > viewportWidth) {
    left = Math.max(gap, viewportWidth - width - gap);
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
    transformOrigin,
  };
}

export function updateDropdownPosition(
  container: HTMLElement,
  wrapper: HTMLElement,
  dropdownHeight: number = 456,
): void {
  const rect = container.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;
  const gap = 8;

  const actualHeight = wrapper.offsetHeight || dropdownHeight;

  let top: number;
  let transformOrigin: string;

  if (spaceBelow >= actualHeight + gap) {
    top = rect.bottom + gap;
    transformOrigin = "top";
    wrapper.classList.remove("dp-ui__wrapper--above");
    wrapper.classList.add("dp-ui__wrapper--below");
  } else if (spaceAbove >= actualHeight + gap) {
    top = rect.top - actualHeight - gap;
    transformOrigin = "bottom";
    wrapper.classList.remove("dp-ui__wrapper--below");
    wrapper.classList.add("dp-ui__wrapper--above");
  } else if (spaceBelow > spaceAbove) {
    top = rect.bottom + gap;
    transformOrigin = "top";
    wrapper.classList.remove("dp-ui__wrapper--above");
    wrapper.classList.add("dp-ui__wrapper--below");
  } else {
    top = Math.max(gap, rect.top - actualHeight - gap);
    transformOrigin = "bottom";
    wrapper.classList.remove("dp-ui__wrapper--below");
    wrapper.classList.add("dp-ui__wrapper--above");
  }

  wrapper.style.top = `${top}px`;
  wrapper.style.left = `${rect.left}px`;
  wrapper.style.transformOrigin = transformOrigin;
}

export function createDropdownObserver(
  input: HTMLElement,
  wrapper: HTMLElement,
  dropdownHeight: number = 456,
): () => void {
  const update = (): void =>
    updateDropdownPosition(input, wrapper, dropdownHeight);

  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(input);

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });

  return () => {
    resizeObserver.disconnect();
    window.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
  };
}
