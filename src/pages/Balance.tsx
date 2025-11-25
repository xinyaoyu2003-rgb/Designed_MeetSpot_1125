import { useEffect, useMemo, useState } from 'react';
import { usePlanner, LatLng, TransportMode } from '../context/PlannerContext';
import { Poi } from '../components/MapView';
import { autocompleteAddresses, searchPOIs, Suggestion } from '../components/PoiProvider';

function haversine(a: LatLng, b: LatLng): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c; // km
}

function estimateMinutes(km: number, mode: TransportMode): number {
  const speed = mode === 'driving' ? 35 : 25; // km/h 粗略估算
  return Math.round((km / speed) * 60);
}

function mid(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

async function geocodeAddress(query: string): Promise<LatLng | null> {
  if (!query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'zh-CN' } });
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      const item = data[0];
      return { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
    }
  } catch (e) {
    console.warn('Geocode failed', e);
  }
  return null;
}

function randomPOIs(center: LatLng, keyword: string, budgetHint: 'low'|'mid'|'high'): Poi[] {
  const radiusKm = 3; // 在中点周围3km生成候选
  const count = 15;
  const list: Poi[] = [];
  const budgetValue = budgetHint === 'low' ? 60 : budgetHint === 'mid' ? 180 : 350;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.random() * radiusKm;
    const dLat = (dist / 111) * Math.cos(angle);
    const dLng = (dist / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
    list.push({
      id: `${keyword}-${i}`,
      name: `${keyword}店-${i + 1}`,
      latlng: { lat: center.lat + dLat, lng: center.lng + dLng },
      rating: 3.5 + Math.random() * 1.5,
      price: Math.round(budgetValue * (0.7 + Math.random() * 0.6)),
    });
  }
  return list;
}

type Ranked = {
  poi: Poi;
  tA: number;
  tB: number;
  delta: number; // P1 公平性差
  total: number; // P2 总耗时
};

function amapLink(from: LatLng, to: LatLng, mode: TransportMode) {
  const m = mode === 'driving' ? 'car' : 'bus';
  return `https://uri.amap.com/navigation?from=${from.lng},${from.lat},A&to=${to.lng},${to.lat},P&mode=${m}`;
}

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY as string | undefined;

