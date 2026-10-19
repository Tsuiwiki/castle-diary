<template>
  <div class="ob-mask">
    <div class="ob-card" role="dialog" aria-modal="true" aria-label="新手引导">
      <div class="ob-top">
        <div class="ob-dots"><i v-for="n in 3" :key="n" :class="{ on: n === step }"></i></div>
        <button class="ob-skip" @click="finish(true)">跳过</button>
      </div>

      <!-- 第 1 步：认识孩子 -->
      <section v-if="step === 1" class="ob-body">
        <h2>欢迎来到城堡日记</h2>
        <p class="ob-lead">一天一页的成长日记：点几下就能写成一篇，年底还能印成一本书。先告诉我孩子是谁吧。</p>
        <div class="ob-form">
          <label>小名</label>
          <input v-model.trim="name" placeholder="比如：小宝、团团" maxlength="12" />
          <label>生日</label>
          <input v-model="birthday" type="date" :max="today" />
          <label>称呼</label>
          <div class="chip-row">
            <span v-for="p in PRONOUNS" :key="p.key" class="chip" :class="{ sel: pronoun === p.key }" @click="pronoun = p.key">{{ p.label }}</span>
          </div>
        </div>
        <p class="ob-note">生日用来算月龄、排疫苗；以后都可以在「设置」里改。所有内容只存在这台设备上，详见<a class="ob-link" href="./privacy.html">隐私政策</a>。</p>
        <div class="ob-actions">
          <a class="ob-link" @click="toImport">换了设备？导入之前的备份</a>
          <button class="btn-primary" @click="saveProfile(); step = 2">下一步</button>
        </div>
      </section>

      <!-- 第 2 步：贴纸自动成文（演示，不写入真实数据） -->
      <section v-else-if="step === 2" class="ob-body">
        <h2>点贴纸，日记自己写</h2>
        <p class="ob-lead">不用打字。每天在日记里点一下贴纸、选一选，城堡日记会把它写成一句话。试试看：</p>
        <div class="ob-stickers">
          <button v-for="d in DEMOS" :key="d.key" class="ob-stk" :class="{ used: tried.includes(d.key) }" @click="tryDemo(d)">
            <Icon :name="d.icon" :size="15" />{{ her(d.label) }}
          </button>
        </div>
        <div class="ob-paper">
          <div class="ob-paper-date">{{ todayLabel }}</div>
          <p v-if="!lines.length" class="ob-paper-empty">点上面的贴纸 ↑</p>
          <p v-for="(l, i) in lines" :key="i" class="ob-line">{{ l }}</p>
        </div>
        <p class="ob-note">这只是演示，不会记进日记。日记里还有「读了」「不舒服」「照片」等贴纸；也可以自己写几句话。</p>
        <div class="ob-actions">
          <a class="ob-link" @click="step = 1">上一步</a>
          <button class="btn-primary" @click="step = 3">{{ lines.length ? '下一步' : '先不试了，下一步' }}</button>
        </div>
      </section>

      <!-- 第 3 步：城堡与数据 -->
      <section v-else class="ob-body">
        <h2>{{ displayName }}的城堡会跟着长大</h2>
        <div class="ob-castle"><CastleSvg :width="240" /></div>
        <ul class="ob-grow">
          <li><b>每过一个月龄生日</b>，城堡加一层</li>
          <li><b>会说的词</b>每多 10 个，添一块砖</li>
          <li><b>每个"第一次"</b>，塔上插一面旗</li>
          <li><b>读过的书</b>点亮窗户，<b>去过的地方</b>院子里种棵树</li>
        </ul>
        <div class="ob-privacy">
          <Icon name="lock" :size="16" />
          <div v-if="isApp()">所有记录只保存在<b>这台手机</b>里，不需要注册，也不会上传。<b>卸载 App 会把记录一起删掉</b>，换手机或卸载前，先在「设置 → 备份」导出一份。</div>
          <div v-else>所有记录只保存在<b>这台设备的浏览器</b>里，不需要注册，也不会上传。记得隔一段时间在「设置 → 备份」导出一份；手机上建议「添加到主屏幕」，用起来像 App，数据也更稳。</div>
        </div>
        <div class="ob-actions">
          <a class="ob-link" @click="step = 2">上一步</a>
          <button class="btn-primary" @click="finish(false)">开始写今天的日记</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { isApp } from '../utils/platform.js'
// 新手引导：只在全新安装（没有任何记录、也没填过小名）时出现一次；设置里可以重看。
// 第 2 步的贴纸是纯演示，不写入任何数据。
import { ref, computed } from 'vue'
import Icon from './Icon.vue'
import CastleSvg from './CastleSvg.vue'
import { store, updateSettings, todayStr, PRONOUNS } from '../store.js'

const emit = defineEmits(['done', 'import'])

const today = todayStr()
const step = ref(1)
const name = ref(store.settings.childName || '')
const birthday = ref(store.settings.birthday || '')
const pronoun = ref(store.settings.pronoun || 'she')

// 引导里的称呼要跟着第 1 步的选择实时变，不读已保存的设置
const word = computed(() => {
  if (pronoun.value === 'he') return '他'
  if (pronoun.value === 'baby') return '宝宝'
  if (pronoun.value === 'name') return name.value || '宝宝'
  return '她'
})
const her = t => t.replace(/她/g, word.value)
const displayName = computed(() => name.value || '宝宝')

