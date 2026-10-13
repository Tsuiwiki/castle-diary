<template>
  <div class="diary-layout">
    <!-- ========== 日记纸 ========== -->
    <section
      class="paper" :class="{ 'drop-on': dragOver }"
      @dragover.prevent="dragOver = true" @dragleave.self="dragOver = false" @drop.prevent="onDropPaper"
    >
      <!-- 日期抬头 -->
      <header class="p-head">
        <button class="p-arrow" title="前一天（←）" @click="shiftDay(-1)"><Icon name="chevron-left" :size="18" /></button>
        <div class="p-date">
          <div class="p-day">{{ dateLabel }}</div>
          <div class="p-age">
            <span v-if="age">{{ childName() }} · {{ age }}</span>
            <a v-else-if="!store.settings.birthday" class="bday-hint" @click="$emit('go', 'settings')">先填小名和生日，月龄才会长出来 →</a>
            <span v-if="isMonthBirthday" class="p-bday">月龄生日</span>
            <span v-if="dayTerm" class="p-term" :class="'term-' + dayTerm.season" :title="dayTerm.hint">今日 · {{ dayTerm.name }}</span>
            <span v-if="entry.lines.length" class="p-mini-castle" title="城堡的家底" @click="castleLedger = true"><CastleSvg :width="64" /></span>
          </div>
        </div>
        <button class="p-arrow" title="后一天（→）" :disabled="isToday" @click="shiftDay(1)"><Icon name="chevron-right" :size="18" /></button>
        <div class="p-head-right">
          <button class="mini-btn ghost mc-btn" :class="{ bday: isMonthBirthday }" @click="openMonthCard">{{ isMonthBirthday ? '这月出卡啦 🎂' : '月龄卡' }}</button>
          <button v-if="!isToday" class="mini-btn ghost" @click="goToday">回到今天</button>
          <label class="p-pick" title="跳到某一天">
            <Icon name="calendar" :size="16" />
            <input type="date" :value="date" :max="today" @change="e => e.target.value && setDate(e.target.value)" />
          </label>
        </div>
      </header>

      <!-- 心情 -->
      <div class="p-mood">
        <span class="p-mood-lbl">她今天</span>
        <span
          v-for="m in MOODS" :key="m.key"
          class="mood-chip" :class="{ on: diary?.mood === m.key }"
          :style="diary?.mood === m.key ? { background: m.color, borderColor: m.color } : { borderColor: m.color, color: m.color }"
          @click="setMood(m.key)"
        >{{ m.key }}</span>
      </div>

      <!-- 贴纸栏 -->
      <div class="stickers">
        <button
          v-for="(s, i) in STICKERS" :key="s.key"
          class="sticker" :class="['st-' + s.key, { on: active === s.key }]"
          @click="toggleSticker(s.key)"
        >
          <Icon :name="s.icon" :size="15" />{{ s.label }}<kbd>{{ i + 1 }}</kbd>
        </button>
      </div>

      <!-- 贴纸面板 -->
      <div v-if="active" ref="panelEl" class="panel" :class="'pk-' + active">
        <button class="pn-close" title="收起（Esc）" @click="active = ''"><Icon name="x" :size="15" /></button>

        <!-- 吃了 -->
        <template v-if="active === 'food'">
          <div class="pn-title">今天吃了什么？</div>
          <div class="chip-row">
            <span v-for="m in MEALS" :key="m" class="chip" :class="{ sel: food.meal === m }" @click="food.meal = food.meal === m ? '' : m">{{ m }}</span>
          </div>
          <div class="pn-input-row">
            <input
              class="pn-input pn-focus" v-model.trim="food.input"
              placeholder="输入食物，回车加入；多个可用顿号隔开，如 南瓜粥、蒸蛋"
              @keydown.enter.prevent="onFoodEnter"
            />
            <button class="mini-btn" :disabled="!food.picked.length && !food.input" @click="saveFood">记下</button>
          </div>
          <div v-for="a in pickedAllergies" :key="a.name" class="al-warn">⚠ {{ a.name }} 之前记过过敏 / 不适：{{ a.allergyNote || '没写反应' }}</div>
          <div v-if="food.picked.length" class="chip-row picked">
            <span v-for="f in food.picked" :key="f" class="chip sel" @click="togglePick(f)">{{ f }} ×</span>
          </div>
          <div v-if="frequent.length" class="chip-row">
            <span class="pn-hint">常吃：</span>
            <span v-for="f in frequent" :key="f" class="chip" :class="{ sel: food.picked.includes(f) }" @click="togglePick(f)">{{ f }}</span>
          </div>
          <div class="chip-row">
            <span class="chip chip-first" :class="{ sel: food.first }" @click="food.first = !food.first">⭐ 第一次吃</span>
            <span
              v-for="t in MEAL_TAGS" :key="t" class="chip"
              :class="{ sel: food.tag === t, disabled: t === '过敏' && food.picked.length > 1 }"
              @click="t === '过敏' && food.picked.length > 1 ? showToast('过敏请一次只记一种食物，方便以后核对') : (food.tag = food.tag === t ? '' : t)"
            >{{ t }}</span>
          </div>
          <div v-if="food.picked.length > 1 && food.first" class="pn-hint" style="margin-top:4px">将标记第一次吃：{{ food.picked.join('、') }}</div>
          <div v-if="food.tag === '过敏' && food.picked.length > 1" class="pn-hint" style="margin-top:4px;color:#c0392b">过敏一次只能记一种：先在食物列表里只留下它</div>
        </template>

        <!-- 读了 -->
        <template v-else-if="active === 'book'">
          <div class="pn-title">读了哪本书？<span class="pn-sub">点封面就记一次</span></div>
          <div class="pn-input-row">
            <input class="pn-input pn-focus" v-model.trim="bookQuery" placeholder="搜书名" />
            <input class="pn-input" v-model.trim="readNote" placeholder="一句话（可选）：指着毛毛虫哈哈笑" />
          </div>
          <div v-if="bookList.length" class="pn-books">
            <div v-for="b in bookList" :key="b.id" class="pn-book" :title="'《' + b.title + '》'" @click="logRead(b)">
              <div class="pn-cover">
                <img v-if="b.coverUrl" :src="b.coverUrl" />
                <span v-else>{{ b.title.slice(0, 1) }}</span>
              </div>
              <div class="pn-btitle">{{ b.title }}</div>
              <div class="pn-bmeta">{{ b.reads.length ? '读过 ' + b.reads.length + ' 次' : '还没读过' }}</div>
            </div>
          </div>
          <div v-else class="pn-empty">{{ store.books.length ? '没找到这本书' : '书房里还没有书' }}</div>
          <div class="pn-foot"><a @click="goAddBook">书房里还没有这本？去上架 →</a></div>
        </template>

        <!-- 她说 -->
        <template v-else-if="active === 'say'">
          <div class="pn-title">她今天说了什么？</div>
          <div class="pn-input-row">
            <input
              class="pn-input pn-focus" v-model.trim="say.input"
              placeholder="一个新词，或一句话，比如 鸽子 / 妈妈抱抱"
              @keydown.enter.prevent="saveSay"
            />
            <button class="mini-btn" :disabled="!say.input" @click="saveSay">记下</button>
          </div>
          <!-- 录音：点一下开始，再点一下停止；最长 15 秒 -->
          <div class="rec-row">
            <button v-if="rec.state === 'idle'" class="rec-btn" @click="startRec">
              <span class="rec-dot"></span>录下她的声音
            </button>
            <template v-else-if="rec.state === 'recording'">
              <button class="rec-btn on" @click="stopRec"><span class="rec-dot"></span>停止</button>
              <span class="rec-meter" title="音量：说话时这里应该跳动">
                <i v-for="n in 8" :key="n" :class="{ lit: rec.level * 8 * 2.2 >= n }"></i>
              </span>
              <span class="rec-time">{{ secText(rec.ms) }} / {{ secText(MAX_RECORD_MS) }}</span>
            </template>
            <template v-else>
              <button class="rec-btn ready" :class="{ playing: playingUrl === rec.result.dataUrl }" @click="playAudio(rec.result.dataUrl)">
                <Icon name="volume" :size="14" />{{ playingUrl === rec.result.dataUrl ? '正在播放，点击停止' : `试听 ${secText(rec.ms)}` }}
              </button>
              <button class="mini-btn ghost" @click="discardRec(); startRec()">重录</button>
              <button class="mini-btn ghost" @click="discardRec">不要了</button>
              <span class="pn-hint">点「记下」时会和文字一起保存</span>
            </template>
          </div>
          <div v-if="rec.state === 'ready' && rec.result?.silent" class="rec-warn">
            这段录音几乎没有声音：可能用的不是你想用的麦克风，或麦克风被静音了。
            检查 Windows「设置 → 系统 → 声音 → 输入」里的默认麦克风，或点地址栏左侧的图标选择麦克风，然后点「重录」。
          </div>
          <div class="chip-row">
            <span
              v-for="k in SAY_KINDS" :key="k.kind"
              class="chip" :class="{ sel: sayKind === k.kind }"
              @click="say.kind = say.kind === k.kind ? '' : k.kind"
            >{{ k.label }}</span>
            <span v-if="sayKind === '句子'" class="chip chip-quote" :class="{ sel: say.funny }" @click="say.funny = !say.funny">✨ 金句</span>
            <span class="pn-hint">{{ sayKind === '句子' ? '说得很妙、逻辑清奇的话点「金句」，会单独记下来' : '不选会自动判断：4 个字以上算一句话' }}</span>
          </div>
        </template>

        <!-- 玩了 -->
        <template v-else-if="active === 'play'">
          <div class="pn-title">今天一起玩了什么？<span class="pn-sub">新游戏会自动加入游戏册</span></div>
          <div class="pn-input-row">
            <input
              class="pn-input pn-focus" v-model.trim="play.name"
              placeholder="游戏名，如 形状配对盒 / 躲猫猫" @keydown.enter.prevent="savePlay"
            />
            <input
              class="pn-input" v-model.trim="play.note"
              placeholder="她的表现（可选）：自己把三角形放进去了" @keydown.enter.prevent="savePlay"
            />
            <button class="mini-btn" :disabled="!play.name" @click="savePlay">记下</button>
          </div>
          <div v-if="gameChips.length" class="chip-row">
            <span class="pn-hint">{{ store.games.length ? '常玩：' : '灵感：' }}</span>
            <span v-for="n in gameChips" :key="n" class="chip" :class="{ sel: play.name === n }" @click="play.name = n">{{ n }}</span>
          </div>
          <div class="chip-row">
            <span class="chip chip-first" :class="{ sel: play.first }" @click="play.first = !play.first">🏅 第一次完成</span>
            <span class="chip" :class="{ sel: play.photo }" @click="playPhotoInput.click()">{{ play.photo ? '已配照片 ✓' : '📷 配张照片' }}</span>
            <img v-if="play.photo" :src="play.photo" class="pn-thumb" />
          </div>
          <input ref="playPhotoInput" type="file" accept="image/*" hidden @change="onPlayPhoto" />
        </template>

        <!-- 去了 -->
        <template v-else-if="active === 'trip'">
          <div class="pn-title">今天去哪儿了？</div>
          <div class="pn-input-row">
            <input class="pn-input pn-focus" v-model.trim="trip.place" placeholder="地点，如 朝阳公园" @keydown.enter.prevent="saveTrip" />
            <input class="pn-input" v-model.trim="trip.note" placeholder="做了什么（可选）：喂鸽子，不肯回家" @keydown.enter.prevent="saveTrip" />
            <button class="mini-btn" :disabled="!trip.place" @click="saveTrip">记下</button>
          </div>
          <div v-if="places.length" class="chip-row">
            <span class="pn-hint">常去：</span>
            <span v-for="p in places" :key="p.place" class="chip" :class="{ sel: trip.place === p.place }" @click="trip.place = p.place">{{ p.place }}</span>
          </div>
          <div class="chip-row">
            <span class="pn-hint">和谁：</span>
            <span v-for="w in withOptions" :key="w" class="chip" :class="{ sel: trip.withWho === w }" @click="trip.withWho = trip.withWho === w ? '' : w">{{ w }}</span>
            <span class="chip" :class="{ sel: trip.photo }" @click="tripPhotoInput.click()">{{ trip.photo ? '已配照片 ✓' : '📷 配张照片' }}</span>
            <img v-if="trip.photo" :src="trip.photo" class="pn-thumb" />
          </div>
          <input ref="tripPhotoInput" type="file" accept="image/*" hidden @change="onTripPhoto" />
        </template>

        <!-- 不舒服 -->
        <template v-else-if="active === 'sick'">
          <!-- 还没在生病：选症状开一张生病记 -->
          <template v-if="!sickNow">
            <div class="pn-title">她哪里不舒服？<span class="pn-sub">会开一张「生病记」，之后每天点这张贴纸接着记</span></div>
            <div class="chip-row">
              <span v-for="sy in SYMPTOMS" :key="sy" class="chip" :class="{ sel: sick.symptoms.includes(sy) }" @click="toggleList(sick.symptoms, sy)">{{ sy }}</span>
            </div>
            <div class="pn-input-row">
              <input class="pn-input pn-focus" v-model.trim="sick.other" placeholder="其他症状（可选）" @keydown.enter.prevent="startSick" />
              <input class="pn-input sk-temp" v-model="sick.temp" type="number" step="0.1" min="34" max="43" placeholder="体温 ℃（可选）" @keydown.enter.prevent="startSick" />
              <button class="mini-btn" :disabled="!sick.symptoms.length && !sick.other" @click="startSick">开始记录</button>
            </div>
          </template>

          <!-- 正在生病（或这天属于某次生病） -->
          <template v-else>
            <div class="pn-title">
              {{ date === sickNow.start ? '这天开始不舒服' : `生病第 ${illnessDays(sickNow, date)} 天` }}：{{ sickNow.symptoms.join('、') || '不舒服' }}
              <a class="pn-link" @click="$emit('go', 'illness')">看整张生病记 →</a>
            </div>
            <div v-if="sickNow.end && sickNow.end < today.value" class="sk-ended">
              这次已经在 {{ sickNow.end }} 好了。<a @click="reopenIllness(sickNow.id)">其实还没好</a>
            </div>
            <div class="sk-row">
              <span class="sk-lbl">体温</span>
              <input class="pn-input sk-temp pn-focus" v-model="sick.temp" type="number" step="0.1" min="34" max="43" placeholder="37.8" @keydown.enter.prevent="saveTemp" />
              <input class="pn-input sk-time" v-model="sick.time" type="time" />
              <button class="mini-btn" :disabled="!sick.temp" @click="saveTemp">记下</button>
              <span v-for="t in dayTemps" :key="t.time" class="temp-chip" :class="{ hot: t.value >= 38.5, warm: t.value >= 37.3 && t.value < 38.5 }">
                {{ t.time.slice(11) }} {{ t.value.toFixed(1) }}℃<i @click="removeTemp(sickNow.id, t.time)">×</i>
              </span>
            </div>
            <div class="sk-row">
              <span class="sk-lbl">吃药</span>
              <template v-if="medOptions.length">
                <span
                  v-for="m in medOptions" :key="m.id"
                  class="chip med-chip" :class="{ off: !m.stock, expired: m.expired }"
                  :title="m.expired ? '已过期' : `库存 ${m.stock} ${m.unit}`"
                  @click="takeMed(m)"
                >{{ m.name }}<i>{{ m.expired ? '过期' : m.stock + m.unit }}</i></span>
              </template>
              <span v-else class="pn-hint">药箱里还没有药，<a class="pn-link" @click="$emit('go', 'medicine')">去药箱添一个 →</a></span>
              <span v-for="(m, i) in dayMeds" :key="i" class="pn-hint">· {{ m.time.slice(11) }} {{ m.name }}</span>
            </div>
            <div class="sk-row">
              <span class="sk-lbl">症状</span>
              <span
                v-for="sy in SYMPTOMS" :key="sy" class="chip"
                :class="{ sel: sickNow.symptoms.includes(sy) }"
                @click="sickNow.symptoms.includes(sy) ? removeSymptom(sickNow.id, sy) : addSymptoms(sickNow.id, [sy])"
              >{{ sy }}</span>
            </div>
            <div class="pn-input-row">
              <input class="pn-input" v-model.trim="sick.note" placeholder="这一天怎么样（可选）：精神好多了，烧退了" @keydown.enter.prevent="saveSickNote" />
              <button class="mini-btn ghost" @click="saveSickNote">记下</button>
            </div>
            <div class="chip-row">
              <span class="chip" :class="{ sel: dayVisit }" @click="toggleVisit">🏥 这天去医院了</span>
              <button v-if="!sickNow.end || sickNow.end !== date" class="mini-btn sk-done" @click="finishSick">🎉 好了</button>
              <span v-else class="pn-hint">这天病好了 · <a class="pn-link" @click="reopenIllness(sickNow.id)">其实还没好</a></span>
            </div>
          </template>
        </template>

        <!-- 照片 -->
        <template v-else-if="active === 'photo'">
          <div class="pn-title">贴几张照片</div>
          <div class="pn-drop" @click="fileInput.click()">
            <Icon name="image" :size="22" />
            <span>{{ uploading ? '正在保存…' : '点这里选照片，或直接把照片拖到日记纸上' }}</span>
          </div>
          <input class="pn-input pn-focus" v-model.trim="photoNote" placeholder="配一句话（可选）" style="margin-top:8px;width:100%" />
        </template>
      </div>
      <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onPickPhotos" />

      <!-- 日记正文 -->
      <div class="p-body">
        <div v-if="dayTerm" class="p-term-hint">今天是{{ dayTerm.name }}：{{ dayTerm.hint }}</div>
        <div v-if="!entry.lines.length && !entry.photos.length" class="p-empty">
          <div class="p-castle" title="城堡的家底" @click="castleLedger = true"><CastleSvg :width="280" /><span>{{ castleSummary }}</span></div>
          <div class="p-q" @click="toggleSticker(question.s)">{{ question.q }}</div>
          <div class="p-q-sub">点上面的贴纸，或按数字键 1–7 开始写今天的日记</div>
        </div>
        <p v-for="line in entry.lines" :key="line.key" class="p-line">
          <template v-for="(tk, i) in line.tokens" :key="i">
            <span v-if="tk.t === 'text'">{{ tk.v }}</span>
            <span v-else class="tk" :class="['tk-' + tk.kind, { 'tk-jump': tk.jump }]" @click="tk.jump && $emit('go', tk.jump)">
              {{ tk.v }}<button v-if="tk.audio" class="tk-play" :class="{ playing: playingUrl === tk.audio }" :title="playingUrl === tk.audio ? '停止' : '听她说'" @click.stop="playAudio(tk.audio)"><Icon name="volume" :size="13" /></button><small v-if="tk.suffix" class="tk-suffix">（{{ tk.suffix }}）</small>
              <span v-if="tk.badge" class="stamp" :class="'stamp-' + tk.badge">{{ tk.badge }}</span>
              <button v-if="tk.del" class="tk-del" title="删掉这条" @click="removeToken(tk)">×</button>
              <button v-if="kindSwitch(tk)" class="tk-kind" @click="switchKind(tk)">{{ kindSwitch(tk).label }}</button>
            </span>
          </template>
        </p>

        <!-- 照片拍立得 -->
        <div v-if="entry.photos.length" class="polaroids">
          <figure v-for="(p, i) in entry.photos" :key="p.id" class="polaroid" :style="{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }" @click="lightbox = p">
            <img v-if="p.imageUrl" :src="p.imageUrl" />
            <figcaption>{{ p.note || ' ' }}</figcaption>
          </figure>
        </div>
      </div>

      <!-- 爸爸妈妈想说的 + 落款 -->
      <footer class="p-foot">
        <textarea
          v-model="textDraft" class="p-text" rows="2"
          placeholder="爸爸妈妈想说的（可选）：今天第一次主动牵手过马路……"
          @input="queueText"
          @blur="flushText"
        ></textarea>
        <div class="p-sign">
          <span class="pn-hint">今天由</span>
          <span
            v-for="m in store.members" :key="m.id"
            class="chip" :class="{ sel: diary?.by === m.name }"
            @click="setBy(m.name)"
          >{{ m.name }}</span>
          <span class="pn-hint">记</span>
          <span class="save-state" :class="{ dim: !saveDirty }">{{ saveStateText }}</span>
        </div>
      </footer>
    </section>

    <!-- ========== 右栏 ========== -->
    <aside class="rail">
      <div v-if="needBackup" class="rail-card rail-backup" @click="$emit('go', 'settings')">
        <div class="rail-title"><Icon name="download" :size="15" />给城堡存个档</div>
        <div class="rail-dim">{{ needBackup }}，去「设置 → 备份与迁移」导出一次备份，换电脑也能带走</div>
      </div>

      <div class="rail-card">
        <div class="rail-title"><Icon name="bell" :size="15" />提醒<a class="rail-more" @click="$emit('go', 'reminders')">查看全部 →</a></div>
        <div v-if="!reminders.length" class="rail-dim">暂时没有要办的事</div>
        <div v-for="(r, i) in reminders" :key="i" class="rail-rem" :class="'lv-' + r.level" @click="$emit('go', r.view)">
          <Icon :name="r.icon" :size="14" /><span>{{ r.text }}</span>
        </div>
      </div>

      <div class="rail-card">
        <div class="rail-title"><Icon name="sparkles" :size="15" />{{ monthLabel }}</div>
        <div class="rail-stats">
          <div><b>{{ monthStats.days }}</b><span>天写了日记</span></div>
          <div><b>{{ monthStats.words }}</b><span>个新词</span></div>
          <div><b>{{ monthStats.photos }}</b><span>张照片</span></div>
        </div>
      </div>

      <div class="rail-card rail-plates" @click="$emit('go', 'diet')">
        <div class="rail-title"><Icon name="bowl" :size="15" />本周彩虹餐盘</div>
        <div class="rp-row">
          <div v-for="d in railPlates" :key="d.date" class="rp-day" :class="{ cur: d.date === date }">
            <RainbowPlate :groups="d.groups" :size="30" />
            <span>{{ d.w }}</span>
          </div>
        </div>
        <div class="rail-dim" style="margin-top:6px">{{ railPlateTip }}</div>
      </div>

      <div class="rail-card">
        <div class="rail-title"><Icon name="map-pin" :size="15" />本月足迹</div>
        <div v-if="!monthPlaces.length" class="rail-dim">这个月还没出门盖章</div>
        <div v-else class="stamps">
          <div v-for="p in monthPlaces" :key="p.place" class="pstamp" :class="{ fresh: p.fresh }">
            <div class="ps-name">{{ p.place }}</div>
            <div class="ps-count">{{ p.fresh ? '新' : '' }} ×{{ p.count }}</div>
          </div>
        </div>
      </div>

      <div v-if="lookback" class="rail-card rail-back" @click="setDate(lookback.date)">
        <div class="rail-title"><Icon name="clock" :size="15" />{{ lookback.label }}</div>
        <img v-if="lookback.photo" :src="lookback.photo" class="rb-img" />
        <div class="rb-text">{{ lookback.text }}</div>
      </div>
    </aside>
  </div>

  <!-- 城堡账册 -->
  <div v-if="castleLedger" class="drawer-mask" @click="castleLedger = false">
    <div class="lightbox castle-sheet" @click.stop>
      <div class="cs-head"><b>城堡的家底</b><button class="mini-btn" @click="castleLedger = false">关闭</button></div>
      <CastleSvg :width="420" />
      <div class="cs-list">
        <div><i class="cs-ic" style="background:#eecfa0"></i>{{ castleSummary }}</div>
        <div class="cs-sub">记录不会消失，城堡只长不倒。工龄越长，灯越亮。</div>
      </div>
    </div>
  </div>

  <!-- 月龄卡 -->
  <div v-if="monthCard.show" class="drawer-mask" @click="closeMonthCard">
    <div class="lightbox mc-sheet" @click.stop>
      <div class="cs-head"><b>月龄卡</b><button class="mini-btn" @click="closeMonthCard">关闭</button></div>
      <div v-if="monthCard.loading" class="mc-loading">正在画这个月龄卡…</div>
      <template v-else-if="monthCard.url">
        <img :src="monthCard.url" class="mc-img" />
        <div class="mc-tip">{{ monthCard.periodLabel }}</div>
        <div class="mc-actions">
          <button class="btn-primary" @click="downloadCard"><Icon name="download" :size="15" />保存图片</button>
          <button class="mini-btn ghost" @click="copyCard">{{ monthCard.copied ? '已复制 ✓' : '复制图片' }}</button>
        </div>
      </template>
      <div v-else class="empty">先在「设置 → 孩子档案」填好生日，每个月龄生日就能出一张卡</div>
    </div>
  </div>

  <!-- 照片灯箱 -->
  <div v-if="lightbox" class="drawer-mask" @click="lightbox = null">
    <div class="lightbox" @click.stop>
      <img :src="lightbox.imageUrl" class="lb-img" />
      <div class="lb-bar">
        <div class="lb-info"><b>{{ lightbox.date }}</b><span v-if="lightbox.note"> · {{ lightbox.note }}</span></div>
        <div class="lb-actions">
          <button class="mini-btn ghost" @click="deletePhoto"><Icon name="trash" :size="13" />删除</button>
          <button class="mini-btn" @click="lightbox = null">关闭</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 大盖章：首尝 / 新足迹 / 最爱书 / 第 N 个词 / 第一次完成 / 痊愈 / 月龄生日 -->
  <div v-if="bigStamp" class="big-stamp" :style="{ color: bigStamp.color, borderColor: bigStamp.color }">
    {{ bigStamp.text }}
  </div>

  <div v-if="toast" class="toast">{{ toast }}</div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import Icon from '../components/Icon.vue'
