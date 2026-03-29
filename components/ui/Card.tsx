import React from 'react';

interface CardProps {
    children: React.ReactNode;
    title?: string;
    className?: string;
    footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, title, className, footer }) => {
    return (
        <div className={`bg-[var(--card-background)] shadow-lg dark:shadow-none dark:border border-[var(--border)] rounded-xl transition-shadow duration-300 hover:shadow-xl ${className}`}>
            {title && (
                <div className="px-6 py-5 border-b border-[var(--border)]">
                    <h3 className="text-xl leading-6 font-semibold text-[var(--card-foreground)]">{title}</h3>
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
            {footer && (
                <div className="px-6 py-4 bg-[var(--card-footer-background)] text-right border-t border-[var(--border)]">
                    {footer}
                </div>
            )}
        </div>
    );
};