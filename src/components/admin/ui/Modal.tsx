import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    /** 아래 버튼 줄 (오른쪽 정렬) */
    footer?: React.ReactNode;
    /** 바깥을 눌러도 닫히지 않게 (작성 중인 내용이 있을 때) */
    lockBackdrop?: boolean;
    children: React.ReactNode;
}

/** 모달 — 라운드 16px, 머리(제목 · 설명 · 닫기) / 본문 / 버튼 줄. 768px 이하에서는 아래에서 올라오는 시트. */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, description, size = 'md', footer, lockBackdrop, children }) => {
    const titleId = useId();
    const boxRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    useEffect(() => {
        if (!open) return;
        const prev = document.activeElement as HTMLElement | null;
        boxRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); } };
        document.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
            prev?.focus?.();
        };
    }, [open]);

    if (!open) return null;
    return (
        <div className="ui-modal-scrim" data-mw-overlay onMouseDown={(e) => { if (!lockBackdrop && e.target === e.currentTarget) onClose(); }}>
            <div ref={boxRef} className={`ui-modal${size === 'md' ? '' : ` ${size}`}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
                <div className="ui-modal-head">
                    <div>
                        <h2 id={titleId}>{title}</h2>
                        {description && <p>{description}</p>}
                    </div>
                    <button type="button" className="btn btn-link btn-icon" aria-label="닫기" onClick={onClose}><X size={20} strokeWidth={1.5} /></button>
                </div>
                <div className="ui-modal-body">{children}</div>
                {footer && <div className="ui-modal-foot">{footer}</div>}
            </div>
        </div>
    );
};
