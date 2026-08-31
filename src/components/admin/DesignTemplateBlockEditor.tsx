import { useMemo, useRef, useState } from 'react';
import type { DesignBlockContent } from '../../types/product';
import type { DesignTemplateField } from '../product/designTemplates/types';
import { getDesignTemplate } from '../product/designTemplates/registry';
import DesignBlockView from '../product/designTemplates/DesignBlockView';
import { uploadImage } from '../../utils/upload';
import { Icon } from './console/Icon';

/**
 * 'design' 상세 블록의 관리자 편집기 — 좌측 미리보기 / 우측 폼 분할.
 * 미리보기의 문구·사진을 클릭하면 해당 입력칸이 열리고 포커스된다.
 * 값을 전부 지우면 디자인 원본 문구(default)로 되돌아간다.
 */
export function DesignTemplateBlockEditor({
    content,
    onChange,
}: {
    content: DesignBlockContent;
    onChange: (next: DesignBlockContent) => void;
}) {
    const def = getDesignTemplate(content?.templateId);
    const [previewVariant, setPreviewVariant] = useState<'desktop' | 'mobile'>('desktop');
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const fieldRefs = useRef(new Map<string, HTMLElement>());
    const previewRef = useRef<HTMLDivElement>(null);

    /** 미리보기에서 필드 클릭 → 해당 섹션 열고 입력칸으로 스크롤 + 포커스 */
    const handlePreviewFieldClick = (key: string) => {
        const field = def?.fields.find(f => f.key === key);
        if (!field) return;
        setSelectedField(key);
        setOpenSection(field.section);
        // 섹션이 방금 열렸으면 입력칸이 다음 렌더에 생기므로 한 프레임 기다린다
        setTimeout(() => {
            const el = fieldRefs.current.get(key);
            el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            (el as HTMLInputElement | HTMLTextAreaElement | null)?.focus?.({ preventScroll: true });
        }, 60);
    };

    /** 입력칸 포커스 → 미리보기의 해당 요소를 하이라이트하고 화면에 보이게 */
    const handleFieldFocus = (key: string) => {
        setSelectedField(key);
        previewRef.current?.querySelector(`[data-df="${key}"]`)
            ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    const sections = useMemo(() => {
        if (!def) return [] as { name: string; fields: DesignTemplateField[] }[];
        const out: { name: string; fields: DesignTemplateField[] }[] = [];
        for (const f of def.fields) {
            const last = out[out.length - 1];
            if (last && last.name === f.section) last.fields.push(f);
            else out.push({ name: f.section, fields: [f] });
        }
        return out;
    }, [def]);

    if (!def) {
        return (
            <div className="card-muted-note">
                <Icon name="warning" />
                <span>알 수 없는 디자인 템플릿입니다: {content?.templateId}</span>
            </div>
        );
    }

    const values = content.values || {};
    const setValue = (key: string, value: string) => {
        onChange({ ...content, values: { ...values, [key]: value } });
    };

    const handleImageUpload = async (key: string, file: File | undefined) => {
        if (!file) return;
        try {
            setUploadingKey(key);
            const url = await uploadImage(file, 'product-details');
            setValue(key, url);
        } catch (error) {
            console.error('Design image upload failed:', error);
            alert('이미지 업로드 실패');
        } finally {
            setUploadingKey(null);
        }
    };

    const filledCount = (fields: DesignTemplateField[]) =>
        fields.filter(f => {
            const raw = values[f.key] ?? '';
            return raw !== '' && raw !== (f.default ?? '');
        }).length;

    return (
        <div className="stack" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="badge b-gray">{def.name}</span>
                <span className="cell-muted" style={{ fontSize: 12 }}>
                    미리보기의 문구·사진을 클릭하면 바로 편집할 수 있습니다 — 전부 지우면 원본으로 되돌아갑니다
                </span>
                <div className="spacer" />
                {def.mobile && (
                    <div className="row" style={{ gap: 6 }}>
                        {(['desktop', 'mobile'] as const).map(vt => (
                            <button
                                key={vt}
                                type="button"
                                className="chip"
                                onClick={() => setPreviewVariant(vt)}
                                style={previewVariant === vt ? { background: 'var(--mrt-navy, #1a2b4a)', color: '#fff' } : undefined}
                            >
                                {vt === 'desktop' ? 'PC' : '모바일'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {/* 좌: 클릭 가능한 미리보기 */}
                <div
                    ref={previewRef}
                    style={{ flex: 1, minWidth: 0, maxHeight: '78vh', overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', background: '#fff' }}
                >
                    <div style={{ maxWidth: previewVariant === 'mobile' ? 430 : undefined, margin: previewVariant === 'mobile' ? '0 auto' : undefined }}>
                        <DesignBlockView
                            content={content}
                            editing
                            variant={previewVariant}
                            onFieldClick={handlePreviewFieldClick}
                            selectedField={selectedField}
                        />
                    </div>
                </div>

                {/* 우: 섹션별 폼 */}
                <div className="stack" style={{ gap: 6, flex: '0 0 380px', maxHeight: '78vh', overflowY: 'auto' }}>
                {sections.map(sec => {
                    const open = openSection === sec.name;
                    const filled = filledCount(sec.fields);
                    return (
                        <div key={sec.name} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                            <button
                                type="button"
                                onClick={() => setOpenSection(open ? null : sec.name)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: open ? 'var(--bg-muted, #f6f7f8)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <Icon name={open ? 'expand_less' : 'expand_more'} style={{ fontSize: 18 }} />
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{sec.name}</span>
                                <span className="cell-muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
                                    {filled > 0 ? `${filled}개 수정됨` : '원본 그대로'}
                                </span>
                            </button>
                            {open && (
                                <div className="stack" style={{ gap: 10, padding: '12px 12px 14px' }}>
                                    {sec.fields.map(f => (
                                        <div key={f.key}>
                                            <label className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                                {f.label}
                                            </label>
                                            {f.type === 'image' ? (
                                                <div
                                                    ref={el => { if (el) fieldRefs.current.set(f.key, el); else fieldRefs.current.delete(f.key); }}
                                                    className="row"
                                                    style={{ gap: 10, alignItems: 'center', ...(selectedField === f.key ? { outline: '2px solid rgba(6,196,160,0.5)', outlineOffset: 4, borderRadius: 6 } : {}) }}
                                                >
                                                    {values[f.key] ? (
                                                        <div style={{ position: 'relative', flex: 'none' }}>
                                                            <img
                                                                src={values[f.key]}
                                                                alt={f.label}
                                                                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)' }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setValue(f.key, '')}
                                                                title="이미지 제거"
                                                                style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'var(--mrt-red)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                                                            >
                                                                <Icon name="close" style={{ fontSize: 14 }} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: 72, height: 72, borderRadius: 'var(--r-md)', border: '1px dashed var(--border-default)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', flex: 'none' }}>
                                                            <Icon name="image" style={{ fontSize: 20 }} />
                                                        </div>
                                                    )}
                                                    <label className="chip" style={{ cursor: 'pointer' }}>
                                                        <Icon name="upload" style={{ fontSize: 16 }} />
                                                        {uploadingKey === f.key ? '업로드 중…' : (values[f.key] ? '변경' : '업로드')}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            style={{ display: 'none' }}
                                                            onChange={(e) => {
                                                                handleImageUpload(f.key, e.target.files?.[0]);
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            ) : f.type === 'textarea' ? (
                                                <textarea
                                                    ref={el => { if (el) fieldRefs.current.set(f.key, el); else fieldRefs.current.delete(f.key); }}
                                                    className="inp"
                                                    rows={Math.min(6, Math.max(2, (f.default?.split('\n').length ?? 2)))}
                                                    value={values[f.key] ?? f.default ?? ''}
                                                    placeholder={f.default || ''}
                                                    onChange={(e) => setValue(f.key, e.target.value)}
                                                    onFocus={() => handleFieldFocus(f.key)}
                                                    style={selectedField === f.key ? { borderColor: '#06C4A0', boxShadow: '0 0 0 2px rgba(6,196,160,0.25)' } : undefined}
                                                />
                                            ) : (
                                                <input
                                                    ref={el => { if (el) fieldRefs.current.set(f.key, el); else fieldRefs.current.delete(f.key); }}
                                                    type="text"
                                                    className="inp"
                                                    value={values[f.key] ?? f.default ?? ''}
                                                    placeholder={f.default || ''}
                                                    onChange={(e) => setValue(f.key, e.target.value)}
                                                    onFocus={() => handleFieldFocus(f.key)}
                                                    style={selectedField === f.key ? { borderColor: '#06C4A0', boxShadow: '0 0 0 2px rgba(6,196,160,0.25)' } : undefined}
                                                />
                                            )}
                                            {f.help && (
                                                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{f.help}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                </div>
            </div>
        </div>
    );
}
