/**
 * usePremium — Ad-only monetization hook
 *
 * Model:
 *  - Every user gets FREE_AI_USES_PER_CYCLE (3) AI conversions per cycle.
 *  - When the cycle runs out, a reward ad is shown automatically.
 *  - After watching the ad, the user gets FREE_AI_USES_PER_CYCLE more conversions.
 *  - No paid upgrade — ads are the only monetization.
 *  - Counter is per-cycle (not daily); persisted in AsyncStorage.
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const FREE_AI_USES_PER_CYCLE = 3;

// Legacy export kept for any remaining references
export const FREE_LIMITS = {
  AI_USES_PER_CYCLE: FREE_AI_USES_PER_CYCLE,
} as const;

const STORAGE_KEY = "kdp_ai_uses_remaining";

export interface UsePremiumReturn {
  /** AI conversions remaining in the current cycle */
  aiUsesRemaining: number;
  /** Whether the reward ad modal should be shown */
  showRewardAd: boolean;
  /**
   * Call before each AI conversion.
   * Returns true if the user may proceed, false if the ad must be watched first.
   */
  consumeAiUse: () => Promise<boolean>;
  /** Call after the user successfully watches the reward ad */
  onAdWatched: () => Promise<void>;
  /** Dismiss the reward ad modal without granting extra uses */
  dismissAdModal: () => void;
  // Legacy stubs so existing call-sites compile during transition
  isPremium: boolean;
  isLoading: boolean;
  /** @deprecated Use consumeAiUse() instead */
  incrementAiCount: () => Promise<boolean>;
}

export function usePremium(): UsePremiumReturn {
  const [aiUsesRemaining, setAiUsesRemaining] = useState<number>(FREE_AI_USES_PER_CYCLE);
  const [showRewardAd, setShowRewardAd] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted counter on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val !== null) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) setAiUsesRemaining(parsed);
      }
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback(async (value: number) => {
    setAiUsesRemaining(value);
    await AsyncStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  /**
   * Attempt to consume one AI use.
   * - If uses remain: decrement and return true.
   * - If at 0: show reward ad modal and return false.
   */
  const consumeAiUse = useCallback(async (): Promise<boolean> => {
    const current = await AsyncStorage.getItem(STORAGE_KEY);
    const remaining =
      current !== null ? parseInt(current, 10) : FREE_AI_USES_PER_CYCLE;

    if (remaining > 0) {
      await persist(remaining - 1);
      return true;
    }

    // Out of uses — trigger reward ad
    setShowRewardAd(true);
    return false;
  }, [persist]);

  /** Grant a new cycle of uses after watching the ad */
  const onAdWatched = useCallback(async () => {
    await persist(FREE_AI_USES_PER_CYCLE);
    setShowRewardAd(false);
  }, [persist]);

  const dismissAdModal = useCallback(() => {
    setShowRewardAd(false);
  }, []);

  return {
    aiUsesRemaining,
    showRewardAd,
    consumeAiUse,
    onAdWatched,
    dismissAdModal,
    isPremium: false,
    isLoading,
    incrementAiCount: consumeAiUse,
  };
}
