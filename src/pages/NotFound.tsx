import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';

export function NotFound() {
  return (
    <>
      <SEO title="ページが見つかりません" description="お探しのページは移動または削除された可能性があります。" robots="noindex, nofollow" />
      <main className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-white">
        <p className="mb-3 text-sm font-bold tracking-[0.18em] text-primary">PAGE NOT FOUND</p>
        <h1 className="text-7xl font-bold text-slate-800 mb-4 tracking-tighter">404</h1>
        <h2 className="text-2xl font-semibold text-slate-700 mb-4">ページが見つかりません</h2>
        <p className="text-slate-500 mb-8 max-w-sm leading-relaxed">
          URLが間違っているか、ページが移動・削除された可能性があります。
        </p>
        <Link
          to="/"
          className="px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all duration-200 shadow-sm shadow-primary/20 hover:shadow-md"
        >
          ホームへ戻る
        </Link>
      </main>
    </>
  );
}
