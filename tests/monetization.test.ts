import { describe, it, expect, vi, beforeEach } from "vitest";

// ── FREE_LIMITS ──────────────────────────────────────────────────────────────
const FREE_LIMITS = { maxPages: 8, dailyAiConversions: 3 };

describe("FREE_LIMITS", () => {
  it("maxPages is 8 for free users", () => {
    expect(FREE_LIMITS.maxPages).toBe(8);
  });

  it("dailyAiConversions is 3 for free users", () => {
    expect(FREE_LIMITS.dailyAiConversions).toBe(3);
  });
});

// ── Page limit gating ────────────────────────────────────────────────────────
function canAddPage(isPremium: boolean, currentPageCount: number): boolean {
  if (isPremium) return true;
  return currentPageCount < FREE_LIMITS.maxPages;
}

describe("canAddPage", () => {
  it("free user can add pages up to the limit", () => {
    expect(canAddPage(false, 0)).toBe(true);
    expect(canAddPage(false, 7)).toBe(true);
  });

  it("free user cannot exceed the page limit", () => {
    expect(canAddPage(false, 8)).toBe(false);
    expect(canAddPage(false, 20)).toBe(false);
  });

  it("premium user has no page limit", () => {
    expect(canAddPage(true, 8)).toBe(true);
    expect(canAddPage(true, 100)).toBe(true);
  });
});

// ── Daily AI conversion gating ───────────────────────────────────────────────
function canUseAi(isPremium: boolean, dailyCount: number): boolean {
  if (isPremium) return true;
  return dailyCount < FREE_LIMITS.dailyAiConversions;
}

describe("canUseAi", () => {
  it("free user can use AI within daily limit", () => {
    expect(canUseAi(false, 0)).toBe(true);
    expect(canUseAi(false, 2)).toBe(true);
  });

  it("free user is blocked after reaching daily limit", () => {
    expect(canUseAi(false, 3)).toBe(false);
    expect(canUseAi(false, 10)).toBe(false);
  });

  it("premium user has unlimited AI conversions", () => {
    expect(canUseAi(true, 3)).toBe(true);
    expect(canUseAi(true, 999)).toBe(true);
  });
});

// ── Remaining AI count display ───────────────────────────────────────────────
function remainingAiCount(isPremium: boolean, dailyCount: number): number | null {
  if (isPremium) return null; // unlimited
  return Math.max(0, FREE_LIMITS.dailyAiConversions - dailyCount);
}

describe("remainingAiCount", () => {
  it("returns correct remaining count for free users", () => {
    expect(remainingAiCount(false, 0)).toBe(3);
    expect(remainingAiCount(false, 1)).toBe(2);
    expect(remainingAiCount(false, 3)).toBe(0);
  });

  it("never returns negative", () => {
    expect(remainingAiCount(false, 10)).toBe(0);
  });

  it("returns null for premium users (unlimited)", () => {
    expect(remainingAiCount(true, 0)).toBeNull();
    expect(remainingAiCount(true, 100)).toBeNull();
  });
});

// ── UpgradeModal trigger reasons ─────────────────────────────────────────────
type TriggerReason = "page_limit" | "ai_limit" | "manual";

function getUpgradeMessage(reason: TriggerReason): string {
  switch (reason) {
    case "page_limit":
      return `無料版は${FREE_LIMITS.maxPages}ページまでです。プレミアムで無制限に。`;
    case "ai_limit":
      return `本日のAI変換回数（${FREE_LIMITS.dailyAiConversions}回）に達しました。プレミアムで無制限に。`;
    case "manual":
      return "プレミアムプランで全機能をご利用いただけます。";
  }
}

describe("getUpgradeMessage", () => {
  it("shows page limit message", () => {
    const msg = getUpgradeMessage("page_limit");
    expect(msg).toContain("8ページ");
  });

  it("shows AI limit message with daily count", () => {
    const msg = getUpgradeMessage("ai_limit");
    expect(msg).toContain("3回");
  });

  it("shows generic message for manual trigger", () => {
    const msg = getUpgradeMessage("manual");
    expect(msg).toContain("プレミアム");
  });
});

// ── AdBanner visibility ──────────────────────────────────────────────────────
function shouldShowAd(isPremium: boolean): boolean {
  return !isPremium;
}

describe("shouldShowAd", () => {
  it("shows ad for free users", () => {
    expect(shouldShowAd(false)).toBe(true);
  });

  it("hides ad for premium users", () => {
    expect(shouldShowAd(true)).toBe(false);
  });
});
