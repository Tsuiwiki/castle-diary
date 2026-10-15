<template>
  <div class="view-head">
    <h2>足迹册</h2>
    <div class="sub">{{ ta() }}去过的每个地方都是一枚邮票，去得越多邮戳越多 · 日常在日记里用「去了」贴纸记</div>
  </div>

  <div class="stat-row">
    <div class="stat-box"><div class="num">{{ stamps.length }}</div><div class="lbl">去过的地方</div></div>
    <div class="stat-box"><div class="num">{{ yearTrips }}</div><div class="lbl">今年出门</div></div>
    <div class="stat-box"><div class="num">{{ monthNew }}</div><div class="lbl">本月新足迹</div></div>
    <div class="stat-box"><div class="num top-name">{{ stamps[0]?.name || '—' }}</div><div class="lbl">最常去</div></div>
  </div>

  <!-- 邮票册 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="map-pin" :size="16" />邮票册</span>
      <span class="more">{{ yearLine }}</span>
    </div>
    <div v-if="stamps.length" class="chip-row">
      <span class="chip" :class="{ sel: !cat }" @click="cat = ''">全部</span>
      <span v-for="c in usedCats" :key="c" class="chip" :class="{ sel: cat === c }" @click="cat = c">{{ c }} {{ catCount(c) }}</span>
    </div>
    <div v-if="!stamps.length" class="empty">还没有足迹，在日记里点「去了」，或在下面记一次出行</div>
    <div class="stamp-grid">
      <div
        v-for="s in shownStamps" :key="s.name"
        class="stamp" :class="['cat-' + catIndex(s.cat), { open: openName === s.name }]"
        @click="openName = openName === s.name ? '' : s.name"
      >
        <div class="st-inner">
          <div class="st-pic">
            <img v-if="s.photo" :src="s.photo" />
            <Icon v-else :name="catIcon(s.cat)" :size="26" />
          </div>
          <div class="st-name">{{ s.name }}</div>
          <div class="st-meta">{{ s.cat }} · 首次 {{ s.first.slice(2).replace(/-/g, '.') }}</div>
          <!-- 邮戳：去过几次就盖几个（最多显示 5 个） -->
          <div class="postmarks">
            <span v-for="n in Math.min(s.count, 5)" :key="n" class="pm" :style="{ transform: `rotate(${(n * 37) % 30 - 15}deg)` }"></span>
            <b>×{{ s.count }}</b>
          </div>
        </div>
      </div>
    </div>

    <!-- 展开的邮票：每次去的记录 + 改分类 -->
    <div v-if="openStamp" class="stamp-detail">
      <div class="sd-head">
        <b>{{ openStamp.name }}</b>
        <span class="pn-hint">分类：</span>
        <span v-for="c in PLACE_CATS" :key="c" class="chip" :class="{ sel: openStamp.cat === c }" @click="setPlaceCat(openStamp.name, c)">{{ c }}</span>
      </div>
      <div v-for="t in openStamp.trips" :key="t.id" class="trip-row">
        <span class="wk-date">{{ t.date }}</span>
        <div class="trip-body">
          <div class="trip-title">
            {{ t.title !== t.place ? t.title : '' }}{{ t.note ? (t.title !== t.place ? '，' : '') + t.note : (t.title === t.place ? '去了一次' : '') }}
            <span v-if="t.withWho" class="trip-place">和{{ t.withWho }}</span>
            <span v-if="termOf(t.date)" class="term-badge" :class="'term-' + termOf(t.date).season">{{ termOf(t.date).name }}</span>
          </div>
        </div>
        <img v-if="photoOf(t)" :src="photoOf(t)" class="sd-thumb" />
        <button class="icon-btn" @click.stop="remove(t)"><Icon name="trash" :size="14" /></button>
      </div>
    </div>
  </div>

  <div class="two-col">
    <!-- 左：记一次出行 + 常去的地方 -->
    <div class="col">
      <div class="card">
        <div class="card-title"><span class="ct-left"><Icon name="plus" :size="16" />补记一次出行</span></div>
        <div class="form-pair">
          <div class="form-row">
            <label>日期</label>
            <input v-model="form.date" type="date" :max="today" />
          </div>
          <div class="form-row">
            <label>地点</label>
            <input v-model.trim="form.place" placeholder="如 朝阳公园" />
          </div>
        </div>
        <div v-if="places.length" class="chip-row" style="margin-top:-4px">
          <span v-for="p in places" :key="p.place" class="chip" :class="{ sel: form.place === p.place }" @click="form.place = p.place">{{ p.place }}</span>
        </div>
        <div class="form-row">
          <label>做了什么（可选）</label>
          <input v-model.trim="form.note" placeholder="喂了鸽子，不肯走" />
        </div>
        <div class="chip-row">
          <span class="pn-hint">和谁：</span>
          <span v-for="w in withOptions" :key="w" class="chip" :class="{ sel: form.withWho === w }" @click="form.withWho = form.withWho === w ? '' : w">{{ w }}</span>
          <span class="chip" :class="{ sel: form.photo }" @click="photoInput.click()">{{ form.photo ? '已配照片 ✓' : '📷 配张照片' }}</span>
        </div>
        <input ref="photoInput" type="file" accept="image/*" hidden @change="onPhoto" />
        <div class="form-actions">
          <button class="mini-btn" :disabled="!form.place" @click="save"><Icon name="check" :size="13" />记下这次出行</button>
        </div>
      </div>

      <div class="card" v-if="places.length">
        <div class="card-title"><span class="ct-left"><Icon name="compass" :size="16" />常去的地方</span></div>
        <div class="place-list">
          <div v-for="p in places" :key="p.place" class="place-row">
            <span class="place-name">{{ p.place }}</span>
            <span class="place-bar"><i :style="{ width: barWidth(p.count) }"></i></span>
            <span class="place-count">{{ p.count }} 次</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右：月份胶片 -->
    <div class="col">
      <div class="card">
        <div class="card-title"><span class="ct-left"><Icon name="camera" :size="16" />月份胶片</span><span class="more">{{ store.trips.length }} 次出行</span></div>
        <div v-if="!months.length" class="empty">还没有出行记录，周末带{{ ta() }}出去走走吧</div>
        <div v-for="m in months" :key="m.month" class="film-month">
          <div class="fm-title">{{ m.label }}<span class="day-count">{{ m.trips.length }} 次 · {{ m.placeCount }} 个地方</span></div>
          <div class="film">
            <div v-for="t in m.trips" :key="t.id" class="frame" :class="'cat-' + catIndex(placeCatOf(t.place))" :title="t.note || t.place">
              <img v-if="photoOf(t)" :src="photoOf(t)" />
              <div v-else class="frame-blank"><Icon :name="catIcon(placeCatOf(t.place))" :size="20" /></div>
              <div class="frame-cap"><b>{{ t.place }}</b><span>{{ t.date.slice(5).replace('-', '/') }}</span></div>
              <span v-if="termOf(t.date)" class="frame-term" :class="'term-' + termOf(t.date).season">{{ termOf(t.date).name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="toast" class="toast">{{ toast }}</div>
</template>

<script setup>
import { ta, her } from '../store.js'
import { ref, reactive, computed } from 'vue'
import Icon from '../components/Icon.vue'
import { store, addTrip, removeTrip, topPlaces, todayStr, PLACE_CATS, placeCatOf, setPlaceCat } from '../store.js'
import { termOf } from '../utils/solarTerms.js'
import { compressImage } from '../utils/image.js'

const today = todayStr()
const CAT_ICONS = { 公园: 'sprout', 商场: 'gift', 亲戚家: 'heart', 早教: 'book-open', 医院: 'heart-pulse', 旅行: 'car', 其他: 'map-pin' }
const catIcon = c => CAT_ICONS[c] || 'map-pin'
const catIndex = c => Math.max(0, PLACE_CATS.indexOf(c))

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}

// 照片：出行自己配的照片优先
const photoMap = computed(() => Object.fromEntries(store.photos.filter(p => p.imageUrl).map(p => [p.id, p.imageUrl])))
const photoOf = t => (t.photoId && photoMap.value[t.photoId]) || ''

// ---------- 邮票 ----------
const stamps = computed(() => {
  const map = new Map()
  for (const t of store.trips) {
    if (!t.place) continue
    const s = map.get(t.place) || { name: t.place, trips: [], count: 0, first: t.date, photo: '' }
    s.trips.push(t)
    s.count++
    if (t.date < s.first) s.first = t.date
    map.set(t.place, s)
  }
  return [...map.values()].map(s => {
    s.trips.sort((a, b) => b.date.localeCompare(a.date))
    const withPic = [...s.trips].reverse().find(t => photoOf(t)) // 最早一张
    return { ...s, cat: placeCatOf(s.name), photo: withPic ? photoOf(withPic) : '' }
  }).sort((a, b) => b.count - a.count || a.first.localeCompare(b.first))
})
const cat = ref('')
const usedCats = computed(() => PLACE_CATS.filter(c => stamps.value.some(s => s.cat === c)))
const catCount = c => stamps.value.filter(s => s.cat === c).length
const shownStamps = computed(() => stamps.value.filter(s => !cat.value || s.cat === cat.value))
const openName = ref('')
const openStamp = computed(() => stamps.value.find(s => s.name === openName.value) || null)

const yearTrips = computed(() => store.trips.filter(t => t.date.slice(0, 4) === today.slice(0, 4)).length)
const monthNew = computed(() => {
  const ym = today.slice(0, 7)
  return stamps.value.filter(s => s.first.slice(0, 7) === ym).length
})
const yearLine = computed(() => {
  const y = today.slice(0, 4)
  const names = new Set(store.trips.filter(t => t.date.startsWith(y)).map(t => t.place))
  if (!names.size) return '今年还没出门'
  const byCat = {}
  for (const n of names) { const c = placeCatOf(n); byCat[c] = (byCat[c] || 0) + 1 }
  const parts = PLACE_CATS.filter(c => byCat[c] && c !== '其他').map(c => `${byCat[c]} 个${c}`)
  return `今年去了 ${names.size} 个地方${parts.length ? '：' + parts.join('、') : ''}`
})

// ---------- 胶片 ----------
const months = computed(() => {
  const map = new Map()
  for (const t of [...store.trips].sort((a, b) => b.date.localeCompare(a.date))) {
    const m = t.date.slice(0, 7)
    if (!map.has(m)) map.set(m, [])
    map.get(m).push(t)
  }
  return [...map.entries()].map(([month, trips]) => ({
    month, trips,
    label: `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月`,
    placeCount: new Set(trips.map(t => t.place)).size,
  }))
})

// ---------- 补记 ----------
const places = computed(() => topPlaces(6))
const maxCount = computed(() => places.value[0]?.count || 1)
const barWidth = c => Math.max(8, Math.round((c / maxCount.value) * 100)) + '%'
const withOptions = computed(() => [...store.members.map(m => m.name), '全家'])
const form = reactive({ date: today, place: '', note: '', withWho: '', photo: '' })
const photoInput = ref(null)
async function onPhoto(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f?.type.startsWith('image/')) form.photo = await compressImage(f, 1280, 0.72)
}
function save() {
  if (!form.place) return
  const fresh = !store.trips.some(t => t.place === form.place)
  addTrip({ date: form.date, place: form.place, note: form.note, withWho: form.withWho, photo: form.photo })
  showToast(fresh ? `盖了一枚新邮票：${form.place}` : '记下了')
  form.place = ''
  form.note = ''
  form.photo = ''
}
function remove(t) {
  if (confirm(`删掉 ${t.date} 去「${t.place}」这条记录？（照片仍留在相册）`)) removeTrip(t.id)
}
</script>

