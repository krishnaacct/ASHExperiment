import React, { Fragment } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode; // New optional footer prop
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[var(--modal-overlay-background)] h-full w-full z-50 flex items-center justify-center p-4" id="my-modal">
            {/* The white modal panel itself. It's a flex column and has a max-height to prevent overflow. */}
            <div className="relative mx-auto w-full max-w-md shadow-lg rounded-2xl bg-[var(--popover-background)] flex flex-col max-h-[calc(100vh-4rem)]">
                {/* Header - not scrollable */}
                <div className="flex justify-between items-center p-6 pb-3 border-b border-[var(--border)] flex-shrink-0">
                    <p className="text-xl font-bold text-[var(--popover-foreground)]">{title}</p>
                    <button onClick={onClose} className="cursor-pointer z-50 p-2 -mr-2 rounded-full hover:bg-[var(--list-item-hover-background)] transition-colors">
                        <svg className="w-6 h-6 text-[var(--foreground-muted)] hover:text-[var(--foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                {/* Content Area - THIS is what scrolls */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
                {/* Footer - not scrollable */}
                {footer && (
                    <div className="flex-shrink-0 p-4 border-t border-[var(--border)] bg-[var(--card-footer-background)] rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
