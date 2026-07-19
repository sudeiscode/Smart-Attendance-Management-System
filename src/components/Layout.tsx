import React from 'react';
import { User } from '../types';
import { 
  LayoutDashboard, 
  BookOpen, 
  Clock, 
  Users, 
  GraduationCap, 
  Settings, 
  LogOut, 
  User as UserIcon, 
  Building2,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';

interface LayoutProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ user, activeTab, setActiveTab, onLogout, children }: LayoutProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Lecturer', 'Student'] },
    { id: 'attendance', label: 'Attendance', icon: Clock, roles: ['Admin', 'Lecturer', 'Student'] },
    { id: 'courses', label: 'Courses', icon: BookOpen, roles: ['Admin', 'Lecturer', 'Student'] },
    { id: 'sessions', label: 'Lecture Sessions', icon: CalendarDays, roles: ['Lecturer', 'Student'] },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet, roles: ['Admin', 'Lecturer'] },
    { id: 'users', label: 'User Provisioning', icon: Users, roles: ['Admin'] },
    { id: 'structures', label: 'Academic Structures', icon: Building2, roles: ['Admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Section */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
              AttendX
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Smart Portal
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-slate-800/50 bg-slate-950/20 flex items-center space-x-3">
          <div className="bg-slate-800 p-2 rounded-full text-indigo-400">
            <UserIcon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-100 truncate">{user.fullName}</p>
            <p className="text-[11px] text-indigo-400 font-semibold">{user.role}</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1">
          {filteredMenu.map(item => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon size={18} className={isSelected ? 'text-white' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top bar header */}
        <header className="bg-white h-16 border-b border-slate-200 px-6 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm shadow-slate-100/40">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
              Academic Term 2025/2026
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-400 block">Logged in as</span>
              <span className="text-sm font-medium text-slate-700">{user.email}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-sm">
              {user.fullName.charAt(0)}
            </div>
          </div>
        </header>

        {/* View Contents */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