<style scoped>
.top-name { font-size: 16px !important; line-height: 29px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 分类色：公园 / 商场 / 亲戚家 / 早教 / 医院 / 旅行 / 其他 */
.cat-0 { --c: #4f8a2f; --bg: #eef6e4; }
.cat-1 { --c: #b4532a; --bg: #fdf0e6; }
.cat-2 { --c: #b83f6b; --bg: #fcebf1; }
.cat-3 { --c: #6a4fb8; --bg: #f0edfb; }
.cat-4 { --c: #1f7f6b; --bg: #e6f5f0; }
.cat-5 { --c: #245d96; --bg: #e8f1fb; }
.cat-6 { --c: #6b5f50; --bg: #f3efe8; }

.stamp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 14px; }
.stamp {
  /* 邮票齿孔：用圆点径向渐变做出锯齿边 */
  padding: 6px; cursor: pointer; transition: transform .15s;
  background:
    radial-gradient(circle at 5px 5px, transparent 3.5px, #fff 4px) -5px -5px / 10px 10px;
  filter: drop-shadow(0 2px 4px rgba(120, 90, 50, .18));
}
.stamp:nth-child(3n + 1) { transform: rotate(-1.5deg); }
.stamp:nth-child(3n + 2) { transform: rotate(1deg); }
.stamp:hover, .stamp.open { transform: rotate(0) scale(1.04); }
.st-inner { position: relative; background: var(--bg); border: 1.5px solid var(--c); padding: 7px; color: var(--c); }
.st-pic {
  aspect-ratio: 4 / 3; overflow: hidden; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, .7); margin-bottom: 6px;
}
.st-pic img { width: 100%; height: 100%; object-fit: cover; }
.st-name { font-size: 14px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-meta { font-size: 11px; opacity: .8; }
.postmarks { position: absolute; right: 6px; top: 6px; display: flex; align-items: center; gap: 1px; }
.pm {
  width: 15px; height: 15px; border-radius: 50%; border: 1.5px solid rgba(208, 70, 60, .75);
  margin-left: -6px; background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(208, 70, 60, .35) 3px 4px);
}
.postmarks b { font-size: 11px; color: #c0392b; margin-left: 3px; background: rgba(255, 255, 255, .85); border-radius: 4px; padding: 0 3px; }

.stamp-detail { margin-top: 14px; border-top: 1px dashed var(--line); padding-top: 10px; }
.sd-head { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.sd-head b { font-size: 15px; margin-right: 6px; }
.sd-head .chip { margin: 0; }
.sd-thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 6px; }
.stamp-detail .wk-date { width: 82px; flex: none; }

.film-month { margin-bottom: 14px; }
.fm-title { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
.film {
  display: flex; gap: 8px; overflow-x: auto; padding: 10px 8px;
  background: #3b332b; border-radius: 6px;
  /* 胶片两侧的齿孔 */
  background-image:
    repeating-linear-gradient(90deg, #fff6 0 6px, transparent 6px 14px),
    repeating-linear-gradient(90deg, #fff6 0 6px, transparent 6px 14px);
  background-size: 100% 4px, 100% 4px;
  background-position: 0 2px, 0 calc(100% - 2px);
  background-repeat: no-repeat;
}
.frame { flex: none; width: 112px; background: #fff; border-radius: 3px; overflow: hidden; }
.frame img, .frame-blank { width: 100%; height: 78px; object-fit: cover; display: flex; align-items: center; justify-content: center; }
.frame-blank { background: var(--bg); color: var(--c); }
.frame-cap { padding: 4px 6px; font-size: 11px; display: flex; justify-content: space-between; gap: 4px; }
.frame-cap b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.frame-cap span { color: var(--ink-3); flex: none; }
.pn-hint { font-size: 12px; color: var(--ink-3); align-self: center; }
.term-badge { font-size: 10px; font-weight: 700; border-radius: 999px; padding: 0 6px; margin-left: 4px; }
.frame-term { position: absolute; top: 4px; left: 4px; font-size: 10px; font-weight: 700; border-radius: 4px; padding: 0 4px; background: rgba(255,255,255,.92); }
.term-春 { color: #4a7c23; background: #e8f3d9; }
.term-夏 { color: #b35c1b; background: #fde8d3; }
.term-秋 { color: #9a6b1c; background: #f9ecd2; }
.term-冬 { color: #3a5f8a; background: #e4eef7; }
.frame { position: relative; }
</style>
