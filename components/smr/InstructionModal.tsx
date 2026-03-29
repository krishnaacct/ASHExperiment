import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Info, AlertTriangle } from 'lucide-react';

interface InstructionModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    type: 'info' | 'warning';
    children: React.ReactNode;
}

export const InstructionModal: React.FC<InstructionModalProps> = ({
    isOpen,
    onClose,
    title,
    type,
    children,
}) => {
    const renderFooter = () => (
        <div className="flex justify-end">
            <Button onClick={onClose}>I Understand</Button>
        </div>
    );

    const Icon = type === 'info' 
        ? <Info className="h-6 w-6 text-[var(--toast-info-foreground)]" /> 
        : <AlertTriangle className="h-6 w-6 text-[var(--toast-warning-foreground)]" />;
    
    const iconBg = type === 'info' ? 'bg-[var(--toast-info-background)]' : 'bg-[var(--toast-warning-background)]';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} footer={renderFooter()}>
            <div className="sm:flex sm:items-start">
                <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
                    {Icon}
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <div className="text-sm text-[var(--foreground-muted)] mt-2 space-y-3">
                        {children}
                    </div>
                </div>
            </div>
        </Modal>
    );
};