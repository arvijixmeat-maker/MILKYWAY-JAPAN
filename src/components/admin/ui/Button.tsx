import React from 'react';

export type ButtonVariant = 'primary' | 'soft' | 'outline' | 'link' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
    primary: 'btn-primary', soft: 'btn-soft', outline: 'btn-outline', link: 'btn-link', danger: 'btn-danger',
};
const SIZE: Record<ButtonSize, string> = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

interface CommonProps {
    /** primary 는 한 화면에 하나만 */
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** 왼쪽 아이콘 (lucide 아이콘) */
    icon?: React.ReactNode;
    /** 글자 없이 아이콘만 — aria-label 필수 */
    iconOnly?: boolean;
    block?: boolean;
    className?: string;
    children?: React.ReactNode;
}
type ButtonProps = CommonProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { href?: undefined };
type LinkProps = CommonProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & { href: string };

/** 관리자 버튼. `href` 를 주면 링크로 그린다. */
export const Button: React.FC<ButtonProps | LinkProps> = (props) => {
    const { variant = 'outline', size = 'md', icon, iconOnly, block, className, children, ...rest } = props;
    const klass = ['btn', VARIANT[variant], SIZE[size], iconOnly ? 'btn-icon' : '', block ? 'btn-block' : '', className || '']
        .filter(Boolean).join(' ');
    if (typeof (rest as LinkProps).href === 'string') {
        return <a className={klass} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>{icon}{children}</a>;
    }
    const { type, ...btn } = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
    return <button type={type || 'button'} className={klass} {...btn}>{icon}{children}</button>;
};
