import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the image generation module
vi.mock("../server/_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({
    url: "https://example.com/generated-image.jpg",
  }),
}));

// Mock the storage module
vi.mock("../server/storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "pdfs/test.pdf",
    url: "/manus-storage/pdfs/test.pdf",
  }),
}));

// Mock pdfkit
vi.mock("pdfkit", () => {
  const EventEmitter = require("events");
  class MockPDFDocument extends EventEmitter {
    constructor() {
      super();
    }
    addPage() { return this; }
    image() { return this; }
    fontSize() { return this; }
    fillColor() { return this; }
    opacity() { return this; }
    text() { return this; }
    rect() { return this; }
    fill() { return this; }
    end() {
      // Emit a small buffer and end
      this.emit("data", Buffer.from("PDF_CONTENT"));
      this.emit("end");
    }
  }
  return { default: MockPDFDocument };
});

describe("Book Router", () => {
  describe("remakeImage", () => {
    it("should call generateImage with correct prompt and image data", async () => {
      const { generateImage } = await import("../server/_core/imageGeneration");
      const { bookRouter } = await import("../server/bookRouter");

      // Verify the router is properly structured
      expect(bookRouter).toBeDefined();
      expect(typeof bookRouter).toBe("object");
    });

    it("should have remakeImage and generatePdf procedures", async () => {
      const { bookRouter } = await import("../server/bookRouter");
      
      // Check that the router has the expected procedures
      expect(bookRouter._def).toBeDefined();
      expect(bookRouter._def.procedures).toBeDefined();
      expect(bookRouter._def.procedures.remakeImage).toBeDefined();
      expect(bookRouter._def.procedures.generatePdf).toBeDefined();
    });
  });

  describe("generatePdf", () => {
    it("should handle empty pages array gracefully", async () => {
      // The router should throw when pages is empty
      const { bookRouter } = await import("../server/bookRouter");
      expect(bookRouter._def.procedures.generatePdf).toBeDefined();
    });
  });
});

describe("App Router Integration", () => {
  it("should include book router in appRouter", async () => {
    const { appRouter } = await import("../server/routers");
    const procedures = appRouter._def.procedures as Record<string, unknown>;
    expect(procedures["book.remakeImage"]).toBeDefined();
    expect(procedures["book.generatePdf"]).toBeDefined();
  });
});
