"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  defaultLocale,
  isLocale,
  landingCopy,
  type Locale,
} from "@/lib/landing-copy";

const STORAGE_KEY = "veridicta-landing-locale";
const LANGUAGE_CHANGE_EVENT = "veridicta-language-change";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  copy: (typeof landingCopy)[Locale];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getCookieLocale() {
  const cookieLocale = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${STORAGE_KEY}=`))
    ?.split("=")[1];

  return isLocale(cookieLocale) ? cookieLocale : null;
}

function subscribeToLocale(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, callback);
  };
}

type LanguageProviderProps = {
  children: ReactNode;
  initialLocale?: Locale;
};

export function LanguageProvider({
  children,
  initialLocale = defaultLocale,
}: LanguageProviderProps) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    () => getCookieLocale() ?? initialLocale,
    () => initialLocale,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    document.documentElement.lang = nextLocale;
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    document.cookie = `${STORAGE_KEY}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        copy: landingCopy[locale],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }

  return context;
}
