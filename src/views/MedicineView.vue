<template>
  <div class="view-head">
    <h2>药箱</h2>
    <div class="sub">常备药入库与用药记录 · 临期自动提醒 · 点药品看历史</div>
  </div>

  <!-- 统计格 -->
  <div class="stat-row">
    <div class="stat-box"><div class="num">{{ store.medicines.length }}</div><div class="lbl">在库药品</div></div>
    <div class="stat-box"><div class="num" :style="warnCount ? 'color:#e0874c' : ''">{{ warnCount }}</div><div class="lbl">30 天内到期</div></div>
    <div class="stat-box"><div class="num" :style="expiredCount ? 'color:#e05555' : ''">{{ expiredCount }}</div><div class="lbl">已过期</div></div>
    <div class="stat-box"><div class="num">{{ todayUseCount }}</div><div class="lbl">今日用药</div></div>
  </div>

  <div class="two-col">
    <!-- 入库表单 -->
    <div class="card">
      <div class="card-title"><span class="ct-left"><Icon name="plus" :size="16" />药品入库</span></div>
      <div class="form-row">
        <label>药品名称</label>
        <input v-model.trim="form.name" placeholder="如：布洛芬混悬液" @keyup.enter="submit" />
      </div>
      <div class="form-row">
        <label>规格（可选）</label>
        <input v-model.trim="form.spec" placeholder="如：100ml / 0.1g×12 袋" />
      </div>
      <div class="form-pair">
        <div class="form-row">
          <label>库存数量</label>
          <input v-model.number="form.stock" type="number" min="1" />
        </div>
        <div class="form-row">
          <label>单位</label>
          <select v-model="form.unit">
            <option v-for="u in MED_UNITS" :key="u" :value="u">{{ u }}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label>有效期至</label>
        <input v-model="form.expiry" type="date" />
      </div>
      <button class="btn-primary" style="width:100%;justify-content:center" @click="submit">入库</button>
      <div class="med-tip">有效期还剩 30 天时会自动在统计卡里提醒</div>
    </div>

    <!-- 药品清单 -->
    <div class="card">
      <div class="card-title">
        <span class="ct-left"><Icon name="pill" :size="16" />药品清单</span>
        <span class="more">临期优先 · {{ store.medicines.length }} 种</span>
      </div>
      <div v-for="m in sortedMeds" :key="m.id" class="med-row" @click="openHistory(m)">
        <span class="med-ic" :class="medStatus(m).level"><Icon :name="medStatus(m).level === 'ok' ? 'pill' : 'alert-triangle'" :size="17" /></span>
        <div class="med-main">
          <div class="med-name">
            {{ m.name }}
            <span class="med-stock" :class="{ zero: !m.stock }">{{ m.stock > 0 ? `剩 ${m.stock} ${m.unit}` : '已用完' }}</span>
          </div>
          <div class="med-sub">
            <span class="badge" :class="'badge-' + medStatus(m).level">{{ medStatus(m).text }}</span>
            <span v-if="m.spec">{{ m.spec }}</span>
            <span v-if="m.expiry">{{ m.expiry }}</span>
          </div>
        </div>
        <button class="mini-btn" @click.stop="use(m)">用药</button>
        <button class="icon-btn" @click.stop="remove(m)"><Icon name="trash" :size="15" /></button>
      </div>
      <div v-if="!store.medicines.length" class="empty">药箱是空的，先入库第一种常备药吧</div>
    </div>
  </div>

  <!-- 单药历史抽屉（右侧滑出） -->
  <div v-if="histMed" class="drawer-mask" @click="histMed = null">
    <div class="drawer-panel drawer-narrow" @click.stop>
      <div class="subbar">
        <button class="back-btn" @click="histMed = null"><Icon name="x" :size="16" /></button>
        <span class="subbar-title">{{ histMed.name }}</span>
        <span class="subbar-sub">用药历史</span>
      </div>
      <div class="card">
        <div class="kv-row"><span class="kv-k">当前库存</span><span class="kv-v">{{ histMed.stock }} {{ histMed.unit }}</span></div>
        <div class="kv-row"><span class="kv-k">有效期至</span><span class="kv-v">{{ histMed.expiry || '未填' }}</span></div>
        <div class="kv-row"><span class="kv-k">累计入库</span><span class="kv-v">{{ inCount(histMed) }} 次</span></div>
        <div class="kv-row"><span class="kv-k">累计用药</span><span class="kv-v">{{ useCount(histMed) }} 次</span></div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-left"><Icon name="clock" :size="15" />流水</span></div>
        <div v-for="(log, i) in histMed.logs" :key="i" class="tl-item">
          <span class="badge" :class="log.mode === 'in' ? 'badge-ok' : 'badge-warn'">{{ log.mode === 'in' ? '入库' : '用药' }}</span>
          <div class="tl-body">
            <div class="tl-title">{{ log.note }}</div>
            <div class="tl-note">{{ fmtTime(log.time) }}</div>
          </div>
        </div>
        <div v-if="!histMed.logs.length" class="empty">还没有记录</div>
      </div>
      <button class="btn-ghost" style="width:100%;justify-content:center" @click="restock(histMed)">补货 +1 {{ histMed.unit }}</button>
    </div>
  </div>

  <div v-if="toast" class="toast">{{ toast }}</div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import Icon from '../components/Icon.vue'
import {
  store, MED_UNITS, addMedicine, removeMedicine, useMedicine, restockMedicine,
  medStatus, todayStr,
} from '../store.js'

const form = reactive({ name: '', spec: '', stock: 1, unit: '盒', expiry: '' })
const histMed = ref(null)
const toast = ref('')
let toastTimer = null

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}

// 临期优先排序：过期 > 临期 > 正常，同档按到期日升序
const sortedMeds = computed(() =>
  [...store.medicines].sort((a, b) => {
    const da = medStatus(a).days ?? 99999
    const db = medStatus(b).days ?? 99999
    return da - db
  })
)

const warnCount = computed(() => store.medicines.filter(m => medStatus(m).level === 'warn').length)
const expiredCount = computed(() => store.medicines.filter(m => medStatus(m).level === 'danger').length)
const todayUseCount = computed(() =>
  store.medicines.reduce(
    (n, m) => n + m.logs.filter(l => l.mode === 'use' && l.time.slice(0, 10) === todayStr()).length,
    0
  )
)

function submit() {
  if (!form.name) { showToast('先填药品名称'); return }
  addMedicine({ ...form })
  form.name = ''
  form.spec = ''
  form.stock = 1
  form.expiry = ''
  showToast('已入库')
}

function use(m) {
  const r = useMedicine(m.id)
  if (!r) return
  if (r.emptied) showToast(`${m.name} 用完了，记得补货`)
  else showToast(`已记一次用药，剩 ${r.med.stock} ${m.unit}`)
}

function remove(m) {
  if (confirm(`把「${m.name}」从药箱移除？历史记录也会一起删掉`)) {
    if (histMed.value?.id === m.id) histMed.value = null
    removeMedicine(m.id)
  }
}

function openHistory(m) { histMed.value = m }
function restock(m) { restockMedicine(m.id, 1); showToast(`已补货，现有 ${m.stock} ${m.unit}`) }

const inCount = m => m.logs.filter(l => l.mode === 'in').length
const useCount = m => m.logs.filter(l => l.mode === 'use').length
const fmtTime = t => (t || '').replace('T', ' ')
</script>
