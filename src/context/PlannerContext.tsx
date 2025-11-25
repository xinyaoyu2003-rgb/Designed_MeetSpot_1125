import React, { createContext, useContext, useState } from 'react';

export type Preferences = {
  duration?: 'short' | 'medium' | 'long';
  budget?: 'low' | 'mid' | 'high';
  indoor?: 'indoor' | 'outdoor' | 'both';
  interests?: Array<'food' | 'leisure' | 'fitness' | 'art' | 'study'>;
  artStyle?: 'observe' | 'diy' | 'none';
  notes?: string;
  onlyFood?: boolean; // 只想吃饭
  cuisineTop?: 'chinese' | 'western' | 'unknown';
  chineseCuisine?: '川菜' | '湘菜' | '江浙菜' | '台湾菜' | '粤菜' | '鲁菜' | '东北菜' | '福建菜' | '徽菜' | '不知道呢';
  westernCuisine?: '日料' | '韩料' | '东南亚菜' | '西餐漂亮饭' | '意大利菜' | '法餐' | '美式' | '英式' | '不知道呢';
  // 当用户在菜系选择“不知道呢”时的引导偏好
  taste?: 'light' | 'spicy' | 'both'; // 清淡/重口/都可以
  prettyMeal?: 'yes' | 'no' | 'either'; // 是否“漂亮饭”
  shopStyle?: 'popular' | 'chain' | 'hole' | 'either'; // 网红店/连锁店/苍蝇小馆/都可以

  // 新增选择项
  timeSlot?: 'morning' | 'afternoon' | 'evening' | 'all_day'; // 上午/下午/晚上/全天
  socialIntent?: 'deep_talk' | 'co_experience' | 'relax'; // 深度交流/共同体验/纯粹放松
  physicalDemand?: 'high' | 'medium' | 'low'; // 消耗型/休闲型/静止型
  mentalEngagement?: 'high' | 'low'; // 高强度/低投入
  noisePreference?: 'noisy' | 'quiet' | 'both'; // 热闹喧嚣/安静私密/都可以
};

export type ActivitySuggestion = {
  id: string;
  title: string;
  category: string; // e.g., 美食探索/休闲娱乐/运动健身/文化艺术/学习成长
  poiKeyword: string; // 用于 POI 搜索的关键词
  description: string;
  reason: string;
  budgetHint: 'low' | 'mid' | 'high';
  durationLabel?: string; // 展示所需的时长标签
};

export type LatLng = { lat: number; lng: number };

export type TransportMode = 'transit' | 'driving';

type PlannerState = {
  preferences: Preferences | null;
  suggestions: ActivitySuggestion[];
  selectedActivity: ActivitySuggestion | null;
  friendA: LatLng | null;
  friendB: LatLng | null;
  transportMode: TransportMode;
};

const PlannerContext = createContext<{
  state: PlannerState;
  setState: React.Dispatch<React.SetStateAction<PlannerState>>;
} | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlannerState>({
    preferences: null,
    suggestions: [],
    selectedActivity: null,
    friendA: null,
    friendB: null,
    transportMode: 'transit',
  });
  return (
    <PlannerContext.Provider value={{ state, setState }}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider');
  return ctx;
}

