import { describe, it, expect } from "vitest";

// Test the logic for compare modal state management
// (Pure logic tests - no React Native rendering needed)

interface PageItem {
  id: string;
  uri: string;
  originalUri: string | null;
  text: string;
  isProcessing: boolean;
  isRemade: boolean;
}

// Simulate the onReject handler logic
function rejectRemake(pages: PageItem[], pageId: string, originalUri: string): PageItem[] {
  return pages.map((p) =>
    p.id === pageId
      ? { ...p, uri: originalUri, isRemade: false, originalUri: null }
      : p
  );
}

// Simulate the state update after a successful remake
function applyRemake(pages: PageItem[], pageId: string, newUri: string, originalUri: string): PageItem[] {
  return pages.map((p) =>
    p.id === pageId
      ? { ...p, uri: newUri, originalUri, isProcessing: false, isRemade: true }
      : p
  );
}

describe("Compare Modal Logic", () => {
  const mockPages: PageItem[] = [
    {
      id: "page1",
      uri: "file://original-photo.jpg",
      originalUri: null,
      text: "テストページ",
      isProcessing: false,
      isRemade: false,
    },
    {
      id: "page2",
      uri: "file://another-photo.jpg",
      originalUri: null,
      text: "",
      isProcessing: false,
      isRemade: false,
    },
  ];

  it("should save originalUri when AI remake is applied", () => {
    const result = applyRemake(mockPages, "page1", "file://remade-photo.jpg", "file://original-photo.jpg");
    const page = result.find((p) => p.id === "page1")!;

    expect(page.uri).toBe("file://remade-photo.jpg");
    expect(page.originalUri).toBe("file://original-photo.jpg");
    expect(page.isRemade).toBe(true);
    expect(page.isProcessing).toBe(false);
  });

  it("should not affect other pages when applying remake", () => {
    const result = applyRemake(mockPages, "page1", "file://remade-photo.jpg", "file://original-photo.jpg");
    const page2 = result.find((p) => p.id === "page2")!;

    expect(page2.uri).toBe("file://another-photo.jpg");
    expect(page2.originalUri).toBeNull();
    expect(page2.isRemade).toBe(false);
  });

  it("should revert to original URI when user rejects remake", () => {
    // First apply a remake
    const afterRemake = applyRemake(mockPages, "page1", "file://remade-photo.jpg", "file://original-photo.jpg");

    // Then reject it
    const afterReject = rejectRemake(afterRemake, "page1", "file://original-photo.jpg");
    const page = afterReject.find((p) => p.id === "page1")!;

    expect(page.uri).toBe("file://original-photo.jpg");
    expect(page.originalUri).toBeNull();
    expect(page.isRemade).toBe(false);
  });

  it("should show compare button only when isRemade=true and originalUri is set", () => {
    const remadePage: PageItem = {
      id: "page1",
      uri: "file://remade-photo.jpg",
      originalUri: "file://original-photo.jpg",
      text: "",
      isProcessing: false,
      isRemade: true,
    };

    const shouldShowCompare = remadePage.isRemade && remadePage.originalUri !== null;
    expect(shouldShowCompare).toBe(true);
  });

  it("should not show compare button for non-remade pages", () => {
    const originalPage: PageItem = {
      id: "page1",
      uri: "file://original-photo.jpg",
      originalUri: null,
      text: "",
      isProcessing: false,
      isRemade: false,
    };

    const shouldShowCompare = originalPage.isRemade && originalPage.originalUri !== null;
    expect(shouldShowCompare).toBe(false);
  });

  it("should correctly identify page number for compare state", () => {
    const pages = [...mockPages];
    const targetId = "page2";
    const index = pages.findIndex((p) => p.id === targetId);

    expect(index).toBe(1);
    expect(index + 1).toBe(2); // page number is 1-indexed
  });
});
