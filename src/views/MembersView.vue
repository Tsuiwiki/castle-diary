<template>
  <div class="view-head">
    <h2>家庭成员</h2>
    <div class="sub">一起守护这座小城堡的人</div>
  </div>

  <div class="two-col">
    <div class="col">
      <div class="card">
        <div class="card-title"><span class="ct-left"><Icon name="plus" :size="16" />添加成员</span></div>
        <div class="form-pair">
          <div class="form-row">
            <label>称呼</label>
            <input v-model.trim="form.name" placeholder="如 奶奶" @keyup.enter="save" />
          </div>
          <div class="form-row">
            <label>关系（可选）</label>
            <input v-model.trim="form.relation" placeholder="默认同称呼" @keyup.enter="save" />
          </div>
        </div>
        <div class="chip-row" style="margin-top:8px">
          <span v-for="q in quick" :key="q" class="chip" @click="form.name = q">{{ q }}</span>
        </div>
        <div class="form-actions">
          <button class="mini-btn" :disabled="!form.name" @click="save"><Icon name="check" :size="13" />添加</button>
        </div>
      </div>
    </div>

    <div class="col">
      <div class="card">
        <div class="card-title"><span class="ct-left"><Icon name="users" :size="16" />成员列表</span><span class="more">{{ store.members.length }} 人</span></div>
        <div v-for="m in store.members" :key="m.id" class="member-row">
          <span class="member-dot" :style="{ background: m.color }">{{ m.name.slice(0, 1) }}</span>
          <div class="member-body">
            <b>{{ m.name }}</b>
            <span class="member-rel">{{ m.relation }}</span>
          </div>
          <button class="icon-btn" @click="remove(m)"><Icon name="trash" :size="14" /></button>
        </div>
        <div v-if="!store.members.length" class="empty">还没有成员</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import Icon from '../components/Icon.vue'
import { store, addMember, removeMember } from '../store.js'

const quick = ['爸爸', '妈妈', '爷爷', '奶奶', '外公', '外婆']
const form = reactive({ name: '', relation: '' })

function save() {
  if (!form.name) return
  if (store.members.some(m => m.name === form.name)) return
  addMember({ ...form })
  form.name = ''; form.relation = ''
}
function remove(m) {
  if (confirm(`把「${m.name}」从家庭成员里移除？`)) removeMember(m.id)
}
</script>
