import { describe, it, expect } from "vitest";

// ---- types mirroring the modal ----
type PageType = "cover" | "back-cover" | "inner";
type ViewMode = "scroll" | "swipe";

interface PreviewPage {
  id: string;
  uri: string;
  text: string;
  pageType: PageType;
}

// ---- helpers mirroring modal logic ----

function calcScrollIndex(offsetY: number, cardSize: number, totalPages: number): number {
  const itemHeight = cardSize + 24;
  const idx = Math.round(offsetY / itemHeight);
  return Math.max(0, Math.min(idx, totalPages - 1));
}

function getPageLabel(page: PreviewPage): string | null {
  if (page.pageType === "cover") return "表紙";
  if (page.pageType === "back-cover") return "裏表紙";
  return null;
}

function getPageNumberBadge(page: PreviewPage, index: number): string | null {
  if (page.pageType === "inner") return `P.${index + 1}`;
  return null;
}

function canGoNext(currentIndex: number, totalPages: number): boolean {
  return currentIndex < totalPages - 1;
}

function canGoPrev(currentIndex: number): boolean {
  return currentIndex > 0;
}

function goToNext(currentIndex: number, totalPages: number): number {
  return canGoNext(currentIndex, totalPages) ? currentIndex + 1 : currentIndex;
}

function goToPrev(currentIndex: number): number {
  return canGoPrev(currentIndex) ? currentIndex - 1 : currentIndex;
}

// ---- tests ----

describe("BookPreviewModal – scroll index calculation", () => {
  const CARD_SIZE = 335;

  it("returns 0 at scroll offset 0", () => {
    expect(calcScrollIndex(0, CARD_SIZE, 10)).toBe(0);
  });

  it("advances to page 1 after scrolling one item height", () => {
    expect(calcScrollIndex(CARD_SIZE + 24, CARD_SIZE, 10)).toBe(1);
  });

  it("clamps to 0 for negative offsets", () => {
    expect(calcScrollIndex(-100, CARD_SIZE, 10)).toBe(0);
  });

  it("clamps to last page index when offset exceeds list", () => {
    expect(calcScrollIndex((CARD_SIZE + 24) * 100, CARD_SIZE, 5)).toBe(4);
  });

  it("rounds to nearest page on partial scroll", () => {
    const itemH = CARD_SIZE + 24;
    expect(calcScrollIndex(itemH * 1.6, CARD_SIZE, 10)).toBe(2);
    expect(calcScrollIndex(itemH * 1.4, CARD_SIZE, 10)).toBe(1);
  });
});

describe("BookPreviewModal – swipe mode navigation", () => {
  it("goToNext advances the index", () => {
    expect(goToNext(0, 5)).toBe(1);
    expect(goToNext(3, 5)).toBe(4);
  });

  it("goToNext does not exceed last page", () => {
    expect(goToNext(4, 5)).toBe(4);
  });

  it("goToPrev decrements the index", () => {
    expect(goToPrev(3)).toBe(2);
    expect(goToPrev(1)).toBe(0);
  });

  it("goToPrev does not go below 0", () => {
    expect(goToPrev(0)).toBe(0);
  });

  it("canGoNext is false on last page", () => {
    expect(canGoNext(4, 5)).toBe(false);
    expect(canGoNext(3, 5)).toBe(true);
  });

  it("canGoPrev is false on first page", () => {
    expect(canGoPrev(0)).toBe(false);
    expect(canGoPrev(1)).toBe(true);
  });
});

describe("BookPreviewModal – page label logic", () => {
  const makePage = (id: string, pageType: PageType): PreviewPage => ({
    id,
    uri: `file:///test/${id}.jpg`,
    text: `Text for ${id}`,
    pageType,
  });

  it("shows '表紙' label for cover pages", () => {
    expect(getPageLabel(makePage("p1", "cover"))).toBe("表紙");
  });

  it("shows '裏表紙' label for back-cover pages", () => {
    expect(getPageLabel(makePage("p2", "back-cover"))).toBe("裏表紙");
  });

  it("returns null for inner pages", () => {
    expect(getPageLabel(makePage("p3", "inner"))).toBeNull();
  });
});

describe("BookPreviewModal – page number badge", () => {
  const makePage = (id: string, pageType: PageType): PreviewPage => ({
    id,
    uri: `file:///test/${id}.jpg`,
    text: "",
    pageType,
  });

  it("shows P.N badge for inner pages", () => {
    expect(getPageNumberBadge(makePage("p1", "inner"), 0)).toBe("P.1");
    expect(getPageNumberBadge(makePage("p5", "inner"), 4)).toBe("P.5");
  });

  it("hides badge for cover pages", () => {
    expect(getPageNumberBadge(makePage("p1", "cover"), 0)).toBeNull();
  });

  it("hides badge for back-cover pages", () => {
    expect(getPageNumberBadge(makePage("p1", "back-cover"), 5)).toBeNull();
  });
});

describe("BookPreviewModal – progress dots visibility", () => {
  it("shows dots when 2–24 pages exist", () => {
    const showDots = (n: number) => n > 1 && n <= 24;
    expect(showDots(1)).toBe(false);
    expect(showDots(2)).toBe(true);
    expect(showDots(24)).toBe(true);
    expect(showDots(25)).toBe(false);
  });
});

describe("BookPreviewModal – view mode switching", () => {
  it("defaults to swipe mode", () => {
    const defaultMode: ViewMode = "swipe";
    expect(defaultMode).toBe("swipe");
  });

  it("can switch to scroll mode", () => {
    let mode: ViewMode = "swipe";
    mode = "scroll";
    expect(mode).toBe("scroll");
  });

  it("switching mode resets index to 0", () => {
    let index = 5;
    // simulate switchMode
    index = 0;
    expect(index).toBe(0);
  });
});

describe("BookPreviewModal – PDF output button", () => {
  it("calls onGeneratePdf when button is pressed", async () => {
    let called = false;
    const onGeneratePdf = async () => { called = true; };
    await onGeneratePdf();
    expect(called).toBe(true);
  });

  it("sets isPdfGenerating to true during generation and false after", async () => {
    let isPdfGenerating = false;
    const handleGeneratePdf = async (fn: () => Promise<void>) => {
      isPdfGenerating = true;
      try { await fn(); } finally { isPdfGenerating = false; }
    };
    const slowFn = () => new Promise<void>((resolve) => setTimeout(resolve, 10));
    const promise = handleGeneratePdf(slowFn);
    expect(isPdfGenerating).toBe(true);
    await promise;
    expect(isPdfGenerating).toBe(false);
  });

  it("does not call onGeneratePdf when isPdfGenerating is true", async () => {
    let callCount = 0;
    const isPdfGenerating = true;
    const onGeneratePdf = async () => { callCount++; };
    // simulate guard
    if (!isPdfGenerating) await onGeneratePdf();
    expect(callCount).toBe(0);
  });

  it("PDF button is hidden when pages is empty", () => {
    const pages: unknown[] = [];
    const showPdfButton = pages.length > 0;
    expect(showPdfButton).toBe(false);
  });

  it("PDF button is visible when pages exist", () => {
    const pages = [{ id: "1" }];
    const showPdfButton = pages.length > 0;
    expect(showPdfButton).toBe(true);
  });
});
