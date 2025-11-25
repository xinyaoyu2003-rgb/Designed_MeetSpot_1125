import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanner } from '../context/PlannerContext';
import { searchPOIs } from '../components/PoiProvider';
import type { Poi } from '../components/MapView';

export default function Confirm() {
  const { state, setState } = usePlanner();
  const nav = useNavigate();
  const [topPoisMap, setTopPoisMap] = useState<Record<string, Poi[]>>({});

  const defaultCenter = useMemo(() => ({ lat: 31.2304, lng: 121.4737 }), []); // 上海市中心坐标

  const choose = (id: string) => {
    const sel = state.suggestions.find(s => s.id === id) || null;
    setState((st) => ({ ...st, selectedActivity: sel }));
    nav('/balance');
  };

  useEffect(() => {
    // 仅当“只想吃饭”且明确选择了子菜系时，在确认页直接推荐3-5家餐厅
    const prefs = state.preferences;
    if (!prefs?.onlyFood) return;

    // 判定是否明确子菜系（非“不知道呢”）
    const isExplicitCuisine = (
      (prefs.cuisineTop === 'western' && prefs.westernCuisine && prefs.westernCuisine !== '不知道呢') ||
      (prefs.cuisineTop === 'chinese' && prefs.chineseCuisine && prefs.chineseCuisine !== '不知道呢')
    );
    if (!isExplicitCuisine) return;

    // 选择一个主要美食建议，在该卡片下展示候选餐厅
    const primary = state.suggestions.find(s => s.category === '美食探索');
    if (!primary) return;

    const budgetHint = primary.budgetHint;
    const keyword = primary.poiKeyword;

    (async () => {
      try {
        const list = await searchPOIs(defaultCenter, keyword, budgetHint);

        // 预算严格过滤：低/中/高
        const inBudget = (price: number) => {
          if (budgetHint === 'low') return price <= 100;
          if (budgetHint === 'mid') return price >= 100 && price <= 300;
          return price >= 300;
        };

        // 按评分排序，确保预算优先；不足3家时适度放宽到最接近预算的候选
        const strict = list.filter(p => inBudget(p.price));
        const sortedStrict = strict.sort((a, b) => b.rating - a.rating);

        let top: Poi[] = sortedStrict.slice(0, 5);
        if (top.length < 3) {
          const target = budgetHint === 'low' ? 80 : budgetHint === 'mid' ? 200 : 350;
          const relaxed = list
            .filter(p => !strict.includes(p))
            .sort((a, b) => {
              const dr = b.rating - a.rating;
              if (Math.abs(dr) > 0.1) return dr; // 评分优先
              const da = Math.abs(a.price - target);
              const db = Math.abs(b.price - target);
              return da - db; // 接近目标人均次之
            });
          top = [...sortedStrict, ...relaxed].slice(0, 5);
        }

        // 尝试补充高德详情照片作为 logo
        const AMAP_KEY = import.meta.env.VITE_AMAP_KEY as string | undefined;
        async function fetchAmapLogo(poiId: string): Promise<string | null> {
          if (!AMAP_KEY) return null;
          try {
            const url = `https://restapi.amap.com/v3/place/detail?key=${AMAP_KEY}&id=${poiId}`;
            const res = await fetch(url);
            const data = await res.json();
            const photos = data?.pois?.[0]?.photos;
            const url0 = photos?.[0]?.url;
            return typeof url0 === 'string' && url0 ? url0 : null;
          } catch { return null; }
        }

        const withLogo: Poi[] = [];
        for (const p of top) {
          let logoUrl: string | undefined;
          // 仅当 id 看起来像高德ID时尝试拉取详情图
          if (/^\d+$/.test(p.id)) {
            const u = await fetchAmapLogo(p.id);
            if (u) logoUrl = u;
          }
          withLogo.push({ ...p, logoUrl });
        }

        setTopPoisMap((prev) => ({ ...prev, [primary.id]: withLogo }));
      } catch {}
    })();
  }, [state.preferences, state.suggestions, defaultCenter]);

  if (!state.suggestions?.length) {
    return (
      <section>
        <h2>请先完成活动策划</h2>
        <p>未找到活动建议，请返回上一步。</p>
        <button onClick={() => nav('/plan')}>返回活动策划</button>
      </section>
    );
  }

  // 若第一步明确选择了菜系，仅保留“一起吃{菜系}”这一张卡片
  const prefs = state.preferences;
  const hasExplicitCuisine = !!(prefs?.onlyFood && (
    (prefs.cuisineTop === 'western' && prefs.westernCuisine && prefs.westernCuisine !== '不知道呢') ||
    (prefs.cuisineTop === 'chinese' && prefs.chineseCuisine && prefs.chineseCuisine !== '不知道呢')
  ));
  const showing = hasExplicitCuisine
    ? state.suggestions.filter(s => s.category === '美食探索' && s.title.startsWith('一起吃')).slice(0, 1)
    : state.suggestions;

  return (
    <section>
      <h2>Step 2：为你推荐</h2>
      <p className="hint">选择一个你喜欢的活动，继续寻找最佳见面地点</p>
      <div className="cards">
        {showing.map((sug) => (
          <div key={sug.id} className="card">
            <h3>{sug.title}</h3>
            {(() => {
              const budgetLabel = sug.budgetHint === 'low' ? '¥100以下' : sug.budgetHint === 'high' ? '¥300以上' : '¥100-300';
              return <p className="meta">【{sug.category}·{sug.durationLabel ?? '未知'}·{budgetLabel}】</p>;
            })()}
            <p><strong>活动描述</strong></p>
            <p>{sug.description}</p>
            <p><strong>推荐理由</strong></p>
            <p className="reason">{sug.reason}</p>

            {topPoisMap[sug.id] && topPoisMap[sug.id].length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p><strong>餐厅推荐（按预算与口碑）</strong></p>
                <ul className="suggest suggest-full">
                  {topPoisMap[sug.id].map((p) => {
                    const amapMarker = `https://uri.amap.com/marker?position=${p.latlng.lng},${p.latlng.lat}&name=${encodeURIComponent(p.name)}`;
                    const dianping = `https://www.dianping.com/search/keyword/0/${encodeURIComponent(p.name)}`;
                    return (
                      <li key={p.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {p.logoUrl ? (
                              <img className="poi-logo" src={p.logoUrl} alt={p.name} />
                            ) : (
                              <div className="poi-logo" style={{ background: '#eee', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {p.name.slice(0,1)}
                              </div>
                            )}
                            <div>
                              <a className="link" href={amapMarker} target="_blank" rel="noreferrer">{p.name}</a>
                              <div style={{ fontSize: 12 }}>
                                <a className="link" href={dianping} target="_blank" rel="noreferrer">大众点评搜索</a>
                                {' · '}
                                <a className="link" href={amapMarker} target="_blank" rel="noreferrer">高德地图</a>
                              </div>
                            </div>
                          </div>
                          <span>评分 {p.rating.toFixed(1)}｜人均 ¥{p.price}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <button className="primary" onClick={() => choose(sug.id)}>选择此活动</button>
          </div>
        ))}
      </div>
    </section>
  );
}