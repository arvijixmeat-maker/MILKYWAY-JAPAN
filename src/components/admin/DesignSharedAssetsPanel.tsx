import { useMemo, useState } from 'react';
import type { DesignTemplateDef } from '../product/designTemplates/types';
import { saveDesignDefaults, useAllDesignDefaults } from '../product/designTemplates/globalDefaults';
import { uploadImage } from '../../utils/upload';
import { Icon } from './console/Icon';

/**
 * 「공통 이미지」 패널 — 상품마다 다시 올릴 필요 없는 사진을 사이트 전체에 한 번만 등록한다.
 *
 * 여기에 올린 사진은 모든 상품의 해당 자리에 자동으로 들어가고,
 * 특정 상품만 다른 사진을 쓰고 싶으면 그 상품의 섹션에서 따로 올리면 그쪽이 우선한다.
 */
export function DesignSharedAssetsPanel({ def }: { def: DesignTemplateDef }) {
    const all = useAllDesignDefaults();
    const shared = all[def.id] || {};
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [openSection, setOpenSection] = useState<string | null>(null);

    // 사진 필드만 섹션별로 묶는다 (문구는 상품마다 다른 경우가 많아 제외)
    const sections = useMemo(() => {
        const out: { name: string; fields: { key: string; label: string }[] }[] = [];
        for (const f of def.fields) {
            if (f.type !== 'image') continue;
            const last = out[out.length - 1];
            const item = { key: f.key, label: f.label };
            if (last && last.name === f.section) last.fields.push(item);
            else out.push({ name: f.section, fields: [item] });
        }
        return out;
    }, [def]);

    const persist = async (nextShared: Record<string, string>) => {
        setSaving(true);
        try {
            await saveDesignDefaults({ ...all, [def.id]: nextShared });
        } catch (e) {
            console.error('Failed to save shared design assets:', e);
            alert('공통 이미지 저장에 실패했습니다');
        } finally {
            setSaving(false);
        }
    };

    const handleUpload = async (key: string, file: File | undefined) => {
        if (!file) return;
        try {
            setUploadingKey(key);
            const url = await uploadImage(file, 'design-shared');
            await persist({ ...shared, [key]: url });
        } catch (e) {
            console.error('Shared image upload failed:', e);
            alert('이미지 업로드 실패');
        } finally {
            setUploadingKey(null);
        }
    };

    const handleRemove = async (key: string) => {
        const next = { ...shared };
        delete next[key];
        await persist(next);
    };

    const filled = Object.values(shared).filter(Boolean).length;
    const total = sections.reduce((n, s) => n + s.fields.length, 0);

    return (
        <div style={{ border: '1px dashed var(--border-default)', borderRadius: 'var(--r-md)', padding: '10px 12px 12px' }}>
            <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Icon name="photo_library" style={{ fontSize: 17, color: '#029F85' }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>공통 이미지</span>
                <span className="cell-muted" style={{ fontSize: 12 }}>
                    한 번 올려두면 모든 상품에 자동으로 들어갑니다 · {filled}/{total}장 등록됨
                </span>
                {saving && <span className="cell-muted" style={{ fontSize: 12 }}>저장 중…</span>}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                특정 상품만 다른 사진을 쓰려면, 아래 섹션에서 그 상품에만 따로 올리면 됩니다 (상품 사진이 우선).
            </div>

            <div className="stack" style={{ gap: 5, marginTop: 9 }}>
                {sections.map(sec => {
                    const open = openSection === sec.name;
                    const secFilled = sec.fields.filter(f => shared[f.key]).length;
                    return (
                        <div key={sec.name} style={{ flex: 'none', border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden' }}>
                            <button
                                type="button"
                                onClick={() => setOpenSection(open ? null : sec.name)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: open ? 'var(--bg-muted, #f6f7f8)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            >
                                <Icon name={open ? 'expand_less' : 'expand_more'} style={{ fontSize: 17 }} />
                                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{sec.name}</span>
                                <span className="cell-muted" style={{ fontSize: 11.5, marginLeft: 'auto' }}>
                                    {secFilled}/{sec.fields.length}
                                </span>
                            </button>
                            {open && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, padding: '10px' }}>
                                    {sec.fields.map(f => (
                                        <div key={f.key}>
                                            <div className="muted" style={{ fontSize: 11, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</div>
                                            <label
                                                title={shared[f.key] ? '사진 변경' : '사진 업로드'}
                                                style={{
                                                    position: 'relative', display: 'block', height: 84, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                                                    border: shared[f.key] ? '1px solid var(--border-default)' : '1px dashed var(--border-default)',
                                                    background: shared[f.key] ? undefined : 'var(--bg-muted, #f6f7f8)',
                                                }}
                                            >
                                                {uploadingKey === f.key ? (
                                                    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#029F85' }}>
                                                        <Icon name="progress_activity" style={{ fontSize: 20 }} />
                                                    </div>
                                                ) : shared[f.key] ? (
                                                    <img src={shared[f.key]} alt={f.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
                                                        <Icon name="add_a_photo" style={{ fontSize: 19 }} />
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => { handleUpload(f.key, e.target.files?.[0]); e.target.value = ''; }}
                                                />
                                            </label>
                                            {shared[f.key] && (
                                                <button
                                                    type="button"
                                                    className="chip"
                                                    style={{ marginTop: 4, fontSize: 11 }}
                                                    onClick={() => handleRemove(f.key)}
                                                >
                                                    <Icon name="close" style={{ fontSize: 13 }} />공통에서 빼기
                                                </button>
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
