
import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: React.ReactNode;
    readOnly?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, id, checked, disabled, onChange, readOnly, ...props }) => {
    
    // ARCHITECTURAL FIX: When readOnly, render a purely presentational div.
    if (readOnly) {
        return (
            <div className={`flex items-start space-x-3 cursor-default`}>
                 <div className="relative flex items-center flex-shrink-0 mt-0.5">
                    <div className={`
                        w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center
                        ${ disabled ? 'bg-[var(--input-disabled-background)] border-[var(--input-disabled-border)]' : (checked ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' : 'bg-[var(--card-background)] border-[var(--border)]') }
                    `}>
                        {checked && <Check className={`w-4 h-4 ${disabled ? 'text-[var(--input-disabled-foreground)]' : 'text-white'}`} />}
                    </div>
                 </div>
                 {label && <div className="select-none text-[var(--foreground)]">{label}</div>}
            </div>
        );
    }

    return (
        <label htmlFor={id} className={`flex items-start space-x-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <div className="relative flex items-center flex-shrink-0 mt-0.5">
                {/* 
                   FIX: Using 'hidden' ensures the native checkbox is removed from the layout flow entirely.
                   We rely on the label triggering the click event for the hidden input.
                */}
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={onChange}
                    className="hidden" 
                    {...props}
                />
                <div className={`
                    w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center
                    ${ disabled ? (checked ? 'bg-[var(--input-disabled-background)] border-[var(--input-disabled-border)]' : 'bg-[var(--input-disabled-background)] border-[var(--input-disabled-border)]') : (checked ? 'bg-[var(--primary-color)] border-[var(--primary-color)]' : 'bg-[var(--card-background)] border-[var(--border)] hover:border-[var(--primary-color)]') }
                `}>
                    {checked && <Check className={`w-4 h-4 ${disabled ? 'text-[var(--input-disabled-foreground)]' : 'text-white'}`} />}
                </div>
            </div>
            {label && <div className={`select-none ${disabled ? 'text-[var(--input-disabled-foreground)]' : 'text-[var(--foreground)]'}`}>{label}</div>}
        </label>
    );
};
