"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

export default function Modal({ open, onClose, title, children, footer, wide }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-bark/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] w-full animate-in fade-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300 ${
          wide ? "max-w-4xl" : "max-w-xl"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b border-[var(--border)] sticky top-0 bg-white rounded-t-3xl sm:rounded-2xl z-10">
          <h3 className="font-sora font-bold text-lg sm:text-xl text-ink leading-tight pr-4">{title}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-sand hover:bg-[var(--border)] flex items-center justify-center text-[var(--ink-lt)] transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 sm:px-8 py-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 sm:px-8 py-5 border-t border-[var(--border)] flex flex-col sm:flex-row justify-end gap-3 bg-sand/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
