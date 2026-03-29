
import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Bold, Italic, Underline, Strikethrough, Code, Link, Quote, EyeOff } from 'lucide-react';
import { Badge } from './Badge';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';

interface WysiwygEditorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
}

export interface WysiwygEditorRef {
    insertText: (text: string) => void;
}

export const WysiwygEditor = forwardRef<WysiwygEditorRef, WysiwygEditorProps>(({ value, onChange, disabled, className }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('https://');

    // Expose insertText method
    useImperativeHandle(ref, () => ({
        insertText: (text: string) => {
            if (disabled) return;
            if (editorRef.current) {
                editorRef.current.focus();
                document.execCommand('insertText', false, text);
                handleInput();
            }
        }
    }));

    /**
     * Sanitizes HTML to be strictly compatible with Telegram's HTML parse mode.
     */
    const sanitizeForTelegram = (html: string): string => {
        if (!html) return '';

        const temp = document.createElement('div');
        temp.innerHTML = html;

        const cleanNode = (node: Node): string => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent || '';
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }

            const element = node as HTMLElement;
            const tagName = element.tagName.toLowerCase();
            let childrenHtml = '';
            
            for (let i = 0; i < element.childNodes.length; i++) {
                childrenHtml += cleanNode(element.childNodes[i]);
            }

            switch (tagName) {
                case 'b':
                case 'strong':
                    return `<b>${childrenHtml}</b>`;
                case 'i':
                case 'em':
                    return `<i>${childrenHtml}</i>`;
                case 'u':
                    return `<u>${childrenHtml}</u>`;
                case 's':
                case 'strike':
                case 'del':
                    return `<s>${childrenHtml}</s>`;
                case 'code':
                    return `<code>${childrenHtml}</code>`;
                case 'pre':
                    return `<pre>${childrenHtml}</pre>`;
                case 'blockquote':
                    return `<blockquote>${childrenHtml}</blockquote>`;
                case 'tg-spoiler':
                    return `<tg-spoiler>${childrenHtml}</tg-spoiler>`;
                case 'a':
                    const href = element.getAttribute('href');
                    return href ? `<a href="${href}">${childrenHtml}</a>` : childrenHtml;
                case 'br':
                    return '\n';
                case 'div':
                case 'p':
                    if (childrenHtml === '\n' || childrenHtml === '') return '\n';
                    return `\n${childrenHtml}`;
                default:
                    return childrenHtml;
            }
        };

        let result = '';
        for (let i = 0; i < temp.childNodes.length; i++) {
            result += cleanNode(temp.childNodes[i]);
        }
        return result.trim();
    };

    /**
     * Converts Telegram-formatted HTML (with \n) back to browser-friendly HTML (with <br>).
     */
    const formatForBrowser = (telegramHtml: string): string => {
        if (!telegramHtml) return '';
        return telegramHtml.replace(/\n/g, '<br>');
    };

    useEffect(() => {
        if (editorRef.current) {
            const currentSanitized = sanitizeForTelegram(editorRef.current.innerHTML);
            if (currentSanitized !== (value || '')) {
                editorRef.current.innerHTML = formatForBrowser(value || '');
            }
        }
    }, [value]);

    useEffect(() => {
        if (!disabled) {
            document.execCommand('defaultParagraphSeparator', false, 'div');
        }
    }, [disabled]);

    const handleInput = () => {
        if (editorRef.current) {
            const cleanHtml = sanitizeForTelegram(editorRef.current.innerHTML);
            onChange(cleanHtml);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;');
            handleInput();
        }
    };

    const applyCommand = (command: string, cmdValue: string | undefined = undefined) => {
        if (disabled) return;
        document.execCommand(command, false, cmdValue);
        handleInput();
        if (editorRef.current) editorRef.current.focus();
    };

    const applyCustomTag = (tag: string) => {
        if (disabled) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (!selectedText) return;

        const element = document.createElement(tag);
        element.textContent = selectedText;
        
        range.deleteContents();
        range.insertNode(element);
        
        handleInput();
    };

    const openLinkModal = () => {
        if (disabled) return;
        setIsLinkModalOpen(true);
    };

    const handleApplyLink = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLinkModalOpen(false);
        applyCommand('createLink', linkUrl);
        setLinkUrl('https://');
    };

    const toolbarButtons = [
        { icon: <Bold size={16} />, action: () => applyCommand('bold'), title: "Bold" },
        { icon: <Italic size={16} />, action: () => applyCommand('italic'), title: "Italic" },
        { icon: <Underline size={16} />, action: () => applyCommand('underline'), title: "Underline" },
        { icon: <Strikethrough size={16} />, action: () => applyCommand('strikeThrough'), title: "Strikethrough" },
        { icon: <Code size={16} />, action: () => applyCommand('formatBlock', 'code'), title: "Code" },
        { icon: <Quote size={16} />, action: () => applyCommand('formatBlock', 'blockquote'), title: "Blockquote" },
        { icon: <EyeOff size={16} />, action: () => applyCustomTag('tg-spoiler'), title: "Spoiler" },
        { icon: <Link size={16} />, action: openLinkModal, title: "Link" },
    ];

    return (
        <>
            <div className={`relative border-2 border-[var(--border)] rounded-lg shadow-sm focus-within:ring-4 focus-within:ring-[var(--primary-color-focus-ring)] focus-within:border-[var(--primary-color)] transition-shadow flex flex-col bg-[var(--card-background)] ${className}`}>
                {disabled && (
                    <Badge variant="secondary" className="absolute top-2 right-2 z-10 opacity-70">
                        Read-only
                    </Badge>
                )}
                
                {!disabled && (
                    <div className="flex items-center space-x-1 p-2 border-b border-[var(--border)] bg-[var(--card-inset-background)] rounded-t-lg flex-wrap sticky top-0 z-10">
                        {toolbarButtons.map((btn, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={btn.action}
                                title={btn.title}
                                className="p-2 rounded-md hover:bg-[var(--list-item-hover-background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] text-[var(--foreground-muted)] transition-colors"
                            >
                                {btn.icon}
                            </button>
                        ))}
                    </div>
                )}

                <div
                    ref={editorRef}
                    contentEditable={!disabled}
                    onInput={handleInput}
                    onBlur={handleInput}
                    onKeyDown={handleKeyDown}
                    className={`block w-full min-h-[150px] p-4 outline-none text-[var(--foreground)] prose prose-sm dark:prose-invert max-w-none font-sans leading-relaxed transition-opacity ${
                        disabled ? 'cursor-default opacity-80' : 'cursor-text'
                    }`}
                    style={{
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                    }}
                />
                
                <style dangerouslySetInnerHTML={{ __html: `
                    [contenteditable] blockquote {
                        border-left: 4px solid var(--primary-color);
                        padding-left: 1rem;
                        margin-left: 0;
                        margin-bottom: 0.75rem;
                        font-style: italic;
                        color: var(--foreground-muted);
                    }
                    [contenteditable] code {
                        background: var(--card-inset-background);
                        padding: 0.2rem 0.4rem;
                        border-radius: 0.25rem;
                        font-family: monospace;
                    }
                    [contenteditable] tg-spoiler {
                        background: #333;
                        color: transparent;
                        border-radius: 2px;
                        cursor: help;
                    }
                    .dark [contenteditable] tg-spoiler {
                        background: #666;
                    }
                `}} />
            </div>

            <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Add Link">
                <form onSubmit={handleApplyLink} className="space-y-4">
                    <Input 
                        label="Destination URL"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        required
                        autoFocus
                        placeholder="https://t.me/yourgroup"
                    />
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsLinkModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Apply Link</Button>
                    </div>
                </form>
            </Modal>
        </>
    );
});