export function generateActivities(p: Preferences): ActivitySuggestion[] {
  const list: ActivitySuggestion[] = [];
  const durationLabel = p.duration === 'short' ? '2h以内' : p.duration === 'medium' ? '2-4h' : p.duration === 'long' ? '4h以上' : '2h以内';
  const push = (
    title: string,
    category: string,
    poiKeyword: string,
    description: string,
    reason: string,
    budgetHint: 'low'|'mid'|'high'
  ) => list.push({ id: `${poiKeyword}-${list.length}-${Date.now()}`, title, category, poiKeyword, description, reason, budgetHint, durationLabel });

  const budgetMap = p.budget ?? 'mid';
  const indoorPref = p.indoor ?? 'both';

  // 若只想吃饭，则仅推荐餐厅，按所选菜系输出建议
  if (p.onlyFood) {
    const cat = '美食探索';
    const isUnknownTop = p.cuisineTop === 'unknown';
    const isUnknownSub = (p.cuisineTop === 'chinese' && p.chineseCuisine === '不知道呢') || (p.cuisineTop === 'western' && p.westernCuisine === '不知道呢');

    if (isUnknownTop || isUnknownSub) {
      // 根据引导偏好直接推荐“菜系组合”，而非具体活动
      const taste = p.taste ?? 'light';
      const pretty = p.prettyMeal ?? 'either';
      const style = p.shopStyle ?? 'either';

      if (pretty === 'yes') {
        push(
          '推荐：Brunch/漂亮饭',
          cat,
          'brunch',
          '选择环境与摆盘更精致的早午餐或轻西餐餐厅，白天采光好、氛围轻松，适合拍照与交流，可先甜后咸或搭配咖啡小食，整体用时控制在2小时左右。',
          '你偏好“漂亮饭”，我们会优先筛选装盘精致、社交氛围友好的店铺，并兼顾排队时长与人流密度，以提升体验的一致性与舒适度。',
          budgetMap
        );
      }

      if (taste === 'light' || taste === 'both') {
        push(
          '推荐：清淡风格（江浙菜/粤菜/日料）',
          cat,
          '江浙菜',
          '以食材本味为核心，口味更柔和，菜品偏清爽。江浙菜与粤菜强调新鲜与火候控制，日料适合轻食与精致拼盘，整体更利于边聊边吃。',
          '代表菜品如清蒸鱼、白灼虾、刺身等，符合清淡偏好。我们将兼顾评分、人均与交通便利度，避开过度排队的热门店，提升会面效率。',
          budgetMap
        );
      }
      if (taste === 'spicy' || taste === 'both') {
        push(
          '推荐：重口风格（川菜/湘菜/韩料/东南亚）',
          cat,
          '川菜',
          '香辣与浓郁风味更具记忆点，适合热烈的社交氛围。川湘菜口味层次丰富；韩料与东南亚菜兼具酸辣与新鲜配菜，适合分享与互动。',
          '代表菜品如火锅、辣炒鸡、冬阴功等，满足重口需求。我们会优先考虑口碑稳定、出品统一的店，并结合双方路程公平性筛选候选清单。',
          budgetMap
        );
      }

      // 根据店铺风格补充理由
      if (style !== 'either') {
        const styleMap: Record<string,string> = {
          popular: '偏好网红店：环境与拍照氛围更佳。',
          chain: '偏好连锁店：稳定性好，出品更均衡。',
          hole: '偏好苍蝇小馆：性价比高，口味地道。'
        };
        push(
          '店铺风格偏好',
          cat,
          '餐厅',
          '我们会在候选列表中应用你的风格偏好（如网红店、连锁店或苍蝇小馆），并与评分、人均和路线耗时共同作为筛选维度，得到更贴合的一致性体验。',
          styleMap[style],
          budgetMap
        );
      }

      return list.slice(0, 5);
    }

    // 已选择明确菜系：按该菜系给出餐厅活动
    let keyword: string;
    if (p.cuisineTop === 'western') {
      keyword = !p.westernCuisine || p.westernCuisine === '不知道呢' ? '西餐' : p.westernCuisine;
    } else if (p.cuisineTop === 'chinese') {
      keyword = !p.chineseCuisine || p.chineseCuisine === '不知道呢' ? '中餐' : p.chineseCuisine;
    } else {
      keyword = '餐厅';
    }
    push(
      `一起吃${keyword}`,
      cat,
      keyword,
      `前往附近评价较好的${keyword}餐厅，优先考虑口碑与环境的一致性；用餐过程中更容易保持轻松节奏，便于交流与建立共同记忆。我们会控制整体用时在${durationLabel}范围内，并结合人流与排队因素提高体验确定性。`,
      `按你的偏好推荐${keyword}餐厅，并综合评分与人均消费筛选，保障体验与预算匹配。道路规划将兼顾双方的路线公平性，避免极端不均衡。`,
      budgetMap
    );
    push(
      '口碑餐馆优选',
      cat,
      keyword,
      '在同类餐厅中优先选择评分更高、环境舒适且排队可控的店铺。通过综合评价与出品稳定性，我们减少踩雷概率，同时兼顾就餐时的交流氛围。',
      '选择口碑稳定的店，以更可预期的用餐体验降低不确定性；若存在热门与冷门选项，我们优先平衡等待时间与菜品质量。',
      budgetMap
    );
    push(
      '交通便捷优先',
      cat,
      keyword,
      '根据双方地址在中点附近选店，减少整体路程成本与疲劳感。若当前可用，将使用真实路线耗时进行评估，并在公平性与总耗时之间做权衡。',
      '兼顾双方耗时公平（P1）与总耗时（P2），优先路线更均衡的候选店，让聚会以更轻松的状态开始。',
      budgetMap
    );
    return list.slice(0, 5);
  }

  // 美食探索（常规）
  if (!p.interests || p.interests.includes('food')) {
    push(
      '咖啡厅深聊',
      '美食探索',
      '咖啡厅',
      '选择安静、座位舒适且采光良好的咖啡厅，更适合首次或深入聊天。可搭配轻食或甜点，避免过强的味觉刺激影响交谈节奏。',
      '安静环境与适中的人均便于交流，若偏内向或中间型也能舒适表达；我们会控制用时并兼顾路线便利度。',
      budgetMap === 'low' ? 'low' : 'mid'
    );
    push(
      '地方特色餐馆',
      '美食探索',
      budgetMap === 'high' ? '精品餐厅' : '川菜',
      '在具有地方风味的餐馆品尝特色菜式，兼顾味道与氛围。我们将平衡评分、人均与可能的排队时长，选择出品稳定的店铺，减少时间不确定性。',
      '尝试口碑餐馆以保证体验；若你偏好新鲜事物，我们会优先含新开门店或特色限定的候选。',
      budgetMap
    );
  }

  // 休闲娱乐
  if (!p.interests || p.interests.includes('leisure')) {
    const indoor = indoorPref !== 'outdoor';
    push(
      indoor ? '桌游/密室轻团建' : '城市漫步+甜品',
      '休闲娱乐',
      indoor ? '桌游' : '甜品店',
      indoor ? '选择合作型桌游或轻量密室，过程更注重协作与沟通。适度的挑战能提升互动质量，同时避免过度体力消耗。' : '以轻徒步为主线，途中挑选甜品店短暂停留，形成节奏更平衡的交流体验。',
      indoor ? '合作与交流并重，建议控制在2-4小时；我们会考虑路线便捷性与候场时间，以保持社交节奏。' : '低压力社交更容易建立联系；甜品店停留提供舒适空间与补给，整体更友好。',
      budgetMap === 'low' ? 'low' : 'mid'
    );
  }

  // 运动健身
  if (p.interests?.includes('fitness')) {
    push(
      '轻运动：羽毛球/保龄球',
      '运动健身',
      '运动馆',
      '选择门槛较低且上手快的项目，如羽毛球或保龄球，既有对抗又不至于太累。更适合在活动中穿插休息与交流，整体体验更均衡。',
      '轻松对抗带来互动与愉悦，适合外向或中间型；我们会优先路线便利、场馆口碑稳定的候选，以提升确定性。',
      'mid'
    );
  }

  // 文化艺术
  if (p.interests?.includes('art')) {
    const diy = p.artStyle === 'diy';
    push(
      diy ? '陶艺/手作工坊' : '美术馆参观',
      '文化艺术',
      diy ? '手作DIY' : '美术馆',
      diy ? '在陶艺或手作工坊沉浸式体验创作，共同完成一件作品，过程中的协作与分享能自然拉近距离。' : '选择合适规模与主题的展馆，以舒适的步速边走边聊，获得审美与交流双重体验。',
      diy ? '共同创作增进默契，记忆点更鲜明；我们会兼顾交通与时长控制。' : '安静观展更适合深度交流与思考；优先排队短的展馆，提升节奏流畅度。',
      budgetMap
    );
  }

  // 学习成长
  if (p.interests?.includes('study')) {
    push(
      '读书会/主题分享',
      '学习成长',
      '书店',
      '在书店或咖啡空间组织小型读书会或主题分享，话题更聚焦且节奏稳定，适合希望进行更深入交流的场景。',
      '强调内容与观点交换，氛围安静、干扰少；我们会控制时长并选择更舒适的座位与灯光环境。',
      'low'
    );
  }

  return list.slice(0, 5);
}