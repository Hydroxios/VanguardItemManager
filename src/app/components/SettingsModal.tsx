import React, { ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import DestinyCheckBox from "./destiny-ui/DestinyCheckbox";
import { DEFAULT_SETTINGS, Settings, updateSettings, useSettings } from "@/lib/hooks/useSettings";
import useModalKeys from "@/lib/hooks/useModalKeys";
import { Dictionary, getLocale, hasInterfaceTranslation, Locale, LOCALE_STORAGE_KEY, useT } from "@/lib/i18n";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  debugMode: boolean;
  handleDebugModeChange: (b: boolean) => void;
  keepOpen: boolean;
  setKeepOpen: (b: boolean) => void;
}

const LANGUAGES: { code: Locale; label: string; icon: string }[] = [
  { code: "en", label: "English", icon: "us" },
  { code: "fr", label: "Français", icon: "fr" },
  { code: "es", label: "Español", icon: "es" },
  { code: "de", label: "Deutsch", icon: "de" },
  { code: "it", label: "Italiano", icon: "it" },
  { code: "ja", label: "日本語", icon: "jp" },
  { code: "ru", label: "Русский", icon: "ru" },
  { code: "pl", label: "Polski", icon: "pl" },
  { code: "ko", label: "한국어", icon: "kr" },
];

const SECTIONS = ["general", "interface", "vault", "debug"] as const;

type SectionId = typeof SECTIONS[number];

type Options<T> = { value: T; label: string }[];

const refreshOptions = (t: Dictionary): Options<Settings["refreshInterval"]> => [
  { value: 0, label: t.settings.off },
  { value: 1, label: t.settings.minutes(1) },
  { value: 3, label: t.settings.minutes(3) },
  { value: 5, label: t.settings.minutes(5) },
];

const tooltipSpeedOptions = (t: Dictionary): Options<Settings["tooltipSpeed"]> => [
  { value: "fast", label: t.settings.fast },
  { value: "normal", label: t.settings.normal },
  { value: "slow", label: t.settings.slow },
];

const motionOptions = (t: Dictionary): Options<Settings["motion"]> => [
  { value: "system", label: t.settings.system },
  { value: "full", label: t.settings.on },
  { value: "reduced", label: t.settings.reduced },
];

const notificationOptions = (t: Dictionary): Options<Settings["notificationDuration"]> => [
  { value: "short", label: t.settings.short },
  { value: "normal", label: t.settings.normal },
  { value: "long", label: t.settings.long },
];

const vaultItemSizeOptions = (t: Dictionary): Options<Settings["vaultItemSize"]> => [
  { value: "small", label: t.settings.small },
  { value: "medium", label: t.settings.medium },
  { value: "large", label: t.settings.large },
];

