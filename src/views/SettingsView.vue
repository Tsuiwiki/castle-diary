<template>
  <div class="view-head">
    <h2>设置</h2>
    <p class="sub">数据只存在本机浏览器 · 换电脑用「导出备份」搬走</p>
  </div>

  <!-- 孩子档案 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="baby" :size="16" />孩子档案</span>
    </div>
    <div class="form-pair">
      <div class="form-row">
        <label>小名</label>
        <input v-model.trim="childName" placeholder="宝宝小名" />
      </div>
      <div class="form-row">
        <label>生日</label>
        <input type="date" v-model="birthday" />
      </div>
    </div>
    <button class="btn-primary" @click="saveProfile">保存</button>
    <span v-if="savedTip" style="margin-left:10px;font-size:12px;color:var(--green)">已保存</span>
  </div>

  <!-- 陪读偏好 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="volume" :size="16" />陪读偏好</span>
    </div>
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px">
      <input type="checkbox" v-model="ttsOn" @change="saveTts" style="width:16px;height:16px;accent-color:var(--brand)" />
      翻卡 / 选图时自动朗读词语（浏览器内置发音，不联网）
    </label>
    <div v-if="ttsOn" style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <select v-model="voiceName" @change="saveVoice" style="flex:1;min-width:220px">
        <option value="">自动选音（优先自然童声）</option>
        <option v-for="v in voices" :key="v.name" :value="v.name">{{ v.name.replace('Microsoft ', '').replace(' Online (Natural)', '·自然音').replace(/ - Chinese.*$/, '') }}</option>
      </select>
      <button class="btn-ghost" @click="speak('小熊宝宝绘本')"><Icon name="volume" :size="14" />试听</button>
    </div>
    <p v-if="ttsOn && !voices.length" style="font-size:12px;color:var(--ink-2);margin-top:8px">未检测到中文语音包，将使用系统默认发音</p>
  </div>

  <!-- 数据备份 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="download" :size="16" />备份与迁移</span>
      <span class="more">封面图也会打包进备份文件</span>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn-primary" @click="doExport"><Icon name="download" :size="15" />导出备份文件</button>
      <span v-if="store.settings.lastExportAt" class="more" style="font-size:12px;color:var(--ink-2)">上次备份：{{ store.settings.lastExportAt.slice(0, 10) }}</span>
      <span v-else class="more" style="font-size:12px;color:#c0392b">还没有备份过</span>
      <button class="btn-ghost" @click="importInput.click()"><Icon name="upload" :size="14" />导入备份</button>
      <input ref="importInput" type="file" accept="application/json,.json" style="display:none" @change="onImport" />
    </div>
    <p style="font-size:12px;color:var(--ink-2);margin-top:10px;line-height:1.7">
      <div class="bk-note"><Icon name="lock" :size="15" /><span>数据只存在本机浏览器，清浏览器数据会丢失；换电脑用「导出备份」带走，或开启下面的自动备份。</span></div>
      导入会整体替换当前数据；支持导入「城堡日记」旧版备份（只抽取书房与词库）。
      <div class="auto-bk">
        <template v-if="autoBackup.supported">
          <template v-if="autoBackup.enabled">
            <span class="ab-on">✓ 自动备份已开启：每天第一次改动后，自动写入文件夹「{{ autoBackup.dirName }}」里的 城堡日记-自动备份.json</span>
            <span v-if="autoBackup.lastAt" class="ab-sub">上次：{{ autoBackup.lastAt.slice(0, 16).replace('T', ' ') }}</span>
            <span v-if="autoBackup.status === 'need-auth'" class="ab-warn">浏览器收回了权限，<a @click="resumeAutoBackup">点这里重新授权</a></span>
            <button class="mini-btn ghost" @click="disableAutoBackup">关闭自动备份</button>
          </template>
          <button v-else class="btn-ghost" @click="openAutoBackup"><Icon name="download" :size="14" />开启自动备份到电脑文件夹</button>
          <div v-if="!autoBackup.enabled" class="ab-sub">选个文件夹授权一次，以后每天有改动就自动存一份，不用再惦记手动导出</div>
        </template>
        <div v-else class="ab-sub">当前浏览器不支持自动备份到文件夹（电脑版 Chrome / Edge 支持）；请用上面的手动导出</div>
      </div>
    </p>
  </div>

  <!-- OCR 设置 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="scan" :size="16" />封面识别（OCR）</span>
      <span class="more">{{ hasCustomOcrKey() ? '已用自己的 key' : '正在用公共 demo key' }}</span>
    </div>
    <div class="form-row">
      <label>OCR.space API Key（留空则用公共 demo key）</label>
      <input v-model.trim="ocrKey" placeholder="在 ocr.space 免费申请，25k 次/月" />
    </div>
    <button class="btn-ghost" @click="saveOcrKey">保存 key</button>
    <p style="font-size:12px;color:var(--ink-2);margin-top:10px;line-height:1.7">
      识别走浏览器直连 OCR.space，不经过任何服务器。key 只保存在本机浏览器。
    </p>
  </div>

  <!-- 危险区 -->
  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="trash" :size="16" />危险区</span>
    </div>
    <button class="danger-btn" @click="doReset">清空本机全部数据（日记、书房、相册、健康等，全部）</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Icon from '../components/Icon.vue'