async function drivingMinutes(origin: LatLng, dest: LatLng): Promise<number | null> {
  if (!AMAP_KEY) return null;
  try {
    const url = `https://restapi.amap.com/v3/direction/driving?origin=${origin.lng},${origin.lat}&destination=${dest.lng},${dest.lat}&strategy=0&key=${AMAP_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const sec = Number(data?.route?.paths?.[0]?.duration);
    if (isNaN(sec)) return null;
    return Math.max(1, Math.round(sec / 60));
  } catch {
    return null;
  }
}

export default function Balance() {
  const { state, setState } = usePlanner();
  const [mode, setMode] = useState<TransportMode>(state.transportMode);
  const [city, setCity] = useState<string>('上海市');
  const [pois, setPois] = useState<Poi[]>([]);
  const [durations, setDurations] = useState<Record<string, { tA: number; tB: number }>>({});
  const [aInput, setAInput] = useState('');
  const [bInput, setBInput] = useState('');
  const [aTips, setATips] = useState<Suggestion[]>([]);
  const [bTips, setBTips] = useState<Suggestion[]>([]);

  const a = state.friendA;
  const b = state.friendB;

  const center = useMemo(() => (a && b ? mid(a, b) : null), [a, b]);

  const canCalc = a && b && state.selectedActivity;

  const recs: Ranked[] = useMemo(() => {
    if (!canCalc || !center) return [];
    const keyword = state.selectedActivity!.poiKeyword;
    const budgetHint = state.selectedActivity!.budgetHint;
    const candidates = pois;
    return candidates.map((p) => {
      const dA = haversine(a!, p.latlng);
      const dB = haversine(b!, p.latlng);
      const estA = estimateMinutes(dA, mode);
      const estB = estimateMinutes(dB, mode);
      const realA = durations[p.id]?.tA;
      const realB = durations[p.id]?.tB;
      const tA = typeof realA === 'number' ? realA : estA;
      const tB = typeof realB === 'number' ? realB : estB;
      return { poi: p, tA, tB, delta: Math.abs(tA - tB), total: tA + tB };
    }).sort((x, y) => x.delta - y.delta || x.total - y.total).slice(0, 5);
  }, [a, b, center, mode, pois, state.selectedActivity, durations]);

  const setA = (latlng: LatLng) => setState((s) => ({ ...s, friendA: latlng }));
  const setB = (latlng: LatLng) => setState((s) => ({ ...s, friendB: latlng }));

  async function refreshCandidates() {
    if (!state.selectedActivity || !a || !b) return;
    const keyword = state.selectedActivity.poiKeyword;
    const budgetHint = state.selectedActivity.budgetHint;
    const c = mid(a, b);
    const list = await searchPOIs(c, keyword, budgetHint);
    setPois(list);
    setDurations({});
  }

  async function transitMinutes(origin: LatLng, dest: LatLng, city: string): Promise<number | null> {
    if (!AMAP_KEY) return null;
    try {
      const url = `https://restapi.amap.com/v3/direction/transit/integrated?origin=${origin.lng},${origin.lat}&destination=${dest.lng},${dest.lat}&city=${encodeURIComponent(city)}&strategy=0&key=${AMAP_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const raw = data?.route?.transits?.[0]?.duration;
      const sec = typeof raw === 'number' ? raw : Number(raw);
      if (isNaN(sec)) return null;
      return Math.max(1, Math.round(sec / 60));
    } catch {
      return null;
    }
  }

  useEffect(() => {
    // 若配置了高德Key且选择驾车，则预取真实耗时
    (async () => {
      if (!AMAP_KEY || mode !== 'driving' || !a || !b || !pois.length) return;
      const updates: Record<string, { tA: number; tB: number }> = {};
      for (const p of pois) {
        const tA = await drivingMinutes(a, p.latlng);
        const tB = await drivingMinutes(b, p.latlng);
        if (typeof tA === 'number' && typeof tB === 'number') {
          updates[p.id] = { tA, tB };
        }
      }
      if (Object.keys(updates).length) setDurations((prev) => ({ ...prev, ...updates }));
    })();
  }, [AMAP_KEY, mode, a, b, pois]);

  useEffect(() => {
    // 公共交通模式：使用高德公交综合接口按城市获取真实耗时
    (async () => {
      if (!AMAP_KEY || mode !== 'transit' || !a || !b || !pois.length) return;
      const updates: Record<string, { tA: number; tB: number }> = {};
      for (const p of pois) {
        const tA = await transitMinutes(a, p.latlng, city);
        const tB = await transitMinutes(b, p.latlng, city);
        if (typeof tA === 'number' && typeof tB === 'number') {
          updates[p.id] = { tA, tB };
        }
      }
      if (Object.keys(updates).length) setDurations((prev) => ({ ...prev, ...updates }));
    })();
  }, [AMAP_KEY, mode, a, b, pois, city]);

  if (!state.selectedActivity) {
    return (
      <section>
        <h2>请先选择活动</h2>
        <button onClick={() => location.assign('/confirm')}>返回活动确认</button>
      </section>
    );
  }

  return (
    <section>
      <h2>Step 3：地点均衡器</h2>
      <p>请输入双方的地址进行计算（可解析为坐标）。</p>

      <div className="grid">
        <label>
          交通模式
          <select value={mode} onChange={(e) => setMode(e.target.value as TransportMode)}>
            <option value="transit">公共交通（默认）</option>
            <option value="driving">打车/驾车</option>
          </select>
        </label>

        <label>
          城市
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="上海市">上海市</option>
            <option value="北京市">北京市</option>
            <option value="杭州市">杭州市</option>
            <option value="广州市">广州市</option>
            <option value="深圳市">深圳市</option>
          </select>
        </label>

        <label>
          好友 A 地址
          <input id="addrA" placeholder="例如：上海市黄浦区南京东路" value={aInput} onChange={async (e) => {
            const v = e.target.value; setAInput(v);
            const tips = await autocompleteAddresses(v);
            setATips(tips);
          }} />
          {aTips.length > 0 && (
            <ul className="suggest">
              {aTips.map((sug, i) => (
                <li key={i} onClick={async () => {
                  setAInput(sug.label); setATips([]); setA(sug.latlng); await refreshCandidates();
                }}>{sug.label}</li>
              ))}
            </ul>
          )}
        </label>

        <label>
          好友 B 地址
          <input id="addrB" placeholder="例如：上海市静安区北京西路" value={bInput} onChange={async (e) => {
            const v = e.target.value; setBInput(v);
            const tips = await autocompleteAddresses(v);
            setBTips(tips);
          }} />
          {bTips.length > 0 && (
            <ul className="suggest">
              {bTips.map((sug, i) => (
                <li key={i} onClick={async () => {
                  setBInput(sug.label); setBTips([]); setB(sug.latlng); await refreshCandidates();
                }}>{sug.label}</li>
              ))}
            </ul>
          )}
        </label>
      </div>

      <div className="actions">
        <button className="primary" onClick={refreshCandidates}>确认地址并推荐商家</button>
      </div>

      <h3>推荐商家（前 5）</h3>
      {!canCalc && <p className="warn">请先在地图上设定好友 A 和好友 B 的位置。</p>}
      {canCalc && (
        <table className="table">
          <thead>
            <tr>
              <th>商家名称</th>
              <th>评分</th>
              <th>人均</th>
              <th>A 耗时</th>
              <th>B 耗时</th>
              <th>旅行时间差 (P1)</th>
              <th>总耗时 (P2)</th>
              <th>路线</th>
            </tr>
          </thead>
          <tbody>
            {recs.map(({ poi, tA, tB, delta, total }) => (
              <tr key={poi.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {poi.logoUrl ? (
                      <img className="poi-logo" src={poi.logoUrl} alt={poi.name} />
                    ) : (
                      <div className="poi-logo" style={{ background: '#eee', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {poi.name.slice(0,1)}
                      </div>
                    )}
                    <div>
                      <a className="link" target="_blank" href={`https://uri.amap.com/marker?position=${poi.latlng.lng},${poi.latlng.lat}&name=${encodeURIComponent(poi.name)}`}>{poi.name}</a>
                      <div style={{ fontSize: 12 }}>
                        <a className="link" target="_blank" href={`https://www.dianping.com/search/keyword/0/${encodeURIComponent(poi.name)}`}>大众点评搜索</a>
                        {' · '}
                        <a className="link" target="_blank" href={`https://uri.amap.com/marker?position=${poi.latlng.lng},${poi.latlng.lat}&name=${encodeURIComponent(poi.name)}`}>高德地图</a>
                      </div>
                    </div>
                  </div>
                </td>
                <td>{poi.rating.toFixed(1)}</td>
                <td>¥{poi.price}</td>
                <td>{tA} 分</td>
                <td>{tB} 分</td>
                <td>{delta} 分</td>
                <td>{total} 分</td>
                <td>
                  {a && <a className="link" target="_blank" href={amapLink(a, poi.latlng, mode)}>A→店</a>}
                  {' | '}
                  {b && <a className="link" target="_blank" href={amapLink(b, poi.latlng, mode)}>B→店</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="note">说明：已接入高德驾车与公交综合路线以获取真实耗时（需配置 `VITE_AMAP_KEY`）。公共交通模式按所选城市（默认上海市）返回耗时；未配置时回退直线估算。评分与人均消费已优先取自高德POI返回。</p>
    </section>
  );
}