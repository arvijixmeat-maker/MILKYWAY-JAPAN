import React, { useState } from 'react';
import { uploadImage } from '../utils/upload';

const LANGUAGES = ['日本語', '英語', 'モンゴル語', '中国語', '韓国語'];
const SPECIALTIES = ['ゴビ砂漠', 'ホブスゴル', 'テレルジ', '乗馬', '文化体験', '写真撮影'];

export const GuideApply: React.FC = () => {
    const [form, setForm] = useState({
        name: '',
        phone: '',
        bio: '',
        experience_years: '',
        image: '',
        languages: [] as string[],
        specialties: [] as string[],
    });
    const [imagePreview, setImagePreview] = useState('');
    const [imageUploading, setImageUploading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggle = (field: 'languages' | 'specialties', value: string) => {
        setForm(prev => ({
            ...prev,
            [field]: prev[field].includes(value)
                ? prev[field].filter(v => v !== value)
                : [...prev[field], value],
        }));
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImagePreview(URL.createObjectURL(file));
        setImageUploading(true);
        try {
            const url = await uploadImage(file, 'guides');
            setForm(prev => ({ ...prev, image: url }));
        } catch {
            setError('画像のアップロードに失敗しました。もう一度お試しください。');
        } finally {
            setImageUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.phone.trim()) {
            setError('お名前と電話番号は必須です。');
            return;
        }
        if (imageUploading) {
            setError('画像のアップロードが完了するまでお待ちください。');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/tour-guides/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    experience_years: form.experience_years ? Number(form.experience_years) : 0,
                }),
            });
            if (!res.ok) throw new Error('送信に失敗しました。');
            setSubmitted(true);
        } catch (e: any) {
            setError(e.message || '送信に失敗しました。もう一度お試しください。');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-teal-600 text-3xl">check_circle</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">申請を受け付けました</h2>
                    <p className="text-gray-600 leading-relaxed">
                        ご申請ありがとうございます。<br />
                        担当者が内容を確認し、<strong>2〜3営業日以内</strong>にご連絡いたします。
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
                        🐴 Milkyway Japan
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">ガイド登録申請</h1>
                    <p className="text-gray-500 text-sm">モンゴル旅行の公認ガイドとして登録申請ができます</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">

                    {/* Profile Photo */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">プロフィール写真</label>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-3xl text-gray-300">person</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                                    <span className="material-symbols-outlined text-base">upload</span>
                                    {imageUploading ? 'アップロード中...' : '写真を選択'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        disabled={imageUploading}
                                    />
                                </label>
                                <p className="text-xs text-gray-400 mt-1">JPG、PNG、WEBPに対応</p>
                            </div>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">
                            お名前 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="山田 太郎"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">
                            電話番号 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            placeholder="090-0000-0000"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        />
                    </div>

                    {/* Experience Years */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">ガイド経験年数</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="0"
                                max="50"
                                value={form.experience_years}
                                onChange={e => setForm({ ...form, experience_years: e.target.value })}
                                placeholder="0"
                                className="w-28 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-center"
                            />
                            <span className="text-sm text-gray-600">年</span>
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">自己紹介</label>
                        <textarea
                            value={form.bio}
                            onChange={e => setForm({ ...form, bio: e.target.value })}
                            placeholder="ガイド経験、得意な地域、資格などをご記入ください"
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                        />
                    </div>

                    {/* Languages */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">対応言語</label>
                        <div className="flex flex-wrap gap-2">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => toggle('languages', lang)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        form.languages.includes(lang)
                                            ? 'bg-teal-500 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Specialties */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">専門分野</label>
                        <div className="flex flex-wrap gap-2">
                            {SPECIALTIES.map(sp => (
                                <button
                                    key={sp}
                                    type="button"
                                    onClick={() => toggle('specialties', sp)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        form.specialties.includes(sp)
                                            ? 'bg-teal-500 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {sp}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || imageUploading}
                        className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />送信中...</>
                        ) : '申請を送信する'}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-4">
                    © Milkyway Japan — mongolryokou.com
                </p>
            </div>
        </div>
    );
};