/* ============================================================
   감정방패 — 공용 데이터 저장소
   초기 데이터 없음. 문의를 넣을 때마다 쌓이고,
   모든 화면(현황·문의·채널·고객)이 이 하나를 읽는다.
   페이지가 나뉘어 있으므로 localStorage로 공유한다.
   ============================================================ */
'use strict';

/* 일반 객체만 깊은 병합 (배열·원시값은 override 가 통째로 이김) */
function deepMerge(base, over) {
  if (!over || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
  const out = Object.assign({}, base);
  for (const k of Object.keys(over)) {
    out[k] = (base && typeof base[k] === 'object' && !Array.isArray(base[k]))
      ? deepMerge(base[k], over[k]) : over[k];
  }
  return out;
}

const Store = {
  KEY: 'gjbp.data.v2',

  /* 매장 설정(실제 백엔드 스키마)의 기본값을 깊은 복사로 가져온다 */
  storeDefaults() { return JSON.parse(JSON.stringify(CONFIG.storeSettings.defaults)); },

  /* ---------- 기본값: 전부 비어 있음 ---------- */
  blank() {
    return {
      items: [],                                   // 들어온 문의
      seq: 0,                                      // 문의 번호
      pulled: {},                                  // 이미 가져온 통화 id (중복 방지)
      settings: Object.assign({}, CONFIG.defaults),
      store: this.storeDefaults()                  // 매장 설정 — response/persona/hours...
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      /* 처음 열면 더미 데이터를 채워 화면이 비어 보이지 않게 한다.
         설정에서 비우면 다시 채우지 않는다. */
      if (!raw) return this.save(this.seeded());
      const d = JSON.parse(raw);
      const blank = this.blank();
      const store = Object.assign({}, blank.store);
      Object.keys(blank.store).forEach(sec => {
        store[sec] = deepMerge(blank.store[sec], (d.store || {})[sec]);
      });
      return Object.assign(blank, d,
        { settings: Object.assign(blank.settings, d.settings || {}), store });
    } catch (e) {
      return this.blank();      // 시크릿 모드 등 — 메모리로만 동작
    }
  },

  /* 매장 설정 한 칸 저장 — section:'response', path:'channels.chat' */
  setStoreField(section, path, value) {
    const d = this.load();
    const keys = path.split('.');
    let node = d.store[section];
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof node[keys[i]] !== 'object' || node[keys[i]] === null) node[keys[i]] = {};
      node = node[keys[i]];
    }
    node[keys[keys.length - 1]] = value;
    this.save(d);
    return d;
  },

  save(d) {
    try { localStorage.setItem(this.KEY, JSON.stringify(d)); } catch (e) { /* 무시 */ }
    return d;
  },

  /* 문의 데이터만 비우고, 매장 설정(response/persona/hours)은 그대로 둔다 */
  reset() {
    const cur = this.load();
    return this.save(Object.assign(this.blank(), { settings: cur.settings, store: cur.store }));
  },

  /* ---------- 더미 데이터 ----------
     오늘 하루치 문의를 흉내 낸다. 시연에서 입력하면 이 위에 계속 쌓인다. */
  seeded(keepStore) {
    const d = this.blank();
    if (keepStore) { d.settings = keepStore.settings; d.store = keepStore.store; }
    const now = Date.now();
    /* 오래된 것부터 넣어야 번호가 시간순으로 붙는다 */
    for (const [min, who, ch, text] of [...CONFIG.seed].reverse()) {
      const s = Judge.score(text);
      const v = Judge.verdict(s.value, d.settings);
      d.seq += 1;
      d.items.unshift({
        id: 'q' + d.seq, no: d.seq,
        ts: now - min * 60000,
        text, channel: ch, customer: Person.key(who),
        score: s.value, hits: s.hits,
        topic: Judge.topic(text),
        verdict: v.key, handled: null
      });
    }
    return d;
  },

  reseed() { return this.save(this.seeded(this.load())); },

  /* ---------- 문의 추가 ---------- */
  add(text, channel, customer) {
    const d = this.load();
    const s = Judge.score(text);
    const v = Judge.verdict(s.value, d.settings);
    d.seq += 1;
    d.items.unshift({
      id: 'q' + d.seq,
      no: d.seq,
      ts: Date.now(),
      text, channel,
      customer: Person.key(customer),
      score: s.value,
      hits: s.hits,
      topic: Judge.topic(text),
      verdict: v.key,
      handled: null                                 // 'ignored' | 'sent'
    });
    return this.save(d);
  },

  /* ---------- 전화 통화 1건 추가 ----------
     AI 전화 데모에서 가져온 통화를 문의와 같은 파이프라인에 넣는다.
     같은 통화를 두 번 가져오지 않도록 callId를 기록해 둔다. */
  addCall(call) {
    const d = this.load();
    const cid = String(call.id || call.call_id || call.sid || (call.phone + '|' + call.ts));
    if (d.pulled[cid]) return { added: false, data: d };     // 이미 가져온 통화

    const text = (call.summary || call.transcript || call.text || '').trim();
    if (!text) return { added: false, data: d };

    const s = Judge.score(text);
    const v = Judge.verdict(s.value, d.settings);
    d.seq += 1;
    d.pulled[cid] = true;
    d.items.unshift({
      id: 'q' + d.seq,
      no: d.seq,
      ts: call.ts ? new Date(call.ts).getTime() : Date.now(),
      text,
      channel: '전화',
      customer: Person.key(call.phone || call.from || call.caller),
      score: s.value,
      hits: s.hits,
      topic: Judge.topic(text),
      verdict: v.key,
      handled: null,
      call: { duration: call.duration || call.sec || null, raw: call.transcript || null }
    });
    return { added: true, data: this.save(d) };
  },

  /* 설정 여러 칸을 한 번에 저장 */
  setSettings(patch) {
    const d = this.load();
    Object.assign(d.settings, patch);
    for (const it of d.items) it.verdict = Judge.verdict(it.score, d.settings).key;
    return this.save(d);
  },

  /* 온보딩 완료 — 기본 정보와 평일 영업시간을 한 번에 저장한다 */
  finishOnboarding(info) {
    const d = this.load();
    Object.assign(d.settings, info.settings, { onboarded: true });
    if (info.hours && info.hours.open && info.hours.close) {
      ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
        d.store.hours.weekly[day] = { open: info.hours.open, close: info.hours.close };
      });
    }
    return this.save(d);
  },

  /* 플랫폼 연결 — 지금은 mock.
     서버가 붙으면 이 함수만 POST /api/platforms/:id/connect 로 바꾼다.
     키는 서버로만 보내고 화면·localStorage 에는 남기지 않는다.
     돌려주는 모양: { ok, why?, profile?: { storeName, ownerName, bizNo } } */
  async connectPlatform(id, creds) {
    const p = CONFIG.platforms.find(x => x.id === id);
    const c = p && p.connect;
    if (!c || c.method !== 'api') return { ok: false, why: '자동 연결을 지원하지 않는 플랫폼이에요.' };
    for (const f of c.fields) {
      const v = String((creds || {})[f.key] || '').trim();
      if (!v) return { ok: false, why: `${f.label}을(를) 입력해 주세요.` };
      if (v.length < f.min) return { ok: false, why: `${f.label} 형식이 올바르지 않아요. 다시 확인해 주세요.` };
    }
    await new Promise(r => setTimeout(r, 900));
    return { ok: true, profile: Object.assign({}, c.mock) };
  },

  /* 욕설 표현을 제외한 문의 요약. 원문은 items에 그대로 보관한다. */
  summary(it) {
    const text = String(it.text || '').replace(/\s+/g, ' ').trim();
    const labels = new Set((it.hits || []).map(hit => hit.label));
    const topic = it.topic?.name || '서비스';

    const legal = labels.has('법적 조치 언급');
    const threat = labels.has('협박·위협');
    const abusive = labels.has('욕설·비속어');
    const repeated = labels.has('반복 요구') ||
      /(몇\s?번째|아직도|도대체|계속|다시\s?문의)/.test(text);
    const angry = abusive || /(화가|화나|열받|짜증|불만|최악|사기|어이없)/.test(text);

    if (legal || threat) {
      return `고객이 ${topic} 문제에 강한 불만을 표하며 신고나 법적 대응을 예고함.`;
    }
    if (repeated) {
      return `고객이 ${topic} 처리 지연에 불만을 느끼며 진행 상황을 반복해서 문의함.`;
    }
    if (angry) {
      return `고객이 ${topic} 문제에 불만을 느끼며 강한 어조로 항의함.`;
    }

    return text.length > 120 ? text.slice(0, 120).trim() + '…' : text;
  },

  setReported(id) {
    const d = this.load();
    const it = d.items.find(item => item.id === id);
    if (it) it.reportedAt = it.reportedAt ? null : Date.now();
    return this.save(d);
  },

  /* how: 'sent' 이면 reply 에 실제로 전달한 문장을 함께 남긴다 */
  setHandled(id, how, reply) {
    const d = this.load();
    const it = d.items.find(x => x.id === id);
    if (it) { it.handled = how; if (how === 'sent') it.reply = reply; }
    return this.save(d);
  },

  /* 담당자가 고친 초안을 임시 저장 — 전달 전까지만 쓴다 */
  setDraft(id, text) {
    const d = this.load();
    const it = d.items.find(x => x.id === id);
    if (it) it.draft = text;
    return this.save(d);
  },

  setSetting(k, v) {
    const d = this.load();
    d.settings[k] = v;
    /* 기준이 바뀌면 쌓인 문의를 다시 판정한다 */
    for (const it of d.items) it.verdict = Judge.verdict(it.score, d.settings).key;
    return this.save(d);
  },

  /* ---------- 파생 값 ----------
     차단 단계는 없고 보류(held) · 통과(passed) 둘로만 나뉜다. */
  stats(d) {
    d = d || this.load();
    const held   = d.items.filter(i => i.verdict === 'held' && !i.handled).length;
    const passed = d.items.filter(i => i.verdict === 'passed').length;
    const total  = d.items.length;
    const heldAll = d.items.filter(i => i.verdict === 'held').length;
    return {
      held, passed, total,
      shielded: heldAll,
      /* 방어율 = 사장님이 직접 손대지 않아도 된 비율 */
      rate: total ? Math.round((total - heldAll) / total * 100) : 0
    };
  },

  /* 고객은 문의에서 자동으로 만들어진다 */
  customers(d) {
    d = d || this.load();
    const map = new Map();
    for (const it of d.items) {
      const key = it.customer;
      if (!map.has(key)) {
        const p = Person.of(key);
        map.set(key, { id: key, name: p.label, person: p, items: [],
          hold: 0, ok: 0, channels: new Set(), last: it.ts });
      }
      const c = map.get(key);
      c.items.push(it);
      c.channels.add(it.channel);
      c.last = Math.max(c.last, it.ts);
      if (it.verdict === 'held') c.hold++;
      else c.ok++;
    }
    return [...map.values()].sort((a, b) => b.last - a.last);
  },

  channels(d) {
    d = d || this.load();
    const map = new Map();
    for (const it of d.items) {
      if (!map.has(it.channel)) map.set(it.channel, { name: it.channel, n: 0, held: 0, last: it.ts });
      const c = map.get(it.channel);
      c.n++;
      if (it.verdict === 'held') c.held++;
      c.last = Math.max(c.last, it.ts);
    }
    return [...map.values()].sort((a, b) => b.n - a.n);
  },

  /* ---------- 긴급도 순 정렬 ----------
     PRD FR-19: 긴급성(위협 표현) · 금전 · 반복 횟수로 매긴다.
     감정 단계는 원문을 가릴지에만 쓰고 순위에는 넣지 않는다. */
  alerts(d) {
    d = d || this.load();
    const repeat = {};
    for (const it of d.items) repeat[it.customer] = (repeat[it.customer] || 0) + 1;
    return d.items
      .map(it => ({ it, u: Judge.urgency(it, repeat[it.customer]) }))
      .sort((a, b) => b.u - a.u || b.it.ts - a.it.ts)
      .map(x => Object.assign({}, x.it, { urgency: x.u, repeat: repeat[x.it.customer] }));
  },

  /* 같은 주제가 기준 횟수를 넘으면 반복 이슈 */
  repeats(d) {
    d = d || this.load();
    const map = new Map();
    for (const it of d.items) {
      if (!it.topic) continue;
      map.set(it.topic.key, (map.get(it.topic.key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([k, n]) => {
        const t = Judge.TOPICS.find(x => x.key === k);
        return { key: k, ico: t.ico, name: t.name, n, over: n >= d.settings.thRepeat };
      })
      .sort((a, b) => b.n - a.n);
  }
};

/* ============================================================
   판정 엔진 — 규칙을 공개해 근거를 보여준다
   ============================================================ */
const Judge = {
  RULES: CONFIG.rules.map(r => ({ label:r.label, pts:r.pts, tone:r.tone, re:new RegExp(r.re,'g') })),

  TOPICS: CONFIG.topics.map(t => ({ key:t.key, ico:t.icon, name:t.name, re:new RegExp(t.re) })),

  score(text) {
    const hits = [];
    let total = 0;
    for (const r of this.RULES) {
      r.re.lastIndex = 0;
      const m = text.match(r.re);
      if (!m) continue;
      const pts = r.pts * Math.min(m.length, 2);     // 반복되면 2배까지 가중
      total += pts;
      hits.push({ label: r.label, pts, tone: r.tone, words: [...new Set(m)].slice(0, 3) });
    }
    return { value: Math.max(0, Math.min(100, Math.round(total))), hits };
  },

  topic(text) {
    for (const t of this.TOPICS) if (t.re.test(text)) return { key: t.key, name: t.name, ico: t.ico };
    return null;
  },

  verdict(v, st) {
    if (v >= st.thHold) return { key:'held', label:'승인 대기', tone:'gold', desc:'담당자 확인 후 발송됩니다' };
    return                { key:'passed', label:'통과', tone:'green', desc:'정상 응대로 전달됩니다' };
  },

  /* 긴급도 — 어떤 항목이 왜 위로 올라왔는지 설명까지 같이 낸다 */
  URGENCY: CONFIG.urgency.byRule,
  MONEY: new RegExp(CONFIG.urgency.money.re),

  urgency(it, repeatCount) {
    let u = 0;
    const why = [];

    for (const r of this.URGENCY) {
      if ((it.hits || []).some(h => h.label === r.label)) { u += r.pts; why.push(r.label); }
    }
    if (this.MONEY.test(it.text)) { u += CONFIG.urgency.money.pts; why.push('금전'); }

    const rep = Math.max(0, (repeatCount || 1) - 1);
    const pr = CONFIG.urgency.perRepeat;
    if (rep) { u += Math.min(rep, pr.max) * pr.pts; why.push(`반복 ${rep + 1}회`); }

    /* 전화는 채팅보다 부담이 크다 — PRD 2.1 (채널은 따로 표시하므로 사유에는 넣지 않는다) */
    u += CONFIG.urgency.byChannel[it.channel] || 0;

    it._why = why;
    return u;
  },

  level(u) {
    return CONFIG.urgency.levels.find(l => u >= l.min) || CONFIG.urgency.levels.at(-1);
  },

  meta(key) {
    return { held:{label:'승인 대기',tone:'gold'},
      passed:{label:'통과',tone:'green'} }[key];
  }
};

/* ============================================================
   답변 초안 — 승인 대기 카드에 보여줄 문장. 담당자가 고쳐서 전달한다.
   ============================================================ */
const Draft = {
  make(it, st) {
    const D = CONFIG.drafts;
    const labels = (it.hits || []).map(h => h.label);
    const serious = labels.includes('협박·위협') || labels.includes('법적 조치 언급');
    const body = serious ? D.serious : (it.topic && D.byTopic[it.topic.key]) || D.fallback;
    const fill = t => t.replace('{store}', (st.storeName || '').trim() || CONFIG.brand.owner)
      .replace('{sla}', CONFIG.receipt.slaOptions[0]);
    return [fill(D.greet), body, fill(D.closing)].join('\n');
  }
};

/* ============================================================
   AI 전화 데모 연동
   서버 응답 모양을 모르므로 흔한 형태를 모두 받아낸다.
   가져온 통화 1건당 수치가 1씩 올라간다.
   ============================================================ */
const Phone = {
  /* 응답에서 통화 목록을 꺼낸다 */
  pick(json) {
    if (Array.isArray(json)) return json;
    for (const k of ['calls', 'items', 'data', 'results', 'records', 'logs']) {
      if (Array.isArray(json?.[k])) return json[k];
    }
    /* 단일 객체 하나만 온 경우 */
    if (json && (json.summary || json.transcript || json.text)) return [json];
    return [];
  },

  /* 서버가 살아 있는지만 본다 */
  async probe(base) {
    base = (base || Store.load().settings.apiUrl || '').replace(/\/+$/, '');
    if (!base) return { ok: false, why: '주소 미설정' };
    try {
      const res = await fetch(base + '/', { method: 'GET', mode: 'cors' });
      return { ok: true, status: res.status };
    } catch (e) {
      return { ok: false, why: e.message || '연결 실패' };
    }
  },

  async pull(base) {
    base = (base || Store.load().settings.apiUrl || '').replace(/\/+$/, '');
    if (!base) throw new Error('전화 데모 주소가 설정되어 있지 않습니다.');

    /* 흔히 쓰는 경로를 차례로 시도 */
    const paths = CONFIG.callPaths;
    let lastErr = null;
    let sample = null;          // 모양을 못 알아본 응답을 보여주기 위해 보관

    for (const p of paths) {
      try {
        const res = await fetch(base + p, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) { lastErr = new Error(`${p} → HTTP ${res.status}`); continue; }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('json')) { lastErr = new Error(`${p} → JSON이 아닙니다`); continue; }

        const json = await res.json();
        const list = this.pick(json);
        if (list.length) return { path: p, list, sample: null };

        /* JSON은 왔는데 통화 목록을 못 찾은 경우 — 키를 기억해 둔다 */
        if (!sample) sample = { path: p, keys: Object.keys(json || {}).slice(0, 12), json };
        lastErr = new Error(`${p} → 통화 목록을 찾지 못했습니다`);
      } catch (e) {
        /* CORS 차단도 여기로 떨어진다 */
        lastErr = e;
      }
    }
    if (sample) return { path: sample.path, list: [], sample };
    throw lastErr || new Error('통화를 가져오지 못했습니다.');
  }
};

/* ============================================================
   고객 표시 — 이름 · 번호 · 미등록을 한 규칙으로 정리한다
   ============================================================ */
const Person = {
  re: new RegExp(CONFIG.person.phoneRe),

  /* 숫자와 가림표(*)만 남긴 형태. 010-9821-**** → 0109821**** */
  compact(p) { return String(p).replace(/[-\s()]/g, ''); },

  isPhone(k) { return /^0[\d*]{8,10}$/.test(this.compact(k)) || this.re.test(k); },

  mask(p) {
    const d = this.compact(p);
    if (!CONFIG.person.maskPhone) return d;
    if (d.length < 9) return d;
    /* 이미 뒷자리가 가려져 있으면 가운데를 살리고, 아니면 가운데를 가린다 */
    return d.endsWith('****')
      ? `${d.slice(0, 3)}-${d.slice(3, 7)}-****`
      : `${d.slice(0, 3)}-****-${d.slice(-4)}`;
  },

  /* 저장 키 — 같은 사람을 한 사람으로 묶는 기준 */
  key(raw) {
    const k = String(raw || '').trim();
    if (!k) return '';
    return this.isPhone(k) ? this.compact(k) : k;
  },

  /* 화면에 쓸 이름표 */
  of(raw) {
    const k = String(raw || '').trim();
    const c = CONFIG.person;

    if (!k) return { label:c.unknownLabel, sub:c.unknownSub,
      avatar:c.icons.none, known:false, kind:'none' };

    if (this.isPhone(k)) return { label:this.mask(k), sub:c.phoneSub,
      avatar:c.icons.phone, known:false, kind:'phone' };

    return { label:k, sub:null, avatar:k[0], known:true, kind:'name' };
  }
};

/* ============================================================
   사업자등록번호 — 형식·체크섬만 본다.
   실제 상태(휴·폐업) 조회는 서버가 국세청 사업자 상태 조회 API 로 붙인다.
   ============================================================ */
const Biz = {
  digits(s) { return String(s || '').replace(/\D/g, '').slice(0, 10); },
  format(s) {
    const d = this.digits(s);
    return [d.slice(0, 3), d.slice(3, 5), d.slice(5)].filter(Boolean).join('-');
  },
  valid(s) {
    const d = this.digits(s);
    if (d.length !== 10) return false;
    const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += +d[i] * w[i];
    sum += Math.floor(+d[8] * 5 / 10);
    return (10 - sum % 10) % 10 === +d[9];
  }
};

/* 상대 시간 & 이스케이프 */
function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return '방금 전';
  if (s < 3600) return Math.floor(s / 60) + '분 전';
  if (s < 86400) return Math.floor(s / 3600) + '시간 전';
  return Math.floor(s / 86400) + '일 전';
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
