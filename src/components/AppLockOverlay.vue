<template>
  <!-- 应用锁屏 / 恢复 / 重置。不出现孩子小名、年龄、照片等任何业务数据；不渲染业务页面 -->
  <div class="lock-screen" role="dialog" aria-modal="true" aria-label="城堡日记应用锁">
    <div class="lock-card" :class="{ shake: shaking }">
      <div class="lock-brand"><Icon name="castle" :size="34" /></div>
      <div class="lock-title">城堡大门已锁上</div>
      <div class="lock-sub">{{ subText }}</div>

      <!-- ========== 解锁 ========== -->
      <template v-if="mode === 'unlock'">
        <!-- 密码语义的隐藏输入：承载物理键盘 / 粘贴 / 读屏；圆点和数字键盘是视觉外壳 -->
        <input
          ref="pinInput" v-model="pin" class="lock-hidden-input" type="password" inputmode="numeric"
          autocomplete="off" maxlength="6" aria-label="PIN 码" @input="onPinInput"
        />
        <div class="lock-dots" aria-hidden="true" @click="pinInput?.focus()">
          <span v-for="i in 6" :key="i" class="lock-dot" :class="{ on: pin.length >= i }"></span>
        </div>
        <div class="lock-msg" aria-live="polite">{{ message }}</div>
        <div class="lock-pad">
          <button
            v-for="k in KEYS" :key="k" class="lock-key" :aria-label="k" :disabled="throttleLeft > 0 || verifying"
            @click="tap(k)"
          >{{ k }}</button>
        </div>
        <div class="lock-links"><a @click="mode = 'forgot'">忘记 PIN？使用恢复码或重置本机数据</a></div>
        <div class="lock-note">应用锁只是界面访问锁，不是数据加密</div>
      </template>

      <!-- ========== 忘记 PIN：两条路 ========== -->
      <template v-else-if="mode === 'forgot'">
        <div class="lock-choice" @click="lock.recoverySet ? (mode = 'recovery') : (mode = 'norecovery')">
          <b>我有恢复码</b><i>{{ lock.recoverySet ? '输入恢复码，保留全部数据重设 PIN' : '你没有保存恢复码' }}</i>
        </div>
        <div class="lock-choice" @click="mode = 'norecovery'">
          <b>我没有恢复码</b><i>无法保留数据解锁，可重置本机数据或用备份重建</i>
        </div>
        <div class="lock-links"><a @click="backToUnlock">返回输入 PIN</a></div>
      </template>

      <!-- ========== 恢复码 ========== -->
      <template v-else-if="mode === 'recovery'">
        <div class="lock-field">
          <label>输入恢复码（不区分大小写，空格和连字符可忽略）</label>
          <input v-model.trim="recCode" class="lock-input" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off" @keydown.enter="doRecovery" />
        </div>
        <div class="lock-field">
          <label>新 PIN（6 位数字）</label>
          <input v-model.trim="newPin" class="lock-input" type="password" inputmode="numeric" maxlength="6" autocomplete="off" />
        </div>
        <div class="lock-field">
          <label>再输一遍新 PIN</label>
          <input v-model.trim="newPin2" class="lock-input" type="password" inputmode="numeric" maxlength="6" autocomplete="off" @keydown.enter="doRecovery" />
        </div>
        <div class="lock-msg" aria-live="polite">{{ message }}</div>
        <button class="btn-primary" style="width:100%" :disabled="verifying" @click="doRecovery">{{ verifying ? '验证中…' : '验证恢复码并重设 PIN' }}</button>
        <div class="lock-links"><a @click="backToUnlock">返回输入 PIN</a></div>
      </template>

      <!-- ========== 恢复成功后：新恢复码（强制确认） ========== -->
      <template v-else-if="mode === 'newcode'">
        <div class="lock-code">{{ newCode }}</div>
        <div class="lock-code-tip">恢复码已验证，新 PIN 已生效，旧恢复码已失效。<br>这串恢复码只显示这一次，请抄写或打印保存。忘记 PIN 时，它是唯一能保留全部数据解锁的方式。</div>
        <label class="lock-check"><input type="checkbox" v-model="codeSaved" /> 我已保存恢复码</label>
        <button class="btn-primary" style="width:100%" :disabled="!codeSaved" @click="finishRecovery">完成，进入城堡</button>
      </template>

      <!-- ========== 没有恢复码 ========== -->
      <template v-else-if="mode === 'norecovery'">
        <div class="lock-no-recovery">
          没有恢复码就无法在保留数据的前提下解锁——城堡日记不提供"保留数据的重置后门"。<br><br>
          你可以：<br>
          ① 返回继续尝试 PIN；<br>
          ② 用一份本地备份重建（备份之后新增的记录会丢失，这本质是重置而非恢复）；<br>
          ③ 重置本机数据（清除全部记录，不可撤销）。
        </div>
        <div class="lock-links-col">
          <a @click="backToUnlock">返回继续尝试</a>
          <a @click="rebuildInput.click()">用备份重建（城堡日记-备份-YYYYMMDD.json）</a>
          <a class="danger" @click="mode = 'reset-confirm'">重置本机数据</a>
        </div>
        <input ref="rebuildInput" type="file" accept=".json,application/json" hidden @change="onRebuildFile" />
      </template>

      <!-- ========== 重置二次确认 ========== -->
      <template v-else-if="mode === 'reset-confirm'">
        <div class="lock-no-recovery">
          此操作会清除本机浏览器内的全部日记、照片与健康记录，且不可撤销。
        </div>
        <label class="lock-check"><input type="checkbox" v-model="resetSure" /> 我明白这会清空全部数据且不可撤销</label>
        <button class="btn-danger-solid" style="width:100%" :disabled="!resetSure" @click="doReset">确认重置本机数据</button>
        <div class="lock-links"><a @click="mode = 'norecovery'">再想想</a></div>
      </template>

      <!-- ========== 用备份重建确认 ========== -->
      <template v-else-if="mode === 'rebuild-confirm'">
        <div class="lock-no-recovery">
          将清除本机全部数据，然后导入「{{ rebuildName }}」。<br>
          备份之后新增的记录会丢失——这是重置，不是恢复。
        </div>
        <div class="lock-msg" aria-live="polite">{{ message }}</div>
        <button class="btn-danger-solid" style="width:100%" :disabled="verifying" @click="doRebuild">{{ verifying ? '正在重建…' : '确认用备份重建' }}</button>
        <div class="lock-links"><a @click="mode = 'norecovery'">再想想</a></div>
      </template>

      <!-- ========== 凭据异常 ========== -->
      <template v-else-if="mode === 'corrupt'">
        <div class="lock-no-recovery">
          应用锁的安全配置异常（凭据缺失或损坏）。城堡日记不会因此放行，也不会动你的数据。<br>
          如果你有恢复码，可以用它重设 PIN；否则只能重置本机数据或用备份重建。
        </div>
        <div class="lock-links-col">
          <a @click="mode = lock.recoverySet ? 'recovery' : 'norecovery'">使用恢复码</a>
          <a class="danger" @click="mode = 'norecovery'">重置或重建</a>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'
