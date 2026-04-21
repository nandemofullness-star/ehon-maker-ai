import { describe, it, expect } from "vitest";

// ---- helpers mirroring the modal's internal logic ----

type PageType = "cover" | "back-cover" | "inner";

interface PreviewPage {
  id: string;
  uri: string;
  text: string;
  pageType: PageType;
}

/** Replicate the scroll-to-index calculation used in the modal */
function calcCurrentIndex(offsetY: number, cardSize: number, totalPages: number): number {
  const itemHeight = cardSize + 24;
  const idx = Math.round(offsetY / itemHeight);
  return Math.max(0, Math.min(idx, totalPages - 1));
}

/** Determine which overlay label to show for a page */
function getPageLabel(page: PreviewPage): string | null {
  if (page.pageType === "cover") return "表紙";
  if (page.pageType === "back-cover") return "裏表紙";
  return null;
}

/** Determine the page number badge text (inner pages only) */
function getPageNumberBadge(page: PreviewPage, index: number): string | null {
  if (page.pageType === "inner") return `P.${index + 1}`;
  return null;
}

// ---- tests ----

describe("BookPreviewModal – scroll index calculation", () => {
  const CARD_SIZE = 335; // typical value for a 375px-wide screen

  it("returns 0 at scroll offset 0", () => {
    expect(calcCurrentIndex(0, CARD_SIZE, 10)).toBe(0);
  });

  it("advances to page 1 after scrolling one item height", () => {
    const itemH = CARD_SIZE + 24;
    expect(calcCurrentIndex(itemH, CARD_SIZE, 10)).toBe(1);
  });

  it("clamps to 0 for negative offsets", () => {
    expect(calcCurrentIndex(-100, CARD_SIZE, 10)).toBe(0);
  });

  it("clamps to last page index when offset exceeds list", () => {
    const itemH = CARD_SIZE + 24;
    expect(calcCurrentIndex(itemH * 100, CARD_SIZE, 5)).toBe(4);
  });

  it("rounds to nearest page on partial scroll", () => {
    const itemH = CARD_SIZE + 24;
    // 60% of the way to page 2 → rounds to page 2
    expect(calcCurrentIndex(itemH * 1.6, CARD_SIZE, 10)).toBe(2);
    // 40% of the way to page 2 → rounds back to page 1
    expect(calcCurrentIndex(itemH * 1.4, CARD_SIZE, 10)).toBe(1);
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
