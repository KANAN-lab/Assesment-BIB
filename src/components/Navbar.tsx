import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Flame, Coins, UserCheck, LayoutDashboard, LogOut, Settings, Zap, ChevronDown, Check, Camera, Lock, BookOpen, HelpCircle } from 'lucide-react';
import { WorkerProfile } from '../types/assessment';
import { RoleEntity } from '../domain/RoleEntity';
import { WorkerAvatar } from './WorkerAvatar';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  currentWorker: WorkerProfile;
  activeView: 'worker' | 'supervisor' | 'admin';
  setActiveView: (view: 'worker' | 'supervisor' | 'admin') => void;
  onOpenDailyQuiz: () => void;
  onOpenProfilePicModal: () => void;
  onOpenSopLibrary?: () => void;
  onOpenOnboarding?: () => void;
  onLogout?: () => void;
}

const ROLE_MODES = [
  {
    key: 'worker',
    label: 'Operational Employee (Worker)',
    shortLabel: 'Operational',
    icon: UserCheck,
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    desc: 'Kinerja, Quest Harian & Rewards',
  },
  {
    key: 'supervisor',
    label: 'Supervisor (Pengawas)',
    shortLabel: 'Supervisor',
    icon: LayoutDashboard,
    badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    desc: 'Audit Matriks & Monitoring Tim',
  },
  {
    key: 'admin',
    label: 'Administrator (System)',
    shortLabel: 'Admin',
    icon: Settings,
    badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    desc: 'Kelola Divisi, Role & Matrix',
  },
] as const;

export const Navbar: React.FC<NavbarProps> = ({
  currentWorker,
  activeView,
  setActiveView,
  onOpenDailyQuiz,
  onOpenProfilePicModal,
  onOpenSopLibrary,
  onOpenOnboarding,
  onLogout,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userSystemRole = RoleEntity.resolveSystemRole(currentWorker.role);

  // Filter allowed mode keys based on actual user role
  const isModeAllowed = (modeKey: 'worker' | 'supervisor' | 'admin') => {
    if (userSystemRole === 'admin') return true;
    if (userSystemRole === 'supervisor') return modeKey === 'worker' || modeKey === 'supervisor';
    return modeKey === 'worker';
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeMode = ROLE_MODES.find((m) => m.key === activeView) || ROLE_MODES[0];
  const ActiveIcon = activeMode.icon;

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">

          {/* Logo & Dynamic Mode Subtitle */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="https://raw.githubusercontent.com/KANAN-lab/WFG-DAM/refs/heads/main/DAM%20LOGO.ico"
              alt="Gappy Assessment Logo"
              className="w-8 h-8 rounded-lg object-contain bg-zinc-900 border border-zinc-800 p-0.5"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-white tracking-tight">Gappy Assessment</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${(activeMode as any).badgeBg}`}>
                  {(activeMode as any).shortLabel || activeMode.label.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Live stats & SOP (Worker mode only) */}
          {activeView === 'worker' && (
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-zinc-400">Streak</span>
                <span className="font-bold text-amber-300 ml-0.5">{currentWorker.streakDays}d</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs">
                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-zinc-400">Poin</span>
                <span className="font-bold text-emerald-300 ml-0.5">{currentWorker.totalPoints.toLocaleString()}</span>
              </div>
              {onOpenOnboarding && (
                <button
                  onClick={onOpenOnboarding}
                  className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-zinc-200 transition"
                  title="Panduan Penggunaan Aplikasi"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              )}
            </div>
          )}

          {/* Right: Demo Role Mode Switcher + Notifications + Profile */}
          <div className="flex items-center gap-2">
            
            {/* OOP Notification Bell */}
            <NotificationBell
              currentUserId={currentWorker?.id}
              currentEmployeeId={currentWorker?.employeeId}
              currentRole={activeView}
            />

            {/* Demo Role Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition"
              >
                <span className="text-zinc-500 hidden md:inline">Akses:</span>
                <ActiveIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-white">{(activeMode as any).shortLabel || activeMode.label.split(' ')[0]}</span>
                {userSystemRole !== 'worker' && (
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/80 mb-1 flex items-center justify-between">
                    <span>Menu Peran Otorisasi</span>
                    <span className="text-emerald-400 font-mono">{userSystemRole.toUpperCase()}</span>
                  </div>
                  {ROLE_MODES.map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = activeView === mode.key;
                    const allowed = isModeAllowed(mode.key);

                    return (
                      <button
                        key={mode.key}
                        disabled={!allowed}
                        onClick={() => {
                          if (allowed) {
                            setActiveView(mode.key);
                            setDropdownOpen(false);
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition flex items-start gap-2.5 ${
                          !allowed
                            ? 'opacity-40 cursor-not-allowed bg-zinc-950'
                            : isSelected
                            ? 'bg-emerald-600/15 border border-emerald-500/30 text-white'
                            : 'hover:bg-zinc-800/70 text-zinc-300 border border-transparent'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${mode.badgeBg}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{mode.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            {!allowed && <Lock className="w-3 h-3 text-zinc-600 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {allowed ? mode.desc : 'Tidak memiliki akses otorisasi'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Profile Avatar & Edit trigger */}
            <div className="flex items-center gap-2 border-l border-zinc-800 pl-2">
              <div className="relative group cursor-pointer" onClick={onOpenProfilePicModal} title="Klik untuk ganti foto profil">
                <WorkerAvatar
                  src={currentWorker.avatar}
                  name={currentWorker.name}
                  className="w-8 h-8 rounded-lg ring-1 ring-zinc-700 group-hover:ring-emerald-500 transition"
                />
                <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              <div className="hidden xl:block">
                <div className="text-xs font-bold text-white leading-tight">{currentWorker.name}</div>
                <div className="text-[10px] text-zinc-500 leading-tight">{currentWorker.role}</div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Keluar Sesi"
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
