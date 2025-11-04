import React, { useState } from "react";
import Switch from "./inputs/Switch";
import DestinyCheckBox from "./destiny-ui/DestinyCheckbox";

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

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, debugMode, handleDebugModeChange, keepOpen, setKeepOpen }) => {
  if (!open) return null;

  // Read from storage at render time
  const systemLocale = (typeof window !== 'undefined' && localStorage.getItem("locale")) || "en";
  const [selectedLocale, setSelectedLocale] = useState(systemLocale);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rtoken");
    localStorage.removeItem("lastUpdate");
    window.location.reload();
  };

  const handleLanguageChange = (locale: string) => {
    setSelectedLocale(locale);
    localStorage.setItem("locale", locale);
    setTimeout(() => {
      window.location.reload();
    }, 120); // delay for smoother UI
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[1010] bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="relative flex flex-col items-center p-5 rounded-lg shadow-xl transition-all duration-300 ease-in-out w-[30vw] bg-black bg-opacity-80 border border-purple-700 backdrop-blur-lg"
        style={{ minHeight: "250px" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center w-full justify-between mb-6">
          <span className="text-xl text-white font-semibold">Settings</span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors" title="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>
        {/* LANGUAGES SELECT (custom dropdown to allow flag icons) */}
        <div className="w-full flex flex-col items-start gap-2 mb-8">
          <label className="text-white text-sm font-semibold mb-1">Language</label>
          <div className="relative w-full">
            <button
              type="button"
              className="w-full p-2 rounded bg-zinc-900 text-white border border-purple-700 outline-none focus:ring-2 focus:ring-purple-800 flex items-center justify-between"
              onClick={() => setIsLanguageOpen(!isLanguageOpen)}
            >
              <span className="flex items-center gap-2">
                <span className={`fi fi-${LANGUAGES.find(l => l.code === selectedLocale)?.icon}`}></span>
                {LANGUAGES.find(l => l.code === selectedLocale)?.label}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {isLanguageOpen && (
              <div className="absolute mt-1 left-0 right-0 bg-[rgba(20,20,30,0.95)] border border-purple-700 rounded shadow-lg z-20 max-h-60 overflow-auto">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[rgba(126,87,194,0.3)] ${selectedLocale === lang.code ? 'bg-[rgba(126,87,194,0.5)] text-white' : 'text-gray-200'}`}
                    onClick={() => {
                      setIsLanguageOpen(false);
                      handleLanguageChange(lang.code);
                    }}
                  >
                    <span className={`fi fi-${lang.icon}`}></span>
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* TOGGLES */}
        <div className="w-full flex flex-col items-start gap-5 mb-8">
          <DestinyCheckBox checked={debugMode} onClick={() => handleDebugModeChange(!debugMode)} label="Debug Mode" />
          <DestinyCheckBox checked={keepOpen} onClick={() => setKeepOpen(!keepOpen)} label="Keep Tooltip Open" />
        </div>
        <div className="w-full flex flex-row justify-between">
          <button
            className="bg-red-900 hover:bg-red-600/80 text-white font-bold p-2 rounded-sm transition-colors focus:outline-none mt-2"
            onClick={handleLogout}
          >
            Logout
          </button>
          <button
            className="bg-gray-600 hover:bg-gray-400/10 text-white font-bold p-2 rounded-sm transition-colors focus:outline-none mt-2"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
