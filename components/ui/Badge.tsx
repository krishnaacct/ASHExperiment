import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    className?: string;
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
}

export const Badge: React.FC<BadgeProps> = ({ children, className, variant = 'secondary', ...props }) => {
    const baseClasses = 'inline-flex items-center px-3 py-1 text-xs font-bold leading-5 rounded-full';

    const variantClasses = {
        primary: 'bg-[var(--badge-primary-background)] text-[var(--badge-primary-foreground)]',
        secondary: 'bg-[var(--list-item-hover-background)] text-[var(--foreground-muted)]',
        success: 'bg-[var(--badge-success-background)] text-[var(--badge-success-foreground)]',
        danger: 'bg-[var(--badge-danger-background)] text-[var(--badge-danger-foreground)]',
        warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    };

    return (
        <span className={`${baseClasses} ${variantClasses[variant]} ${className || ''}`} {...props}>
            {children}
        </span>
    );
};