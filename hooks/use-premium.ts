import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const PREMIUM_KEY = "kdp_is_premium";
const DAILY_AI_COUNT_KEY = "kdp_daily_ai_count";
const DAILY_AI_DATE_KEY = "kdp_daily_ai_date";

export const FREE_LIMITS = {
  maxPages: 8,
  dailyAiConversions: 3,
} as const;

export interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  dailyAiCount: number;
  canUseAi: boolean;
  remainingAiCount: number;
}

export interface UsePremiumReturn extends PremiumState {
  checkPremium: () => Promise<void>;
  setPremium: (value: boolean) => Promise<void>;
  incrementAiCount: () => Promise<boolean>;
  resetAiCount: () => Promise<void>;
  purchasePremium: () => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
}

export function usePremium(): UsePremiumReturn {
  const [isPremium, setIsPremiumState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyAiCount, setDailyAiCount] = useState(0);

  const getTodayString = () => new Date().toISOString().split("T")[0];

  const loadDailyAiCount = useCallback(async () => {
    const today = getTodayString();
    const savedDate = await AsyncStorage.getItem(DAILY_AI_DATE_KEY);
    if (savedDate !== today) {
      await AsyncStorage.setItem(DAILY_AI_DATE_KEY, today);
      await AsyncStorage.setItem(DAILY_AI_COUNT_KEY, "0");
      setDailyAiCount(0);
    } else {
      const count = await AsyncStorage.getItem(DAILY_AI_COUNT_KEY);
      setDailyAiCount(parseInt(count ?? "0", 10));
    }
  }, []);

  const checkPremium = useCallback(async () => {
    setIsLoading(true);
    try {
      // On native, try RevenueCat; fall back to AsyncStorage cache
      if (Platform.OS !== "web") {
        try {
          const Purchases = require("react-native-purchases").default;
          const customerInfo = await Purchases.getCustomerInfo();
          const active = customerInfo.entitlements.active;
          const premium = !!active["premium"];
          await AsyncStorage.setItem(PREMIUM_KEY, premium ? "1" : "0");
          setIsPremiumState(premium);
          setIsLoading(false);
          return;
        } catch {
          // RevenueCat not configured yet — fall through to local cache
        }
      }
      const cached = await AsyncStorage.getItem(PREMIUM_KEY);
      setIsPremiumState(cached === "1");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setPremium = useCallback(async (value: boolean) => {
    await AsyncStorage.setItem(PREMIUM_KEY, value ? "1" : "0");
    setIsPremiumState(value);
  }, []);

  const incrementAiCount = useCallback(async (): Promise<boolean> => {
    if (isPremium) return true; // unlimited for premium
    const today = getTodayString();
    const savedDate = await AsyncStorage.getItem(DAILY_AI_DATE_KEY);
    let count = 0;
    if (savedDate === today) {
      count = parseInt((await AsyncStorage.getItem(DAILY_AI_COUNT_KEY)) ?? "0", 10);
    } else {
      await AsyncStorage.setItem(DAILY_AI_DATE_KEY, today);
    }
    if (count >= FREE_LIMITS.dailyAiConversions) return false;
    const newCount = count + 1;
    await AsyncStorage.setItem(DAILY_AI_COUNT_KEY, String(newCount));
    setDailyAiCount(newCount);
    return true;
  }, [isPremium]);

  const resetAiCount = useCallback(async () => {
    await AsyncStorage.setItem(DAILY_AI_COUNT_KEY, "0");
    setDailyAiCount(0);
  }, []);

  const purchasePremium = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (Platform.OS === "web") {
      // Web: simulate purchase for preview purposes
      await setPremium(true);
      return { success: true };
    }
    try {
      const Purchases = require("react-native-purchases").default;
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.[0];
      if (!pkg) return { success: false, error: "商品が見つかりません" };
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const premium = !!customerInfo.entitlements.active["premium"];
      await setPremium(premium);
      return { success: premium };
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (err.userCancelled) return { success: false, error: "キャンセルされました" };
      return { success: false, error: err.message ?? "購入に失敗しました" };
    }
  }, [setPremium]);

  const restorePurchases = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (Platform.OS === "web") {
      return { success: false, error: "Web環境では復元できません" };
    }
    try {
      const Purchases = require("react-native-purchases").default;
      const customerInfo = await Purchases.restorePurchases();
      const premium = !!customerInfo.entitlements.active["premium"];
      await setPremium(premium);
      return { success: premium, error: premium ? undefined : "有効なサブスクリプションが見つかりませんでした" };
    } catch (e: unknown) {
      const err = e as { message?: string };
      return { success: false, error: err.message ?? "復元に失敗しました" };
    }
  }, [setPremium]);

  useEffect(() => {
    checkPremium();
    loadDailyAiCount();
  }, [checkPremium, loadDailyAiCount]);

  const canUseAi = isPremium || dailyAiCount < FREE_LIMITS.dailyAiConversions;
  const remainingAiCount = isPremium
    ? Infinity
    : Math.max(0, FREE_LIMITS.dailyAiConversions - dailyAiCount);

  return {
    isPremium,
    isLoading,
    dailyAiCount,
    canUseAi,
    remainingAiCount,
    checkPremium,
    setPremium,
    incrementAiCount,
    resetAiCount,
    purchasePremium,
    restorePurchases,
  };
}
