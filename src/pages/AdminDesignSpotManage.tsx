import React, { useEffect, useRef, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { Icon } from '../components/admin/console/Icon';
import { uploadImage } from '../utils/upload';
import { loadDesignSpots, saveDesignSpots, type DesignSpot } from '../components/product/designTemplates/designSpots';

/**
 * 여행지 사진 — 디자인 템플릿 「방문 여행지」 카드에서 바로 불러 쓰는
 * 이미지 + 이름만의 가벼운 등록 페이지. (관광지 마스터와 별개)
 */
export const AdminDesignSpotManage: React.FC = () => {
    const [spots, setSpots] = useState<DesignSpot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState('');
    const [newImage, setNewImage] = useState('');
    const [uploadingNew, setUploadingNew] = useState(false);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadDesignSpots(true).then(v => { setSpots(v); setLoading(false); });
    }, []);

    const persist = async (next: DesignSpot[]) => {
        setSpots(next);
        setSaving(true);
        try {
            await saveDesignSpots(next);
        } catch (error) {
            console.error('Design spot save failed:', error);
            alert('저장 실패 — 잠시 후 다시 시도해 주세요');
        } finally {
            setSaving(false);
        }
    };

    const handleNewUpload = async (file: File | undefined) => {
        if (!file) return;
        try {
            setUploadingNew(true);
            setNewImage(await uploadImage(file, 'design-spots'));
        } catch (error) {
            console.error('Design spot image upload failed:', error);
            alert('이미지 업로드 실패');
        } finally {
            setUploadingNew(false);
        }
    };

    const addSpot = () => {
        const name = newName.trim();
        if (!name) { alert('여행지 이름을 입력해 주세요 (운영 페이지에 그대로 표시되므로 일본어 권장)'); return; }
        if (!newImage) { alert('사진을 올려 주세요'); return; }
        persist([...spots, { id: `spot_${Date.now()}`, name, image: newImage }]);
        setNewName('');
        setNewImage('');
        nameRef.current?.focus();
    };

    const rename = (id: string, name: string) => {
        setSpots(spots.map(s => (s.id === id ? { ...s, name } : s)));
    };
    const renameCommit = () => persist(spots);

    const replaceImage = async (id: string, file: File | undefined) => {
        if (!file) return;
        try {
            setUploadingId(id);
            const url = await uploadImage(file, 'design-spots');
            await persist(spots.map(s => (s.id === id ? { ...s, image: url } : s)));
        } catch (error) {
            console.error('Design spot image upload failed:', error);
            alert('이미지 업로드 실패');
        } finally {
            setUploadingId(null);
        }
    };

    const removeSpot = (id: string) => {
        const target = spots.find(s => s.id === id);
        if (!target) return;
        if (!window.confirm(`"${target.name}" 여행지를 삭제하시겠습니까?\n\n이미 카드에 담아 저장한 상품에는 영향이 없습니다.`)) return;
        persist(spots.filter(s => s.id !== id));
    };

    return (
        <AdminLayout
            activePage="design-spots"
            title="여행지 사진"
            description="디자인 템플릿의 「방문 여행지」 카드에서 바로 골라 쓰는 목록입니다. 이름은 운영 페이지에 그대로 표시되므로 일본어로 입력해 주세요."
            showSearch={false}
            actions={saving ? <span className="cell-muted" style={{ fontSize: 12 }}>저장 중…</span> : undefined}
        >
            {/* 새 여행지 등록 */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label title="사진 업로드" style={{ flex: 'none', width: 72, height: 72, borderRadius: 12, overflow: 'hidden', border: newImage ? '2px solid #06C4A0' : '2px dashed var(--border-default)', cursor: 'pointer', display: 'grid', placeItems: 'center', background: 'var(--bg-muted, #f8f9fa)' }}>
                        {uploadingNew
                            ? <Icon name="progress_activity" style={{ fontSize: 20, color: '#06C4A0' }} />
                            : newImage
                                ? <img src={newImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <Icon name="add_a_photo" style={{ fontSize: 22, color: 'var(--text-muted)' }} />}
                        <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={(e) => { handleNewUpload(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    <input
                        ref={nameRef}
                        className="inp"
                        style={{ flex: 1, minWidth: 200 }}
                        value={newName}
                        placeholder="여행지 이름 (예: テレルジ国立公園)"
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addSpot(); }}
                    />
                    <button type="button" className="btn btn-primary" onClick={addSpot}>
                        <Icon name="add" />여행지 등록
                    </button>
                </div>
            </div>

            {/* 등록된 여행지 그리드 */}
            {loading ? (
                <div className="cell-muted" style={{ padding: 24 }}>불러오는 중…</div>
            ) : spots.length === 0 ? (
                <div className="cell-muted" style={{ padding: 24 }}>등록된 여행지가 없습니다. 위에서 사진과 이름을 등록해 주세요.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    {spots.map(s => (
                        <div key={s.id} className="card" style={{ overflow: 'hidden' }}>
                            <label title="사진 변경" style={{ display: 'block', position: 'relative', aspectRatio: '4/3', cursor: 'pointer', background: 'var(--bg-muted, #f0f1f3)' }}>
                                {uploadingId === s.id
                                    ? <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><Icon name="progress_activity" style={{ fontSize: 22, color: '#06C4A0' }} /></span>
                                    : <img src={s.image} alt={s.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                                <input type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={(e) => { replaceImage(s.id, e.target.files?.[0]); e.target.value = ''; }} />
                            </label>
                            <div className="row" style={{ gap: 6, alignItems: 'center', padding: '8px 10px' }}>
                                <input
                                    className="inp"
                                    style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700 }}
                                    value={s.name}
                                    onChange={(e) => rename(s.id, e.target.value)}
                                    onBlur={renameCommit}
                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                />
                                <button type="button" className="act-btn" title="삭제" onClick={() => removeSpot(s.id)}>
                                    <Icon name="delete" style={{ fontSize: 16, color: 'var(--mrt-red)' }} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
};