import { lock, verifyPin, unlockByRecovery, regenerateRecoveryCode, throttleWaitMs, clearAppLock } from '../utils/appLock.js'
import { resetAll, importBackup } from '../store.js'

const emit = defineEmits(['unlocked'])

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '清空', '0', '删除']
const mode = ref(lock.corrupt ? 'corrupt' : 'unlock')
const pin = ref('')
const message = ref('')
const verifying = ref(false)
const shaking = ref(false)
const throttleLeft = ref(0)
const pinInput = ref(null)
const recCode = ref('')
const newPin = ref('')
const newPin2 = ref('')
const newCode = ref('')
const codeSaved = ref(false)
const resetSure = ref(false)
const rebuildInput = ref(null)
const rebuildName = ref('')
let rebuildFile = null
let throttleTimer = null
let shakeTimer = null

const subText = computed(() => ({
  unlock: '请输入 PIN 码，回到你的小小成长城堡。',
  forgot: '忘记 PIN？',
  recovery: '用恢复码保留全部数据，重设 PIN',
  newcode: '恢复成功',
  norecovery: '没有恢复码',
  'reset-confirm': '重置本机数据',
  'rebuild-confirm': '用备份重建',
  corrupt: '安全配置异常',
}[mode.value]))

function tap(k) {
  if (k === '清空') { pin.value = ''; return }
  if (k === '删除') { pin.value = pin.value.slice(0, -1); return }
  if (pin.value.length >= 6) return
  pin.value += k
  if (pin.value.length === 6) submit()
}
function onPinInput() {
  pin.value = pin.value.replace(/\D/g, '').slice(0, 6)
  if (pin.value.length === 6) submit()
}

