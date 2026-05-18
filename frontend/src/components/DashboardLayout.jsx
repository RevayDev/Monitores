import React, { useState, useEffect } from 'react';
import { Bell, Menu, ChevronRight } from 'lucide-react';
import Sidebar from './Sidebar';
import UserAvatar from './UserAvatar';
import { useTheme } from '../context/ThemeContext';

const DashboardLayout = ({
  children,
  sidebarItems = [],
  activeItem,
  onItemChange,
  title = 'Dashboard',
  subtitle = '',
  user = null,
  headerActions = null,
}) => {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  // Mobile: start collapsed
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const sidebarCollapsed = isMobile ? true : collapsed;
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const handleItemSelect = (id) => {
    onItemChange?.(id);
    if (isMobile) setMobileOpen(false);
  };

  // Find active label for breadcrumb
  const activeLabel = sidebarItems.find(i => i.id === activeItem)?.label || '';

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-th-background">
      {/* Sidebar */}
      <Sidebar
        items={sidebarItems}
        activeId={activeItem}
        onSelect={handleItemSelect}
        collapsed={isMobile ? !mobileOpen : collapsed}
        onToggle={handleSidebarToggle}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 shrink-0 flex items-center justify-between px-4 lg:px-6 bg-th-card border-b-2 border-primary">
          <div className="flex items-center gap-3">
            {/* Mobile menu btn */}
            <button
              onClick={handleSidebarToggle}
              className="lg:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-th-card-foreground">{title}</span>
              {activeLabel && (
                <>
                  <ChevronRight size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">{activeLabel}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {headerActions}
            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-th-border">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-th-card-foreground leading-none">{user.nombre || 'Usuario'}</p>
                  <p className="text-[10px] font-medium text-primary leading-none mt-1 uppercase tracking-wide">{user.role}</p>
                </div>
                <UserAvatar user={user} size="sm" />
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
