import { LatLng } from '../context/PlannerContext';
import { Poi } from './MapView';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY as string | undefined;
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY as string | undefined;

export type Suggestion = { label: string; latlng: LatLng };

function priceFromBudget(budgetHint: 'low'|'mid'|'high') {
  return budgetHint === 'low' ? 60 : budgetHint === 'mid' ? 180 : 350;
}

export async function searchPOIs(center: LatLng, keyword: string, budgetHint: 'low'|'mid'|'high'): Promise<Poi[]> {
  if (GOOGLE_KEY) {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword)}&location=${center.lat},${center.lng}&radius=3000&language=zh-CN&key=${GOOGLE_KEY}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data.results)) {
        return data.results.slice(0, 20).map((r:any, i:number) => ({
          id: r.place_id || `${keyword}-${i}-${Date.now()}`,
          name: r.name,
          latlng: { lat: r.geometry?.location?.lat ?? center.lat, lng: r.geometry?.location?.lng ?? center.lng },
          rating: typeof r.rating === 'number' ? r.rating : 4.0,
          price: priceFromBudget(budgetHint)
        }));
      }
    } catch {}
  }

  if (AMAP_KEY) {
    const url = `https://restapi.amap.com/v3/place/around?location=${center.lng},${center.lat}&keywords=${encodeURIComponent(keyword)}&radius=3000&offset=20&key=${AMAP_KEY}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data.pois)) {
        return data.pois.slice(0, 20).map((p:any, i:number) => {
          const [lngStr, latStr] = (p.location || '').split(',');
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);
          const ratingRaw = p.biz_ext?.rating;
          const costRaw = p.biz_ext?.cost ?? p.biz_ext?.lowest_price;
          const ratingVal = typeof ratingRaw === 'number' ? ratingRaw : parseFloat(ratingRaw);
          const costVal = typeof costRaw === 'number' ? costRaw : parseFloat(costRaw);
          return {
            id: p.id || `${keyword}-${i}-${Date.now()}`,
            name: p.name,
            latlng: { lat: isNaN(lat) ? center.lat : lat, lng: isNaN(lng) ? center.lng : lng },
            rating: !isNaN(ratingVal) ? ratingVal : 4.2,
            price: !isNaN(costVal) ? Math.round(costVal) : priceFromBudget(budgetHint)
          } as Poi;
        });
      }
    } catch {}
  }

  // Fallback: generate random POIs near center
  const radiusKm = 3;
  const count = 15;
  const budgetValue = priceFromBudget(budgetHint);
  const list: Poi[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.random() * radiusKm;
    const dLat = (dist / 111) * Math.cos(angle);
    const dLng = (dist / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
    list.push({
      id: `${keyword}-${i}`,
      name: `${keyword}店-${i + 1}`,
      latlng: { lat: center.lat + dLat, lng: center.lng + dLng },
      rating: 3.8 + Math.random() * 1.2,
      price: Math.round(budgetValue * (0.7 + Math.random() * 0.6)),
    });
  }
  return list;
}

// 常用城市的近似中心与搜索半径（米），用于偏向或限定自动补全结果到指定城市
const CITY_CENTER: Record<string, { lat: number; lng: number; radius: number }> = {
  '上海市': { lat: 31.2304, lng: 121.4737, radius: 30000 },
  '北京市': { lat: 39.9042, lng: 116.4074, radius: 30000 },
  '杭州市': { lat: 30.2741, lng: 120.1551, radius: 25000 },
  '广州市': { lat: 23.1291, lng: 113.2644, radius: 30000 },
  '深圳市': { lat: 22.5431, lng: 114.0579, radius: 30000 },
};

export async function autocompleteAddresses(query: string, city?: string): Promise<Suggestion[]> {
  if (!query.trim()) return [];
  const suggestions: Suggestion[] = [];
  try {
    if (GOOGLE_KEY) {
      // 限制到中国区域，并在提供城市时偏向该城市
      const cityCfg = city ? CITY_CENTER[city] : undefined;
      const locationParam = cityCfg ? `&location=${cityCfg.lat},${cityCfg.lng}&radius=${cityCfg.radius}&strictbounds=true` : '';
      const autoUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&language=zh-CN&components=country:cn${locationParam}&key=${GOOGLE_KEY}`;
      const autoRes = await fetch(autoUrl);
      const autoData = await autoRes.json();
      if (Array.isArray(autoData.predictions)) {
        for (const pred of autoData.predictions.slice(0, 5)) {
          const detUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pred.place_id}&language=zh-CN&key=${GOOGLE_KEY}`;
          const detRes = await fetch(detUrl);
          const detData = await detRes.json();
          const loc = detData.result?.geometry?.location;
          const label = detData.result?.formatted_address || pred.description;
          const addrComps: any[] = detData.result?.address_components || [];
          const matchCity = !city || (typeof label === 'string' && label.includes(city)) || addrComps.some((c:any) => c.long_name === city);
          if (loc && matchCity) suggestions.push({ label, latlng: { lat: loc.lat, lng: loc.lng } });
        }
        if (suggestions.length) return suggestions;
      }
    }
  } catch {}

  try {
    if (AMAP_KEY) {
      const cityParam = city ? `&city=${encodeURIComponent(city)}` : '';
      const url = `https://restapi.amap.com/v3/assistant/inputtips?keywords=${encodeURIComponent(query)}${cityParam}&key=${AMAP_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data.tips)) {
        for (const tip of data.tips.slice(0, 5)) {
          const [lngStr, latStr] = (tip.location || '').split(',');
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);
          const label = tip.name || tip.address;
          const matchCity = !city || (typeof tip.district === 'string' && tip.district.includes(city)) || (typeof label === 'string' && label.includes(city));
          if (!isNaN(lat) && !isNaN(lng) && matchCity) suggestions.push({ label, latlng: { lat, lng } });
        }
        if (suggestions.length) return suggestions;
      }
    }
  } catch {}

  try {
    // 限制到中国区域，并在提供城市时为查询增加城市关键词
    const q = city ? `${city} ${query}` : query;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=cn`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'zh-CN' } });
    const data = await res.json();
    if (Array.isArray(data)) {
      const list = data.map((item:any) => ({ label: item.display_name, latlng: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) } }));
      return city ? list.filter((s:Suggestion) => typeof s.label === 'string' && s.label.includes(city)) : list;
    }
  } catch {}

  return suggestions;
}