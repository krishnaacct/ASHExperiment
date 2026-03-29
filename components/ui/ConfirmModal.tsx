import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    // FIX: Allow async functions for the onConfirm handler by changing the return type.
    onConfirm: () => Promise<void> | void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false
}) => {

    const renderFooter = () => (
        <div className="flex justify-end space-x-2">
            <Button
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
            >
                {cancelText}
            </Button>
            <Button
                variant="danger"
                onClick={onConfirm}
                isLoading={isLoading}
            >
                {confirmText}
            </Button>
        </div>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title}
            footer={renderFooter()}
        >
            <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-[var(--toast-error-background)] sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-[var(--toast-error-foreground)]" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                     <p className="text-sm text-[var(--foreground-muted)] mt-2">{message}</p>
                </div>
            </div>
        </Modal>
    );
};
