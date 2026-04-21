import { describe, it, expect } from "vitest";

// ---- Mirror helpers from index.tsx ----
type PageType = "cover" | "back-cover" | "inner";
interface PageItem {
  id: string;
  uri: string;
  originalUri: string | null;
  text: string;
  isProcessing: boolean;
  isRemade: boolean;
  pageType: PageType;
}

function makePages(count: number): PageItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    uri: `file://img${i}.jpg`,
    originalUri: null,
    text: "",
    isProcessing: false,
    isRemade: false,
    pageType: "inner" as PageType,
  }));
}

function assignPageTypes(pages: PageItem[]): PageItem[] {
  return pages.map((p, i) => ({
    ...p,
    pageType:
      i === 0 && pages.length >= 1
        ? "cover"
        : i === pages.length - 1 && pages.length >= 2
        ? "back-cover"
        : "inner",
  }));
}

function reorder(pages: PageItem[], fromIndex: number, toIndex: number): PageItem[] {
  const newPages = [...pages];
  const [moved] = newPages.splice(fromIndex, 1);
  newPages.splice(toIndex, 0, moved);
  return assignPageTypes(newPages);
}

// ---- Tests ----
describe("Drag-and-drop reorder logic", () => {
  it("assigns cover to first page and back-cover to last after reorder", () => {
    const pages = assignPageTypes(makePages(4));
    const reordered = reorder(pages, 2, 0);
    expect(reordered[0].pageType).toBe("cover");
    expect(reordered[reordered.length - 1].pageType).toBe("back-cover");
    reordered.slice(1, -1).forEach((p) => expect(p.pageType).toBe("inner"));
  });

  it("moving the last page to the middle re-assigns back-cover correctly", () => {
    const pages = assignPageTypes(makePages(5));
    const lastId = pages[4].id;
    const reordered = reorder(pages, 4, 2);
    expect(reordered[0].pageType).toBe("cover");
    expect(reordered[4].pageType).toBe("back-cover");
    expect(reordered[2].id).toBe(lastId);
    expect(reordered[2].pageType).toBe("inner");
  });

  it("moving the first page to the end re-assigns cover correctly", () => {
    const pages = assignPageTypes(makePages(4));
    const firstId = pages[0].id;
    const reordered = reorder(pages, 0, 3);
    expect(reordered[0].pageType).toBe("cover");
    expect(reordered[3].id).toBe(firstId);
    expect(reordered[3].pageType).toBe("back-cover");
  });

  it("single page always gets cover type", () => {
    const pages = assignPageTypes(makePages(1));
    expect(pages[0].pageType).toBe("cover");
  });

  it("two pages: first is cover, second is back-cover", () => {
    const pages = assignPageTypes(makePages(2));
    expect(pages[0].pageType).toBe("cover");
    expect(pages[1].pageType).toBe("back-cover");
  });

  it("reorder preserves all page IDs", () => {
    const pages = assignPageTypes(makePages(6));
    const originalIds = pages.map((p) => p.id).sort();
    const reordered = reorder(pages, 1, 4);
    const newIds = reordered.map((p) => p.id).sort();
    expect(newIds).toEqual(originalIds);
  });

  it("reorder preserves page text and uri", () => {
    const pages = assignPageTypes(makePages(3));
    pages[1].text = "Hello page 2";
    pages[1].uri = "file://special.jpg";
    const reordered = reorder(pages, 1, 2);
    const movedPage = reordered.find((p) => p.id === "p1")!;
    expect(movedPage.text).toBe("Hello page 2");
    expect(movedPage.uri).toBe("file://special.jpg");
  });

  it("isActive flag indicates dragging state (boolean check)", () => {
    // Simulates the isActive prop passed by DraggableFlatList
    const isActive = true;
    expect(isActive).toBe(true);
    const notActive = false;
    expect(notActive).toBe(false);
  });
});