import RainbowPlate from '../components/RainbowPlate.vue'
import {
  store, diaryDate, todayStr, nowLocal,
  MEALS, MEAL_TAGS, MOODS, getDiary, saveDiary, babyAgeText,
  addMeal, removeMeal, frequentFoods, addRead, removeRead,
  addWord, removeWord, setWordAudio, updateWord, addTrip, removeTrip, topPlaces,
  addPhoto, removePhoto, allReminders,
  addGame, addPlay, removePlay, lastPlayDate,
  allergyOf, dayFoodGroups, babyMonths, backupDaysAgo, persistNow, lastSavedAt, storageError,
  SYMPTOMS, illnessOn, illnessDays, startIllness, addSymptoms, removeSymptom, addTemp, removeTemp,
  setIllnessNote, addVisit, removeVisit, illnessMeds, endIllness, reopenIllness, useMedicine, medStatus,
} from '../store.js'
import { FOOD_GROUPS } from '../utils/foodGroups.js'
import { dayLines, linesToText, monthIndex, childName } from '../utils/diaryText.js'
import { compressImage } from '../utils/image.js'
import { canRecord, startRecording, playAudio, stopAudio, playingUrl, MAX_RECORD_MS } from '../utils/recorder.js'
import { GAME_IDEAS } from '../utils/gameIdeas.js'
import { termOf } from '../utils/solarTerms.js'
import CastleSvg from '../components/CastleSvg.vue'
import { latestCardPeriod, renderMonthCard } from '../utils/monthCard.js'

