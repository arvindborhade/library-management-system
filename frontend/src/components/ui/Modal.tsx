"use client";

import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
  onClose?: () => void;
};

export default function Modal({ open, title, children, maxWidth = "max-w-md", onClose }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-8">
      <div className={`relative w-full ${maxWidth} mx-auto rounded-xl bg-white p-6 shadow-xl`}>
        {(title || onClose) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close dialog"
              >
                Close
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
