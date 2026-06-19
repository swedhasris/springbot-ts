import React, { useEffect, useRef } from"react";

export interface ContextMenuItem {
 label: string;
 onClick: () => void;
 icon?: React.ReactNode;
 disabled?: boolean;
}

interface ContextMenuProps {
 x: number;
 y: number;
 onClose: () => void;
 items: ContextMenuItem[];
}

export function ContextMenu({ x, y, onClose, items }: ContextMenuProps) {
 const menuRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 function handleClickOutside(event: MouseEvent) {
 if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
 onClose();
 }
 }
 // Listen to click outside
 document.addEventListener("mousedown", handleClickOutside);
 return () => {
 document.removeEventListener("mousedown", handleClickOutside);
 };
 }, [onClose]);

 // Adjust coordinates if menu would overflow viewport bounds
 const adjustedX = Math.min(x, window.innerWidth - 200);
 const adjustedY = Math.min(y, window.innerHeight - 250);

 return (
 <div
 ref={menuRef}
 onContextMenu={(e) => e.preventDefault()}
 style={{ top: adjustedY, left: adjustedX }}
 className="fixed z-[9999] min-w-[200px] bg-black/90 dark:bg-sn-sidebar/95 backdrop-blur-xl border border-white/5 dark:border-white/10 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 text-foreground animate-in fade-in zoom-in-95 duration-100"
 >
 {items.map((item, index) => (
 <button
 key={index}
 disabled={item.disabled}
 onClick={(e) => {
 e.stopPropagation();
 item.onClick();
 onClose();
 }}
 className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl text-left hover:bg-sn-green hover:text-sn-dark text-text-dim hover:text-sn-dark transition-all duration-200 disabled:opacity-40 disabled:hover:bg-transparent"
 >
 {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
 <span className="truncate">{item.label}</span>
 </button>
 ))}
 </div>
 );
}
