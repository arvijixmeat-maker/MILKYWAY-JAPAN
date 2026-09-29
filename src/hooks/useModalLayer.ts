import { useEffect, useRef } from 'react';

type ChannelIO = (command: string) => void;

/**
 * For full-screen sheets / drawers while they are mounted: lock page scroll, close on
 * Escape, and hide the floating LINE button (body.mw-modal-open, see index.css) and the
 * Channel Talk launcher, which otherwise sit on top of the sheet.
 */
export function useModalLayer(onClose: () => void) {
    const closeRef = useRef(onClose);
    useEffect(() => {
        closeRef.current = onClose;
    });

    useEffect(() => {
        const body = document.body;
        const prevOverflow = body.style.overflow;
        body.style.overflow = 'hidden';
        body.classList.add('mw-modal-open');
        const channel = (window as unknown as { ChannelIO?: ChannelIO }).ChannelIO;
        channel?.('hideChannelButton');
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeRef.current();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            body.style.overflow = prevOverflow;
            body.classList.remove('mw-modal-open');
            channel?.('showChannelButton');
        };
    }, []);
}
