/** Constants and pure helpers shared by the PC and mobile 旅マガジン screens. */

export const ALL = '全体';
export const KEYWORDS = ['ウランバートル', '星空', '草原', 'ゲル'];

export const SITE = 'https://mongolryokou.com';
export const EDITORIAL = 'モンゴル銀河旅行社 編集部';

export const formatDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};
