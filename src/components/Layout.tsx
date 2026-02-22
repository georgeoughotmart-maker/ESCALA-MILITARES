import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar as CalendarIcon, List, Settings as SettingsIcon, LogOut, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  onAddService: () => void;
}

export default function Layout({ children, user, onLogout, onAddService }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: CalendarIcon, label: 'Calendário', path: '/calendar' },
    { icon: List, label: 'Serviços', path: '/services' },
    { icon: SettingsIcon, label: 'Configurações', path: '/settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-[#171717] border-b border-[#262626] p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {user?.coat_of_arms && (
            <img src={user.coat_of_arms} alt="Brasão" className="w-8 h-8 object-contain" />
          )}
          <h1 className="text-xl font-bold text-blue-500">Escala Pro</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onAddService}
            className="bg-blue-600 p-2 rounded-full text-white shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-64 bg-[#171717] border-t md:border-t-0 md:border-r border-[#262626] z-50">
        <div className="hidden md:flex flex-col p-6 h-full">
          <div className="flex items-center gap-3 mb-8">
            {user?.coat_of_arms && (
              <img src={user.coat_of_arms} alt="Brasão" className="w-10 h-10 object-contain" />
            )}
            <h1 className="text-2xl font-bold text-blue-500">Escala Pro</h1>
          </div>
          
          <div className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  location.pathname === item.path 
                    ? 'bg-blue-600/10 text-blue-500' 
                    : 'text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="pt-6 border-t border-[#262626]">
            <div className="flex items-center gap-3 mb-4 px-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden flex justify-around items-center p-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                location.pathname === item.path ? 'text-blue-500' : 'text-neutral-500'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Desktop Floating Action Button */}
      <button 
        onClick={onAddService}
        className="hidden md:flex fixed bottom-8 right-8 bg-blue-600 w-14 h-14 rounded-full text-white shadow-xl items-center justify-center hover:bg-blue-500 active:scale-95 transition-all z-40"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