const emit = defineEmits(['go'])

const STICKERS = [
  { key: 'food', label: '吃了', icon: 'bowl' },
  { key: 'book', label: '读了', icon: 'book-open' },
  { key: 'say', label: '她说', icon: 'message-circle' },
  { key: 'play', label: '玩了', icon: 'blocks' },
  { key: 'trip', label: '去了', icon: 'map-pin' },
  { key: 'sick', label: '不舒服', icon: 'heart-pulse' },
  { key: 'photo', label: '照片', icon: 'camera' },
]
const SAY_KINDS = [
  { kind: '词语', label: '新词' },
  { kind: '句子', label: '一句话' },
  { kind: '歌谣', label: '儿歌' },
  { kind: '识字', label: '认字' },
]
const QUESTIONS = [
  { q: '今天她吃了什么好吃的？', s: 'food' },
  { q: '今天读了哪本绘本？', s: 'book' },
  { q: '今天她说了什么新词？', s: 'say' },
  { q: '今天一起玩了什么游戏？', s: 'play' },
  { q: '今天出门去哪儿玩了？', s: 'trip' },
  { q: '今天有没有拍到好玩的照片？', s: 'photo' },
]
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// ---------- 日期 ----------
const today = computed(() => todayStr())
const date = computed(() => diaryDate.value)
const isToday = computed(() => date.value === todayStr())
const p2 = n => String(n).padStart(2, '0')
const fmt = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

