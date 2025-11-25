import { useNavigate } from 'react-router-dom';
import { usePlanner, generateActivities, Preferences } from '../context/PlannerContext';
import { useState } from 'react';

export default function Plan() {
  const { setState } = usePlanner();
  const nav = useNavigate();
  const [form, setForm] = useState<Preferences>({
    interests: []
  });

  const update = (key: keyof Preferences, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const toggleInterest = (v: NonNullable<Preferences['interests']>[number]) => {
    setForm((f) => {
      const s = new Set(f.interests ?? []);
      if (s.has(v)) s.delete(v); else s.add(v);
      return { ...f, interests: Array.from(s) };
    });
  };

  const submit = () => {
    const suggestions = generateActivities(form);
    setState((s) => ({ ...s, preferences: form, suggestions }));
    nav('/confirm');
  };

  // 明确活动类型：先是/否，再选择具体活动；支持“其他”自定义
  const [explicitYesNo, setExplicitYesNo] = useState<string>('');
  const [otherActivity, setOtherActivity] = useState<string>('');

  type ExplicitOpt = { label: string; keyword: string; category: '休闲娱乐'|'运动健身'|'文化艺术'|'美食探索'; pinyin: string };
  const ACTIVITY_OPTIONS: ExplicitOpt[] = [
    // 运动健身
    { label: '保龄球', keyword: '保龄球馆', category: '运动健身', pinyin: 'baolingqiu' },
    { label: '棒球', keyword: '棒球场', category: '运动健身', pinyin: 'bangqiu' },
    { label: '篮球', keyword: '篮球场', category: '运动健身', pinyin: 'lanqiu' },
    { label: '乒乓球', keyword: '乒乓球馆', category: '运动健身', pinyin: 'bingbangqiu' },
    { label: '排球', keyword: '排球场', category: '运动健身', pinyin: 'paiqiu' },
    { label: '网球', keyword: '网球场', category: '运动健身', pinyin: 'wangqiu' },
    { label: '羽毛球', keyword: '羽毛球馆', category: '运动健身', pinyin: 'yumaqiu' },
    { label: '足球', keyword: '足球场', category: '运动健身', pinyin: 'zuqiu' },
    { label: '飞盘', keyword: '飞盘场', category: '运动健身', pinyin: 'feipan' },
    { label: '保健/游泳', keyword: '游泳馆', category: '运动健身', pinyin: 'youyong' },
    { label: '跑步', keyword: '跑步公园', category: '运动健身', pinyin: 'paobu' },
    { label: '骑行', keyword: '骑行路线', category: '运动健身', pinyin: 'qixing' },
    { label: '徒步', keyword: '徒步路线', category: '运动健身', pinyin: 'tubu' },
    { label: '滑板', keyword: '滑板公园', category: '运动健身', pinyin: 'huaban' },
    { label: '射箭', keyword: '射箭馆', category: '运动健身', pinyin: 'shejian' },
    { label: '桌球', keyword: '桌球馆', category: '运动健身', pinyin: 'zhuoqiu' },
    { label: '保健/瑜伽', keyword: '瑜伽馆', category: '运动健身', pinyin: 'yujia' },

    // 休闲娱乐
    { label: '桌游', keyword: '桌游吧', category: '休闲娱乐', pinyin: 'zhuoyou' },
    { label: '密室逃脱', keyword: '密室', category: '休闲娱乐', pinyin: 'mishitaotuo' },
    { label: 'KTV', keyword: 'KTV', category: '休闲娱乐', pinyin: 'ktv' },
    { label: '保龄/滚球', keyword: '保龄球馆', category: '休闲娱乐', pinyin: 'baoling' },
    { label: '台球', keyword: '台球馆', category: '休闲娱乐', pinyin: 'taiqiu' },
    { label: '飞镖', keyword: '飞镖吧', category: '休闲娱乐', pinyin: 'feibiao' },
    { label: '投篮机/街机', keyword: '电玩', category: '休闲娱乐', pinyin: 'dianwan' },
    { label: '保龄/保龄球', keyword: '保龄球馆', category: '休闲娱乐', pinyin: 'baolingqiu2' },

    // 文化艺术 / 手作
    { label: '陶瓷/陶艺', keyword: '陶艺手作', category: '文化艺术', pinyin: 'taoyi' },
    { label: '拼豆', keyword: '拼豆手作', category: '文化艺术', pinyin: 'pindou' },
    { label: '绘画/手绘', keyword: '绘画手作', category: '文化艺术', pinyin: 'huihua' },
    { label: '烘焙课', keyword: '烘焙教室', category: '文化艺术', pinyin: 'hongbei' },
    { label: '摄影漫步', keyword: '摄影基地', category: '文化艺术', pinyin: 'sheying' },
    { label: '咖啡品鉴', keyword: '咖啡馆', category: '美食探索', pinyin: 'kafei' },
    { label: '茶艺体验', keyword: '茶馆', category: '美食探索', pinyin: 'chayi' },
    { label: '葡萄酒品鉴', keyword: '酒吧', category: '美食探索', pinyin: 'putaojiu' },
    { label: '美术馆', keyword: '美术馆', category: '文化艺术', pinyin: 'meishuguan' },
    { label: '博物馆', keyword: '博物馆', category: '文化艺术', pinyin: 'bowuguan' },
    { label: '电影/影院', keyword: '电影院', category: '休闲娱乐', pinyin: 'dianying' },
    { label: '剧场/话剧', keyword: '剧场', category: '文化艺术', pinyin: 'juchang' },
    { label: '脱口秀/演出', keyword: '剧场', category: '文化艺术', pinyin: 'tuokouxiu' },
  ];
  const SORTED_OPTIONS = ACTIVITY_OPTIONS.slice().sort((a, b) => a.pinyin.localeCompare(b.pinyin));

  const commitExplicitActivity = (opt: { label: string; keyword: string; category: ExplicitOpt['category'] } | null, customLabel?: string) => {
    const label = customLabel ?? opt?.label ?? '自定义活动';
    const keyword = opt?.keyword ?? (customLabel ?? '活动');
    const category = opt?.category ?? '休闲娱乐';
    const durationLabel = form.duration === 'short' ? '2h以内' : form.duration === 'medium' ? '2-4h' : form.duration === 'long' ? '4h以上' : '2h以内';
    const budgetHint = form.budget ?? 'mid';
    const suggestion = {
      id: `explicit-${keyword}-${Date.now()}`,
      title: `一起${label}`,
      category,
      poiKeyword: keyword,
      description: `根据你的选择，推荐“${label}”相关的场地或店铺，并综合评分、环境与交通公平性进行筛选。`,
      reason: '你已明确活动类型，我们将集中匹配合适场地并控制整体用时。',
      budgetHint,
      durationLabel,
    };
    setState((s) => ({ ...s, preferences: form, suggestions: [suggestion] }));
    nav('/confirm');
  };

  return (
    <section>
      <h2>Step 1：头脑风暴</h2>
      <div className="grid" style={{ marginBottom: 8 }}>
        {!form.onlyFood && (
          <label>
            是否有明确的活动类型
            <select value={explicitYesNo} onChange={(e) => setExplicitYesNo(e.target.value)}>
              <option value="">请选择</option>
              <option value="no">否</option>
              <option value="yes">是</option>
            </select>
          </label>
        )}

        {explicitYesNo === 'yes' && (
          <label className="full">
            请选择活动类型（按首字母排序）
            <select onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              if (v === '__other__') {
                setOtherActivity('');
                return; // 展示下方输入框
              }
              const opt = SORTED_OPTIONS.find(o => o.label === v);
              if (opt) commitExplicitActivity(opt);
            }}>
              <option value="">请选择（选择后直接进入下一步）</option>
              {SORTED_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.label}>{opt.label}</option>
              ))}
              <option value="__other__">其他（自行输入）</option>
            </select>
          </label>
        )}

        {explicitYesNo === 'yes' && (
          <label className="full">
            {otherActivity !== undefined && (
              <>
                其他活动
                <input placeholder="请输入你想进行的活动" value={otherActivity} onChange={(e) => setOtherActivity(e.target.value)} />
                <div className="actions" style={{ marginTop: 8 }}>
                  <button className="primary" disabled={!otherActivity.trim()} onClick={() => commitExplicitActivity(null, otherActivity.trim())}>确认选择并进入下一步</button>
                </div>
              </>
            )}
          </label>
        )}
      </div>
      {explicitYesNo !== 'yes' && (
      <>
      <fieldset className="full">
        <legend className="legend-with-checkbox">
          <span>只想吃饭</span>
          <input type="checkbox" checked={!!form.onlyFood} onChange={(e) => update('onlyFood', e.target.checked)} />
        </legend>
        <p className="hint">选中后仅推荐餐厅，并可选择餐厅种类与菜系</p>
      </fieldset>

      {form.onlyFood && (
        <div className="grid" style={{ marginTop: 8 }}>
          <label>
            餐厅种类选择
            <select value={form.cuisineTop ?? ''} onChange={(e) => update('cuisineTop', e.target.value as any)}>
              <option value="">请选择</option>
              <option value="chinese">中式</option>
              <option value="western">西式</option>
              <option value="unknown">不知道呢</option>
            </select>
          </label>

          {form.cuisineTop === 'chinese' && (
            <label>
              中式类别
              <select value={form.chineseCuisine ?? ''} onChange={(e) => update('chineseCuisine', e.target.value as any)}>
                <option value="">请选择</option>
                <option value="川菜">川菜</option>
                <option value="湘菜">湘菜</option>
                <option value="江浙菜">江浙菜</option>
                <option value="台湾菜">台湾菜</option>
                <option value="粤菜">粤菜</option>
                <option value="鲁菜">鲁菜</option>
                <option value="东北菜">东北菜</option>
                <option value="福建菜">福建菜</option>
                <option value="徽菜">徽菜</option>
                <option value="不知道呢">不知道呢</option>
              </select>
            </label>
          )}

          {(
            form.cuisineTop === 'unknown' ||
            (form.cuisineTop === 'chinese' && form.chineseCuisine === '不知道呢') ||
            (form.cuisineTop === 'western' && form.westernCuisine === '不知道呢')
          ) && (
            <>
              <label>
                你想吃清淡还是重口
                <select value={(form as any).taste ?? ''} onChange={(e) => update('taste' as any, e.target.value)}>
                  <option value="">请选择</option>
                  <option value="light">清淡</option>
                  <option value="spicy">重口</option>
                  <option value="both">都可以</option>
                </select>
              </label>

              <label>
                你想吃漂亮饭吗（指的是 brunch 等）
                <select value={(form as any).prettyMeal ?? ''} onChange={(e) => update('prettyMeal' as any, e.target.value)}>
                  <option value="">请选择</option>
                  <option value="yes">想</option>
                  <option value="no">不想</option>
                  <option value="either">都可以</option>
                </select>
              </label>

              <label>
                你想吃网红店/连锁店/苍蝇小馆
                <select value={(form as any).shopStyle ?? ''} onChange={(e) => update('shopStyle' as any, e.target.value)}>
                  <option value="">请选择</option>
                  <option value="popular">网红店</option>
                  <option value="chain">连锁店</option>
                  <option value="hole">苍蝇小馆</option>
                  <option value="either">都可以</option>
                </select>
              </label>
            </>
          )}

          {form.cuisineTop === 'western' && (
            <label>
              西式类别
              <select value={form.westernCuisine ?? ''} onChange={(e) => update('westernCuisine', e.target.value as any)}>
                <option value="">请选择</option>
                <option value="日料">日料</option>
                <option value="韩料">韩料</option>
                <option value="东南亚菜">东南亚菜</option>
                <option value="西餐漂亮饭">西餐漂亮饭</option>
                <option value="意大利菜">意大利菜</option>
                <option value="法餐">法餐</option>
                <option value="美式">美式</option>
                <option value="英式">英式</option>
                <option value="不知道呢">不知道呢</option>
              </select>
            </label>
          )}
        </div>
      )}
      {!form.onlyFood && (
      <div className="grid">
        <label>
          聚会时长
          <select value={form.duration ?? ''} onChange={(e) => update('duration', e.target.value as any)}>
            <option value="">请选择</option>
            <option value="short">2h 以内</option>
            <option value="medium">2-4h</option>
            <option value="long">4h 以上</option>
          </select>
        </label>

        <label>
          消费预算
          <select value={form.budget ?? ''} onChange={(e) => update('budget', e.target.value as any)}>
            <option value="">请选择</option>
            <option value="low">¥100 以下</option>
            <option value="mid">¥100-300</option>
            <option value="high">¥300 以上</option>
          </select>
        </label>

        <label>
          时间段选择
          <select value={form.timeSlot ?? ''} onChange={(e) => update('timeSlot', e.target.value as any)}>
            <option value="">请选择</option>
            <option value="morning">上午</option>
            <option value="afternoon">下午</option>
            <option value="evening">晚上</option>
            <option value="all_day">全天</option>
          </select>
        </label>

        <label>
          社交意图
          <select value={form.socialIntent ?? ''} onChange={(e) => update('socialIntent', e.target.value as any)}>
            <option value="">请选择</option>
            <option value="deep_talk">深度交流（谈心）</option>
            <option value="co_experience">共同体验（做事）</option>
            <option value="relax">纯粹放松（解压）</option>
          </select>
        </label>

        <label>
          体力需求
          <select value={form.physicalDemand ?? ''} onChange={(e) => update('physicalDemand', e.target.value as any)}>
            <option value="">请选择</option>
            <option value="high">消耗型（大量运动）</option>
            <option value="medium">休闲型（适度走动）</option>
            <option value="low">静止型（坐着不动）</option>
          </select>
        </label>

        <label>
          脑力投入
          <select value={form.mentalEngagement ?? ''} onChange={(e) => update('mentalEngagement', e.target.value as any)}>
            <option value="">请选择</option>
            <option value="high">高强度（需要思考/解谜）</option>
            <option value="low">低投入（纯放松/观赏）</option>
          </select>
        </label>

        <label>
          室内/室外
          <select value={form.indoor ?? ''} onChange={(e) => update('indoor', e.target.value as any)}>
            <option value="">请选择</option>
            <option value="indoor">倾向室内</option>
            <option value="outdoor">倾向室外</option>
            <option value="both">都可以</option>
          </select>
        </label>

        <label>
          环境噪音
          <select value={form.noisePreference ?? ''} onChange={(e) => update('noisePreference', e.target.value as any)}>
            <option value="">请选择</option>
            <option value="noisy">热闹喧嚣</option>
            <option value="quiet">安静私密</option>
            <option value="both">都可以</option>
          </select>
        </label>

        {/* 艺术追求：与上方选择器格式一致，放在室内/室外右侧 */}
        <label>
          艺术追求
          <select value={form.artStyle ?? ''} onChange={(e) => update('artStyle', e.target.value as any)}>
            <option value="">请选择</option>
            <option value="observe">仅观赏</option>
            <option value="diy">愿意体验 (DIY)</option>
            <option value="none">不追求</option>
          </select>
        </label>

        <fieldset className="full">
          <legend>兴趣爱好（多选）</legend>
          <div className="chips">
            {[
              { k: 'leisure', label: '休闲娱乐' },
              { k: 'fitness', label: '运动健身' },
              { k: 'art', label: '文化艺术' },
              { k: 'study', label: '学习成长' },
            ].map((opt) => (
              <label key={opt.k} className={form.interests?.includes(opt.k as any) ? 'chip active' : 'chip'}>
                <input type="checkbox" checked={!!form.interests?.includes(opt.k as any)} onChange={() => toggleInterest(opt.k as any)} />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/** 兴趣爱好 fieldset 仍位于补充信息上方，无需改动位置（已满足需求） */}

        <label className="full">
          补充信息
          <textarea placeholder="当前心情或特殊要求（如：想彻底放松，必须安静）" value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} />
        </label>

        {/* 标题下方已呈现“只想吃饭”与餐厅种类选择 */}
      </div>
      )}
      </>
      )}

      {explicitYesNo !== 'yes' && (
        <div className="actions">
          <button className="primary" onClick={submit}>生成活动建议</button>
        </div>
      )}
    </section>
  );
}