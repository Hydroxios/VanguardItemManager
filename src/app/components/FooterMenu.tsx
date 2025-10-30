"use client";

import { useRef, useState, useEffect } from 'react';
import DestinyIcon from './destiny-ui/DestinyIcon';

interface FooterMenuProps {
  vaultExotic: boolean;
  isVaultOpen: boolean;
  setIsVaultOpen: (isOpen: boolean) => void;
  changeCharacter: () => void;
  handleVaultDrop: (event: React.DragEvent) => void;
  handleDragOver: (event: React.DragEvent) => void;
}

const FooterMenu: React.FC<FooterMenuProps> = ({
  vaultExotic,
  isVaultOpen,
  setIsVaultOpen,
  changeCharacter,
  handleVaultDrop,
  handleDragOver,
}) => {
  const [isVimMenuOpen, setIsVimMenuOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<string>('en');
  const vimMenuRef = useRef<HTMLDivElement>(null);

  // Load current locale from localStorage
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale');
    if (savedLocale) {
      setCurrentLocale(savedLocale);
    }
  }, []);

  // Handle language change
  const handleLanguageChange = (locale: string) => {
    localStorage.setItem('locale', locale);
    setCurrentLocale(locale);
    setIsVimMenuOpen(false);
    window.location.reload();
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vimMenuRef.current && !vimMenuRef.current.contains(event.target as Node)) {
        setIsVimMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <footer
      className="fixed bottom-0 right-0 w-full flex flex-row items-center justify-between gap-2"
      style={{
        height: "35px",
        borderTop: "2px solid #1a1a1a",
        boxShadow: "0 -4px 8px rgba(0, 0, 0, 0.3)",
        zIndex: 40
      }}
    >
      <div className="relative" ref={vimMenuRef}>
        <button 
          className="flex flex-row items-center gap-2 ml-5"
          onClick={() => setIsVimMenuOpen(!isVimMenuOpen)}
        >
          <img src={"intellect.svg"} height={24} width={24} alt="Intellect icon" />
          <p className="text-gray-500">VIM v0.1</p>
        </button>
        
        {isVimMenuOpen && (
          <div 
            className="absolute bottom-9 left-0 w-56 z-50"
            style={{
              background: 'linear-gradient(to bottom, rgba(15, 15, 25, 0.98), rgba(25, 25, 35, 0.98))',
              borderTop: '1px solid #7e57c2',
              borderLeft: '1px solid #7e57c2',
              borderRight: '1px solid #7e57c2',
              boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="flex justify-between items-center border-b border-gray-700 bg-[rgba(30,30,40,0.5)] py-1">
              <div className="flex items-center gap-1 ml-3">
                <img src={"intellect.svg"} height={16} width={16} alt="Intellect icon" />
                <h2 className="text-base font-medium text-white">Language Settings</h2>
              </div>
              <button 
                className="text-gray-400 hover:text-white transition-colors mr-2"
                onClick={() => setIsVimMenuOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-2 bg-[rgba(20,20,30,0.8)]">
              <div 
                className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded mb-1 ${currentLocale === 'en' ? 'bg-[rgba(126,87,194,0.5)] text-white' : 'text-gray-200'}`}
                onClick={() => handleLanguageChange('en')}
              >
                <span className="mr-2">🇺🇸</span> English
              </div>
              <div 
                className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded mb-1 ${currentLocale === 'fr' ? 'bg-[rgba(126,87,194,0.5)] text-white' : 'text-gray-200'}`}
                onClick={() => handleLanguageChange('fr')}
              >
                <span className="mr-2">🇫🇷</span> Français
              </div>
              <div 
                className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded mb-1 ${currentLocale === 'es' ? 'bg-[rgba(126,87,194,0.5)] text-white' : 'text-gray-200'}`}
                onClick={() => handleLanguageChange('es')}
              >
                <span className="mr-2">🇪🇸</span> Español
              </div>
              <div 
                className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded mb-1 ${currentLocale === 'de' ? 'bg-[rgba(126,87,194,0.5)] text-white' : 'text-gray-200'}`}
                onClick={() => handleLanguageChange('de')}
              >
                <span className="mr-2">🇩🇪</span> Deutsch
              </div>
              <div 
                className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded mb-1 ${currentLocale === 'it' ? 'bg-[rgba(126,87,194,0.5)] text-white' : 'text-gray-200'}`}
                onClick={() => handleLanguageChange('it')}
              >
                <span className="mr-2">🇮🇹</span> Italiano
              </div>
              <div 
                className={`flex items-center px-3 py-2 cursor-pointer hover:bg-[rgba(126,87,194,0.3)] rounded ${currentLocale === 'ja' ? 'bg-[rgba(126,87,194,0.5)] text-white' : 'text-gray-200'}`}
                onClick={() => handleLanguageChange('ja')}
              >
                <span className="mr-2">🇯🇵</span> 日本語
              </div>
            </div>
          </div>
        )}
      </div>
      
      <button
        className="flex flex-row items-center gap-2"
        onDrop={handleVaultDrop}
        onDragOver={handleDragOver}
        onClick={() => setIsVaultOpen(!isVaultOpen)}
      >
        <img
          src={vaultExotic ? "./vault_exotic.svg" : "./vault.svg"}
          height={16}
          width={16}
          alt="Vault icon"
        />
        {isVaultOpen ? "Close Vault" : "Open Vault"}
      </button>
      <button
        className="flex flex-row items-center gap-2 mr-5"
        onClick={changeCharacter}
      >
        <DestinyIcon icon=''/>
        Change Character
      </button>
    </footer>
  );
};

export default FooterMenu; 