const dateLabel = computed(() => {
  const d = new Date(date.value + 'T00:00:00')
  const y = d.getFullYear() !== new Date().getFullYear() ? `${d.getFullYear()} 年 ` : ''
  return `${y}${d.getMonth() + 1} 月 ${d.getDate()} 日 ${WEEK[d.getDay()]}${isToday.value ? ' · 今天' : ''}`
})
const age = computed(() => babyAgeText(date.value))
const isMonthBirthday = computed(() => age.value.endsWith('整'))

function setDate(d) {
  flushText()
  diaryDate.value = d > todayStr() ? todayStr() : d
}
function shiftDay(n) {
  const d = new Date(date.value + 'T00:00:00')
  d.setDate(d.getDate() + n)
  setDate(fmt(d))
}
function goToday() { setDate(todayStr()) }

// ---------- 当天内容 ----------
const diary = computed(() => getDiary(date.value))
const entry = computed(() => dayLines(date.value))
const dayTerm = computed(() => termOf(date.value))
const question = computed(() => {
  // 节气当天，今日一问换成应景灵感
  if (dayTerm.value) return { q: `今日${dayTerm.value.name}：${dayTerm.value.hint}`, s: dayTerm.value.sticker }
  const n = Number(date.value.replace(/-/g, '')) % QUESTIONS.length
  return QUESTIONS[n]
})

function setMood(key) {
  saveDiary(date.value, { mood: diary.value?.mood === key ? '' : key })
}
function setBy(name) {
  saveDiary(date.value, { by: diary.value?.by === name ? '' : name })
}

