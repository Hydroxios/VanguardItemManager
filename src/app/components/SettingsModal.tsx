import React, { useState } from "react";
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
    <div className={`fixed inset-0 flex items-center justify-center z-[1010] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}>
      <div
        className={`relative flex flex-col items-center w-[30vw] min-h-[250px] rounded-2xl shadow-2xl shadow-purple-900/20 border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-md transition-all duration-300 ease-out
          ${open ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center w-full justify-between p-4 border-b border-white/5">
          <span className="text-xl text-white font-semibold pl-2">Settings</span>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10" title="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="w-full p-6 flex flex-col gap-6">
          {/* LANGUAGES SELECT */}
          <div className="w-full flex flex-col items-start gap-2">
            <label className="text-gray-400 text-sm font-medium ml-1">Language</label>
            <div className="relative w-full">
              <button
                type="button"
                className="w-full p-3 rounded-xl bg-black/20 text-white border border-white/10 hover:bg-white/5 transition-colors outline-none focus:ring-2 focus:ring-purple-500/50 flex items-center justify-between group"
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
              >
                <span className="flex items-center gap-3">
                  <span className={`fi fi-${LANGUAGES.find(l => l.code === selectedLocale)?.icon} rounded-sm shadow-sm`}></span>
                  <span className="text-gray-200 group-hover:text-white transition-colors">{LANGUAGES.find(l => l.code === selectedLocale)?.label}</span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-500 transition-transform duration-200 ${isLanguageOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {isLanguageOpen && (
                <div className="absolute mt-2 left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20 max-h-60 overflow-auto custom-scrollbar">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors ${selectedLocale === lang.code ? 'bg-purple-500/10 text-purple-300' : 'text-gray-300'}`}
                      onClick={() => {
                        setIsLanguageOpen(false);
                        handleLanguageChange(lang.code);
                      }}
                    >
                      <span className={`fi fi-${lang.icon} rounded-sm`}></span>
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TOGGLES */}
          <div className="w-full flex flex-col items-start gap-2">
            <label className="text-gray-400 text-sm font-medium ml-1">Debug</label>
            <div className="w-full flex flex-col items-start gap-4 p-4 rounded-xl bg-black/20 border border-white/5">
              <DestinyCheckBox checked={debugMode} onClick={() => handleDebugModeChange(!debugMode)} label="Debug Mode" />
              <DestinyCheckBox checked={keepOpen} onClick={() => setKeepOpen(!keepOpen)} label="Keep Tooltip Open" />
            </div>
          </div>

          <div className="w-full flex flex-row justify-between pt-2">
            <button
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 font-medium px-4 py-2 rounded-lg transition-all duration-200 focus:outline-none"
              onClick={handleLogout}
            >
              Logout
            </button>
            <button
              className="text-gray-400 hover:text-white hover:bg-white/10 font-medium px-4 py-2 rounded-lg transition-all duration-200 focus:outline-none"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
