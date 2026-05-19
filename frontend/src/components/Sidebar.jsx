import React, { useState } from 'react';
import { GraduationCap, PanelLeftClose, PanelLeft } from 'lucide-react';

const Sidebar = ({ items = [], activeId, onSelect, collapsed, onToggle, brandLabel = 'MONITORES' }) => {
  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen z-50 flex flex-col
          bg-sidebar-bg border-r border-sidebar-border
          transition-all duration-200 ease-out
          max-lg:w-[260px] max-lg:${collapsed ? '-translate-x-full' : 'translate-x-0'}
          lg:${collapsed ? 'w-[68px]' : 'w-[250px]'}
          lg:translate-x-0 lg:relative
        `}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-2.5 px-4 border-b border-sidebar-border shrink-0">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shrink-0 shadow-sm">
            <GraduationCap size={20} />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-black tracking-tight text-th-card-foreground whitespace-nowrap overflow-hidden">
              MONI<span className="text-primary">TORES</span>
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {items.map((item) => {
            const isActive = activeId === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                title={collapsed ? item.label : undefined}
                className={`
                  w-full flex items-center gap-3 rounded-xl transition-all duration-200
                  ${collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'}
                  ${isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground hover:bg-muted hover:text-th-card-foreground'
                  }
                `}
              >
                <Icon size={collapsed ? 20 : 18} className="shrink-0" />
                {!collapsed && (
                  <span className="text-[13px] font-semibold truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden lg:flex items-center justify-center py-3 px-2 border-t border-sidebar-border shrink-0">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg text-sidebar-foreground hover:bg-muted hover:text-th-card-foreground transition-all"
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