import { store, updateSettings, exportBackup, importBackup, resetAll, todayStr, markExported, autoBackup, enableAutoBackup, resumeAutoBackup, disableAutoBackup } from '../store.js'
import { getOcrKey, setOcrKey, hasCustomOcrKey } from '../utils/ocr.js'
import { speak, listZhVoices, getTtsVoiceName, setTtsVoiceName } from '../utils/tts.js'

const childName = ref(store.settings.childName)
const birthday = ref(store.settings.birthday)
const savedTip = ref(false)
const ocrKey = ref(hasCustomOcrKey() ? getOcrKey() : '')
const importInput = ref(null)
const ttsOn = ref(store.settings.tts !== false)
const voiceName = ref(getTtsVoiceName())
const voices = ref(listZhVoices())

// 浏览器语音列表异步加载，进页面后刷新一次
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener?.('voiceschanged', () => { voices.value = listZhVoices() })
  setTimeout(() => { voices.value = listZhVoices() }, 300)
}

function saveVoice() {
  setTtsVoiceName(voiceName.value)
}

function saveTts() {
  updateSettings({ tts: ttsOn.value })
}

function saveProfile() {
  updateSettings({ childName: childName.value, birthday: birthday.value })
  savedTip.value = true
  setTimeout(() => savedTip.value = false, 1500)
}

function saveOcrKey() {
  setOcrKey(ocrKey.value)
  alert(ocrKey.value ? '已保存自己的 OCR key' : '已恢复使用公共 demo key')
}

async function openAutoBackup() {
  try {
    await enableAutoBackup()
  } catch (e) {
    if (e?.name !== 'AbortError') alert('开启失败：' + (e?.message || e))
  }
}

async function doExport() {
  const data = await exportBackup()
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  markExported()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `城堡日记-备份-${todayStr().replaceAll('-', '')}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function onImport(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    const data = JSON.parse(await file.text())
    const isDiary = data?.app !== 'castle-books'
    const tip = isDiary
      ? '检测到手机版「城堡日记」旧备份，将导入书房、词库、药箱、健康、餐桌、玩具、里程碑、出行、相册与成员，并覆盖当前全部数据。继续？'
      : '导入会覆盖当前全部数据（日记、书房、词库、饮食、游戏、玩具、足迹、相册、健康、药箱、生病记、成员等）。当前数据会先暂存一份，导入失败会尽量恢复。继续？'
    if (!confirm(tip)) return
    await importBackup(data)
    alert('导入完成')
    location.reload()
  } catch (err) {
    alert('导入失败：' + err.message)
  }
}

async function doReset() {
  if (confirm('确定清空本机全部数据？建议先导出备份。此操作不可恢复！')) {
    await resetAll()
  }
}
</script>

<style scoped>
.bk-note {
  display: flex; align-items: flex-start; gap: 8px; margin: 8px 0 10px;
  background: #fff7e6; border: 1px solid rgba(224, 166, 59, .5); border-radius: 10px;
  padding: 8px 12px; font-size: 12.5px; color: #8a5a00; line-height: 1.6;
}
.bk-note svg { flex: none; margin-top: 2px; }
.auto-bk { margin-top: 10px; border-top: 1px dashed var(--line); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.ab-on { font-size: 13px; color: var(--green); font-weight: 600; }
.ab-sub { font-size: 12px; color: var(--ink-2); }
.ab-warn { font-size: 12px; color: #c0392b; }
.ab-warn a { text-decoration: underline; cursor: pointer; }
</style>
