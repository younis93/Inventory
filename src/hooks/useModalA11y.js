import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

const getFocusableElements = (root) => {
    if (!root) return [];
    return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    });
};

export const useModalA11y = ({ isOpen, onClose, containerRef }) => {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen || !containerRef?.current) return undefined;

        const dialog = containerRef.current;
        const previousOverflow = document.body.style.overflow;
        const previousActiveElement = document.activeElement;

        document.body.style.overflow = 'hidden';

        requestAnimationFrame(() => {
            const focusable = getFocusableElements(dialog);
            const first = focusable[0] || dialog;
            if (typeof first.focus === 'function') first.focus();
        });

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current?.();
                return;
            }

            if (event.key !== 'Tab') return;

            const focusable = getFocusableElements(dialog);
            if (focusable.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (event.shiftKey) {
                if (active === first || active === dialog) {
                    event.preventDefault();
                    last.focus();
                }
                return;
            }

            if (active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
            if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
                previousActiveElement.focus();
            }
        };
    }, [isOpen, containerRef]);
};
