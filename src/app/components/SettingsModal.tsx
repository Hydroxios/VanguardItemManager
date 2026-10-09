import React, { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DestinyCheckBox from "./destiny-ui/DestinyCheckbox";
import { DEFAULT_SETTINGS, Settings, updateSettings, useSettings } from "@/lib/hooks/useSettings";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  debugMode: boolean;
  handleDebugModeChange: (b: boolean) => void;
  keepOpen: boolean;
  setKeepOpen: (b: boolean) => void;
}

const LANGUAGES = [
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

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "interface", label: "Interface" },
  { id: "vault", label: "Vault" },
  { id: "debug", label: "Debug" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

const REFRESH_OPTIONS: { value: Settings["refreshInterval"]; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 1, label: "1 min" },
  { value: 3, label: "3 min" },
  { value: 5, label: "5 min" },
];

const TOOLTIP_SPEED_OPTIONS: { value: Settings["tooltipSpeed"]; label: string }[] = [
  { value: "fast", label: "Fast" },
  { value: "normal", label: "Normal" },
  { value: "slow", label: "Slow" },
];

const MOTION_OPTIONS: { value: Settings["motion"]; label: string }[] = [
  { value: "system", label: "System" },
  { value: "full", label: "On" },
  { value: "reduced", label: "Reduced" },
];

const NOTIFICATION_OPTIONS: { value: Settings["notificationDuration"]; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "normal", label: "Normal" },
  { value: "long", label: "Long" },
];

const VAULT_ITEM_SIZE_OPTIONS: { value: Settings["vaultItemSize"]; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
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
  const [selectedLocale, setSelectedLocale] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem("locale")) || "en";
  });
  const [section, setSection] = useState<SectionId>("general");
  const { settings, setSetting } = useSettings();

  // Escape closes the settings. Keys stop here, before the page's shortcuts on window (Escape leaving the
  // character, "z" opening the vault, "s" the search) act behind the modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") onClose();
    };
    const handleKeyUp = (e: KeyboardEvent) => e.stopPropagation();
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Unknown stored locales fall back to English
  const currentLanguage = LANGUAGES.find(l => l.code === selectedLocale) ?? LANGUAGES[0];

  const handleLogout = async () => {
    await fetch("/api/token", { method: "DELETE" }).catch(() => undefined);
    window.location.reload();
  };

  const handleLanguageChange = (locale: string) => {
    // Definitions are loaded per locale, so only reload when it actually changes
    if (locale === currentLanguage.code) return;
    setSelectedLocale(locale);
    localStorage.setItem("locale", locale);
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
            <h2 id="settings-title" className="text-xl text-white font-semibold truncate">Settings</h2>
            <span className="text-sm text-gray-500 truncate">Saved on this browser</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10"
          title="Close (Esc)"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
        </button>
      </header>

      {/* Body: sections on the left (on top on small screens), their settings on the right */}
      <div className="flex-1 min-h-0 grid grid-cols-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[220px_1fr]">
        <nav className="flex lg:flex-col gap-1 p-4 lg:p-6 overflow-x-auto border-b lg:border-b-0 lg:border-r border-white/10" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-current={s.id === section ? "page" : undefined}
              className={`shrink-0 px-3 py-2 text-sm text-left rounded-md transition-colors ${s.id === section ? "bg-[#7e57c2] text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-3xl flex flex-col gap-8">
            {section === "general" && (
              <>
                <div className="flex flex-col gap-3">
                  <span className={sectionLabel}>Language</span>
                  <span className="text-sm text-gray-500">Item names and descriptions. Changing it reloads the page.</span>
                  <div role="radiogroup" aria-label="Language" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                  <span className={sectionLabel}>Profile</span>
                  <SettingRow label="Automatic refresh" description="How often your inventory is synced with the game.">
                    <Segmented label="Automatic refresh" value={settings.refreshInterval} options={REFRESH_OPTIONS} onChange={(v) => setSetting("refreshInterval", v)} />
                  </SettingRow>
                </div>
              </>
            )}

            {section === "interface" && (
              <>
                <div className="flex flex-col">
                  <span className={sectionLabel}>Tooltips</span>
                  <SettingRow label="Opening speed" description="How quickly an item's tooltip opens when the mouse rests on it.">
                    <Segmented label="Opening speed" value={settings.tooltipSpeed} options={TOOLTIP_SPEED_OPTIONS} onChange={(v) => setSetting("tooltipSpeed", v)} />
                  </SettingRow>
                  <SettingRow label="Keep tooltip open" description="Tooltips stay open after the mouse leaves the item.">
                    <DestinyCheckBox checked={keepOpen} onClick={() => setKeepOpen(!keepOpen)} ariaLabel="Keep tooltip open" />
                  </SettingRow>
                </div>

                <div className="flex flex-col">
                  <span className={sectionLabel}>Display</span>
                  <SettingRow label="Animations" description="System follows your device's reduced motion setting.">
                    <Segmented label="Animations" value={settings.motion} options={MOTION_OPTIONS} onChange={(v) => setSetting("motion", v)} />
                  </SettingRow>
                  <SettingRow label="Notification duration" description="How long notifications stay on screen.">
                    <Segmented label="Notification duration" value={settings.notificationDuration} options={NOTIFICATION_OPTIONS} onChange={(v) => setSetting("notificationDuration", v)} />
                  </SettingRow>
                </div>
              </>
            )}

            {section === "vault" && (
              <div className="flex flex-col">
                <span className={sectionLabel}>Vault</span>
                <SettingRow label="Remember filters" description="The vault reopens on the tab and filters you left, even after a reload.">
                  <DestinyCheckBox checked={settings.rememberVaultFilters} onClick={() => setSetting("rememberVaultFilters", !settings.rememberVaultFilters)} ariaLabel="Remember filters" />
                </SettingRow>
                <SettingRow label="Item size" description="Size of the items in the vault grid.">
                  <Segmented label="Item size" value={settings.vaultItemSize} options={VAULT_ITEM_SIZE_OPTIONS} onChange={(v) => setSetting("vaultItemSize", v)} />
                </SettingRow>
              </div>
            )}

            {section === "debug" && (
              <div className="flex flex-col">
                <span className={sectionLabel}>Debug</span>
                <SettingRow label="Debug mode" description="Shows the raw API data of items in their tooltip.">
                  <DestinyCheckBox checked={debugMode} onClick={() => handleDebugModeChange(!debugMode)} ariaLabel="Debug mode" />
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
          Logout
        </button>
        <button
          type="button"
          onClick={handleReset}
          title="Back to the default settings (the language stays)"
          className="px-4 py-2 text-sm text-gray-300 rounded-md hover:bg-white/10 transition-colors"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-white rounded-md bg-[#7e57c2] hover:bg-[#8e67d2] transition-colors"
        >
          Done
        </button>
      </footer>
    </div>,
    document.body
  );
};

export default SettingsModal;
