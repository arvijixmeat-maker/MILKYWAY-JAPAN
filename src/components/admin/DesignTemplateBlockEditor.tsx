import { useMemo, useState } from 'react';
import type { DesignBlockContent } from '../../types/product';
import type { DesignTemplateField } from '../product/designTemplates/types';
import { getDesignTemplate } from '../product/designTemplates/registry';
import DesignBlockView from '../product/designTemplates/DesignBlockView';
import { uploadImage } from '../../utils/upload';
import { Icon } from './console/Icon';

/**
 * 'design' 상세 블록의 관리자 편집기.
 * 템플릿 매니페스트(fields)를 읽어 섹션별로 텍스트 입력/이미지 업로드 폼을 자동 생성한다.
 * 값을 비워두면 디자인 원본 문구(default)가 그대로 사용된다.
 */
export function DesignTemplateBlockEditor({
    content,
    onChange,
}: {
    content: DesignBlockContent;
    onChange: (next: DesignBlockContent) => void;
}) {
    const def = getDesignTemplate(content?.templateId);
    const [showPreview, setShowPreview] = useState(false);
    const [previewVariant, setPreviewVariant] = useState<'desktop' | 'mobile'>('desktop');
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [openSection, setOpenSection] = useState<string | null>(null);

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
        fields.filter(f => (values[f.key] ?? '') !== '').length;

    return (
        <div className="stack" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <span className="badge b-gray">{def.name}</span>
                <span className="cell-muted" style={{ fontSize: 12 }}>
                    비워둔 항목은 디자인 원본 문구가 표시됩니다
                </span>
                <div className="spacer" />
                <button type="button" className="chip" onClick={() => setShowPreview(p => !p)}>
                    <Icon name={showPreview ? 'visibility' : 'preview'} style={{ fontSize: 16 }} />
                    {showPreview ? '미리보기 닫기' : '미리보기'}
                </button>
            </div>

            {showPreview && (
                <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: '#fff' }}>
                    {def.mobile && (
                        <div className="row" style={{ gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--border-default)' }}>
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
                            <span className="cell-muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
                                {previewVariant === 'mobile' ? '모바일 접속 시 이 디자인이 표시됩니다' : 'PC 접속 시 이 디자인이 표시됩니다'}
                            </span>
                        </div>
                    )}
                    <div style={{ maxWidth: previewVariant === 'mobile' ? 430 : undefined, margin: previewVariant === 'mobile' ? '0 auto' : undefined }}>
                        <DesignBlockView content={content} editing variant={previewVariant} />
                    </div>
                </div>
            )}

            <div className="stack" style={{ gap: 6 }}>
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
                                                <div className="row" style={{ gap: 10, alignItems: 'center' }}>
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
                                                    className="inp"
                                                    rows={Math.min(6, Math.max(2, (f.default?.split('\n').length ?? 2)))}
                                                    value={values[f.key] ?? ''}
                                                    placeholder={f.default || ''}
                                                    onChange={(e) => setValue(f.key, e.target.value)}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="inp"
                                                    value={values[f.key] ?? ''}
                                                    placeholder={f.default || ''}
                                                    onChange={(e) => setValue(f.key, e.target.value)}
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
    );
}