async function submit() {
  if (verifying.value) return
  const wait = throttleWaitMs('pin')
  if (wait > 0) { startThrottle(wait); return }
  verifying.value = true
  try {
    const r = await verifyPin(pin.value)
    if (r === true) { emit('unlocked'); return }
    if (r?.throttled) { startThrottle(r.waitMs); pin.value = ''; return }
    pin.value = ''
    message.value = 'PIN 不正确，请重试。'
    shake()
  } catch {
    pin.value = ''
    message.value = '暂时无法完成验证，请重试。'
  } finally {
    verifying.value = false
  }
}

function startThrottle(ms) {
  throttleLeft.value = Math.ceil(ms / 1000)
  message.value = '休息一下再试试，稍后可以重新输入。'
  clearInterval(throttleTimer)
  throttleTimer = setInterval(() => {
    const w = throttleWaitMs('pin')
    if (w <= 0) {
      throttleLeft.value = 0
      message.value = ''
      clearInterval(throttleTimer)
    } else {
      throttleLeft.value = Math.ceil(w / 1000)
    }
  }, 1000)
}

function shake() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  shaking.value = true
  clearTimeout(shakeTimer)
  shakeTimer = setTimeout(() => (shaking.value = false), 400)
}

async function doRecovery() {
  message.value = ''
  if (!/^\d{6}$/.test(newPin.value)) { message.value = '新 PIN 需要 6 位数字'; return }
  if (newPin.value !== newPin2.value) { message.value = '两次输入的新 PIN 不一致'; return }
  const wait = throttleWaitMs('rec')
  if (wait > 0) { message.value = `尝试次数较多，请 ${Math.ceil(wait / 1000)} 秒后再试`; return }
  verifying.value = true
  try {
    const r = await unlockByRecovery(recCode.value, newPin.value)
    if (r.ok) {
      // 旧恢复码已失效，强制生成并确认新恢复码
      newCode.value = await regenerateRecoveryCode()
      codeSaved.value = false
      mode.value = 'newcode'
    } else {
      message.value = '恢复码不正确'
      shake()
    }
  } catch {
    message.value = '暂时无法完成验证，请重试。'
  } finally {
    verifying.value = false
  }
}

function finishRecovery() { emit('unlocked') }

function onRebuildFile(e) {
  const f = e.target.files?.[0]
  if (!f) return
  rebuildFile = f
  rebuildName.value = f.name
  message.value = ''
  mode.value = 'rebuild-confirm'
  e.target.value = ''
}

async function doRebuild() {
  if (!rebuildFile) return
  verifying.value = true
  message.value = ''
  try {
    const data = JSON.parse(await rebuildFile.text())
    if (!data || typeof data !== 'object' || (!data.settings && !data.baby)) throw new Error('bad')
    await resetAll(true) // 清空本机数据与应用锁，不刷新
    await importBackup(data)
    location.reload()
  } catch {
    message.value = '这个备份文件读不了（格式不对）。没有改动任何数据，可以重选文件。'
    verifying.value = false
  }
}

async function doReset() {
  await resetAll(true)
  clearAppLock()
  location.reload()
}

function backToUnlock() {
  mode.value = 'unlock'
  message.value = ''
  pin.value = ''
  pinInput.value?.focus()
}

