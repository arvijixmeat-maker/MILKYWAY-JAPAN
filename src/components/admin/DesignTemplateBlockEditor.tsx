import { useMemo, useRef, useState } from 'react';
import type { DesignBlockContent } from '../../types/product';
import type { DesignTemplateField } from '../product/designTemplates/types';
import { getDesignTemplate } from '../product/designTemplates/registry';
import DesignBlockView from '../product/designTemplates/DesignBlockView';
import { MAP_DESTINATIONS } from '../product/designTemplates/mapDestinations';
import { uploadImage } from '../../utils/upload';
import { Icon } from './console/Icon';

/**
 * 지도 경유지 선택 UI — 지도에 좌표가 등록된 여행지 목록에서 골라 담는다.
 * 저장 형식은 기존과 동일한 텍스트("지역명|일본어라벨" 줄 단위)라서
 * 지도/템플릿 쪽은 그대로 동작하고, 직접 입력(좌표·사진)도 그대로 지원한다.
 */
function MapStopsField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
    const [advanced, setAdvanced] = useState(false);
    const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
    const lines = value.split('\n').map(s => s.trim()).filter(Boolean);

    const setLines = (next: string[]) => onChange(next.join('\n'));
    const move = (i: number, dir: -1 | 1) => {
        const next = [...lines];
        const j = i + dir;
        if (j < 0 || j >= next.length) return;
        [next[i], next[j]] = [next[j], next[i]];
        setLines(next);
    };

    const addDestination = (ko: string) => {
        if (!ko) return;
        const dest = MAP_DESTINATIONS.find(d => d.ko === ko);
        if (!dest) return;
        setLines([...lines, `${dest.ko}|${dest.ja}`]);
    };

    /** 한 줄 = 지역명|표시문구|사진URL|위도,경도 — 필드 단위로 안전하게 수정 */
    const parseLine = (line: string) => {
        const p = line.split('|').map(s => s.trim());
        return { ko: p[0] || '', ja: p[1] || '', img: p[2] || '', coords: p[3] || '' };
    };
    const serializeLine = (p: { ko: string; ja: string; img: string; coords: string }) => {
        const parts = [p.ko, p.ja, p.img, p.coords];
        while (parts.length > 1 && !parts[parts.length - 1]) parts.pop();
        return parts.join('|');
    };
    const setLineImage = (i: number, img: string) => {
        const next = [...lines];
        next[i] = serializeLine({ ...parseLine(next[i]), img });
        setLines(next);
    };

    const handleStopImageUpload = async (i: number, file: File | undefined) => {
        if (!file) return;
        try {
            setUploadingIdx(i);
            const url = await uploadImage(file, 'product-details');
            setLineImage(i, url);
        } catch (error) {
            console.error('Map stop image upload failed:', error);
            alert('이미지 업로드 실패');
        } finally {
            setUploadingIdx(null);
        }
    };

    const groups = useMemo(() => {
        const out: { name: string; items: typeof MAP_DESTINATIONS }[] = [];
        for (const d of MAP_DESTINATIONS) {
            const last = out[out.length - 1];
            if (last && last.name === d.group) last.items.push(d);
            else out.push({ name: d.group, items: [d] });
        }
        return out;
    }, []);

    return (
        <div className="stack" style={{ gap: 8 }}>
            {lines.length === 0 && (
                <div className="cell-muted" style={{ fontSize: 12 }}>아래에서 여행지를 추가하면 지도에 순서대로 표시됩니다</div>
            )}
            {lines.map((line, i) => {
                const { ko, ja, img } = parseLine(line);
                return (
                    <div key={`${ko}-${i}`} className="row" style={{ gap: 6, alignItems: 'center', padding: '6px 8px', border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-muted, #f8f9fa)' }}>
                        <span style={{ flex: 'none', width: 20, height: 20, borderRadius: '50%', background: '#06C4A0', color: '#fff', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{i + 1}</span>
                        {/* 원형 버블에 표시될 사진 — 클릭해서 업로드/변경 */}
                        <label title={img ? '사진 변경' : '사진 업로드 (지도 원형에 표시)'} style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: img ? '2px solid #06C4A0' : '2px dashed var(--border-default)', cursor: 'pointer', display: 'grid', placeItems: 'center', background: '#fff' }}>
                            {uploadingIdx === i
                                ? <Icon name="progress_activity" style={{ fontSize: 16, color: '#06C4A0' }} />
                                : img
                                    ? <img src={img} alt={ko} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <Icon name="add_a_photo" style={{ fontSize: 15, color: 'var(--text-muted)' }} />}
                            <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => { handleStopImageUpload(i, e.target.files?.[0]); e.target.value = ''; }}
                            />
                        </label>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ko}{ja ? <span className="cell-muted" style={{ fontWeight: 500, marginLeft: 6 }}>{ja}</span> : null}
                        </span>
                        {img && (
                            <button type="button" className="act-btn" title="사진 제거" onClick={() => setLineImage(i, '')}><Icon name="image" style={{ fontSize: 15, color: 'var(--mrt-red)' }} /></button>
                        )}
                        <button type="button" className="act-btn" title="위로" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="arrow_upward" style={{ fontSize: 15 }} /></button>
                        <button type="button" className="act-btn" title="아래로" disabled={i === lines.length - 1} onClick={() => move(i, 1)}><Icon name="arrow_downward" style={{ fontSize: 15 }} /></button>
                        <button type="button" className="act-btn danger" title="삭제" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}><Icon name="close" style={{ fontSize: 15 }} /></button>
                    </div>
                );
            })}
            <select
                className="inp"
                value=""
                onChange={(e) => { addDestination(e.target.value); e.target.value = ''; }}
            >
                <option value="">＋ 여행지 추가…</option>
                {groups.map(g => (
                    <optgroup key={g.name} label={g.name}>
                        {g.items.map(d => (
                            <option key={d.ko} value={d.ko}>{d.ko} — {d.ja}</option>
                        ))}
                    </optgroup>
                ))}
            </select>
            <button type="button" className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => setAdvanced(a => !a)}>
                <Icon name="edit_note" style={{ fontSize: 15 }} />{advanced ? '직접 입력 닫기' : '직접 입력 (목록에 없는 지역·좌표·사진)'}
            </button>
            {advanced && (
                <>
                    <textarea
                        className="inp"
                        rows={Math.max(3, lines.length + 1)}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                    <div className="muted" style={{ fontSize: 11 }}>
                        한 줄에 한 곳: 지역명|표시문구|사진URL|위도,경도 (사진·좌표 생략 가능). 미등록 지역은 위도,경도를 넣으면 그 위치에 표시됩니다.
                    </div>
                </>
            )}
        </div>
    );
}

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
                <div className="stack" style={{ gap: 6, flex: '0 0 420px', maxHeight: '78vh', overflowY: 'auto' }}>
                {sections.map(sec => {
                    const open = openSection === sec.name;
                    const filled = filledCount(sec.fields);
                    return (
                        <div key={sec.name} style={{ flex: 'none', border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
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
                                            ) : f.type === 'map-stops' ? (
                                                <div ref={el => { if (el) fieldRefs.current.set(f.key, el); else fieldRefs.current.delete(f.key); }}>
                                                    <MapStopsField
                                                        value={values[f.key] ?? f.default ?? ''}
                                                        onChange={(next) => setValue(f.key, next)}
                                                    />
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
                                            {f.help && f.type !== 'map-stops' && (
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