// 想说的话：输入防抖保存，切换日期前先落盘
const textDraft = ref('')
let textTimer = null
watch(date, () => { textDraft.value = getDiary(date.value)?.text || '' }, { immediate: true })
function queueText() {
  saveDirty.value = true
  clearTimeout(textTimer)
  const d = date.value
  textTimer = setTimeout(() => saveText(d), 600)
}
// 自动保存状态：输入时标脏，真实落盘（lastSavedAt 更新）后才显示已保存
const saveDirty = ref(false)
const saveStateText = computed(() => {
  if (saveDirty.value) return '正在保存到本机…'
  if (storageError.value) return '保存失败，请检查存储空间并导出备份'
  if (!lastSavedAt.value) return ''
  const d = new Date(lastSavedAt.value)
  return `已保存在本机 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})
watch(lastSavedAt, () => { saveDirty.value = false })

function flushText() {
  if (!textTimer) return
  clearTimeout(textTimer)
  textTimer = null
  saveText(date.value)
}
function saveText(d) {
  textTimer = null
  const v = textDraft.value.trim()
  if ((getDiary(d)?.text || '') !== v) saveDiary(d, { text: v })
}

// ---------- 贴纸面板 ----------
const active = ref('')
const panelEl = ref(null)
function toggleSticker(key) {
  active.value = active.value === key ? '' : key
  if (active.value) nextTick(() => panelEl.value?.querySelector('.pn-focus')?.focus())
}

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2400)
}

// 上次因锁定等原因丢弃了录音：轻声告知
if (sessionStorage.getItem('castle-diary-lost-rec')) {
  sessionStorage.removeItem('castle-diary-lost-rec')
  setTimeout(() => showToast('上次锁定时正在录音，那段录音没有保存'), 1800)
}

// PWA 离线提示：第一次打开时轻声告诉一声（已安装为桌面应用则不再提示）
if (!store.settings.pwaHintShown && !window.matchMedia('(display-mode: standalone)').matches) {
  store.settings.pwaHintShown = true
  persistNow()
  setTimeout(() => showToast('城堡日记支持离线使用，可添加到桌面，随时离线记录'), 1500)
}

// 吃了
function guessMeal() {
  if (!isToday.value) return ''
  const h = new Date().getHours()
  if (h < 10) return '早餐'
  if (h < 14) return '午餐'
  if (h < 17) return '加餐'
  return '晚餐'
}
const food = reactive({ meal: guessMeal(), input: '', picked: [], first: false, tag: '' })
watch(date, () => { food.meal = guessMeal() })
const frequent = computed(() => frequentFoods(10))
const pickedAllergies = computed(() =>
  [...food.picked, ...splitFoods(food.input)].map(f => allergyOf(f)).filter(Boolean)
)
function splitFoods(s) { return s.split(/[、，,;；\s]+/).map(x => x.trim()).filter(Boolean) }
function togglePick(f) {
  const i = food.picked.indexOf(f)
  if (i >= 0) food.picked.splice(i, 1)
  else food.picked.push(f)
}
function onFoodEnter() {
  if (food.input) {
    for (const f of splitFoods(food.input)) if (!food.picked.includes(f)) food.picked.push(f)
    food.input = ''
  } else if (food.picked.length) {
    saveFood()
  }
}
function saveFood() {
  if (food.input) onFoodEnter()
  if (!food.picked.length) return
  for (const f of food.picked) {
    addMeal({ date: date.value, meal: food.meal, food: f, firstTaste: food.first, tag: food.tag })
  }
  const n = food.picked.length
  showToast(food.first ? `⭐ 第一次吃 ${food.picked.join('、')}，进里程碑啦` : `记下了 ${n} 样`)
  if (food.first) stamp('首尝', `第一次吃 ${food.picked.join('、')}`)
  food.picked = []
  food.first = false
  food.tag = ''
}

// 读了
const bookQuery = ref('')
const readNote = ref('')
const lastReadTime = b => (b.reads || []).reduce((a, r) => (r.time > a ? r.time : a), '')
const bookList = computed(() => {
  const q = bookQuery.value
  return [...store.books]
    .filter(b => !q || b.title.includes(q))
    .sort((a, b) => lastReadTime(b).localeCompare(lastReadTime(a)))
    .slice(0, 12)
})
function readTime() {
  if (isToday.value) return nowLocal()
  return `${date.value}T20:00`
}
function logRead(b) {
  // 时长不再让家长填，沿用书房「读了一次」的 15 分钟默认值，保持阅读统计口径一致
  addRead(b.id, { time: readTime(), minutes: 15, scene: '', withWho: '', note: readNote.value })
  readNote.value = ''
  const n = b.reads.length
  if (n % 10 === 0) stamp('最爱书', `《${b.title}》第 ${n} 次`)
  showToast(n % 10 === 0 ? `《${b.title}》第 ${n} 次，正式成为最爱书` : `《${b.title}》第 ${n} 次`)
}
function goAddBook() {
  emit('go', 'shelf-add')
}

// 她说
const say = reactive({ input: '', kind: '', funny: false })
const sayKind = computed(() => say.kind || (say.input.length >= 4 || /\s/.test(say.input) ? '句子' : '词语'))
async function saveSay() {
  if (rec.state === 'recording') await stopRec()
  if (!say.input) {
    if (rec.result) showToast('先写下她说的是什么，再点记下')
    return
  }
  const kind = sayKind.value
  const audio = rec.result
  if (kind === '词语') {
    const dup = store.words.find(w => w.word === say.input && ['词语', '发音'].includes(w.kind))
    if (dup) {
      // 记过的词：有新录音就补上（已有录音先确认替换），否则只提示
      const hadAudio = !!dup.audioId
      if (audio && (!hadAudio || confirm(`“${dup.word}”已经有一段录音，换成刚录的这段吗？`))) {
        await setWordAudio(dup.id, audio)
        showToast(`给“${dup.word}”${hadAudio ? '换上' : '补上'}了录音`)
        resetSay()
      } else if (!audio) {
        showToast(`“${say.input}”在 ${dup.date} 已经记过啦，可以录一段她的声音补上`)
      }
      return
    }
  }
  addWord({ word: say.input, kind, date: date.value, audio, funny: kind === '句子' && say.funny })
  if (kind === '词语') {
    const n = store.words.filter(w => ['词语', '发音'].includes(w.kind)).length
    if (n % 10 === 0) stamp('新词', `她会说的第 ${n} 个词！`)
    showToast(`这是她会说的第 ${n} 个词${audio ? '，声音也存好了' : ''}`)
  } else {
    showToast(audio ? '记下了，连声音一起' : (say.funny ? '记下了这句金句 ✨' : '记下了'))
  }
  resetSay()
}
function resetSay() {
  say.input = ''
  say.kind = ''
  rec.result = null
  rec.state = 'idle'
  rec.ms = 0
  say.funny = false
}

// 录音
const rec = reactive({ state: 'idle', ms: 0, level: 0, result: null, handle: null })
const secText = ms => `0:${String(Math.floor(ms / 1000)).padStart(2, '0')}`
async function startRec() {
  if (!canRecord()) { showToast('这个浏览器不支持录音，换 Chrome 或 Edge 试试'); return }
  try {
    rec.ms = 0
    rec.level = 0
    stopAudio()
    rec.handle = await startRecording({
      onTick: ms => { rec.ms = ms },
      onLevel: v => { rec.level = v },
      onAutoStop: r => finishRec(r),
    })
    rec.state = 'recording'
  } catch (e) {
    rec.handle = null
    showToast(e?.name === 'NotAllowedError'
      ? '麦克风没有授权：点地址栏左侧的图标，允许使用麦克风'
      : '没找到可用的麦克风')
  }
}
async function stopRec() {
  if (rec.state !== 'recording' || !rec.handle) return
  finishRec(await rec.handle.stop())
}
function finishRec(r) {
  if (rec.state !== 'recording') return
  rec.handle = null
  if (!r) { rec.state = 'idle'; return }
  rec.result = r
  rec.ms = r.ms
  rec.state = 'ready'
}
function discardRec() {
  rec.handle?.cancel()
  rec.handle = null
  rec.result = null
  rec.state = 'idle'
  rec.ms = 0
}
// 收起面板或换天时，正在录的那段直接丢弃
watch([active, date], () => { if (rec.state === 'recording') discardRec() })

// 玩了
const play = reactive({ name: '', note: '', first: false, photo: '' })
const playPhotoInput = ref(null)
const gameChips = computed(() => {
  if (!store.games.length) return GAME_IDEAS.slice(0, 8).map(g => g.name)
  return [...store.games]
    .sort((a, b) => lastPlayDate(b).localeCompare(lastPlayDate(a)) || b.plays.length - a.plays.length)
    .slice(0, 12)
    .map(g => g.name)
})
async function onPlayPhoto(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f?.type.startsWith('image/')) play.photo = await compressImage(f, 1280, 0.72)
}
function savePlay() {
  if (!play.name) return
  let g = store.games.find(x => x.name === play.name)
  const isNew = !g
  if (!g) {
    const idea = GAME_IDEAS.find(i => i.name === play.name)
    g = addGame({ name: play.name, tags: idea?.tags || [], how: idea?.how || '' })
  }
  const p = addPlay(g.id, { date: date.value, note: play.note, first: play.first, photo: play.photo })
  if (p.first) { stamp('第一次', `第一次完成 ${g.name}`); showToast(`🏅 ${g.name}：第一次完成，进里程碑啦`) }
  else if (isNew) showToast(`「${g.name}」加入了游戏册`)
  else showToast(`${g.name} 第 ${g.plays.length} 次`)
  play.name = ''
  play.note = ''
  play.first = false
  play.photo = ''
}

// 去了
const trip = reactive({ place: '', note: '', withWho: '', photo: '' })
const tripPhotoInput = ref(null)
async function onTripPhoto(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f?.type.startsWith('image/')) trip.photo = await compressImage(f, 1280, 0.72)
}
const places = computed(() => topPlaces(8))
const withOptions = computed(() => [...store.members.map(m => m.name), '全家'])
function saveTrip() {
  if (!trip.place) return
  const firstEver = !store.trips.some(t => t.place === trip.place)
  const n = store.trips.filter(t => t.place === trip.place).length + 1
  addTrip({ date: date.value, place: trip.place, note: trip.note, withWho: trip.withWho, photo: trip.photo })
  if (firstEver) stamp('新足迹', `新足迹：${trip.place}`)
  showToast(firstEver ? `盖了一枚新足迹邮票：${trip.place}` : `第 ${n} 次来${trip.place}`)
  trip.place = ''
  trip.note = ''
  trip.photo = ''
}

// 不舒服 / 生病记
const sickNow = computed(() => illnessOn(date.value))
const p2t = n => String(n).padStart(2, '0')
const nowHM = () => { const d = new Date(); return `${p2t(d.getHours())}:${p2t(d.getMinutes())}` }
const sick = reactive({ symptoms: [], other: '', temp: '', time: '', note: '' })
function resetSickForm() {
  sick.symptoms = []
  sick.other = ''
  sick.temp = ''
  sick.time = isToday.value ? nowHM() : '12:00'
  sick.note = sickNow.value?.notes.find(n => n.date === date.value)?.text || ''
}
watch([date, active], () => { if (active.value === 'sick') resetSickForm() }, { immediate: true })
function toggleList(list, v) {
  const i = list.indexOf(v)
  if (i >= 0) list.splice(i, 1)
  else list.push(v)
}
const sickTime = () => `${date.value}T${sick.time || (isToday.value ? nowHM() : '12:00')}`
function startSick() {
  const list = [...sick.symptoms, ...(sick.other ? [sick.other] : [])]
  if (!list.length) return
  const ill = startIllness({ date: date.value, symptoms: list })
  if (sick.temp) addTemp(ill.id, sick.temp, sickTime())
  stamp('生病', '开始不舒服，抱抱她')
  showToast('开了一张生病记，好了记得点「好了」')
  resetSickForm()
}
const dayTemps = computed(() => (sickNow.value?.temps || []).filter(t => t.time.slice(0, 10) === date.value))
function saveTemp() {
  const t = addTemp(sickNow.value.id, sick.temp, sickTime())
  if (!t) { showToast('体温要在 34–43℃ 之间'); return }
  showToast(`记下了 ${t.value.toFixed(1)}℃`)
  sick.temp = ''
  sick.time = isToday.value ? nowHM() : sick.time
}
// 药箱里的药：这次吃过的排前面，其次有库存的
const medOptions = computed(() => {
  const used = new Set(sickNow.value ? illnessMeds(sickNow.value.id).map(m => m.medId) : [])
  return store.medicines
    .map(m => ({ id: m.id, name: m.name, stock: m.stock, unit: m.unit, expired: medStatus(m).level === 'danger', used: used.has(m.id) }))
    .sort((a, b) => (b.used - a.used) || ((b.stock > 0) - (a.stock > 0)) || a.name.localeCompare(b.name))
})
const dayMeds = computed(() => (sickNow.value ? illnessMeds(sickNow.value.id).filter(m => m.time.slice(0, 10) === date.value) : []))
function takeMed(m) {
  if (m.expired && !confirm(`「${m.name}」已经过期了，确定还要记这次用药吗？`)) return
  if (!m.stock && !confirm(`药箱里「${m.name}」的库存是 0，还是要记这次用药吗？（记得补货）`)) return
  const r = useMedicine(m.id, sickTime(), sickNow.value.id)
  showToast(r?.emptied ? `记下了 ${m.name}，药箱里这个药用完了，记得补货` : `记下了 ${m.name}`)
}
function saveSickNote() {
  setIllnessNote(sickNow.value.id, date.value, sick.note)
  showToast(sick.note ? '记下了' : '已清空这天的一句话')
}
const dayVisit = computed(() => sickNow.value?.visits.find(v => v.date === date.value) || null)
function toggleVisit() {
  if (dayVisit.value) {
    if (confirm('取消这天的就医记录？健康档案里对应的那条也会删除')) removeVisit(sickNow.value.id, dayVisit.value.healthId)
  } else {
    addVisit(sickNow.value.id, { date: date.value })
    showToast('记下了，健康档案里也加了一条就医记录')
  }
}
function finishSick() {
  const ill = sickNow.value
  endIllness(ill.id, date.value)
  stamp('痊愈', `病好了，这次一共 ${illnessDays(ill)} 天`)
  showToast(`🎉 好了！这次一共 ${illnessDays(ill)} 天。可以到「生病记」里补一句最心疼的瞬间`)
}

// 照片
const fileInput = ref(null)
const photoNote = ref('')
const uploading = ref(false)
const dragOver = ref(false)
async function handleFiles(files) {
  const imgs = [...(files || [])].filter(f => f.type.startsWith('image/'))
  if (!imgs.length || uploading.value) return
  uploading.value = true
  try {
    for (const f of imgs) {
      const dataUrl = await compressImage(f, 1280, 0.72)
      addPhoto({ dataUrl, date: date.value, note: photoNote.value })
    }
    photoNote.value = ''
    showToast(`贴上了 ${imgs.length} 张照片`)
  } finally {
    uploading.value = false
  }
}
function onPickPhotos(e) {
  handleFiles(e.target.files)
  e.target.value = ''
}
function onDropPaper(e) {
  dragOver.value = false
  handleFiles(e.dataTransfer?.files)
}
const lightbox = ref(null)
function deletePhoto() {
  if (!confirm('删除这张照片？')) return
  removePhoto(lightbox.value.id)
  lightbox.value = null
}

// 日记里就地改词的类型：「认识了」↔「会说了」
function kindSwitch(tk) {
  const k = tk.word?.kind
  if (k === '识字') return { label: '其实是会说', to: '词语' }
  if (k === '词语' || k === '发音') return { label: '其实是认字', to: '识字' }
  if (k === '句子') return { label: tk.kind === 'quote' ? '不是金句' : '✨ 是金句', funny: true }
  return null
}
function switchKind(tk) {
  const s = kindSwitch(tk)
  const w = store.words.find(x => x.id === tk.word.id)
  if (s.funny) {
    updateWord(tk.word.id, { funny: !w?.funny })
    showToast(w?.funny ? '从金句里撤下来了' : '标成了金句 ✨')
    return
  }
  updateWord(tk.word.id, { kind: s.to })
  showToast(s.to === '词语' ? `“${tk.v.replace(/[“”]/g, '')}”改成了她会说的词` : `“${tk.v.replace(/[“”]/g, '')}”改成了认字`)
}

// 日记里撤销一条记录（同时删掉对应模块里的数据）
function removeToken(tk) {
  const label = tk.v
  if (!confirm(`删掉日记里的「${label}」？对应的记录会一起删除`)) return
  const d = tk.del
  if (d.coll === 'meals') removeMeal(d.id)
  else if (d.coll === 'reads') removeRead(d.bookId, d.id || d.time)
  else if (d.coll === 'words') removeWord(d.id)
  else if (d.coll === 'trips') removeTrip(d.id)
  else if (d.coll === 'plays') removePlay(d.gameId, d.playId)
  showToast('已删除')
}

// ---------- 城堡 & 月龄卡 & 盖章 ----------
const castleLedger = ref(false)
const castleSummary = computed(() => `城堡 ${Math.min(1 + babyMonths(), 14)} 层 · ${store.milestones.length} 面旗 · ${store.books.filter(b => (b.reads || []).length).length} 盏灯`)

// 大盖章：重要的"第一次"用这个弹出
const bigStamp = ref(null)
let stampTimer = null
const STAMP_COLORS = {
  首尝: '#d8643f', 新足迹: '#245d96', 最爱书: '#a55a10', 第一次: '#5b4bb0', 痊愈: '#1f7f6b', 生日: '#c8860d', 新词: '#a23a62', 生病: '#c0392b',
}
function stamp(kind, text) {
  bigStamp.value = { kind, text, color: STAMP_COLORS[kind] || '#d8643f' }
  clearTimeout(stampTimer)
  stampTimer = setTimeout(() => (bigStamp.value = null), 1900)
}

// 月龄生日当天第一次打开，先盖个生日章
const bdayStamped = new Set()
watch(date, () => {
  if (isMonthBirthday.value && !bdayStamped.has(date.value)) {
    bdayStamped.add(date.value)
    stamp('生日', `${age.value}了`)
  }
}, { immediate: true })

// 月龄卡
const monthCard = reactive({ show: false, loading: false, url: '', copied: false, periodLabel: '' })
async function openMonthCard() {
  const period = latestCardPeriod()
  if (!period) {
    monthCard.show = true
    monthCard.url = ''
    return
  }
  monthCard.show = true
  monthCard.loading = true
  monthCard.copied = false
  try {
    monthCard.url = await renderMonthCard(period)
    monthCard.periodLabel = `${period.months} 个月 · 进行中（截至今天 ${period.end}，这个月龄生日再出完整卡）`
  } finally {
    monthCard.loading = false
  }
}
function closeMonthCard() { monthCard.show = false }
function downloadCard() {
  const a = document.createElement('a')
  a.href = monthCard.url
  const period = latestCardPeriod()
  a.download = `月龄卡-${period ? period.months : ''}个月-${todayStr().replaceAll('-', '')}.png`
  a.click()
}
async function copyCard() {
  try {
    const blob = await (await fetch(monthCard.url)).blob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    monthCard.copied = true
  } catch {
    showToast('复制图片没成功，用「保存图片」吧')
  }
}

// ---------- 右栏 ----------
const reminders = computed(() => allReminders().filter(r => r.kind !== '玩具').slice(0, 3))

// 14 天没备份就提醒；从未备份过且有内容时立即提醒
const needBackup = computed(() => {
  const hasData = store.meals.length + store.words.length + store.photos.length + store.trips.length + store.diaries.length + store.games.length > 0
  if (!hasData) return ''
  const d = backupDaysAgo()
  if (d === null) return '还没有备份过'
  return d >= 14 ? `已经 ${d} 天没有备份了` : ''
})

const ym = computed(() => date.value.slice(0, 7))
const monthLabel = computed(() => `${Number(ym.value.slice(5))} 月的小城堡`)
const monthStats = computed(() => {
  const idx = monthIndex(ym.value)
  return {
    days: Object.keys(idx).length,
    words: store.words.filter(w => w.date.slice(0, 7) === ym.value).length,
    photos: store.photos.filter(p => p.date.slice(0, 7) === ym.value).length,
  }
})
const monthPlaces = computed(() => {
  const start = ym.value + '-01'
  const map = new Map()
  for (const t of store.trips) {
    if (t.date.slice(0, 7) !== ym.value || !t.place) continue
    const e = map.get(t.place) || { place: t.place, count: 0, fresh: !store.trips.some(x => x.place === t.place && x.date < start) }
    e.count++
    map.set(t.place, e)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
})

// 本周彩虹餐盘（日记日期所在的周一到周日）
const railPlates = computed(() => {
  const d0 = new Date(date.value + 'T00:00:00')
  const dow = (d0.getDay() + 6) % 7
  return ['一', '二', '三', '四', '五', '六', '日'].map((w, i) => {
    const ds = fmt(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - dow + i))
    return { date: ds, w, groups: dayFoodGroups(ds), has: store.meals.some(m => m.date === ds) }
  })
})
const railPlateTip = computed(() => {
  const days = railPlates.value.filter(d => d.has)
  if (!days.length) return '这周还没记吃了什么'
  const worst = FOOD_GROUPS
    .map(g => ({ k: g.key, n: days.filter(d => !d.groups.has(g.key)).length }))
    .sort((a, b) => b.n - a.n)[0]
  return worst.n ? `${worst.k}有 ${worst.n} 天没吃到` : '记录的每天 5 类都吃到了'
})

// 回看：一个月前 / 三个月前 / 一年前，取第一个有内容的
const lookback = computed(() => {
  const base = new Date(date.value + 'T00:00:00')
  const opts = [
    { label: '一个月前的今天', m: 1 },
    { label: '三个月前的今天', m: 3 },
    { label: '一年前的今天', m: 12 },
  ]
  for (const o of opts) {
    const d = new Date(base.getFullYear(), base.getMonth() - o.m, base.getDate())
    const ds = fmt(d)
    const e = dayLines(ds)
    if (!e.lines.length && !e.photos.length) continue
    const text = linesToText(e.lines.filter(l => l.key !== 'mood'))
    return {
      date: ds,
      label: o.label,
      photo: e.photos.find(p => p.imageUrl)?.imageUrl || null,
      text: text.length > 70 ? text.slice(0, 70) + '…' : (text || e.photos[0]?.note || '那天贴了照片'),
    }
  }
  return null
})

// ---------- 键盘：1-5 打开贴纸，←/→ 换天，Esc 收起 ----------
function onKey(e) {
  if (document.querySelector('.card-mask, .drawer-mask')) return
  const tag = (e.target.tagName || '').toLowerCase()
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable
  if (e.key === 'Escape') {
    if (active.value) { active.value = ''; e.target.blur?.() }
    return
  }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return
  const n = Number(e.key)
  if (n >= 1 && n <= STICKERS.length) {
    e.preventDefault()
    toggleSticker(STICKERS[n - 1].key)
  } else if (e.key === 'ArrowLeft') {
    shiftDay(-1)
  } else if (e.key === 'ArrowRight' && !isToday.value) {
    shiftDay(1)
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  flushText() // 想说的话草稿会落盘
  clearTimeout(toastTimer)
  clearTimeout(stampTimer)
  if (rec.state === 'recording') {
    discardRec()
    // 锁定/离开时正在录音：记个标记，下次进来提示一声
    sessionStorage.setItem('castle-diary-lost-rec', '1')
  }
  stopAudio()
})
</script>

<style scoped>
.save-state { margin-left: auto; font-size: 11px; color: var(--ink-3); }
.save-state:not(.dim) { color: #b4743a; }
.bday-hint { color: var(--brand-deep); text-decoration: underline; cursor: pointer; font-size: 12.5px; }
.diary-layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 18px; align-items: start; }
@media (max-width: 1100px) { .diary-layout { grid-template-columns: 1fr; } }

/* ---------- 日记纸 ---------- */
.paper {
  position: relative;
  background-color: #fffaf1;
  border: 1px solid rgba(226, 190, 140, .55);
  border-radius: 18px;
  padding: 20px 28px 22px 36px;
  box-shadow: 0 6px 22px rgba(170, 120, 60, .1);
  min-height: 560px;
}
.paper::before { /* 左侧装订线 */
  content: ''; position: absolute; top: 0; bottom: 0; left: 20px;
  border-left: 2px dashed rgba(236, 140, 110, .35);
}
.paper.drop-on { outline: 2px dashed var(--brand); outline-offset: -8px; }

.p-head { display: flex; align-items: center; gap: 8px; }
.p-arrow {
  width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--line);
  background: rgba(255, 255, 255, .7); color: var(--brand-deep); cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex: none;
}
.p-arrow:disabled { opacity: .35; cursor: default; }
.p-date { min-width: 0; }
.p-day { font-family: "KaiTi", "STKaiti", "Kaiti SC", serif; font-size: 24px; font-weight: 700; color: #5a3c1e; }
.p-age { font-size: 13px; color: #a5774a; display: flex; align-items: center; gap: 8px; }
.p-bday { background: #f0934b; color: #fff; border-radius: 999px; padding: 0 9px; font-size: 11px; font-weight: 700; }
.p-term { border-radius: 999px; padding: 0 9px; font-size: 11px; font-weight: 700; }
.term-春 { background: #e8f3d9; color: #4a7c23; }
.term-夏 { background: #fde8d3; color: #b35c1b; }
.term-秋 { background: #f9ecd2; color: #9a6b1c; }
.term-冬 { background: #e4eef7; color: #3a5f8a; }
.p-term-hint {
  font-size: 12.5px; color: #8a6b45; background: rgba(243, 201, 105, .14);
  border: 1px dashed rgba(224, 166, 59, .5); border-radius: 10px; padding: 6px 12px; margin: 8px 0 4px;
}
.p-head-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.p-pick {
  position: relative; width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--line);
  background: rgba(255, 255, 255, .7); color: var(--brand-deep); display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.p-pick input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

.p-mood { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 14px 0 10px; }
.p-mood-lbl { font-size: 13px; color: #a5774a; margin-right: 2px; }
.mood-chip {
  border: 1.5px solid; border-radius: 999px; padding: 2px 12px; font-size: 13px;
  cursor: pointer; background: rgba(255, 255, 255, .7); transition: transform .12s;
}
.mood-chip:hover { transform: translateY(-1px); }
.mood-chip.on { color: #fff !important; font-weight: 700; }

/* 贴纸栏 */
.stickers { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.sticker {
  display: inline-flex; align-items: center; gap: 6px;
  border: none; border-radius: 10px; padding: 7px 12px 7px 11px;
  font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer;
  transition: transform .12s, box-shadow .12s;
}
.sticker:hover { transform: translateY(-1px) rotate(-1deg); box-shadow: 0 3px 8px rgba(0, 0, 0, .08); }
.sticker kbd { font-family: inherit; font-size: 10px; font-weight: 400; opacity: .6; border: 1px solid currentColor; border-radius: 4px; padding: 0 4px; margin-left: 2px; }
.st-food { background: #eaf3de; color: #3b6d11; }
.st-book { background: #fdebd3; color: #9a5512; }
.st-say { background: #fbe4ec; color: #a23a62; }
.st-play { background: #ece9fb; color: #4e3fa8; }
.st-sick { background: #e1f5ee; color: #085041; }
.st-trip { background: #e3eefa; color: #245d96; }
.st-photo { background: #efebe3; color: #5b5145; }
.sticker.on { box-shadow: 0 0 0 2px currentColor inset; }

/* 贴纸面板 */
.panel {
  position: relative; background: #fff; border-radius: 14px; padding: 14px 16px 6px;
  margin-bottom: 14px; border: 1px solid rgba(226, 190, 140, .5);
  box-shadow: 0 4px 16px rgba(170, 120, 60, .1);
  animation: pnIn .16s ease;
}
@keyframes pnIn { from { transform: translateY(-4px); opacity: 0; } to { transform: none; opacity: 1; } }
.pk-food { border-left: 4px solid #8fbf5f; }
.pk-book { border-left: 4px solid #f0a050; }
.pk-say { border-left: 4px solid #e58fae; }
.pk-play { border-left: 4px solid #9b8fd0; }
.pk-sick { border-left: 4px solid #2aa082; }
.pn-link { color: var(--brand-deep); cursor: pointer; font-size: 12px; font-weight: 400; margin-left: 8px; }
.sk-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.sk-row .chip { margin: 0; }
.sk-lbl { font-size: 12px; color: var(--ink-2); width: 30px; flex: none; }
.sk-row .sk-temp, .pn-input-row .sk-temp { flex: none; width: 120px; }
.sk-row .sk-time { flex: none; width: 110px; }
.sk-ended { font-size: 12.5px; color: #1f7f6b; background: #e6f5f0; border-radius: 8px; padding: 6px 10px; margin-bottom: 10px; }
.sk-ended a { color: var(--brand-deep); cursor: pointer; margin-left: 6px; }
.temp-chip { font-size: 12px; border-radius: 999px; padding: 2px 9px; background: #eef6f2; color: #1f7f6b; font-variant-numeric: tabular-nums; }
.temp-chip.warm { background: #fff1e0; color: #b0601c; }
.temp-chip.hot { background: #fde6e2; color: #c0392b; }
.temp-chip i { font-style: normal; margin-left: 4px; cursor: pointer; opacity: .6; }
.med-chip i { font-style: normal; font-size: 10px; margin-left: 4px; opacity: .7; }
.med-chip.off { opacity: .55; }
.med-chip.expired { border-color: rgba(224, 85, 85, .5); color: #c0392b; }
.sk-done { background: linear-gradient(135deg, #7fcfb4, #2aa082); box-shadow: 0 2px 8px rgba(42, 160, 130, .3); }
.pk-trip { border-left: 4px solid #6aa6d8; }
.pn-thumb { width: 30px; height: 30px; object-fit: cover; border-radius: 6px; align-self: center; }
.panel .chip-first { width: auto; padding: 5px 14px; font-size: 12px; }
.al-warn { font-size: 12.5px; color: #c0392b; background: rgba(238, 99, 99, .08); border-radius: 8px; padding: 6px 10px; margin-bottom: 8px; }
.rail-plates { cursor: pointer; }
.rp-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.rp-day { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 10px; color: var(--ink-3); border-radius: 6px; padding: 2px 0; }
.rp-day.cur { background: var(--brand-soft); color: var(--brand-deep); font-weight: 700; }

/* 录音 */
.rec-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.rec-btn {
  display: inline-flex; align-items: center; gap: 7px; border: 1px solid rgba(229, 143, 174, .6);
  background: #fff5f8; color: #a23a62; border-radius: 999px; padding: 6px 14px;
  font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer;
}
.rec-btn:hover { background: #fde8ef; }
.rec-dot { width: 10px; height: 10px; border-radius: 50%; background: #e0466f; }
.rec-btn.on { background: #e0466f; color: #fff; border-color: #e0466f; }
.rec-btn.on .rec-dot { background: #fff; animation: recPulse 1s infinite; }
.rec-btn.ready { background: #fde8ef; }
@keyframes recPulse { 50% { opacity: .2; } }
.rec-meter { display: inline-flex; align-items: flex-end; gap: 3px; height: 18px; }
.rec-meter i { width: 5px; border-radius: 2px; background: rgba(229, 143, 174, .3); transition: background .1s; }
.rec-meter i:nth-child(1) { height: 5px; } .rec-meter i:nth-child(2) { height: 7px; }
.rec-meter i:nth-child(3) { height: 9px; } .rec-meter i:nth-child(4) { height: 11px; }
.rec-meter i:nth-child(5) { height: 13px; } .rec-meter i:nth-child(6) { height: 15px; }
.rec-meter i:nth-child(7) { height: 17px; } .rec-meter i:nth-child(8) { height: 18px; }
.rec-meter i.lit { background: #e0466f; }
.rec-btn.playing { background: #e0466f; color: #fff; border-color: #e0466f; }
.rec-warn {
  font-size: 12.5px; line-height: 1.6; color: #a0461c; background: #fff4e8;
  border: 1px solid rgba(240, 147, 75, .4); border-radius: 10px; padding: 8px 10px; margin-bottom: 10px;
}
.rec-time { font-size: 12px; color: #a23a62; font-variant-numeric: tabular-nums; }
.pk-photo { border-left: 4px solid #b5a894; }
.pn-close { position: absolute; top: 8px; right: 8px; border: none; background: none; color: var(--ink-2); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; }
.pn-close:hover { background: var(--brand-soft); }
.pn-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; color: var(--ink); }
.pn-sub { font-size: 12px; font-weight: 400; color: var(--ink-2); margin-left: 8px; }
.pn-hint { font-size: 12px; color: var(--ink-3); align-self: center; }
.pn-input-row { display: flex; gap: 8px; margin-bottom: 10px; }
.pn-input {
  flex: 1; min-width: 0; border: 1px solid var(--line); border-radius: 10px; padding: 8px 11px;
  font-size: 14px; font-family: inherit; background: #fffdf9; color: var(--ink); outline: none;
}
.pn-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(240, 147, 75, .12); }
.chip-row.picked { margin-bottom: 8px; }
.pn-books { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 10px; margin-bottom: 8px; }
.pn-book { cursor: pointer; text-align: center; transition: transform .12s; }
.pn-book:hover { transform: translateY(-2px); }
.pn-cover {
  aspect-ratio: 3 / 4; border-radius: 8px; overflow: hidden; background: var(--brand-soft);
  display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; color: var(--brand);
  box-shadow: 0 2px 6px rgba(150, 100, 50, .15);
}
.pn-cover img { width: 100%; height: 100%; object-fit: cover; }
.pn-btitle { font-size: 12px; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pn-bmeta { font-size: 11px; color: var(--ink-3); }
.pn-empty { font-size: 13px; color: var(--ink-2); padding: 10px 0; }
.pn-foot { font-size: 12px; padding: 4px 0 8px; }
.pn-foot a { color: var(--brand-deep); cursor: pointer; }
.pn-drop {
  display: flex; align-items: center; gap: 10px; padding: 16px; border: 2px dashed rgba(181, 168, 148, .6);
  border-radius: 12px; color: #6b5f50; font-size: 13px; cursor: pointer; background: #fbf8f2;
}
.pn-drop:hover { border-color: var(--brand); }
.pk-photo .pn-input { margin-bottom: 10px; }

/* 正文 */
.p-body, .p-text { /* 横线跟着正文走，字正好落在线上 */
  background-image: repeating-linear-gradient(transparent 0 33px, rgba(214, 178, 128, .32) 33px 34px);
  background-attachment: local;
}
.p-body { min-height: 238px; }
.p-line {
  font-family: "KaiTi", "STKaiti", "Kaiti SC", serif;
  font-size: 18px; line-height: 34px; color: #4a3520; margin: 0;
}
.tk { position: relative; font-weight: 700; padding: 1px 3px; border-radius: 5px; }
.tk-food { color: #3f7a1c; background: rgba(143, 191, 95, .16); }
.tk-book { color: #a55a10; background: rgba(240, 160, 80, .16); }
.tk-say { color: #a23a62; background: rgba(229, 143, 174, .18); }
.tk-trip { color: #245d96; background: rgba(106, 166, 216, .18); }
.tk-mood { color: #c2701c; background: rgba(245, 167, 66, .18); }
.tk-game { color: #4e3fa8; background: rgba(155, 143, 208, .2); }
.tk-sick { color: #b8452c; background: rgba(229, 103, 90, .14); }
.tk-quote { color: #8a5a00; background: rgba(243, 201, 105, .25); }
.chip-quote.sel { background: #f3c969; color: #6b4a00; border-color: transparent; }
.stamp-金句 { color: #c8860d; border-color: #e0a53b; background: rgba(255, 247, 224, .95); }
.tk-jump { cursor: pointer; text-decoration: underline dotted rgba(184, 69, 44, .5); text-underline-offset: 4px; }
.tk-play {
  display: inline-flex; align-items: center; justify-content: center; vertical-align: 1px;
  width: 22px; height: 22px; margin-left: 3px; border-radius: 50%; border: none; cursor: pointer;
  background: #e0466f; color: #fff; padding: 0;
}
.tk-play:hover { background: #c7335b; }
.tk-play.playing { animation: playPulse .8s infinite; }
@keyframes playPulse { 50% { box-shadow: 0 0 0 5px rgba(224, 70, 111, .25); } }
.tk-milestone { color: #5b4bb0; background: rgba(155, 143, 208, .2); }
.tk-health { color: #1f7f6b; background: rgba(42, 160, 130, .14); }
.tk-suffix { font-size: 13px; font-weight: 400; color: #9b7b58; }
.tk-del {
  display: none; position: absolute; top: -9px; right: -9px; width: 18px; height: 18px;
  border-radius: 50%; border: none; background: #e05555; color: #fff; font-size: 12px; line-height: 18px;
  cursor: pointer; padding: 0; font-family: sans-serif;
}
.tk:hover .tk-del { display: block; }
.tk-kind {
  display: none; position: absolute; left: 0; top: 100%; z-index: 2; white-space: nowrap;
  border: 1px solid rgba(229, 143, 174, .6); border-radius: 999px; background: #fff;
  color: #a23a62; font-size: 11px; font-weight: 700; padding: 1px 8px; cursor: pointer;
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 18px;
}
.tk-kind:hover { background: #fde8ef; }
.tk:hover .tk-kind { display: block; }

/* 盖章 */
.stamp {
  display: inline-block; margin-left: 4px; padding: 0 5px; line-height: 18px;
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 11px; font-weight: 700; vertical-align: 3px;
  border: 1.5px solid; border-radius: 4px; transform: rotate(-8deg);
  animation: stampIn .35s cubic-bezier(.3, 1.6, .5, 1);
}
.stamp-首尝, .stamp-新足迹, .stamp-最爱书, .stamp-第一次 { color: #d8643f; border-color: #d8643f; background: rgba(255, 240, 230, .9); }
.stamp-爱吃 { color: #3f7a1c; border-color: #8fbf5f; }
.stamp-过敏 { color: #c0392b; border-color: #e05555; background: rgba(255, 235, 235, .9); }
.stamp-痊愈 { color: #1f7f6b; border-color: #2aa082; background: rgba(230, 245, 240, .95); }
.stamp-不爱吃 { color: #8a7a68; border-color: #c4b5a0; }
@keyframes stampIn { from { transform: scale(1.8) rotate(-20deg); opacity: 0; } to { transform: scale(1) rotate(-8deg); opacity: 1; } }

.p-empty { text-align: center; padding: 60px 0 40px; }
.p-q {
  display: inline-block; font-family: "KaiTi", "STKaiti", "Kaiti SC", serif; font-size: 24px;
  color: #b4743a; cursor: pointer; padding: 6px 16px; border-radius: 12px; transition: background .15s;
}
.p-q:hover { background: rgba(240, 147, 75, .1); }
.p-q-sub { font-size: 13px; color: var(--ink-3); margin-top: 8px; }

.polaroids { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0 6px; }
.polaroid {
  width: 150px; margin: 0; background: #fff; padding: 7px 7px 0; border-radius: 3px;
  box-shadow: 0 3px 10px rgba(110, 80, 40, .18); cursor: zoom-in; transition: transform .15s;
}
.polaroid:hover { transform: rotate(0deg) scale(1.04) !important; }
.polaroid img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
.polaroid figcaption {
  font-family: "KaiTi", "STKaiti", "Kaiti SC", serif; font-size: 13px; color: #5a4632;
  padding: 5px 2px 7px; min-height: 30px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.p-foot { margin-top: 18px; border-top: 1px dashed rgba(226, 160, 110, .6); padding-top: 12px; }
.p-text {
  width: 100%; border: none; background: transparent; resize: vertical; outline: none;
  font-family: "KaiTi", "STKaiti", "Kaiti SC", serif; font-size: 17px; line-height: 34px; color: #4a3520;
}
.p-text::placeholder { color: #c9b59c; }
.p-sign { display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 6px; }
.p-sign .chip { margin: 0; }

/* ---------- 右栏 ---------- */
.rail { display: flex; flex-direction: column; gap: 12px; }
.rail-card {
  background: var(--card); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, .8);
  border-radius: 16px; padding: 13px 14px; box-shadow: 0 2px 10px rgba(240, 147, 75, .07);
}
.rail-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--brand-deep); margin-bottom: 8px; }
.rail-more { margin-left: auto; font-size: 11.5px; font-weight: 400; color: var(--ink-3); cursor: pointer; }
.rail-more:hover { color: var(--brand-deep); }
.rail-dim { font-size: 12px; color: var(--ink-3); }
.rail-rem { display: flex; gap: 6px; align-items: flex-start; font-size: 12.5px; padding: 5px 6px; border-radius: 8px; cursor: pointer; line-height: 1.5; }
.rail-rem:hover { background: var(--brand-soft); }
.rail-rem svg { flex: none; margin-top: 2px; }
.rail-rem.lv-danger { color: #d0463c; }
.rail-rem.lv-warn { color: #b0601c; }
.rail-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center; }
.rail-stats b { display: block; font-size: 20px; color: var(--brand-deep); }
.rail-stats span { font-size: 11px; color: var(--ink-2); }
.stamps { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pstamp {
  border: 2px dashed #8db5dc; border-radius: 6px; padding: 7px 4px; text-align: center;
  background: #f4f8fd; color: #245d96;
}
.pstamp.fresh { border-color: #e58a5f; background: #fff4ee; color: #b4532a; transform: rotate(-2deg); }
.ps-name { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ps-count { font-size: 11px; opacity: .8; }
.rail-back { cursor: pointer; transition: transform .12s; }
.rail-back:hover { transform: translateY(-2px); }
.rb-img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 10px; margin-bottom: 6px; }
.rb-text { font-family: "KaiTi", "STKaiti", "Kaiti SC", serif; font-size: 14px; line-height: 1.7; color: #5a4632; }

.p-mini-castle { display: inline-flex; align-items: flex-end; cursor: pointer; margin-left: 4px; }
.p-castle { display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; margin-bottom: 6px; }
.p-castle span { font-size: 12px; color: var(--ink-2); }
.p-castle:hover span { color: var(--brand-deep); }
.mc-btn { display: inline-flex; }
.mc-btn.bday { background: linear-gradient(135deg, #f3c969, #e8a23b); color: #fff; border: none; font-weight: 700; }
.castle-sheet { max-width: 560px; }
.cs-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 15px; }
.cs-list { margin-top: 10px; font-size: 13px; line-height: 1.8; }
.cs-ic { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; }
.cs-sub { color: var(--ink-2); font-size: 12px; }
.mc-sheet { max-width: 480px; }
.mc-loading { padding: 60px 0; text-align: center; color: var(--ink-2); }
.mc-img { width: 100%; border-radius: 8px; box-shadow: 0 4px 18px rgba(150, 100, 40, .2); display: block; }
.mc-tip { text-align: center; font-size: 12px; color: var(--ink-2); margin: 8px 0; }
.mc-actions { display: flex; gap: 10px; justify-content: center; }
.rail-backup { cursor: pointer; border: 1px solid rgba(240, 147, 75, .5); background: rgba(240, 147, 75, .1); }
.rail-backup:hover { background: rgba(240, 147, 75, .16); }
.big-stamp {
  position: fixed; top: 34vh; left: 50%; z-index: 45; pointer-events: none;
  transform: translateX(-50%) rotate(-8deg);
  font-family: "KaiTi", "STKaiti", "Kaiti SC", serif; font-size: 34px; font-weight: 700;
  border: 4px double; border-radius: 12px; padding: 10px 26px; white-space: nowrap;
  background: rgba(255, 250, 241, .92);
  animation: bigStampIn .4s cubic-bezier(.3, 1.8, .5, 1), bigStampOut .5s ease 1.4s forwards;
}
@keyframes bigStampIn { from { transform: translateX(-50%) rotate(-20deg) scale(2.2); opacity: 0; } to { transform: translateX(-50%) rotate(-8deg) scale(1); opacity: 1; } }
@keyframes bigStampOut { to { opacity: 0; transform: translateX(-50%) rotate(-6deg) translateY(-10px); } }

@media (max-width: 767px) {
  .paper { padding: 14px 14px 16px 24px; }
  .paper::before { left: 12px; }
  .p-day { font-size: 19px; }
  .pn-input-row { flex-wrap: wrap; }
  .sticker kbd { display: none; }
}
</style>
