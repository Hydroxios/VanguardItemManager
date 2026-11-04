"use client";

import { useEffect } from "react";
import { hasInterfaceTranslation, useLocale } from "@/lib/i18n";

/** Puts the interface language on <html>, for screen readers and the browser's spell checking or translation */
const DocumentLanguage = () => {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = hasInterfaceTranslation(locale) ? locale : "en";
  }, [locale]);

  return null;
};

export default DocumentLanguage;
