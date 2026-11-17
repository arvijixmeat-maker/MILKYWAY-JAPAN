import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * 旅行ルートマップ — 디자인 시안의 route-map.html 을 React 로 옮긴 것.
 * 몽골 전체에서 경로 범위로 날아간 뒤, 차량 점이 경로를 따라가며 정거장 핀이 차례로 떨어진다.
 * 도로 경로는 OSRM(키 없음)에서 받아오고, 실패하면 정거장을 직선으로 잇는다.
 */
export interface MapStop { name: string; sub?: string; lat: number; lon: number; side?: 'left' | 'right' }

const CSS = `
.trm{position:absolute;inset:0;background:#EEF3F1;font-family:'Noto Sans JP','Pretendard Variable',Pretendard,sans-serif;color:#123B3A;overflow:hidden}
.trm .leaflet-container{background:#EEF3F1;font-family:inherit}
.trm .leaflet-tile-pane{filter:saturate(.55) hue-rotate(-8deg) brightness(1.03)}
.trm .leaflet-control-attribution{font-size:9px;background:rgba(255,255,255,.75)!important}
.trm-pin{position:relative;width:32px;height:32px}
.trm-pin b{position:absolute;inset:0;border-radius:50%;background:#FFFFFF;border:2.5px solid #00A88B;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font:700 13px Inter,sans-serif;color:#007F75;box-shadow:0 6px 16px rgba(18,59,58,.22);opacity:0;transform:translateY(-18px) scale(.4);transition:background .3s,color .3s}
.trm-pin.on b{animation:trmDrop .6s cubic-bezier(.22,.61,.36,1) both}
.trm-pin.cur b{background:#00A88B;color:#FFFFFF}
.trm-pin i{position:absolute;inset:0;border-radius:50%;border:2px solid #06C4A0;opacity:0}
.trm-pin.cur i{animation:trmPulse 1.8s ease-out infinite}
.trm-lbl{position:absolute;top:50%;white-space:nowrap;transform:translate(var(--dx,0),-50%);display:flex;flex-direction:column;gap:2px;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.96);box-shadow:0 4px 14px rgba(18,59,58,.14);opacity:0;transition:opacity .4s ease .2s,transform .4s cubic-bezier(.22,.61,.36,1) .2s}
.trm-lbl.r{left:40px;--dx:-6px}.trm-lbl.l{right:40px;text-align:right;--dx:6px}
.trm-pin.on .trm-lbl{opacity:1;--dx:0}
.trm-lbl strong{font-size:12px;font-weight:700;color:#123B3A}
.trm-lbl span{font-size:10px;font-weight:600;color:#007F75}
.trm-car{position:relative;width:18px;height:18px;border-radius:50%;background:#123B3A;border:3px solid #FFFFFF;box-sizing:border-box;box-shadow:0 0 0 5px rgba(6,196,160,.35),0 4px 10px rgba(18,59,58,.3)}
.trm-hud{position:absolute;left:12px;bottom:12px;z-index:500;display:flex;align-items:center;gap:10px;padding:8px 14px 8px 8px;border-radius:999px;background:rgba(18,59,58,.92);color:#FFFFFF;box-shadow:0 6px 18px rgba(18,59,58,.25);opacity:0;transform:translateY(8px);transition:opacity .4s,transform .4s;pointer-events:none}
.trm-hud.on{opacity:1;transform:none}
.trm-hud em{font-style:normal;height:24px;padding:0 9px;border-radius:999px;background:#06C4A0;color:#123B3A;font:700 11px Inter,sans-serif;display:inline-flex;align-items:center}
.trm-hud strong{font-size:13px;font-weight:700}
.trm-bar{position:absolute;left:0;top:0;height:3px;width:100%;z-index:600;background:linear-gradient(90deg,#007F75,#06C4A0,#6CE3CC);transform:scaleX(0);transform-origin:0 50%}
.trm-replay{position:absolute;right:10px;top:10px;z-index:500;height:30px;padding:0 12px;border:0;border-radius:999px;background:rgba(255,255,255,.94);box-shadow:0 2px 8px rgba(18,59,58,.14);font:600 12px inherit;font-family:inherit;color:#123B3A;cursor:pointer}
@keyframes trmDrop{0%{opacity:0;transform:translateY(-18px) scale(.4)}65%{opacity:1;transform:translateY(3px) scale(1.08)}100%{opacity:1;transform:none}}
@keyframes trmPulse{0%{opacity:.85;transform:scale(1)}100%{opacity:0;transform:scale(2.6)}}
`;

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const RouteMap: React.FC<{ stops: MapStop[] }> = ({ stops }) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const hudRef = useRef<HTMLDivElement>(null);
    const hudDayRef = useRef<HTMLElement>(null);
    const hudNameRef = useRef<HTMLElement>(null);
    const barRef = useRef<HTMLDivElement>(null);
    const replayRef = useRef<HTMLButtonElement>(null);
    const key = JSON.stringify(stops);

    useEffect(() => {
        const el = mapRef.current;
        if (!el || stops.length < 2) return;
        const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const OVER: [number, number] = [46.9, 103.5], OVERZ = 4.25;
        const map = L.map(el, { zoomControl: false, scrollWheelZoom: false, zoomSnap: 0.25, attributionControl: true, minZoom: 3, worldCopyJump: false, maxBounds: [[25, 70], [65, 140]], maxBoundsViscosity: 1 }).setView(OVER, OVERZ);
        const SRC: Array<[string, string]> = [
            ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', 'Tiles &copy; Esri'],
            ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', '&copy; OpenStreetMap'],
        ];
        let si = 0, errs = 0, layer: L.TileLayer;
        const addLayer = () => {
            layer = L.tileLayer(SRC[si][0], { maxZoom: 18, minZoom: 3, noWrap: true, attribution: SRC[si][1], crossOrigin: true }).addTo(map);
            layer.on('tileerror', () => { if (++errs > 4 && si < SRC.length - 1) { map.removeLayer(layer); si++; errs = 0; addLayer(); } });
        };
        addLayer();
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const ll: Array<[number, number]> = stops.map(s => [s.lat, s.lon]);
        const bounds = L.latLngBounds(ll).pad(0.45);
        let path: Array<[number, number]> = ll;
        let disposed = false;
        let raf = 0, timer = 0, started = false;

        const pins = stops.map((s, i) => {
            const side = s.side === 'left' ? 'l' : 'r';
            const html = `<div class="trm-pin"><i></i><b>${i + 1}</b><div class="trm-lbl ${side}"><strong>${esc(s.name)}</strong>${s.sub ? `<span>${esc(s.sub)}</span>` : ''}</div></div>`;
            return L.marker([s.lat, s.lon], { icon: L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] }), keyboard: false, zIndexOffset: 100 }).addTo(map);
        });
        const ghost = L.polyline(path, { color: '#123B3A', weight: 2, opacity: 0, dashArray: '2 7', lineCap: 'round' }).addTo(map);
        const halo = L.polyline([], { color: '#FFFFFF', weight: 10, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
        const line = L.polyline([], { color: '#00A88B', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);
        const car = L.marker(ll[0], { icon: L.divIcon({ html: '<div class="trm-car"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] }), keyboard: false, opacity: 0, zIndexOffset: 500 }).addTo(map);

        let near: number[] = [];
        const computeNear = () => {
            near = ll.map(p => { let bi = 0, bd = Infinity; path.forEach((q, k) => { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bd) { bd = d; bi = k; } }); return bi; });
        };
        computeNear();
        const pinEl = (i: number) => pins[i].getElement()?.querySelector('.trm-pin') as HTMLElement | null;
        const setPin = (i: number, on: boolean, cur?: boolean) => { const p = pinEl(i); if (p) { p.classList.toggle('on', on); p.classList.toggle('cur', !!cur); } };
        const showHud = (i: number) => {
            if (hudDayRef.current) hudDayRef.current.textContent = 'STOP ' + (i + 1);
            if (hudNameRef.current) hudNameRef.current.textContent = stops[i].name;
            hudRef.current?.classList.add('on');
        };
        const setBar = (v: number) => { if (barRef.current) barRef.current.style.transform = `scaleX(${v})`; };
        const sized = () => el.clientWidth > 40 && el.clientHeight > 40;

        const finish = () => { pins.forEach((_, i) => setPin(i, true, i === pins.length - 1)); line.setLatLngs(path); halo.setLatLngs(path); car.setOpacity(0); setBar(1); showHud(pins.length - 1); };
        const play = () => {
            if (disposed) return;
            if (!sized()) { started = false; return; }
            map.invalidateSize(false);
            cancelAnimationFrame(raf); window.clearTimeout(timer); map.stop();
            line.setLatLngs([]); halo.setLatLngs([]); car.setOpacity(0); ghost.setStyle({ opacity: 0 }); hudRef.current?.classList.remove('on'); setBar(0);
            pins.forEach((_, i) => setPin(i, false));
            if (reduce) { map.fitBounds(bounds); ghost.setStyle({ opacity: 0.35 }); finish(); return; }
            map.setView(OVER, OVERZ, { animate: false });
            timer = window.setTimeout(() => {
                map.flyToBounds(bounds, { duration: 2.4, easeLinearity: 0.15 });
                map.once('moveend', () => {
                    if (disposed) return;
                    ghost.setStyle({ opacity: 0.35 });
                    setPin(0, true, true); showHud(0);
                    const D = 5200, t0 = performance.now() + 300, N = path.length; let shown = 1;
                    car.setOpacity(1);
                    const step = (t: number) => {
                        const k = Math.max(0, Math.min(1, (t - t0) / D)), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
                        const n = Math.max(2, Math.round(e * (N - 1)) + 1), seg = path.slice(0, n);
                        line.setLatLngs(seg); halo.setLatLngs(seg); car.setLatLng(seg[seg.length - 1]);
                        setBar(Number(e.toFixed(3)));
                        while (shown < near.length && n - 1 >= near[shown]) { setPin(shown - 1, true, false); setPin(shown, true, true); showHud(shown); shown++; }
                        if (k < 1) raf = requestAnimationFrame(step); else { raf = 0; finish(); }
                    };
                    raf = requestAnimationFrame(step);
                });
            }, 600);
        };
        const start = () => { if (!started && sized()) { started = true; play(); } };
        const replay = () => { started = true; play(); };
        const replayBtn = replayRef.current;
        replayBtn?.addEventListener('click', replay);

        // 도로 경로 (3.5초 제한, 실패하면 직선)
        const ctl = new AbortController();
        const abortTimer = window.setTimeout(() => ctl.abort(), 3500);
        fetch('https://router.project-osrm.org/route/v1/driving/' + stops.map(s => s.lon + ',' + s.lat).join(';') + '?overview=full&geometries=geojson', { signal: ctl.signal })
            .then(r => r.json())
            .then(j => {
                if (disposed || !j?.routes?.[0]) return;
                path = j.routes[0].geometry.coordinates.map(([x, y]: [number, number]) => [y, x] as [number, number]);
                ghost.setLatLngs(path);
                computeNear();
                if (started && !raf) finish();
            })
            .catch(() => { /* 직선 경로 유지 */ })
            .finally(() => window.clearTimeout(abortTimer));

        let lastW = 0, rt = 0;
        const ro = new ResizeObserver(() => {
            const w = el.clientWidth; if (!w) return;
            map.invalidateSize(false);
            if (!started) { start(); return; }
            if (Math.abs(w - lastW) > 4) { lastW = w; window.clearTimeout(rt); rt = window.setTimeout(() => { if (!raf) map.fitBounds(bounds, { animate: false }); }, 150); }
        });
        ro.observe(el);
        let io: IntersectionObserver | null = null;
        if ('IntersectionObserver' in window) {
            io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io?.disconnect(); start(); } }, { threshold: 0.3 });
            io.observe(el);
        }
        const fallback = window.setTimeout(start, 1500);

        return () => {
            disposed = true;
            ctl.abort();
            cancelAnimationFrame(raf);
            window.clearTimeout(timer); window.clearTimeout(fallback); window.clearTimeout(rt); window.clearTimeout(abortTimer);
            ro.disconnect(); io?.disconnect();
            replayBtn?.removeEventListener('click', replay);
            map.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    if (stops.length < 2) return null;
    return (
        <div ref={wrapRef} className="trm">
            <style>{CSS}</style>
            <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />
            <div ref={barRef} className="trm-bar" />
            <div ref={hudRef} className="trm-hud"><em ref={hudDayRef}>STOP 1</em><strong ref={hudNameRef} /></div>
            <button ref={replayRef} type="button" className="trm-replay">↻ もう一度見る</button>
        </div>
    );
};
