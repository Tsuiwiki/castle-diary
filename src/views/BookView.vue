<template>
  <div class="subbar">
    <button class="back-btn" @click="$emit('back')"><Icon name="arrow-left" :size="17" /></button>
    <span class="subbar-title">《{{ book?.title }}》</span>
    <span class="subbar-sub">{{ book?.category }}</span>
  </div>

  <template v-if="book">
    <div class="stat-row">
      <div class="stat-box"><div class="num">{{ book.reads.length }}</div><div class="lbl">读过次数</div></div>
      <div class="stat-box"><div class="num">{{ totalMinutes }}</div><div class="lbl">累计分钟</div></div>
      <div class="stat-box"><div class="num">{{ relatedWords.length }}</div><div class="lbl">学会的词语</div></div>
    </div>

    <div class="book-detail">
      <!-- 左栏：封面 + 藏书信息 -->
      <div>
        <div class="book-cover-lg">
          <img v-if="book.coverUrl" :src="book.coverUrl" :alt="book.title" />
          <template v-else>{{ book.title.slice(0, 1) }}</template>
        </div>
        <button class="btn-ghost" style="width:100%;justify-content:center;margin-top:10px" @click="coverInput.click()">
          <Icon name="camera" :size="14" />{{ book.coverUrl ? '更换封面' : '拍个封面' }}
        </button>
        <input ref="coverInput" type="file" accept="image/*" style="display:none" @change="onCover" />

        <div class="card" style="margin-top:14px">
          <div class="card-title">
            <span class="ct-left"><Icon name="book" :size="16" />藏书信息</span>
          </div>
          <div class="kv-row"><span class="kv-k">作者</span>
            <input class="kv-input" :value="book.author" placeholder="佚名"
              @change="updateBook(book.id, { author: $event.target.value.trim() })" />
          </div>
          <div class="kv-row"><span class="kv-k">出版社</span>
            <input class="kv-input" :value="book.publisher" placeholder="未填写"
              @change="updateBook(book.id, { publisher: $event.target.value.trim() })" />
          </div>
          <div class="kv-row"><span class="kv-k">适龄</span>
            <input class="kv-input" :value="book.age" placeholder="如 3-6 岁"
              @change="updateBook(book.id, { age: $event.target.value.trim() })" />
          </div>
          <div class="kv-row"><span class="kv-k">分类</span>
            <select class="kv-select" :value="book.category || '其他'" @change="updateBook(book.id, { category: $event.target.value })">
              <option v-for="c in BOOK_CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>

        <button class="danger-btn" @click="remove">把这本书移出书房</button>
      </div>

      <!-- 右栏：记阅读 + 沉淀词语 + 历史 -->
      <div>
        <!-- 快速记一次阅读 -->
        <div class="card">
          <div class="card-title">
            <span class="ct-left"><Icon name="book-open" :size="16" />记一次阅读</span>
          </div>
          <div class="inline-add">
            <input v-model.number="minutes" type="number" min="1" placeholder="时长（分钟）" style="flex:1.2" />
            <select v-model="scene">
              <option>睡前</option><option>下午</option><option>外出</option><option>其他</option>
            </select>
            <button class="mini-btn" @click="quickRead">记一笔</button>
          </div>
        </div>

        <!-- 从这本书沉淀词语（阅读→识字闭环） -->
        <div class="card">
          <div class="card-title">
            <span class="ct-left"><Icon name="message-circle" :size="16" />读这本书学会的词语</span>
            <span class="more">{{ relatedWords.length }} 个</span>
          </div>
          <div class="inline-add" style="margin-bottom:10px">
            <input v-model.trim="newWord" placeholder="学到的词 / 字 / 句子" style="flex:1.4" @keyup.enter="addWordHere" />
            <select v-model="newKind">
              <option v-for="k in WORD_KINDS" :key="k">{{ k }}</option>
            </select>
            <button class="mini-btn" @click="addWordHere">记下来</button>
          </div>
          <div class="word-grid" v-if="relatedWords.length">
            <div v-for="w in relatedWords" :key="w.id" class="word-cell" :class="{ mastered: w.mastered }">
              {{ w.word }}<span class="wkind">{{ w.kind }}{{ w.mastered ? ' · 已掌握' : '' }}</span>
              <button class="wdel" @click.stop="delWord(w)">×</button>
            </div>
          </div>
          <div v-else class="empty">还没有，读到新词随手记一个</div>
        </div>

        <!-- 阅读历史 -->
        <div class="card">
          <div class="card-title">
            <span class="ct-left"><Icon name="clock" :size="16" />阅读历史</span>
          </div>
          <div v-for="(r, ri) in book.reads" :key="r.id || (r.time + '-' + ri)" class="tl-item">
            <span class="tl-time">{{ r.time.slice(5, 10) }}</span>
            <span class="tl-icon"><Icon name="book-open" :size="18" /></span>
            <div class="tl-body">
              <div class="tl-title">{{ r.minutes ? r.minutes + ' 分钟' : '读了一次' }}<span v-if="r.scene"> · {{ r.scene }}</span></div>
              <div v-if="r.note || r.withWho" class="tl-note">{{ r.withWho }} {{ r.note }}</div>
            </div>
          </div>
          <div v-if="!book.reads.length" class="empty">还没读过，今晚试试？</div>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup>
import { ref, computed } from 'vue'
import Icon from '../components/Icon.vue'
import { store, addRead, addWord, removeWord, removeBook, setBookCover, updateBook, nowLocal, WORD_KINDS, BOOK_CATEGORIES } from '../store.js'
import { genPinyin } from '../utils/pinyin.js'
import { compressImage } from '../utils/image.js'

const props = defineProps({ bookId: { type: String, required: true } })
const emit = defineEmits(['back'])

const minutes = ref(15)
const scene = ref('睡前')
const newWord = ref('')
const newKind = ref('词语')
const coverInput = ref(null)

const book = computed(() => store.books.find(b => b.id === props.bookId))
const totalMinutes = computed(() => book.value ? book.value.reads.reduce((s, r) => s + (r.minutes || 0), 0) : 0)
const relatedWords = computed(() => book.value ? store.words.filter(w => w.sourceBook === book.value.title) : [])

function quickRead() {
  addRead(book.value.id, {
    time: nowLocal(), minutes: minutes.value || 0,
    scene: scene.value, withWho: '', note: '',
  })
  minutes.value = 15
}

function addWordHere() {
  if (!newWord.value) return
  addWord({ word: newWord.value, kind: newKind.value, sourceBook: book.value.title, pinyin: genPinyin(newWord.value) })
  newWord.value = ''
}

function delWord(w) {
  if (confirm(`把「${w.word}」从词库删除？`)) removeWord(w.id)
}

async function onCover(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    const dataUrl = await compressImage(file)
    await setBookCover(book.value.id, dataUrl)
  } catch (err) {
    alert('封面保存失败：' + err.message)
  }
}

function remove() {
  if (confirm(`把《${book.value.title}》移出书房？（关联词语保留在词库）`)) {
    removeBook(book.value.id)
    emit('back')
  }
}
</script>
