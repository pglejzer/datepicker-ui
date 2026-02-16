export interface VirtualScrollerOptions {
  container: HTMLElement;
  startYear: number;
  endYear: number;
  currentYear: number;
  itemHeight: number;
  bufferSize?: number;
  isGrid?: boolean;
  onYearClick: (year: number) => void;
  renderYearItem: (year: number, isSelected: boolean) => HTMLElement;
}

interface VisibleRange {
  start: number;
  end: number;
}

interface ScrollMetrics {
  scrollTop: number;
  scrollBottom: number;
  containerHeight: number;
  contentHeight: number;
}

export class VirtualYearScroller {
  private readonly container: HTMLElement;
  private readonly startYear: number;
  private readonly endYear: number;
  private readonly currentYear: number;
  private readonly itemHeight: number;
  private readonly bufferSize: number;
  private readonly isGrid: boolean;
  private readonly onYearClick: (year: number) => void;
  private readonly renderYearItem: (
    year: number,
    isSelected: boolean
  ) => HTMLElement;

  private contentWrapper: HTMLElement | null = null;
  private visibleRange: VisibleRange = { start: 0, end: 0 };
  private readonly totalYears: number;
  private readonly SCROLL_THRESHOLD = 100;
  private readonly MAX_CHILDREN_MULTIPLIER = 4;

  constructor(options: VirtualScrollerOptions) {
    this.container = options.container;
    this.startYear = options.startYear;
    this.endYear = options.endYear;
    this.currentYear = options.currentYear;
    this.itemHeight = options.itemHeight;
    this.bufferSize = options.bufferSize || 10;
    this.isGrid = options.isGrid || false;
    this.onYearClick = options.onYearClick;
    this.renderYearItem = options.renderYearItem;
    this.totalYears = this.endYear - this.startYear + 1;
  }

  init(): void {
    this.createContentWrapper();
    this.renderAllYears();
    this.scrollToCurrentYear();
  }

  private createContentWrapper(): void {
    this.contentWrapper = document.createElement("div");
    this.contentWrapper.style.position = "relative";

    if (this.isGrid) {
      this.contentWrapper.className = "dp-ui__unified-picker-grid";
    }

    this.container.appendChild(this.contentWrapper);
  }

  private renderAllYears(): void {
    if (!this.contentWrapper) return;

    for (let i = 0; i < this.totalYears; i++) {
      const year = this.startYear + i;
      const isSelected = year === this.currentYear;
      const yearElement = this.renderYearItem(year, isSelected);

      yearElement.addEventListener("click", () => {
        this.onYearClick(year);
      });

      this.contentWrapper.appendChild(yearElement);
    }

    this.visibleRange = { start: 0, end: this.totalYears - 1 };
  }

  private scrollToCurrentYear(): void {
    if (!this.contentWrapper) return;

    const currentIndex = this.currentYear - this.startYear;

    requestAnimationFrame(() => {
      const children = Array.from(
        this.contentWrapper!.children
      ) as HTMLElement[];
      const currentYearElement = children[currentIndex];

      if (currentYearElement) {
        currentYearElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });
  }

  destroy(): void {
    if (this.contentWrapper) {
      this.contentWrapper.remove();
      this.contentWrapper = null;
    }
  }
}
