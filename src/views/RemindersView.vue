<template>
  <div class="view-head">
    <h2>提醒中心</h2>
    <div class="sub">各模块该留意的事，都汇总在这里</div>
  </div>

  <div class="card">
    <div class="card-title">
      <span class="ct-left"><Icon name="bell" :size="16" />当前提醒</span>
      <span class="more">{{ reminders.length }} 条</span>
    </div>
    <div v-if="!reminders.length" class="empty">一切安好，没有要提醒的事 🌿</div>
    <div
      v-for="(r, i) in reminders" :key="i"
      class="rem-row" :class="'rem-' + r.level"
      @click="$emit('go', r.view)"
    >
      <span class="rem-icon"><Icon :name="r.icon" :size="16" /></span>
      <div class="rem-body">
        <span class="badge" :class="'badge-' + r.level">{{ r.kind }}</span>
        <span class="rem-text">{{ r.text }}</span>
      </div>
      <Icon name="chevron-right" :size="14" />
    </div>
  </div>

  <div class="card">
    <div class="card-title"><span class="ct-left"><Icon name="sprout" :size="16" />说明</span></div>
    <div class="wk-line dim">药品：过期 / 30 天内到期 / 库存用完会自动上榜</div>
    <div class="wk-line dim">疫苗：按宝宝月龄对照国家免疫规划程序，到龄未打的会提醒</div>
    <div class="wk-line dim">健康：体检/就医填了「下次日期」且距今 14 天内的会上榜</div>
    <div class="wk-line dim">玩具：超过 30 天没玩的会提醒（轻度提示，排在最后）</div>
    <div class="wk-line dim">点任意一条，跳到对应模块处理</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '../components/Icon.vue'
import { allReminders } from '../store.js'

defineEmits(['go'])

// allReminders 读取的是响应式 store，computed 会自动跟着变
const reminders = computed(() => allReminders())
</script>
