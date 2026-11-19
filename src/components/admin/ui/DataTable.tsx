import React from 'react';

export interface Column<T> {
    key: string;
    header: React.ReactNode;
    align?: 'left' | 'center' | 'right';
    /** 줄바꿈을 허용하는 칸 (상품명 등) */
    wrap?: boolean;
    /** 금액 · 날짜처럼 자릿수를 맞출 칸 */
    numeric?: boolean;
    width?: number | string;
    render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T, index: number) => string;
    onRowClick?: (row: T) => void;
    /** 표가 이보다 좁아지면 가로로 스크롤 */
    minWidth?: number;
    /** 카드 안에 넣을 때는 false (바깥 테두리 없이) */
    framed?: boolean;
    loading?: boolean;
    skeletonRows?: number;
    /** rows 가 비었을 때 표 대신 보여 줄 것 */
    empty?: React.ReactNode;
    caption?: string;
    className?: string;
}

const alignClass = (a?: 'left' | 'center' | 'right') => (a === 'right' ? 'r' : a === 'center' ? 'c' : '');

/** 데이터 표 — 헤더 gray-60, 행 구분은 헤어라인만. 넓으면 가로 스크롤. */
export function DataTable<T>({
    columns, rows, rowKey, onRowClick, minWidth = 900, framed = true, loading, skeletonRows = 5, empty, caption, className = '',
}: DataTableProps<T>) {
    const showEmpty = !loading && rows.length === 0 && !!empty;
    const table = (
        <div className={`tbl-wrap ${className}`.trim()}>
            <table className={`tbl${onRowClick ? '' : ' static'}`} style={{ minWidth }} aria-busy={loading || undefined}>
                {caption && <caption className="sr-only">{caption}</caption>}
                <thead><tr>
                    {columns.map((c) => <th key={c.key} scope="col" className={alignClass(c.align) || undefined} style={c.width ? { width: c.width } : undefined}>{c.header}</th>)}
                </tr></thead>
                <tbody>
                    {loading && Array.from({ length: skeletonRows }, (_, i) => (
                        <tr key={`sk-${i}`}>
                            {columns.map((c) => (
                                <td key={c.key}><span className="sk" style={{ width: c.align === 'right' ? 72 : 96, marginLeft: c.align === 'right' ? 'auto' : undefined }} /></td>
                            ))}
                        </tr>
                    ))}
                    {!loading && rows.map((row, i) => (
                        <tr key={rowKey(row, i)} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                            {columns.map((c) => (
                                <td key={c.key} className={[alignClass(c.align), c.wrap ? 'wrap' : '', c.numeric ? 'tnum' : ''].filter(Boolean).join(' ') || undefined}>
                                    {c.render(row, i)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
    const body = showEmpty ? <>{empty}</> : table;
    return framed ? <div className="tbl-card">{body}</div> : body;
}
