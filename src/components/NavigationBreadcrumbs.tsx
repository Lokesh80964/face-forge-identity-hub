
import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface NavigationBreadcrumbsProps {
  currentTab: string;
}

const NavigationBreadcrumbs = ({ currentTab }: NavigationBreadcrumbsProps) => {
  const getTabDisplayName = (tab: string) => {
    switch (tab) {
      case 'registration':
        return 'Face Registration';
      case 'recognition':
        return 'Live Recognition';
      case 'chat':
        return 'AI Assistant';
      default:
        return tab;
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm text-slate-400 mb-6">
      <Home className="w-4 h-4" />
      <ChevronRight className="w-4 h-4" />
      <span className="text-slate-300 font-medium">{getTabDisplayName(currentTab)}</span>
    </div>
  );
};

export default NavigationBreadcrumbs;