/** A setting: what it is on the left, its control on the right */
const SettingRow = ({ label, description, children }: { label: string; description?: string; children: ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 py-4 border-b border-white/5 last:border-b-0">
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-white">{label}</span>
      {description && <span className="text-sm text-gray-500">{description}</span>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

/** One choice among a few, styled like the editors' tabs */
const Segmented = <T extends string | number>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) => (
  <div role="radiogroup" aria-label={label} className="inline-flex rounded-md bg-white/5 p-0.5">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={option.value === value}
        onClick={() => onChange(option.value)}
        className={`px-3 py-1 text-sm rounded transition-colors ${option.value === value ? "bg-[#7e57c2] text-white" : "text-gray-400 hover:text-white"}`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, debugMode, handleDebugModeChange, keepOpen, setKeepOpen }) => {
  const t = useT();
  // Unknown stored locales fall back to English
  const [selectedLocale, setSelectedLocale] = useState(getLocale);
  const [section, setSection] = useState<SectionId>("general");
  const { settings, setSetting } = useSettings();

  // Escape closes the settings, and no key reaches the page's shortcuts behind them
  useModalKeys(onClose, { enabled: open });

  if (!open) return null;

  const currentLanguage = LANGUAGES.find(l => l.code === selectedLocale) ?? LANGUAGES[0];

  const handleLogout = async () => {
    await fetch("/api/token", { method: "DELETE" }).catch(() => undefined);
    window.location.reload();
  };

  const handleLanguageChange = (locale: Locale) => {
    // Definitions and interface texts are loaded per locale, so only reload when it actually changes
    if (locale === currentLanguage.code) return;
    setSelectedLocale(locale);
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    setTimeout(() => {
      window.location.reload();
    }, 120); // delay for smoother UI
  };

  // Everything but the language, which would reload the page
  const handleReset = () => {
    updateSettings(DEFAULT_SETTINGS);
    setKeepOpen(false);
    handleDebugModeChange(false);
  };

  const sectionLabel = "text-xs uppercase tracking-wider text-gray-400";

  // Portaled to <body>, like the editors: above the header (1001), below the item tooltip (1005)
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-[1003] flex flex-col bg-[#141414]/95 backdrop-blur-md text-left animate-fade-in"
    >
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white/5 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19.43 12.98c.04-.31.07-.63.07-.98s-.03-.67-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.65l-2-3.46a.5.5 0 0 0-.61-.23l-2.49 1a7.03 7.03 0 0 0-1.7-.98l-.38-2.65A.488.488 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.63.25-1.21.58-1.76.99l-2.49-1a.5.5 0 0 0-.61.23l-2 3.46a.5.5 0 0 0 .12.65l2.11 1.65c-.05.32-.08.64-.08.98s.03.66.08.98l-2.11 1.65a.5.5 0 0 0-.12.65l2 3.46a.5.5 0 0 0 .61.23l2.49-1c.54.41 1.13.74 1.76.99l.38 2.65A.5.5 0 0 0 10 22h4c.25 0 .46-.18.5-.42l.38-2.65a6.97 6.97 0 0 0 1.7-.98l2.49 1a.5.5 0 0 0 .61-.23l2-3.46a.5.5 0 0 0-.12-.65l-2.11-1.65ZM12 15.5a3.5 3.5 0 1 1 .001-7.001A3.5 3.5 0 0 1 12 15.5Z"
              />
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <h2 id="settings-title" className="text-xl text-white font-semibold truncate">{t.settings.title}</h2>
            <span className="text-sm text-gray-500 truncate">{t.settings.subtitle}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10"
          title={t.common.closeEsc}
          aria-label={t.common.close}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
        </button>
      </header>

      {/* Body: sections on the left (on top on small screens), their settings on the right */}
      <div className="flex-1 min-h-0 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[220px_1fr]">
        <nav className="flex lg:flex-col gap-1 p-4 lg:p-6 overflow-x-auto border-b lg:border-b-0 lg:border-r border-white/10" aria-label={t.settings.sectionsLabel}>
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              aria-current={s === section ? "page" : undefined}
              className={`shrink-0 px-3 py-2 text-sm text-left rounded-md transition-colors ${s === section ? "bg-[#7e57c2] text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            >
              {t.settings.sections[s]}
            </button>
          ))}
        </nav>

        <div className="overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-3xl flex flex-col gap-8">
            {section === "general" && (
              <>
                <div className="flex flex-col gap-3">
                  <span className={sectionLabel}>{t.settings.language}</span>
                  <span className="text-sm text-gray-500">{t.settings.languageDescription}</span>
                  {!hasInterfaceTranslation(currentLanguage.code) && (
                    <span className="text-sm text-gray-500">{t.settings.languageNoTranslation}</span>
                  )}
                  <div role="radiogroup" aria-label={t.settings.language} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        role="radio"
                        aria-checked={currentLanguage.code === lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md border transition-colors ${currentLanguage.code === lang.code
                          ? "border-[#7e57c2] bg-[#7e57c2]/15 text-white"
                          : "border-white/10 text-gray-300 hover:text-white hover:bg-white/5"}`}
                      >
                        <span className={`fi fi-${lang.icon} rounded-sm shrink-0`}></span>
                        <span className="truncate">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className={sectionLabel}>{t.settings.profile}</span>
                  <SettingRow label={t.settings.refresh} description={t.settings.refreshDescription}>
                    <Segmented label={t.settings.refresh} value={settings.refreshInterval} options={refreshOptions(t)} onChange={(v) => setSetting("refreshInterval", v)} />
                  </SettingRow>
                </div>
              </>
            )}

            {section === "interface" && (
              <>
                <div className="flex flex-col">
                  <span className={sectionLabel}>{t.settings.tooltips}</span>
                  <SettingRow label={t.settings.tooltipSpeed} description={t.settings.tooltipSpeedDescription}>
                    <Segmented label={t.settings.tooltipSpeed} value={settings.tooltipSpeed} options={tooltipSpeedOptions(t)} onChange={(v) => setSetting("tooltipSpeed", v)} />
                  </SettingRow>
                  <SettingRow label={t.settings.keepTooltipOpen} description={t.settings.keepTooltipOpenDescription}>
                    <DestinyCheckBox checked={keepOpen} onClick={() => setKeepOpen(!keepOpen)} ariaLabel={t.settings.keepTooltipOpen} />
                  </SettingRow>
                </div>

                <div className="flex flex-col">
                  <span className={sectionLabel}>{t.settings.display}</span>
                  <SettingRow label={t.settings.animations} description={t.settings.animationsDescription}>
                    <Segmented label={t.settings.animations} value={settings.motion} options={motionOptions(t)} onChange={(v) => setSetting("motion", v)} />
                  </SettingRow>
                  <SettingRow label={t.settings.notificationDuration} description={t.settings.notificationDurationDescription}>
                    <Segmented label={t.settings.notificationDuration} value={settings.notificationDuration} options={notificationOptions(t)} onChange={(v) => setSetting("notificationDuration", v)} />
                  </SettingRow>
                </div>
              </>
            )}

            {section === "vault" && (
              <div className="flex flex-col">
                <span className={sectionLabel}>{t.settings.vault}</span>
                <SettingRow label={t.settings.rememberFilters} description={t.settings.rememberFiltersDescription}>
                  <DestinyCheckBox checked={settings.rememberVaultFilters} onClick={() => setSetting("rememberVaultFilters", !settings.rememberVaultFilters)} ariaLabel={t.settings.rememberFilters} />
                </SettingRow>
                <SettingRow label={t.settings.itemSize} description={t.settings.itemSizeDescription}>
                  <Segmented label={t.settings.itemSize} value={settings.vaultItemSize} options={vaultItemSizeOptions(t)} onChange={(v) => setSetting("vaultItemSize", v)} />
                </SettingRow>
              </div>
            )}

            {section === "debug" && (
              <div className="flex flex-col">
                <span className={sectionLabel}>{t.settings.debug}</span>
                <SettingRow label={t.settings.debugMode} description={t.settings.debugModeDescription}>
                  <DestinyCheckBox checked={debugMode} onClick={() => handleDebugModeChange(!debugMode)} ariaLabel={t.settings.debugMode} />
                </SettingRow>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="mr-auto px-4 py-2 text-sm text-red-400 rounded-md hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          {t.settings.logout}
        </button>
        <button
          type="button"
          onClick={handleReset}
          title={t.settings.resetTitle}
          className="px-4 py-2 text-sm text-gray-300 rounded-md hover:bg-white/10 transition-colors"
        >
          {t.common.reset}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-white rounded-md bg-[#7e57c2] hover:bg-[#8e67d2] transition-colors"
        >
          {t.common.done}
        </button>
      </footer>
    </div>,
    document.body
  );
};

export default SettingsModal;