onMounted(() => {
  pinInput.value?.focus()
  const w = throttleWaitMs('pin')
  if (w > 0) startThrottle(w)
})
onBeforeUnmount(() => { clearInterval(throttleTimer); clearTimeout(shakeTimer) })
</script>

<style scoped>
.lock-screen {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background:
    radial-gradient(1200px 600px at 20% -10%, rgba(243, 201, 105, .25), transparent),
    radial-gradient(900px 500px at 90% 110%, rgba(212, 122, 90, .18), transparent),
    #fdf3e3;
}
.lock-card {
  width: 320px; max-width: calc(100vw - 48px); max-height: calc(100vh - 48px); overflow: auto;
  background: #fffdf9; border-radius: 22px; padding: 28px 26px;
  box-shadow: 0 16px 48px rgba(150, 100, 40, .18);
  border: 1px solid rgba(246, 176, 100, .35);
  text-align: center;
}
.lock-brand { color: #e07a50; }
.lock-title { font-size: 20px; font-weight: 800; color: var(--ink); margin-top: 6px; letter-spacing: 1px; }
.lock-sub { font-size: 13px; color: var(--ink-2); margin: 4px 0 16px; }
.lock-hidden-input { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
.lock-dots { display: flex; gap: 12px; justify-content: center; margin-bottom: 10px; cursor: text; }
.lock-dot { width: 13px; height: 13px; border-radius: 50%; border: 2px solid #d9b98c; transition: background .12s; }
.lock-dot.on { background: #e07a50; border-color: #e07a50; }
.lock-msg { min-height: 20px; font-size: 12.5px; color: #c0392b; margin-bottom: 8px; }
.lock-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
.lock-key {
  height: 52px; border-radius: 12px; border: 1px solid var(--line);
  background: #fff; font-size: 17px; font-weight: 600; color: var(--ink); cursor: pointer;
}
.lock-key:hover { border-color: var(--brand); background: #fff8ec; }
.lock-key:active { transform: scale(.96); }
.lock-key:disabled { opacity: .45; cursor: not-allowed; }
.lock-links { margin-top: 4px; }
.lock-links a { font-size: 12.5px; color: var(--ink-2); text-decoration: underline; cursor: pointer; }
.lock-links-col { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
.lock-links-col a { font-size: 13px; color: var(--brand-deep); text-decoration: underline; cursor: pointer; }
.lock-links-col a.danger { color: #c0392b; }
.lock-note { font-size: 11px; color: var(--ink-3); margin-top: 12px; }
.lock-field { text-align: left; margin-bottom: 10px; }
.lock-field label { font-size: 12px; color: var(--ink-2); display: block; margin-bottom: 4px; }
.lock-input { width: 100%; box-sizing: border-box; border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; font-size: 15px; outline: none; }
.lock-input:focus { border-color: var(--brand); }
.lock-no-recovery { font-size: 13px; color: var(--ink-2); line-height: 1.9; margin: 4px 0 14px; text-align: left; }
.lock-code {
  font-family: monospace; font-size: 19px; letter-spacing: 1px; font-weight: 700;
  background: #fff8ec; border: 1px dashed rgba(224, 166, 59, .6); border-radius: 12px;
  padding: 12px; margin-bottom: 10px; color: #6b4a00; user-select: all;
}
.lock-code-tip { font-size: 12.5px; color: var(--ink-2); line-height: 1.8; margin-bottom: 12px; text-align: left; }
.lock-check { display: flex; align-items: center; gap: 8px; justify-content: center; font-size: 13px; margin-bottom: 12px; cursor: pointer; }
.btn-danger-solid { background: #c0392b; color: #fff; border: none; border-radius: 12px; padding: 11px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-danger-solid:disabled { opacity: .5; cursor: not-allowed; }
.shake { animation: lk-shake .38s; }
@keyframes lk-shake {
  0%, 100% { transform: translateX(0) }
  20% { transform: translateX(-9px) }
  40% { transform: translateX(8px) }
  60% { transform: translateX(-6px) }
  80% { transform: translateX(4px) }
}
@media (prefers-reduced-motion: reduce) { .shake { animation: none; } }
</style>
