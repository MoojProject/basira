import React, { useEffect, useState, useRef } from 'react';
import { MenuIcon, XIcon, FileTextIcon } from 'lucide-react';
import { BasiraLogo } from './BasiraLogo';

type ViewState =
  | 'landing'
  | 'upload'
  | 'analyzing'
  | 'results'
  | 'general-chat';

interface User {
  name: string;
  email: string;
}

interface HeaderProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenDraft?: () => void;
}

export function Header({
  currentView,
  onNavigate,
  user,
  onOpenAuth,
  onLogout,
  onOpenDraft,
}: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const navLabels = {
    home:          'الرئيسية',
    upload:        'ارفع عقدك',
    ask:           'اسأل سؤال',
    createAccount: 'أنشئ حسابك',
    logout:        'تسجيل الخروج',
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-eclipse/80 backdrop-blur-md border-b border-eclipse-3 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16" dir="rtl">

          {/* Right side */}
          <div className="flex items-center gap-6">
            <div
              className="cursor-pointer group shrink-0 text-cream hover:text-matcha-light transition-colors"
              onClick={() => onNavigate('landing')}
            >
              <BasiraLogo size="sm" />
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <button
                onClick={() => onNavigate('landing')}
                className={`text-sm font-medium transition-colors hover:text-cream py-1 ${
                  currentView === 'landing' ? 'text-cream border-b-2 border-matcha' : 'text-cream-dim'
                }`}
              >
                {navLabels.home}
              </button>

              <button
                onClick={() => onNavigate('upload')}
                className={`text-sm font-medium transition-colors hover:text-cream py-1 ${
                  ['upload', 'analyzing', 'results'].includes(currentView)
                    ? 'text-cream border-b-2 border-matcha'
                    : 'text-cream-dim'
                }`}
              >
                {navLabels.upload}
              </button>

              <button
                onClick={() => onNavigate('general-chat')}
                className={`text-sm font-medium transition-colors hover:text-cream py-1 ${
                  currentView === 'general-chat' ? 'text-cream border-b-2 border-matcha' : 'text-cream-dim'
                }`}
              >
                {navLabels.ask}
              </button>

              {onOpenDraft && (
                <button
                  onClick={onOpenDraft}
                  className="flex items-center gap-1.5 text-sm font-medium text-cream-dim hover:text-matcha transition-colors py-1"
                >
                  <FileTextIcon className="w-3.5 h-3.5" />
                  أنشئ عقدًا
                </button>
              )}
            </nav>
          </div>

          {/* Left side */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-cream-dim hidden sm:block">{user.name}</span>
                  <div
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-9 h-9 rounded-full bg-matcha text-eclipse font-bold flex items-center justify-center cursor-pointer hover:bg-matcha-light transition-colors"
                  >
                    {user.name.charAt(0)}
                  </div>
                </div>

                {showDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-eclipse-2 border border-eclipse-3 rounded-xl shadow-lg p-2 min-w-[160px]">
                    <button
                      onClick={() => { onLogout(); setShowDropdown(false); }}
                      className="w-full text-right text-sm text-red-400 hover:bg-red-400/10 rounded-lg px-3 py-2 transition-colors"
                    >
                      {navLabels.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="border border-matcha text-matcha hover:bg-matcha hover:text-eclipse px-4 py-2 rounded-lg text-sm transition-all font-semibold hidden md:block"
              >
                {navLabels.createAccount}
              </button>
            )}

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-cream-dim hover:text-cream transition-colors"
            >
              {showMobileMenu ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-eclipse-2 border-b border-eclipse-3 px-6 py-4 space-y-1" dir="rtl">
          <button
            onClick={() => { onNavigate('landing'); setShowMobileMenu(false); }}
            className={`block w-full text-right py-3 text-sm font-medium border-b border-eclipse-3/50 ${
              currentView === 'landing' ? 'text-cream' : 'text-cream-dim'
            }`}
          >
            {navLabels.home}
          </button>

          <button
            onClick={() => { onNavigate('upload'); setShowMobileMenu(false); }}
            className={`block w-full text-right py-3 text-sm font-medium border-b border-eclipse-3/50 ${
              ['upload', 'analyzing', 'results'].includes(currentView) ? 'text-cream' : 'text-cream-dim'
            }`}
          >
            {navLabels.upload}
          </button>

          <button
            onClick={() => { onNavigate('general-chat'); setShowMobileMenu(false); }}
            className={`block w-full text-right py-3 text-sm font-medium border-b border-eclipse-3/50 ${
              currentView === 'general-chat' ? 'text-cream' : 'text-cream-dim'
            }`}
          >
            {navLabels.ask}
          </button>

          <div className="pt-3">
            {user ? (
              <button
                onClick={() => { onLogout(); setShowMobileMenu(false); }}
                className="block w-full text-right py-2 text-sm text-red-400"
              >
                {navLabels.logout} ({user.name})
              </button>
            ) : (
              <button
                onClick={() => { onOpenAuth(); setShowMobileMenu(false); }}
                className="block w-full text-right py-2 text-sm font-semibold text-matcha"
              >
                {navLabels.createAccount}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}