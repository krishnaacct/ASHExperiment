import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  enabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, text, enabled = true }) => {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full mb-2 w-max max-w-xs px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none dark:bg-gray-700 z-10">
        <div dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br />') }} />
        <div className="tooltip-arrow" data-popper-arrow></div>
      </div>
    </div>
  );
};