const d = new Date()
const todayLabel = `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 周${'日一二三四五六'[d.getDay()]}`

const DEMOS = [
  { key: 'mood', label: '开心', icon: 'heart', line: () => `今天${word.value}很开心。` },
  { key: 'food', label: '吃了', icon: 'bowl', line: () => '午饭吃了西兰花（第一次吃）、软米饭。' },
  { key: 'say', label: '她说', icon: 'message-circle', line: () => `${word.value}说了新词“月亮”，这是${word.value}会说的第 1 个词。` },
  { key: 'trip', label: '去了', icon: 'map-pin', line: () => '下午去了小区公园，看鸽子。' },
]
const tried = ref([])
const lines = computed(() => DEMOS.filter(x => tried.value.includes(x.key)).map(x => x.line()))
function tryDemo(x) {
  tried.value = tried.value.includes(x.key) ? tried.value.filter(k => k !== x.key) : [...tried.value, x.key]
}

// 第 1 步填完就先存：后面的城堡要按生日长层数，背景里的日记页也要换称呼
function saveProfile(extra = {}) {
  const patch = { pronoun: pronoun.value, ...extra }
  if (name.value) patch.childName = name.value
  if (birthday.value) patch.birthday = birthday.value
  updateSettings(patch)
}
function save() {
  saveProfile({ onboarded: true, pwaHintShown: true })
}
function finish(skipped) {
  save()
  emit('done', { skipped })
}
function toImport() {
  updateSettings({ onboarded: true }) // 导入的备份会带回孩子信息，这里只记下"引导看过了"
  emit('import')
}
</script>

<style scoped>
.ob-mask { position: fixed; inset: 0; z-index: 110; background: rgba(60, 40, 20, .35); display: flex; align-items: center; justify-content: center; padding: 16px; }
.ob-card { width: min(520px, 100%); max-height: calc(100vh - 32px); overflow-y: auto; background: #fffdf8; border-radius: 22px; box-shadow: 0 18px 50px rgba(90, 55, 20, .25); padding: 18px 24px 22px; }
.ob-top { display: flex; align-items: center; justify-content: space-between; }
.ob-dots { display: flex; gap: 6px; }
.ob-dots i { width: 8px; height: 8px; border-radius: 50%; background: #ecdcc4; }
.ob-dots i.on { background: var(--brand); width: 20px; border-radius: 4px; }
.ob-skip { border: none; background: none; color: var(--ink-3); font-size: 13px; cursor: pointer; padding: 6px; }
.ob-body h2 { font-size: 21px; margin: 10px 0 6px; }
.ob-lead { font-size: 14px; color: var(--ink-2); line-height: 1.75; margin: 0 0 14px; }
.ob-note { font-size: 12px; color: var(--ink-3); line-height: 1.7; margin: 10px 0 0; }
.ob-form { display: grid; grid-template-columns: auto 1fr; gap: 10px 12px; align-items: center; }
.ob-form label { font-size: 13px; color: var(--ink-2); white-space: nowrap; }
.ob-form input { border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; font-size: 15px; background: #fff; }
.ob-form .chip-row { margin: 0; }
.ob-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 18px; }
.ob-link { font-size: 13px; color: var(--brand-deep); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }

.ob-stickers { display: flex; flex-wrap: wrap; gap: 8px; }
.ob-stk { display: inline-flex; align-items: center; gap: 5px; border: 1px solid rgba(240, 147, 75, .4); background: #fff7ec; color: #8a4f1f; border-radius: 999px; padding: 7px 14px; font-size: 14px; cursor: pointer; }
.ob-stk.used { background: var(--brand); color: #fff; border-color: transparent; }
.ob-paper { margin-top: 12px; min-height: 120px; border-radius: 14px; padding: 12px 16px; background: repeating-linear-gradient(#fffdf6 0 29px, #f1e4cf 29px 30px); border: 1px solid #f0e2cc; }
.ob-paper-date { font-size: 12px; color: var(--ink-3); margin-bottom: 4px; }
.ob-paper-empty { color: var(--ink-3); font-size: 13px; margin: 26px 0 0; text-align: center; }
.ob-line { margin: 0; font-size: 15px; line-height: 30px; font-family: "KaiTi", "STKaiti", serif; color: #4a3520; animation: obIn .35s ease; }
@keyframes obIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

.ob-castle { display: flex; justify-content: center; margin: 4px 0 6px; }
.ob-grow { margin: 0; padding-left: 18px; font-size: 13.5px; line-height: 1.9; color: var(--ink); }
.ob-grow b { color: #8a4f1f; }
.ob-privacy { display: flex; gap: 10px; margin-top: 14px; background: #f3f8f2; border: 1px solid #d8eadb; border-radius: 12px; padding: 10px 12px; font-size: 12.5px; line-height: 1.75; color: #2f5b3e; }
.ob-privacy svg { flex: none; margin-top: 3px; color: #2aa082; }

@media (max-width: 560px) {
  .ob-mask { padding: 0; align-items: stretch; }
  .ob-card { border-radius: 0; max-height: none; height: 100%; padding: 14px 18px calc(18px + env(safe-area-inset-bottom, 0px)); }
}
@media (prefers-reduced-motion: reduce) { .ob-line { animation: none; } }
</style>
