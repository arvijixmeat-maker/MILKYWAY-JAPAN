import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface FieldShell { label?: string; hint?: string; error?: string; className?: string }

const Shell: React.FC<FieldShell & { id: string; children: React.ReactNode }> = ({ id, label, hint, error, className = '', children }) => (
    <div className={`field ${className}`.trim()} style={{ marginBottom: 0 }}>
        {label && <label htmlFor={id}>{label}</label>}
        {children}
        {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
);

type InputProps = FieldShell & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    /** 왼쪽 아이콘 (검색 등) */
    icon?: React.ReactNode;
};

/** 입력창 — 각진 모서리 · 48px · gray-60 바탕. 포커스 링은 green-700. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, hint, error, className, icon, id, ...rest }, ref) => {
    const auto = useId();
    const fid = id || auto;
    const input = <input ref={ref} id={fid} className={`inp${error ? ' invalid' : ''}`} aria-invalid={error ? true : undefined} {...rest} />;
    return (
        <Shell id={fid} label={label} hint={hint} error={error} className={className}>
            {icon ? <div className="inp-wrap">{icon}{input}</div> : input}
        </Shell>
    );
});
Input.displayName = 'Input';

type TextareaProps = FieldShell & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, hint, error, className, id, ...rest }, ref) => {
    const auto = useId();
    const fid = id || auto;
    return (
        <Shell id={fid} label={label} hint={hint} error={error} className={className}>
            <textarea ref={ref} id={fid} className={`inp${error ? ' invalid' : ''}`} aria-invalid={error ? true : undefined} {...rest} />
        </Shell>
    );
});
Textarea.displayName = 'Textarea';

type SelectProps = FieldShell & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
    options?: { value: string; label: string }[];
};

/** 선택 상자 — 입력창과 같은 규격, 오른쪽에 아래 화살표. `options` 대신 `<option>` 을 자식으로 넣어도 된다. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ label, hint, error, className, options, children, id, ...rest }, ref) => {
    const auto = useId();
    const fid = id || auto;
    return (
        <Shell id={fid} label={label} hint={hint} error={error} className={className}>
            <div className="inp-wrap">
                <select ref={ref} id={fid} className={`inp inp-select${error ? ' invalid' : ''}`} aria-invalid={error ? true : undefined} {...rest}>
                    {options ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}
                </select>
                <ChevronDown className="inp-caret" size={18} strokeWidth={1.5} aria-hidden="true" />
            </div>
        </Shell>
    );
});
Select.displayName = 'Select';
