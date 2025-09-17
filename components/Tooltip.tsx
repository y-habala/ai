
import React, { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  text: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, text }) => {
  return (
    <div className="group relative">
      {children}
      <span className="absolute bottom-full mb-2 hidden w-max max-w-xs scale-0 rounded bg-gray-800 p-2 text-xs text-white group-hover:block group-hover:scale-100 transition-transform origin-bottom z-10">
        {text}
      </span>
    </div>
  );
};
