import { describe, it, expect } from "vitest";

// ── Ad-only model constants ───────────────────────────────────────────────────
const FREE_AI_USES_PER_CYCLE = 3;

describe("FREE_AI_USES_PER_CYCLE", () => {
  it("is 3 per cycle", () => {
    expect(FREE_AI_USES_PER_CYCLE).toBe(3);
  });
});

// ── consumeAiUse logic ────────────────────────────────────────────────────────
function consumeAiUse(remaining: number): { allowed: boolean; newRemaining: number; showAd: boolean } {
  if (remaining > 0) {
    return { allowed: true, newRemaining: remaining - 1, showAd: false };
  }
  return { allowed: false, newRemaining: 0, showAd: true };
}

describe("consumeAiUse", () => {
  it("allows use when remaining > 0 and decrements", () => {
    const result = consumeAiUse(3);
    expect(result.allowed).toBe(true);
    expect(result.newRemaining).toBe(2);
    expect(result.showAd).toBe(false);
  });

  it("allows use when remaining is 1 and decrements to 0", () => {
    const result = consumeAiUse(1);
    expect(result.allowed).toBe(true);
    expect(result.newRemaining).toBe(0);
    expect(result.showAd).toBe(false);
  });

  it("blocks use when remaining is 0 and triggers ad", () => {
    const result = consumeAiUse(0);
    expect(result.allowed).toBe(false);
    expect(result.newRemaining).toBe(0);
    expect(result.showAd).toBe(true);
  });
});

// ── onAdWatched logic ─────────────────────────────────────────────────────────
function onAdWatched(): number {
  return FREE_AI_USES_PER_CYCLE;
}

describe("onAdWatched", () => {
  it("grants a full new cycle of uses", () => {
    expect(onAdWatched()).toBe(FREE_AI_USES_PER_CYCLE);
  });
});

// ── Full cycle simulation ─────────────────────────────────────────────────────
describe("Full ad-only cycle simulation", () => {
  it("user gets 3 uses, then must watch ad, then gets 3 more", () => {
    let remaining = FREE_AI_USES_PER_CYCLE;

    // Use all 3
    for (let i = 0; i < 3; i++) {
      const r = consumeAiUse(remaining);
      expect(r.allowed).toBe(true);
      remaining = r.newRemaining;
    }
    expect(remaining).toBe(0);

    // 4th use triggers ad
    const blocked = consumeAiUse(remaining);
    expect(blocked.allowed).toBe(false);
    expect(blocked.showAd).toBe(true);

    // After watching ad, gets 3 more
    remaining = onAdWatched();
    expect(remaining).toBe(3);

    // Can use again
    const r = consumeAiUse(remaining);
    expect(r.allowed).toBe(true);
    expect(r.newRemaining).toBe(2);
  });
});

// ── AI uses remaining display ─────────────────────────────────────────────────
function getAiUsesDisplay(remaining: number): string {
  if (remaining === 0) return "AI変換残り0回";
  return `AI残り${remaining}回`;
}

describe("getAiUsesDisplay", () => {
  it("shows correct remaining count", () => {
    expect(getAiUsesDisplay(3)).toBe("AI残り3回");
    expect(getAiUsesDisplay(1)).toBe("AI残り1回");
    expect(getAiUsesDisplay(0)).toBe("AI変換残り0回");
  });
});

// ── AdBanner visibility ───────────────────────────────────────────────────────
function shouldShowAdBanner(): boolean {
  // In ad-only model, banner is always shown
  return true;
}

describe("shouldShowAdBanner", () => {
  it("always shows banner in ad-only model", () => {
    expect(shouldShowAdBanner()).toBe(true);
  });
});

// ── Reward ad modal trigger ───────────────────────────────────────────────────
describe("Reward ad modal", () => {
  it("should show when remaining is 0", () => {
    const { showAd } = consumeAiUse(0);
    expect(showAd).toBe(true);
  });

  it("should not show when remaining > 0", () => {
    const { showAd } = consumeAiUse(2);
    expect(showAd).toBe(false);
  });
});
