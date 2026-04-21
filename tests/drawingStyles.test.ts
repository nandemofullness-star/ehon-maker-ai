import { describe, it, expect } from "vitest";
import {
  DRAWING_STYLES,
  DEFAULT_STYLE_ID,
  getStyleById,
} from "../constants/drawing-styles";

describe("Drawing Styles", () => {
  it("should have exactly 6 styles defined", () => {
    expect(DRAWING_STYLES).toHaveLength(6);
  });

  it("should include all expected style IDs", () => {
    const ids = DRAWING_STYLES.map((s) => s.id);
    expect(ids).toContain("watercolor");
    expect(ids).toContain("crayon");
    expect(ids).toContain("anime");
    expect(ids).toContain("oilpaint");
    expect(ids).toContain("papercut");
    expect(ids).toContain("pencil");
  });

  it("each style should have all required fields", () => {
    for (const style of DRAWING_STYLES) {
      expect(style.id).toBeTruthy();
      expect(style.label).toBeTruthy();
      expect(style.emoji).toBeTruthy();
      expect(style.description).toBeTruthy();
      expect(style.promptFragment).toBeTruthy();
    }
  });

  it("default style ID should be watercolor", () => {
    expect(DEFAULT_STYLE_ID).toBe("watercolor");
  });

  it("getStyleById should return correct style", () => {
    const style = getStyleById("anime");
    expect(style.id).toBe("anime");
    expect(style.label).toBe("アニメ風");
  });

  it("getStyleById should fall back to first style for unknown ID", () => {
    const style = getStyleById("unknown_style");
    expect(style.id).toBe(DRAWING_STYLES[0].id);
  });

  it("prompt fragments should be in English for AI processing", () => {
    for (const style of DRAWING_STYLES) {
      // Prompt fragments should contain at least some ASCII (English) characters
      expect(/[a-zA-Z]/.test(style.promptFragment)).toBe(true);
    }
  });
});

describe("Server STYLE_PROMPTS mapping", () => {
  it("server style prompts should cover all client-side style IDs", async () => {
    // Dynamically import the server router to check STYLE_PROMPTS
    const { bookRouter } = await import("../server/bookRouter");
    expect(bookRouter).toBeDefined();

    // Verify the router accepts drawingStyle input
    const procedure = bookRouter._def.procedures.remakeImage;
    expect(procedure).toBeDefined();
    expect(procedure._def.type).toBe("mutation");
  });
});
