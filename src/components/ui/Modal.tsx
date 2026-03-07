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
      className="fixed inset-0 z-50 flex items-center justify-center bg-bark/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-full animate-in fade-in slide-in-from-bottom-4 duration-200 ${
          wide ? "max-w-3xl" : "max-w-xl"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border)]">
          <h3 className="font-sora font-bold text-xl text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sand hover:bg-[var(--border)] flex items-center justify-center text-[var(--ink-lt)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-8 py-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-8 py-5 border-t border-[var(--border)] flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
