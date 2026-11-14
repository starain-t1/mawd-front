/* ============================================================
   감정방패 — 화면 렌더링
   body[data-page] 를 보고 해당 화면을 그린다.
   body[data-root] 는 루트까지의 상대 경로 (하위 폴더에서는 "../").
   ============================================================ */
'use strict';

/* 폴더가 달라도 링크가 깨지지 않도록 루트 기준으로 만든다 */
const ROOT = document.body.dataset.root || '';
const L = (() => {
  const m = {};
  CONFIG.menu.forEach(x => { m[x.id] = ROOT + x.path; });
  Object.entries(CONFIG.routes).forEach(([k, v]) => { m[k] = ROOT + v; });
  return m;
})();

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- 공통 조각 ---------- */
function empty(ico, t, b) {
  return `<div class="card"><div class="empty">
    <div class="empty-ico">${ico}</div>
    <div class="empty-t">${t}</div>
    <div class="empty-b">${b}</div>
  </div></div>`;
}

/* 고객 이름표 — 이름이 없으면 "미등록" 칩을 붙인다 */
function who(raw) {
  const p = Person.of(raw);
  const chip = (!p.known && p.kind === 'phone') ? ' <span class="chip gray">미등록</span>' : '';
  return `${esc(p.label)}${chip}`;
}
function whoPlain(raw) { return Person.of(raw).label; }

/* 업종 — 설정에서 고른 id로 config.js 의 bizTypes 에서 찾는다 */
function bizTypeOf(id) {
  return CONFIG.bizTypes.find(b => b.id === id) || CONFIG.bizTypes[CONFIG.bizTypes.length - 1];
}

function hitChips(hits) {
  if (!hits || !hits.length) return '<div class="row-t2">걸린 규칙 없음 — 0점</div>';
  return `<div class="hits">${hits.map(h => `
    <span class="hit ${h.tone}">${esc(h.label)} <b>${h.pts > 0 ? '+' : ''}${h.pts}</b>
      <i>${h.words.map(esc).join(', ')}</i></span>`).join('')}</div>`;
}

/* ============================================================
   현황
   ============================================================ */
function pageDashboard() {
  const d = Store.load();
  const st = Store.stats(d);
  const reps = Store.repeats(d);

  const biz = bizTypeOf(d.settings.bizType);
  const storeName = d.settings.storeName || CONFIG.brand.owner;
  const sub = $('#pageSub');
  if (sub) sub.textContent = st.total
    ? `${biz.icon} ${biz.label} · ${storeName} · 오늘 방어 ${st.shielded}건`
    : `${biz.icon} ${biz.label} · ${storeName} · 아직 들어온 문의가 없습니다`;

  const stats = `
    <div class="sec"><div class="stats">
      <div class="stat gold"><div class="stat-n">${st.held}</div><div class="stat-l">승인 대기</div>
        <div class="stat-d">확인이 필요합니다</div></div>
      <div class="stat blue"><div class="stat-n">${st.total}</div><div class="stat-l">오늘 처리</div>
        <div class="stat-d">통과 ${st.passed}건 포함</div></div>
      <div class="stat green"><div class="stat-n">${st.rate}%</div><div class="stat-l">고객 대응 진행도</div>
        <div class="stat-d">오늘 받은 문의 중 총 처리한 비율</div></div>
    </div></div>`;

  if (!st.total) {
    return stats + `
      <div class="sec">
        ${empty('🛡', '아직 들어온 문의가 없습니다',
      '시연 화면에서 문의를 넣으면 이곳의 숫자가 올라갑니다.')}
        <a class="btn block" href="${L.demo}" style="margin-top:10px">문의 넣어보기 ›</a>
      </div>`;
  }

  /* 최근 알림 — 시간순이 아니라 긴급도 순으로 위에 올린다 */
  const recent = Store.alerts(d).slice(0, 6).map(it => {
    const m = Judge.meta(it.verdict);
    const lv = Judge.level(it.urgency);
    const why = (it._why || []).length ? (it._why || []).join(' · ') : '일반';
    return `<a class="row" href="${L.inquiries}">
      <span class="chip ${lv.tone}" style="flex-shrink:0;min-width:34px;text-align:center">${lv.label}</span>
      <span class="row-body">
        <span class="row-t1">${who(it.customer)} · ${m.label}
          ${it.channel === '전화' ? '<span class="chip gray">📞 통화</span>' : ''}</span>
        <span class="row-t2">${esc(why)} · ${esc(it.channel)} · 점수 ${it.score}</span>
      </span>
      <span class="row-val">${ago(it.ts)}</span><span class="chev">›</span>
    </a>`;
  }).join('');

  const repHtml = reps.length ? reps.map(r => `
    <div class="card">
      <div style="display:flex;align-items:center;gap:11px">
        <div class="ico-box">${r.ico}</div>
        <div style="flex:1;min-width:0">
          <div class="row-t1">${esc(r.name)}
            ${r.over ? '<span class="chip red">임계값 초과</span>' : '<span class="chip gray">관찰 중</span>'}</div>
          <div class="row-t2">임계값 ${d.settings.thRepeat}건</div>
        </div>
        <div style="font-size:19px;font-weight:700;flex-shrink:0">${r.n}건</div>
      </div>
      <div class="meter"><i style="width:${Math.min(100, r.n / d.settings.thRepeat * 100)}%;
        background:var(--${r.over ? 'red' : 'blue'})"></i></div>
    </div>`).join('')
    : `<div class="note">아직 주제를 묶을 만큼 문의가 쌓이지 않았습니다.</div>`;

  return stats + `
    <div class="sec">
      <div class="sec-head"><h2>최근 알림</h2>
        <span class="row-t2">긴급한 순</span>
        <a class="more" href="${L.inquiries}">전체 보기 ›</a></div>
      <div class="list">${recent}</div>
      <div class="note" style="margin-top:10px">
        위협 표현 · 금전 · 반복 횟수로 순위를 매깁니다. 감정 단계는 원문을 가릴지에만 쓰고
        <b>순위에는 넣지 않습니다</b>.
      </div>
    </div>
    <div class="sec">
      <div class="sec-head"><h2>반복 이슈 감지</h2>
        <a class="more" href="${L.threshold}">임계값 ${d.settings.thRepeat}건 ›</a></div>
      ${repHtml}
      <div class="note" style="margin-top:10px">
        <b>악성이 아닌 묶음</b>입니다. 같은 주제가 ${d.settings.thRepeat}건을 넘으면
        개별 응대 대신 공지나 제품 점검이 필요한 신호로 봅니다.
      </div>
    </div>`;
}

/* ============================================================
   문의
   ============================================================ */
function pageInquiries() {
  const d = Store.load();
  const pending = d.items.filter(it => !it.handled);
  const handled = d.items.filter(it => it.handled);

  if (!d.items.length) {
    return `<div class="sec">${empty('📋', '처리할 문의가 없습니다',
      '시연 화면에서 문의를 넣으면 여기에 요약이 표시됩니다.')}
      <a class="btn block" href="${L.demo}" style="margin-top:10px">문의 넣어보기 ›</a></div>`;
  }

  const pendingHtml = pending.length ? pending.map(it => `
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px">
        <span class="chip gray">${esc(it.channel)}</span>
        <span class="row-t2">${ago(it.ts)} · ${whoPlain(it.customer)}</span>
        <span class="chip ${it.verdict === 'held' ? 'gold' : 'green'}" style="margin-left:auto">
          ${it.verdict === 'held' ? '확인 필요' : '일반 문의'}
        </span>
      </div>

      <div class="eyebrow">요청 요약</div>
      <div class="quote">${esc(Store.summary(it))}</div>

      <div style="margin-top:12px">
        <label class="eyebrow" for="draft-${it.id}">사장님 답변</label>
        <textarea class="textarea" id="draft-${it.id}" data-draft="${it.id}" rows="5"
          placeholder="고객에게 전달할 답변을 직접 입력하세요">${esc(it.draft || '')}</textarea>
      </div>

      <div class="btn-row" style="margin-top:13px">
        <button class="btn danger" data-act="handle" data-id="${it.id}" data-how="ignored">처리하지 않기</button>
        <button class="btn" data-act="handle" data-id="${it.id}" data-how="sent">답변 저장 및 처리</button>
      </div>
    </div>`).join('')
    : empty('✓', '처리할 문의가 없습니다', '새 문의가 들어오면 이곳에 표시됩니다.');

  const handledHtml = handled.length ? `<div class="list">${handled.map(it => `
    <div class="row">
      <span class="dot ${it.handled === 'sent' ? 'green' : 'gold'}"></span>
      <span class="row-body">
        <span class="row-t1">${who(it.customer)} · ${it.handled === 'sent' ? '답변 기록됨' : '처리하지 않음'}</span>
        <span class="row-t2">${esc(Store.summary(it))} · ${ago(it.ts)}</span>
      </span>
    </div>`).join('')}</div>` : '<div class="note">처리한 문의가 없습니다.</div>';

  return `
    <div class="sec">
      <div class="sec-head"><h2>답변할 문의</h2><span class="chip gold">${pending.length}건</span></div>
      ${pendingHtml}
    </div>
    <div class="sec">
      <div class="sec-head"><h2>처리한 문의</h2><span class="row-t2">${handled.length}건</span></div>
      ${handledHtml}
    </div>`;
}

function pageStorehouse() {
  const d = Store.load();

  if (!d.items.length) {
    return `<div class="sec">${empty('🗂️', '저장된 요청이 없습니다',
      '고객 요청 원문이 여기에 저장됩니다.')}
      <a class="btn block" href="${L.demo}" style="margin-top:10px">문의 넣어보기 ›</a></div>`;
  }

  return `
    <div class="sec">
      <div class="sec-head">
        <h2>고객 요청 원문</h2>
        <span class="chip gray">${d.items.length}건</span>
      </div>
      <div class="note" style="margin-bottom:10px">
        문의 화면에는 요약을 표시하고, 이곳에는 고객이 남긴 원문 전체를 보관합니다.
      </div>
      ${d.items.map(it => `
        <div class="card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px">
            <span class="chip gray">${esc(it.channel)}</span>
            <span class="row-t2">${ago(it.ts)} · ${whoPlain(it.customer)}</span>
            ${it.reportedAt
    ? '<span class="chip red" style="margin-left:auto">신고 기록됨</span>'
    : ''}
          </div>
          <div class="eyebrow">요청 요약</div>
          <div class="quote">${esc(Store.summary(it))}</div>
          <div class="eyebrow" style="margin-top:12px">고객 요청 원문</div>
          <div class="quote">${esc(it.text)}</div>
          <div class="btn-row" style="margin-top:12px">
            <button class="btn sm ${it.reportedAt ? 'ghost' : 'danger'}"
              data-act="report" data-id="${it.id}">
              ${it.reportedAt ? '신고 기록 취소' : '신고 기록'}
            </button>
          </div>
        </div>`).join('')}
    </div>`;
}

/* ============================================================
   채널
   ============================================================ */
function pageChannels() {
  const d = Store.load();
  const params = new URLSearchParams(location.search);
  const selectedChannel = params.get('channel');
  const title = $('#pageTitle');

  // 채널 하나를 선택했을 때: 해당 채널의 요청 보관함
  if (selectedChannel) {
    if (title) title.textContent = `${selectedChannel} 문의`;

    const items = d.items.filter(it => it.channel === selectedChannel);

    if (!items.length) {
      return `<div class="sec">
        ${empty('💬', '저장된 문의가 없습니다', '이 채널에서 수집된 문의가 없습니다.')}
        <a class="btn ghost block" href="${L.channels}" style="margin-top:10px">채널 목록으로</a>
      </div>`;
    }

    return `
      <div class="sec">
        <div class="sec-head">
          <h2>${esc(selectedChannel)} 문의</h2>
          <span class="chip gray">${items.length}건</span>
          <a class="more" href="${L.channels}">‹ 채널 목록</a>
        </div>

        ${items.map(it => `
          <div class="card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px">
              <span class="row-t2">${ago(it.ts)} · ${whoPlain(it.customer)}</span>
              <span class="chip ${it.verdict === 'held' ? 'gold' : 'green'}" style="margin-left:auto">
                ${it.verdict === 'held' ? '보류' : '통과'}
              </span>
              ${it.reportedAt ? '<span class="chip red">신고 기록됨</span>' : ''}
            </div>

            <div class="eyebrow">요청 요약</div>
            <div class="quote">${esc(Store.summary(it))}</div>

            <div class="eyebrow" style="margin-top:12px">고객이 남긴 원문</div>
            <div class="quote">${esc(it.text)}</div>

            <div class="btn-row" style="margin-top:12px">
              <button class="btn sm ${it.reportedAt ? 'ghost' : 'danger'}"
                data-act="report" data-id="${it.id}">
                ${it.reportedAt ? '신고 기록 취소' : '신고 기록'}
              </button>
            </div>
          </div>`).join('')}
      </div>`;
  }

  // 채널 목록 화면
  if (title) title.textContent = '채널';

  const channels = Store.channels(d);

  if (!channels.length) {
    return `<div class="sec">
      ${empty('💬', '수집된 문의가 없습니다', '문의가 들어오면 채널별로 여기에 쌓입니다.')}
      <a class="btn block" href="${L.demo}" style="margin-top:10px">문의 넣어보기 ›</a>
    </div>`;
  }

  return `
    <div class="sec">
      <div class="sec-head"><h2>유입 채널별 문의</h2></div>
      <div class="list">
        ${channels.map(c => `
          <a class="row" href="${L.channels}?channel=${encodeURIComponent(c.name)}">
            <span class="ico-box">💬</span>
            <span class="row-body">
              <span class="row-t1">${esc(c.name)}</span>
              <span class="row-t2">수집 문의 ${c.n}건 · 이 중 보류 ${c.held}건</span>
            </span>
            <span class="chev">›</span>
          </a>`).join('')}
      </div>
    </div>`;
}

/* ============================================================
   고객
   ============================================================ */
function customerRows(list, selId) {
  return `<div class="list">${list.map(c => {
    const tone = c.hold ? 'gold' : 'green';
    const badge = c.hold ? `보류 ×${c.hold}` : '정상';
    return `<a class="row" href="${L.customer}?id=${encodeURIComponent(c.id)}"
      ${c.id === selId ? 'aria-current="true"' : ''}>
      <span class="avatar${c.person.known ? '' : ' muted'}">${esc(c.person.avatar)}</span>
      <span class="row-body">
        <span class="row-t1">${esc(c.person.label)}
          ${!c.person.known && c.person.kind === 'phone'
      ? '<span class="chip gray">미등록</span>' : ''}
          <span class="chip ${tone}">${badge}</span></span>
        <span class="row-t2">${[...c.channels].map(esc).join(' · ')}${
      c.person.sub ? ' · ' + esc(c.person.sub) : ''}</span>
      </span>
      <span class="row-val">최근<br>${ago(c.last)}</span><span class="chev">›</span>
    </a>`;
  }).join('')}</div>`;
}

function customerDetail(c) {
  if (!c) return empty('👤', '고객을 선택하세요', '문의 이력과 판정 근거를 볼 수 있습니다.');
  return `
    <div class="sec"><div class="card">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="avatar${c.person.known ? '' : ' muted'}"
             style="width:46px;height:46px;border-radius:12px;font-size:17px">${esc(c.person.avatar)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:6px">
            ${esc(c.person.label)}
            ${!c.person.known && c.person.kind === 'phone'
    ? '<span class="chip gray">미등록</span>' : ''}
          </div>
          <div class="row-t2">${[...c.channels].map(esc).join(' · ')} · 문의 ${c.items.length}건${
    c.person.sub ? ' · ' + esc(c.person.sub) : ''}</div>
        </div>
        <span class="chip ${c.hold ? 'gold' : 'green'}">
          ${c.hold ? '주의 고객' : '정상 고객'}</span>
      </div>
      <div class="stats" style="grid-template-columns:repeat(2,1fr);margin-top:13px">
        <div class="stat gold" style="padding:11px"><div class="stat-n" style="font-size:21px">${c.hold}</div><div class="stat-l">보류</div></div>
        <div class="stat green" style="padding:11px"><div class="stat-n" style="font-size:21px">${c.ok}</div><div class="stat-l">통과</div></div>
      </div>
    </div></div>

    <div class="sec">
      <div class="sec-head"><h2>문의 이력</h2><span class="row-t2">${c.items.length}건</span></div>
      ${c.items.map(it => {
    const m = Judge.meta(it.verdict);
    return `<div class="card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">
            <span class="chip gray">${esc(it.channel)}</span>
            <span class="row-t2">${ago(it.ts)}</span>
            <span class="chip ${m.tone}" style="margin-left:auto">${m.label} · ${it.score}점</span>
          </div>
          <div class="quote">${esc(it.text)}</div>
          <div style="margin-top:10px">${hitChips(it.hits)}</div>
        </div>`;
  }).join('')}
    </div>`;
}

/* AI 전화 데모에서 통화를 가져오는 카드 — 1건당 1씩 올라간다 */
function phonePullCard() {
  const d = Store.load();
  const calls = d.items.filter(i => i.channel === '전화').length;
  return `
  <div class="sec"><div class="card">
    <div style="display:flex;align-items:center;gap:11px">
      <div class="ico-box">📞</div>
      <div style="flex:1;min-width:0">
        <div class="row-t1">AI 전화 데모 연동</div>
        <div class="row-t2">가져온 통화 ${calls}건 · 1건당 수치가 1씩 올라갑니다</div>
      </div>
      <button class="btn sm" id="pull">통화 가져오기</button>
    </div>
    <div id="pullMsg" class="note" style="margin-top:11px;display:none"></div>
  </div></div>`;
}

function pageCustomers() {
  const list = Store.customers();
  if (!list.length) {
    return phonePullCard() + `<div class="sec">${empty('👤', '등록된 고객이 없습니다',
      '문의를 넣거나 전화 데모에서 통화를 가져오면 고객 기록이 만들어집니다.')}
      <a class="btn block" href="${L.demo}" style="margin-top:10px">문의 넣어보기 ›</a></div>`;
  }
  return phonePullCard() + `<div class="split">
    <div class="pane-list"><div class="eyebrow">고객 ${list.length}명</div>${customerRows(list)}</div>
    <div class="pane-detail">${customerDetail(list[0])}</div>
  </div>`;
}

function pageCustomer() {
  const id = new URLSearchParams(location.search).get('id');
  const list = Store.customers();
  const c = list.find(x => x.id === id);
  const t = $('#pageTitle'), s = $('#pageSub');
  if (t) t.textContent = c ? c.person.label : '고객';
  if (s) s.textContent = c ? `${[...c.channels].join(' · ')} · 문의 ${c.items.length}건` + (c.person.sub ? ' · ' + c.person.sub : '') : '';

  if (!c) return `<div class="sec">${empty('👤', '고객을 찾을 수 없습니다',
    '목록에서 다시 선택해 주세요.')}
    <a class="btn block" href="${L.customers}" style="margin-top:10px">고객 목록 ›</a></div>`;

  return `<div class="split">
    <div class="pane-list"><div class="eyebrow">고객 ${list.length}명</div>${customerRows(list, id)}</div>
    <div class="pane-detail-full">${customerDetail(c)}</div>
  </div>`;
}

/* ============================================================
   시연 — 고객 통화 시뮬레이터 & 채널톡 채팅
   ============================================================ */
const SAMPLES = CONFIG.samples;
const SCENARIOS = CONFIG.scenarios;

/* 통화 상태 — 저장하지 않는다 (진행 중인 통화) */
const call = {
  on: false, t0: 0, turns: [], used: [], heat: 0, tab: 'phone',
  latency: [], timer: null, card: null
};

function callSecs() { return call.on ? Math.floor((Date.now() - call.t0) / 1000) : 0; }
function mmss(s) { return String(Math.floor(s / 60)).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0'); }

function p50(a) {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  return b[Math.floor(b.length / 2)];
}

function heatLabel(h) {
  const th = Store.load().settings.thHeat ?? CONFIG.defaults.thHeat;
  if (h >= th + 25) return { t:'매우 높음', tone:'red' };
  if (h >= th)      return { t:'높음',      tone:'red' };
  if (h >= th / 2)  return { t:'보통',      tone:'gold' };
  return { t:'낮음', tone:'green' };
}

/* ---------- 왼쪽: 고객 ---------- */
function paneCall() {
  const tape = call.turns.length
    ? call.turns.map(t => `
      <div class="msg ${t[0] === 'cust' ? 'them' : 'ai'}">
        <div class="msg-av">${t[0] === 'cust' ? '👤' : '🛡'}</div>
        <div class="bubble">${esc(t[1])}</div>
      </div>`).join('')
    : `<div class="ph">${call.on
      ? '아래 상황 버튼을 눌러 고객이 말하게 해보세요.'
      : '전화 걸기를 누르면 통화가 시작됩니다.'}</div>`;

  const chips = SCENARIOS.map(sc => `
    <button data-sc="${sc.id}" class="${sc.heat >= 40 ? 'hot' : ''}"
      ${call.on ? '' : 'disabled'}>${esc(sc.label)}</button>`).join('');

  return `
  <div class="card">
    <div class="seg">
      <button data-tab="phone" aria-selected="${call.tab === 'phone'}">📞 전화</button>
      <button data-tab="chat"  aria-selected="${call.tab === 'chat'}">💬 채널톡 채팅</button>
    </div>

    ${call.tab === 'phone' ? `
      <div class="call-head">
        <span class="ttl">고객 통화</span>
        <span class="chip ${call.on ? 'red' : 'gray'}">${call.on ? '통화 중' : '대기'}</span>
        <span class="call-time" id="clock">${mmss(callSecs())}</span>
      </div>

      <div class="tape" id="tape">${tape}</div>

      <div class="chips-row">${chips}</div>

      <div class="send-row">
        <input class="input" id="say" placeholder="말 대신 입력해도 됩니다"
               ${call.on ? '' : 'disabled'}>
        <button class="btn" id="saySend" ${call.on ? '' : 'disabled'}>보내기</button>
      </div>

      ${call.on
    ? `<button class="btn block btn-hang" id="hang">통화 종료 · 요약 카드 보내기</button>`
    : `<button class="btn block btn-call" id="dial">📞 전화 걸기</button>`}
    ` : `
      <div class="eyebrow">채널톡 채팅</div>
      <textarea class="textarea" id="inp" rows="3"
        placeholder="고객이 보낸 메시지를 입력하면 바로 판정됩니다."></textarea>
      <div class="demo-row">
        <input class="input" id="who" placeholder="고객 이름 (선택)" style="flex:1">
        <select class="input select" id="ch" aria-label="채널">
          ${CONFIG.channels.options.filter(c => c !== '전화').map(c => `<option>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <button class="btn block" id="send" style="margin-top:8px">방패에 넣기</button>
      <div class="eyebrow" style="margin-top:16px">예시 문장</div>
      <div class="tags">${SAMPLES.map(([n], i) =>
    `<button class="tag-ui sample" data-i="${i}">${esc(n)}</button>`).join('')}</div>
    `}
  </div>`;
}

/* ---------- 오른쪽: 사장님 화면 ---------- */
function paneOwner() {
  const st = Store.load().settings;
  const lat = p50(call.latency);

  const card = call.card ? (() => {
    const c = call.card, hl = heatLabel(c.heat), m = Judge.meta(c.verdict);
    return `
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px">
        <span class="chip gray">📞 통화</span>
        <span class="row-t2">${whoPlain(c.who)} · ${mmss(c.secs)}</span>
        <span class="chip ${m.tone}" style="margin-left:auto">${m.label} · ${c.score}점</span>
      </div>
      <div class="eyebrow">📋 통화 요약</div>
      <div class="kv"><span class="kv-k">요청</span><span class="kv-v">${esc(c.ask)}</span></div>
      <div class="kv"><span class="kv-k">감정</span><span class="kv-v">${hl.t} (격앙 ${c.heat})</span></div>
      <div class="kv"><span class="kv-k">위협</span><span class="kv-v">${esc(c.threat)}</span></div>
      <div class="kv"><span class="kv-k">턴 수</span><span class="kv-v">${c.turns}턴</span></div>
      <div style="margin-top:12px">
        <div class="eyebrow">🤖 추천 대응</div>
        <div class="note">${esc(c.advice)}</div>
      </div>
      <div style="margin-top:11px">${hitChips(c.hits)}</div>
      <a class="btn block" href="${L.customers}" style="margin-top:12px">고객 기록에서 보기 ›</a>
    </div>`;
  })() : `<div class="drop">통화가 끝나면 요약 카드가 여기에 나타납니다.<br>
           통화 중에는 사장님이 아무것도 보지 않아도 됩니다.</div>`;

  return `
  <div>
    <div class="sec">
      <div class="sec-head"><h2>사장님 화면</h2></div>
      <div class="row-t2" style="margin-bottom:12px">
        통화 중에는 아무것도 보지 않아도 됩니다. 끝나면 정리된 카드만 도착합니다.
      </div>
      <div class="metrics">
        <div class="metric"><div class="mk">AI 답변 체감 (p50)</div>
          <div class="mv">${lat ? lat + '<small style="font-size:12px">ms</small>' : '—'}</div></div>
        <div class="metric"><div class="mk">격앙도</div>
          <div class="mv" style="color:var(--${heatLabel(call.heat).tone})">${call.heat}</div></div>
        <div class="metric"><div class="mk">턴 수</div>
          <div class="mv">${call.turns.length}</div></div>
      </div>
      ${card}
    </div>

    <div class="sec">
      <div class="sec-head"><h2>매장 설정</h2></div>
      <div class="row-t2" style="margin-bottom:12px">
        매장마다 AI 응대를 조정할 수 있습니다. 다음 턴부터 바로 반영됩니다.
      </div>
      <div class="card">
        <div class="set-row">
          <div>
            <label class="label" for="agent">상담원 이름</label>
            <input class="input" id="agent" value="${esc(st.agent || CONFIG.defaults.agent)}">
          </div>
          <div>
            <label class="label" for="tone">말투</label>
            <select class="input select" id="tone">
              ${CONFIG.receipt.toneOptions.map(t =>
    `<option ${(st.tone || CONFIG.defaults.tone) === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-top:12px">
          <div class="th-label">격앙 기준 <b id="vHeat">${st.thHeat ?? CONFIG.defaults.thHeat}</b></div>
          <input class="range gold" type="range" id="thHeat" min="0" max="100" value="${st.thHeat ?? CONFIG.defaults.thHeat}">
          <div class="hint">이 값을 넘으면 통화를 격앙 상태로 보고 요약 카드에 위협 항목을 남깁니다.</div>
        </div>
      </div>
    </div>
  </div>`;
}

function pageDemo() {
  return `<div class="demo-grid">${paneCall()}${paneOwner()}</div>`;
}

/* ---------- 통화 동작 ---------- */
function pushTurn(who, text) {
  call.turns.push([who, text]);
  if (who === 'ai') call.latency.push(180 + Math.floor(Math.random() * 420));
}

function runScenario(id) {
  const sc = SCENARIOS.find(x => x.id === id);
  if (!sc || !call.on) return;
  sc.turns.forEach(([w, t]) => pushTurn(w, t));
  call.heat = Math.min(100, call.heat + sc.heat);
  if (!call.used.includes(sc.id)) call.used.push(sc.id);
  render();
  const tape = $('#tape'); if (tape) tape.scrollTop = tape.scrollHeight;
}

function hangUp() {
  const secs = callSecs();
  const said = call.turns.filter(t => t[0] === 'cust').map(t => t[1]).join(' ');
  const names = CONFIG.callerNames;
  const caller = names[Math.floor(Math.random() * names.length)];

  const used = SCENARIOS.filter(s => call.used.includes(s.id));
  const ask = used.map(s => s.ask).join(' / ') || '일반 문의';

  /* CONFIG.advice 에서 우선순위에 맞는 추천 대응·위협 문구를 가져온다 */
  const adv = CONFIG.advice.find(a => a.when && call.used.includes(a.when))
    || CONFIG.advice.find(a => a.when === null)
    || { text: '정상 문의입니다. 일반 응대로 충분합니다.', threat: '없음' };

  /* 고객이 한 말을 그대로 판정에 넣는다 */
  const added = Store.add(said || '통화 문의', '전화', caller);
  const it = added.items[0];

  call.card = {
    who: caller, secs, ask,
    threat: adv.threat, advice: adv.text,
    heat: call.heat, turns: call.turns.length,
    score: it.score, verdict: it.verdict, hits: it.hits
  };
  call.on = false;
  clearInterval(call.timer);
  call.timer = null;
  render();
}

/* ============================================================
   설정 — 데이터에 연결된 부분 동기화
   ============================================================ */
function syncSettings() {
  const d = Store.load();
  const el = $('#thSummary');
  if (el) el.textContent = `보류 ${d.settings.thHold}점 · 반복 ${d.settings.thRepeat}건`;

  const api = $('#apiUrl');
  if (api && document.activeElement !== api) api.value = d.settings.apiUrl || '';

  ['thHold', 'thRepeat', 'thHeat'].forEach(k => {
    const r = $('#' + k), v = $('#v' + k.slice(2));
    if (r && document.activeElement !== r) r.value = d.settings[k];
    if (v) v.textContent = d.settings[k];
  });
}

/* ============================================================
   설정 화면 — 내용은 모두 CONFIG 에서 온다
   ============================================================ */
function pageSettings() {
  const d = Store.load(), b = CONFIG.brand;
  const row = (o) => `
    <${o.href ? 'a' : 'div'} class="row" ${o.href ? `href="${o.href}"` : ''}>
      <span class="ico-box">${o.icon}</span>
      <span class="row-body">
        <span class="row-t1">${esc(o.name)}</span>
        ${o.desc ? `<span class="row-t2">${esc(o.desc)}</span>` : ''}
      </span>
      ${o.toggle
    ? `<input class="sw" type="checkbox" id="sw-${o.id}" ${o.on ? 'checked' : ''}>
           <label class="sw-ui" for="sw-${o.id}" aria-label="${esc(o.name)}"></label>`
    : '<span class="chev">›</span>'}
    </${o.href ? 'a' : 'div'}>`;

  const biz = bizTypeOf(d.settings.bizType);
  const storeName = d.settings.storeName || b.owner;

  return `
  <div class="sec">
    <div class="card" style="display:flex;align-items:center;gap:12px;background:var(--soft-2)">
      <div class="avatar" style="width:44px;height:44px;border-radius:11px;font-size:16px">${esc(storeName[0] || '🛡')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14.5px;font-weight:700">${esc(storeName)}</div>
        <div class="row-t2">${biz.icon} ${esc(biz.label)} · ${esc(b.email)}</div>
      </div>
      <span class="chip solid">${esc(b.plan)}</span>
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">매장 정보</div>
    <div class="card">
      <label class="label" for="storeName">매장명</label>
      <input class="input" id="storeName" placeholder="${esc(b.owner)}" value="${esc(d.settings.storeName || '')}">
    </div>
    <div class="card">
      <label class="label" for="bizType">업종</label>
      <select class="input select" id="bizType" style="width:100%">
        ${CONFIG.bizTypes.map(t => `<option value="${t.id}" ${t.id === biz.id ? 'selected' : ''}>${t.icon} ${esc(t.label)}</option>`).join('')}
      </select>
      <div class="hint">문의 예시·AI 답변 톤이 업종에 맞게 조정됩니다</div>
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">매장 설정 (서버 연동)</div>
    <div class="list">
      ${row({ icon:'🧭', name:'응대 정책 · 말투 · 영업시간', desc:`AI 이름 "${esc(d.store.persona.assistant_name)}" · 격앙 기준 ${d.store.response.heat_threshold}점`, href:L.store })}
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">방패 설정 (데모 채점)</div>
    <div class="list">
      ${row({ icon:'💬', name:'채널 연결', desc:`${esc(CONFIG.channels.hub.name)} 허브로 수집`, href:L.setChannels })}
      ${row({ icon:'🎚', name:'판정 기준', desc:`보류 ${d.settings.thHold}점 · 반복 ${d.settings.thRepeat}건`, href:L.threshold })}
      ${row({ icon:'🗣', name:'접수 확인 문구', desc:'손님에게 나가는 유일한 자동 메시지', href:L.tone })}
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">알림</div>
    <div class="list">
      ${CONFIG.notices.map(n => row({ ...n, toggle:true })).join('')}
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">AI 전화 데모 연동</div>
    <div class="card">
      <label class="label" for="apiUrl">데모 서버 주소</label>
      <input class="input" id="apiUrl" placeholder="https://example.trycloudflare.com" value="${esc(d.settings.apiUrl || '')}">
      <div class="hint">고객 화면의 <b>통화 가져오기</b> 버튼이 이 주소를 씁니다.
        터널을 다시 켜면 주소가 바뀌니 여기서 고치세요.</div>
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">데이터</div>
    <div class="btn-row">
      <button class="btn ghost" id="reseed">더미 데이터 다시 채우기</button>
      <button class="btn ghost" id="reset" style="color:var(--red)">전체 비우기</button>
    </div>
    <div class="hint" style="text-align:center">
      더미 데이터는 문의 ${CONFIG.seed.length}건입니다. 전체 비우기를 누르면 0에서 시작합니다.
    </div>
    <div style="text-align:center;font-size:10px;color:var(--mute-3);margin-top:12px">
      ${esc(CONFIG.brand.name)} v${esc(CONFIG.brand.version)}
    </div>
  </div>`;
}

function pageThreshold() {
  const d = Store.load();
  const bar = (id, label, unit, min, max, tone, desc) => `
    <div class="card">
      <div class="th-row">
        <div class="th-label">${esc(label)} <b id="v${id.slice(2)}">${d.settings[id]}</b>${unit}</div>
        <input class="range ${tone}" type="range" id="${id}" min="${min}" max="${max}" value="${d.settings[id]}">
      </div>
      <div class="row-t2">${esc(desc)}</div>
    </div>`;

  return `
  <div class="sec"><div class="note">
    문의마다 매겨지는 <b>악성 점수(0–100)</b>로 어디서 보류할지 정합니다.
    바꾸면 <b>이미 쌓인 문의도 즉시 다시 판정</b>됩니다.
    이 화면은 <b>이 데모의 채점 로직</b>입니다 — 실제 서버의 매장 설정은
    <a href="${L.store}">설정 › 매장 설정</a>에서 따로 관리합니다.
  </div></div>

  <div class="sec">
    ${bar('thHold','보류 기준','점',0,100,'gold','이 점수 이상이면 자동 발송을 멈추고 승인 대기함으로 넘깁니다.')}
    ${bar('thRepeat','반복 이슈 기준','건',2,20,'blue','같은 주제 문의가 이 건수를 넘으면 묶어서 알립니다.')}
  </div>

  <div class="sec"><div class="note">
    현재 설정: <b id="thSummary">보류 ${d.settings.thHold}점 · 반복 ${d.settings.thRepeat}건</b>
  </div></div>

  <div class="sec">
    <div class="eyebrow">지금 적용된 규칙 ${CONFIG.rules.length}개</div>
    <div class="list">
      ${CONFIG.rules.map(r => `
        <div class="row">
          <span class="row-body"><span class="row-t1">${esc(r.label)}</span></span>
          <span class="chip ${r.tone}">${r.pts > 0 ? '+' : ''}${r.pts}</span>
        </div>`).join('')}
    </div>
    <div class="hint">규칙은 config.js 의 <code>rules</code> 에서 고칩니다.</div>
  </div>`;
}

function pageSetChannels() {
  const c = CONFIG.channels;
  return `
  <div class="sec"><div class="note blue">
    ${esc(c.hub.name)} <b>하나만 연결</b>하면 ${esc(c.hub.desc)}이 함께 들어옵니다.
    계정을 하나씩 연결하지 않아 넘겨야 하는 권한이 적습니다.
  </div></div>

  <div class="sec">
    <div class="eyebrow">허브</div>
    <div class="card" style="background:var(--soft-3);border-color:#d4dae6">
      <div style="display:flex;align-items:center;gap:11px">
        <div class="ico-box">${c.hub.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="row-t1"><span class="dot green"></span>${esc(c.hub.name)}</div>
          <div class="row-t2">${esc(c.hub.desc)}</div>
        </div>
        <span class="chip green">연결됨</span>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">붙는 기능</div>
    <div class="list">
      ${c.addons.map(a => `
        <div class="row">
          <span class="ico-box">${a.icon}</span>
          <span class="row-body">
            <span class="row-t1">${esc(a.name)}</span>
            <span class="row-t2">${esc(a.desc)}</span>
          </span>
          <span class="chip gray">${esc(a.stage)}</span>
        </div>`).join('')}
    </div>
  </div>`;
}

function pageTone() {
  const r = CONFIG.receipt, st = Store.load().settings;
  return `
  <div class="sec"><div class="note">
    손님에게 나가는 자동 메시지는 <b>접수 확인 하나뿐</b>입니다.
    AI가 손님과 대화하거나 달래지 않습니다. 실제 답은 담당자가 승인한 것만 나갑니다.
  </div></div>

  <div class="sec">
    <div class="eyebrow">접수 확인 문구</div>
    <div class="card">
      <div class="msg ai" style="margin-bottom:0">
        <div class="msg-av">${CONFIG.brand.mark}</div>
        <div class="bubble" style="max-width:100%">${r.message}</div>
      </div>
      <div class="row-t2" style="margin-top:10px">${esc(r.note)}</div>
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">응답 약속 시간</div>
    <div class="list">
      ${r.slaOptions.map((o, i) => `
        <div class="row">
          <span class="row-body"><span class="row-t1">${esc(o)}</span></span>
          ${i === 0 ? '<span class="chip solid">선택됨</span>' : '<span class="chev">›</span>'}
        </div>`).join('')}
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">말투</div>
    <div class="list">
      ${r.toneOptions.map(o => `
        <div class="row">
          <span class="row-body"><span class="row-t1">${esc(o)}</span></span>
          ${o === (st.tone || CONFIG.defaults.tone)
    ? '<span class="chip solid">선택됨</span>' : '<span class="chev">›</span>'}
        </div>`).join('')}
    </div>
    <div class="hint">통화 화면의 매장 설정에서도 바꿀 수 있습니다.</div>
  </div>`;
}

/* ============================================================
   매장 설정 — 실제 백엔드(테스트 콘솔) 스키마를 그대로 그린다.
   ============================================================ */
function storeFieldGet(section, path) {
  const d = Store.load();
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), d.store[section]);
}

function storeControl(f, section, parentPath) {
  const path = parentPath ? `${parentPath}.${f.key}` : f.path;
  const apiKey = f.key || f.path;
  const keyLabel = `<code>${esc(apiKey)}</code>`;

  const v = storeFieldGet(section, path);

  if (f.type === 'toggle') return `
    <div class="row">
      <span class="row-body"><span class="row-t1">${keyLabel}</span>${f.desc ? `<span class="row-t2">${esc(f.desc)}</span>` : ''}</span>
      <input class="sw" type="checkbox" id="sf-${section}-${path}" data-sec="${section}" data-path="${path}" data-type="toggle" ${v ? 'checked' : ''}>
      <label class="sw-ui" for="sf-${section}-${path}" aria-label="${esc(apiKey)}"></label>
    </div>`;

  if (f.type === 'number') return `
    <div class="row">
      <span class="row-body"><span class="row-t1">${keyLabel}</span>${f.desc ? `<span class="row-t2">${esc(f.desc)}</span>` : ''}</span>
      <input class="input" style="max-width:110px;text-align:right" type="number"
        data-sec="${section}" data-path="${path}" data-type="number"
        min="${f.min ?? ''}" max="${f.max ?? ''}" step="${f.step ?? 1}" value="${v ?? ''}">
      ${f.unit ? `<span class="row-t2" style="margin-left:6px">${esc(f.unit)}</span>` : ''}
    </div>`;

  if (f.type === 'select') return `
    <div class="row">
      <span class="row-body"><span class="row-t1">${keyLabel}</span>${f.desc ? `<span class="row-t2">${esc(f.desc)}</span>` : ''}</span>
      <select class="input select" style="max-width:140px" data-sec="${section}" data-path="${path}" data-type="select">
        ${f.options.map(o => `<option value="${esc(o.value)}" ${o.value === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
      </select>
    </div>`;

  if (f.type === 'text') return `
    <div class="card">
      <label class="label">${keyLabel}</label>
      <input class="input" data-sec="${section}" data-path="${path}" data-type="text"
        value="${esc(v ?? '')}" ${f.readonly ? 'readonly' : ''}>
      ${f.desc ? `<div class="hint">${esc(f.desc)}</div>` : ''}
    </div>`;

  if (f.type === 'textarea') {
    const text = f.lines ? (Array.isArray(v) ? v.join('\n') : '') : (v ?? '');
    return `
    <div class="card">
      <label class="label">${keyLabel}</label>
      <textarea class="textarea" data-sec="${section}" data-path="${path}" data-type="textarea" data-lines="${f.lines ? '1' : ''}"
        placeholder="${esc(f.placeholder || '')}">${esc(text)}</textarea>
      ${f.desc ? `<div class="hint">${esc(f.desc)}</div>` : ''}
    </div>`;
  }

  if (f.type === 'group') return `
    <div class="card">
      <div class="row-t1" style="margin-bottom:2px">${keyLabel}</div>
      ${f.desc ? `<div class="row-t2" style="margin-bottom:8px">${esc(f.desc)}</div>` : ''}
      <div class="list" style="margin-top:4px">
        ${f.children.map(c => storeControl(c, section, path)).join('')}
      </div>
    </div>`;

  return '';
}

function storeWeekly(f, section) {
  const days = CONFIG.storeSettings.days;
  const weekly = storeFieldGet(section, f.path) || {};
  return `
    <div class="card">
      <div class="row-t1" style="margin-bottom:2px"><code>${esc(f.path)}</code></div>
      ${f.desc ? `<div class="row-t2" style="margin-bottom:8px">${esc(f.desc)}</div>` : ''}
      <div class="list">
        ${days.map(dy => {
    const w = weekly[dy.key] || { open:null, close:null };
    const closed = !w.open && !w.close;
    return `
          <div class="row">
            <span class="row-body"><span class="row-t1">${esc(dy.label)}요일</span></span>
            <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--mute);margin-right:10px;cursor:pointer">
              <input type="checkbox" data-wk-closed="${dy.key}" data-sec="${section}" ${closed ? 'checked' : ''}> 휴무
            </label>
            <input type="time" class="input" style="max-width:110px" data-wk="${dy.key}" data-wk-part="open" data-sec="${section}"
              value="${w.open || ''}" ${closed ? 'disabled' : ''}>
            <span style="margin:0 4px">–</span>
            <input type="time" class="input" style="max-width:110px" data-wk="${dy.key}" data-wk-part="close" data-sec="${section}"
              value="${w.close || ''}" ${closed ? 'disabled' : ''}>
          </div>`;
  }).join('')}
      </div>
    </div>`;
}

function pageStore() {
  const sections = CONFIG.storeSettings.sections;
  const active = new URLSearchParams(location.search).get('s') || 'response';
  const sec = sections.find(s => s.id === active) || sections[0];
  const fields = CONFIG.storeSettings.fields[sec.id] || [];

  const rail = sections.map(s => s.ready
    ? `<a class="row" href="${L.store}?s=${s.id}" style="${s.id === sec.id ? 'background:var(--soft-2)' : ''}">
         <span class="ico-box">${s.icon}</span>
         <span class="row-body"><span class="row-t1">${esc(s.label)}</span><span class="row-t2">${esc(s.api)}</span></span>
         ${s.id === sec.id ? '<span class="chip solid">보는 중</span>' : '<span class="chev">›</span>'}
       </a>`
    : `<div class="row" style="opacity:.5">
         <span class="ico-box">${s.icon}</span>
         <span class="row-body"><span class="row-t1">${esc(s.label)}</span><span class="row-t2">${esc(s.api)}</span></span>
         <span class="chip gray">연동 예정</span>
       </div>`
  ).join('');

  const body = fields.map(f => f.type === 'weekly' ? storeWeekly(f, sec.id) : storeControl(f, sec.id)).join('');

  return `
  <div class="sec"><div class="note blue">
    <b>${esc(sec.label)}</b> ${sec.live ? '<span class="chip green">실제 반영</span>' : ''} — ${esc(sec.note || '')}<br>
    저장하면 다음 메시지(턴)부터 반영됩니다. 실제 서버 연동 전까지는 이 브라우저에만 저장됩니다.
  </div></div>

  <div class="sec">
    <div class="eyebrow">매장 설정</div>
    <div class="list">${rail}</div>
  </div>

  <div class="sec">
    <div class="eyebrow">${esc(sec.label)} <code style="font-weight:400">${esc(sec.api)}</code></div>
    ${body}
  </div>`;
}

/* ============================================================
   온보딩 — 처음 한 번만. 플랫폼 → 연결하기 → 사업장 정보 → 시작
   입력 중에는 render() 를 부르지 않는다 (포커스·한글 입력 유지).
   연결 키는 ob.creds 에 잠깐만 두고, 연결에 성공하면 바로 지운다.
   ============================================================ */
const OB_STEPS = ['플랫폼', '연결', '사업장', '시작'];
const OB = { PLATFORM: 0, CONNECT: 1, STORE: 2, CONFIRM: 3 };

const ob = {
  step: 0,
  platforms: [],              // 고른 플랫폼 id (고른 순서 유지)
  creds: {},                  // { platformId: { fieldKey: value } }
  conn: {},                   // { platformId: { state:'loading'|'ok'|'error', profile?, why? } }
  storeName: '', ownerName: '', bizNo: '',
  edited: {},                 // 사용자가 직접 고친 항목 — 연결 값으로 덮어쓰지 않는다
  src: {},                    // 항목별로 값을 가져온 플랫폼 id
  bizType: null,              // null 이면 플랫폼에서 추천한 값을 쓴다
  open: '10:00',
  close: '19:00'
};

function platformOf(id) { return CONFIG.platforms.find(p => p.id === id); }
function obConnected(id) { return (ob.conn[id] || {}).state === 'ok'; }

/* 업종 — 직접 고른 값이 우선, 없으면 첫 번째 플랫폼 유형에서 추천 */
function obBizId() {
  if (ob.bizType) return ob.bizType;
  const first = platformOf(ob.platforms[0]);
  return first ? CONFIG.platformKinds[first.kind].bizType : CONFIG.defaults.bizType;
}

/* 연결된 플랫폼에서 가져온 값을 사업장 폼에 미리 채운다. 직접 고친 항목은 건드리지 않는다. */
function obPrefill() {
  for (const f of CONFIG.profileFields) {
    if (ob.edited[f.key]) continue;
    ob[f.key] = ''; ob.src[f.key] = null;
    for (const id of ob.platforms) {
      const v = ((ob.conn[id] || {}).profile || {})[f.key];
      if (obConnected(id) && v) { ob[f.key] = f.key === 'bizNo' ? Biz.format(v) : v; ob.src[f.key] = id; break; }
    }
  }
}

function obStoreOk() {
  return !!ob.storeName.trim() && (!ob.bizNo || Biz.valid(ob.bizNo));
}

function obBizHint() {
  const n = Biz.digits(ob.bizNo).length;
  if (!n)        return { cls: '', text: '선택 입력이에요. 국세청 상태 조회는 서버 연동 후 붙고, 지금은 번호 형식만 확인해요.' };
  if (n < 10)    return { cls: '', text: '10자리를 입력해 주세요.' };
  return Biz.valid(ob.bizNo) ? { cls: 'ok', text: '형식이 올바른 번호예요.' }
    : { cls: 'bad', text: '번호가 올바르지 않아요. 다시 확인해 주세요.' };
}

/* ---------- 1단계: 플랫폼 ---------- */
function obPlatformStep() {
  const groups = Object.entries(CONFIG.platformKinds).map(([kind, k]) => `
    <div class="sec">
      <div class="eyebrow">${esc(k.label)}</div>
      <div class="ob-grid">
        ${CONFIG.platforms.filter(p => p.kind === kind).map(p => `
          <button type="button" class="ob-plat" data-ob-plat="${p.id}"
                  aria-pressed="${ob.platforms.includes(p.id)}">
            <span class="ob-plat-ico">${p.icon}</span>
            <span class="ob-plat-name">${esc(p.name)}</span>
          </button>`).join('')}
      </div>
    </div>`).join('');

  return `
    <h2 class="ob-t">어디서 장사하고 계세요?</h2>
    <p class="ob-d">고객 문의를 모아올 플랫폼을 골라 주세요. 여러 개 골라도 되고, 나중에 바꿀 수 있어요.</p>
    ${groups}
    <div class="ob-foot">
      <button type="button" class="btn block" data-ob="next">
        ${ob.platforms.length ? `${ob.platforms.length}개 선택 · 다음` : '다음'}
      </button>
      <button type="button" class="ob-skip" data-ob="finish">건너뛰고 바로 시작</button>
    </div>`;
}

/* ---------- 2단계: 연결하기 ---------- */
function obConnectCard(p) {
  const c = p.connect, st = ob.conn[p.id] || {};
  const isApi = c.method === 'api';
  const chip = st.state === 'ok' ? '<span class="chip green">연결됨</span>'
    : isApi ? '<span class="chip gray">연결 필요</span>'
      : '<span class="chip gray">직접 입력</span>';

  let body;
  if (!isApi) {
    body = `<div class="ob-got">${esc(c.note)}</div>`;
  } else if (st.state === 'ok') {
    const got = CONFIG.profileFields.filter(f => st.profile && st.profile[f.key]).map(f => f.label);
    body = `<div class="ob-got">${got.length ? `가져온 정보: <b>${got.map(esc).join(' · ')}</b>` : '가져올 수 있는 정보가 없었어요.'}
              <br>나머지는 다음 단계에서 직접 채워 주세요.</div>
            <button type="button" class="btn ghost sm" data-ob-disconnect="${p.id}">연결 끊기</button>`;
  } else {
    const loading = st.state === 'loading';
    body = `
      <div class="hint" style="margin:0 0 10px">${esc(c.help)}</div>
      ${c.fields.map(f => `
        <div class="field">
          <label class="label" for="obc-${p.id}-${f.key}">${esc(f.label)}</label>
          <input class="input" id="obc-${p.id}-${f.key}" data-ob-cred="${p.id}:${f.key}"
                 type="${f.secret ? 'password' : 'text'}" autocomplete="off" spellcheck="false"
                 value="${esc((ob.creds[p.id] || {})[f.key] || '')}" ${loading ? 'disabled' : ''}>
        </div>`).join('')}
      ${st.state === 'error' ? `<p class="ob-err" role="alert">${esc(st.why)}</p>` : ''}
      <button type="button" class="btn block" data-ob-connect="${p.id}" ${loading ? 'disabled' : ''}>
        ${loading ? '연결 중…' : '연결하기'}
      </button>`;
  }

  return `
    <div class="card ob-conn">
      <div class="ob-conn-h"><span class="ob-plat-ico">${p.icon}</span><div class="ob-conn-n">${esc(p.name)}</div>${chip}</div>
      <div class="ob-conn-b">${body}</div>
    </div>`;
}

function obConnectStep() {
  const plats = ob.platforms.map(platformOf).filter(Boolean);
  const n = plats.filter(p => obConnected(p.id)).length;
  return `
    <h2 class="ob-t">플랫폼을 연결해 주세요</h2>
    <p class="ob-d">연결하면 사업장 정보를 대신 채워 드려요. 지금 연결하지 않아도 다음으로 넘어갈 수 있어요.</p>
    ${plats.map(obConnectCard).join('')}
    <div class="ob-foot">
      <div class="btn-row">
        <button type="button" class="btn ghost" data-ob="prev">이전</button>
        <button type="button" class="btn" data-ob="next">${n ? `${n}개 연결됨 · 다음` : '연결 없이 다음'}</button>
      </div>
      <button type="button" class="ob-skip" data-ob="finish">건너뛰고 바로 시작</button>
    </div>`;
}

/* ---------- 3단계: 사업장 (항상 보여준다. 가져온 값은 확인만) ---------- */
function obLab(key, text, forId) {
  const src = ob.src[key] && platformOf(ob.src[key]);
  return `<div class="ob-lab"><label class="label" for="${forId}">${text}</label>
    ${src ? `<span class="chip green">${esc(src.name)}에서 가져옴</span>` : ''}</div>`;
}

function obStoreStep() {
  const suggested = !ob.bizType && ob.platforms.length;
  const pulled = Object.values(ob.src).some(Boolean);
  const bh = obBizHint();
  return `
    <h2 class="ob-t">사업장 정보를 확인해 주세요</h2>
    <p class="ob-d">${pulled ? '연결에서 가져온 값은 맞는지 확인만 해 주세요. 비어 있는 칸은 직접 입력해 주세요.'
    : '응대 문구와 현황 화면에 쓰여요. 매장명만 있어도 시작할 수 있어요.'}</p>
    <div class="card">
      <div class="field">
        ${obLab('storeName', '매장명 *', 'obStoreName')}
        <input class="input" id="obStoreName" autocomplete="off" placeholder="예: 모루 의류" value="${esc(ob.storeName)}">
      </div>
      <div class="field">
        ${obLab('ownerName', '사장님 성함', 'obOwner')}
        <input class="input" id="obOwner" autocomplete="off" placeholder="선택 입력" value="${esc(ob.ownerName)}">
      </div>
      <div class="field">
        ${obLab('bizNo', '사업자등록번호', 'obBizNo')}
        <input class="input" id="obBizNo" inputmode="numeric" autocomplete="off" placeholder="000-00-00000"
               value="${esc(ob.bizNo)}">
        <div class="hint ${bh.cls}" id="obBizHint">${bh.text}</div>
      </div>
      <div class="field">
        <label class="label" for="obBiz">업종</label>
        <select class="input select" id="obBiz">
          ${CONFIG.bizTypes.map(t => `<option value="${t.id}" ${t.id === obBizId() ? 'selected' : ''}>${t.icon} ${esc(t.label)}</option>`).join('')}
        </select>
        ${suggested ? '<div class="hint">고른 플랫폼에 맞춰 추천했어요. 다르면 바꿔 주세요.</div>' : ''}
      </div>
      <div class="field" style="margin-bottom:0">
        <label class="label">평일 영업시간</label>
        <div class="ob-time">
          <input class="input" type="time" id="obOpen" value="${ob.open}" aria-label="여는 시간">
          <span>~</span>
          <input class="input" type="time" id="obClose" value="${ob.close}" aria-label="닫는 시간">
        </div>
        <div class="hint">주말은 휴무로 시작해요. 요일별로 바꾸려면 설정에서 고치세요.</div>
      </div>
    </div>
    <div class="ob-foot">
      <div class="btn-row">
        <button type="button" class="btn ghost" data-ob="prev">이전</button>
        <button type="button" class="btn" data-ob="next" ${obStoreOk() ? '' : 'disabled'}>다음</button>
      </div>
      <button type="button" class="ob-skip" data-ob="finish">건너뛰고 바로 시작</button>
    </div>`;
}

/* ---------- 4단계: 확인 ---------- */
function obConfirmStep() {
  const biz = bizTypeOf(obBizId());
  const plats = ob.platforms.map(platformOf).filter(Boolean);
  const status = p => obConnected(p.id) ? '연결됨' : p.connect.method === 'api' ? '연결 안 함' : '직접 입력';
  return `
    <h2 class="ob-t">이대로 시작할까요?</h2>
    <p class="ob-d">${esc(ob.ownerName.trim() ? ob.ownerName.trim() + ' 사장님, ' : '')}준비가 끝났어요.</p>
    <div class="card">
      <div class="kv"><span class="kv-k">매장명</span><span class="kv-v">${esc(ob.storeName.trim() || CONFIG.brand.owner)}</span></div>
      ${ob.bizNo ? `<div class="kv"><span class="kv-k">사업자번호</span><span class="kv-v">${esc(ob.bizNo)}</span></div>` : ''}
      <div class="kv"><span class="kv-k">업종</span><span class="kv-v">${biz.icon} ${esc(biz.label)}</span></div>
      <div class="kv"><span class="kv-k">평일 영업</span><span class="kv-v">${esc(ob.open)} ~ ${esc(ob.close)}</span></div>
      <div class="kv"><span class="kv-k">플랫폼</span>
        <span class="kv-v">${plats.length ? plats.map(p => `${p.icon} ${esc(p.name)} · ${status(p)}`).join('<br>') : '선택 안 함'}</span></div>
    </div>
    <div class="ob-foot">
      <div class="btn-row">
        <button type="button" class="btn ghost" data-ob="prev">이전</button>
        <button type="button" class="btn" data-ob="finish">시작하기</button>
      </div>
    </div>`;
}

function pageOnboarding() {
  const b = CONFIG.brand;
  const body = [obPlatformStep, obConnectStep, obStoreStep, obConfirmStep][ob.step]();
  return `
  <div class="ob-wrap">
    <div class="ob-head">
      <div class="brand-mark">${b.mark}</div>
      <div><div class="ob-name">${esc(b.name)}</div><div class="ob-sub">${esc(b.owner)}</div></div>
    </div>
    <ol class="ob-steps" aria-label="진행 단계">
      ${OB_STEPS.map((t, i) => `
        <li class="${i === ob.step ? 'on' : i < ob.step ? 'done' : ''}">
          <i>${i < ob.step ? '✓' : i + 1}</i>${esc(t)}
        </li>`).join('')}
    </ol>
    ${body}
  </div>`;
}

function obGo(step) { ob.step = step; render(); window.scrollTo(0, 0); }

function obNext() {
  if (ob.step === OB.PLATFORM) return obGo(ob.platforms.length ? OB.CONNECT : OB.STORE);   // 고른 게 없으면 연결 단계 생략
  if (ob.step === OB.CONNECT) { obPrefill(); return obGo(OB.STORE); }
  obGo(Math.min(ob.step + 1, OB_STEPS.length - 1));
}
function obPrev() {
  if (ob.step === OB.STORE) return obGo(ob.platforms.length ? OB.CONNECT : OB.PLATFORM);
  obGo(Math.max(ob.step - 1, 0));
}

async function obConnect(id) {
  ob.conn[id] = { state: 'loading' }; render();
  const r = await Store.connectPlatform(id, ob.creds[id] || {});
  if (r.ok) { ob.conn[id] = { state: 'ok', profile: r.profile }; delete ob.creds[id]; }   // 키는 바로 버린다
  else ob.conn[id] = { state: 'error', why: r.why };
  render();
}

function obFinish() {
  Store.finishOnboarding({
    settings: {
      storeName: ob.storeName.trim(),
      ownerName: ob.ownerName.trim(),
      bizNo: Biz.valid(ob.bizNo) ? Biz.digits(ob.bizNo) : '',
      bizType: obBizId(),
      platforms: ob.platforms.map(id => ({ id, connected: obConnected(id) }))
    },
    hours: { open: ob.open, close: ob.close }
  });
  /* 저장이 막힌 브라우저(시크릿 모드 등)면 화면을 넘기지 않는다 */
  if (!Store.load().settings.onboarded) {
    alert('브라우저가 저장을 막고 있어요. 시크릿 모드라면 일반 창에서 열어 주세요.');
    return;
  }
  location.href = L.dashboard;
}

document.addEventListener('click', (e) => {
  const p = e.target.closest('[data-ob-plat]');
  if (p) {
    const id = p.dataset.obPlat;
    if (ob.platforms.includes(id)) { ob.platforms = ob.platforms.filter(x => x !== id); delete ob.conn[id]; delete ob.creds[id]; }
    else ob.platforms = [...ob.platforms, id];
    render();
    return;
  }
  const cn = e.target.closest('[data-ob-connect]');
  if (cn) { if (!cn.disabled) obConnect(cn.dataset.obConnect); return; }
  const dc = e.target.closest('[data-ob-disconnect]');
  if (dc) { delete ob.conn[dc.dataset.obDisconnect]; render(); return; }

  const a = e.target.closest('[data-ob]');
  if (!a || a.disabled) return;
  if (a.dataset.ob === 'next')   obNext();
  if (a.dataset.ob === 'prev')   obPrev();
  if (a.dataset.ob === 'finish') obFinish();
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.draft) Store.setDraft(t.dataset.draft, t.value);
  const syncNext = () => { const n = $('[data-ob="next"]'); if (n) n.disabled = !obStoreOk(); };
  if (t.dataset && t.dataset.obCred) {
    const [id, key] = t.dataset.obCred.split(':');
    (ob.creds[id] = ob.creds[id] || {})[key] = t.value;
  }
  if (t.id === 'obStoreName') { ob.storeName = t.value; ob.edited.storeName = true; syncNext(); }
  if (t.id === 'obOwner')     { ob.ownerName = t.value; ob.edited.ownerName = true; }
  if (t.id === 'obBizNo') {
    ob.bizNo = t.value; ob.edited.bizNo = true;
    const h = $('#obBizHint'), bh = obBizHint();
    if (h) { h.className = 'hint ' + bh.cls; h.textContent = bh.text; }
    syncNext();
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'obBizNo') { t.value = ob.bizNo = Biz.format(t.value); }   // 입력이 끝나면 000-00-00000 로 정리
  if (t.id === 'obBiz')   ob.bizType = t.value;
  if (t.id === 'obOpen')  ob.open = t.value || '10:00';
  if (t.id === 'obClose') ob.close = t.value || '19:00';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'obStoreName' && !e.isComposing) {
    e.preventDefault();
    const next = $('[data-ob="next"]');
    if (next && !next.disabled) next.click();
  }
});


/* ============================================================
   라우팅 & 네비게이션
   ============================================================ */
const PAGES = {
  dashboard:   pageDashboard,
  inquiries:   pageInquiries,
  channels:    pageChannels,
  customers:   pageCustomers,
  customer:    pageCustomer,
  demo:        pageDemo,
  onboarding:  pageOnboarding,
  settings:    pageSettings,
  threshold:   pageThreshold,
  setchannels: pageSetChannels,
  tone:        pageTone,
  storehouse: pageStorehouse,
  store:       pageStore

};

const MENU_OF = {
  dashboard:'dashboard', inquiries:'inquiries', channels:'channels',
  customers:'customers', customer:'customers',
  settings:'settings', threshold:'settings', setchannels:'settings', tone:'settings', store:'settings', storehouse: 'storehouse',
  demo:'demo'
};

function renderNav(active) {
  const d = Store.load();
  const held = Store.stats(d).held;
  const biz = bizTypeOf(d.settings.bizType);
  const storeName = d.settings.storeName || CONFIG.brand.owner;

  const side = $('#sidebar');
  if (side) side.innerHTML = `
    <div class="brand">
      <div class="brand-mark">${CONFIG.brand.mark}</div>
      <div class="brand-text">
        <div class="bt1">${esc(CONFIG.brand.name)}</div>
        <div class="bt2">${biz.icon} ${esc(biz.label)} · ${esc(storeName)}</div>
      </div>
    </div>
    <nav class="nav" aria-label="주요 메뉴">
      ${CONFIG.menu.map(m => `
        <a class="nav-item${m.id === active ? ' is-active' : ''}" href="${ROOT + m.path}">
          <span class="nav-ico">${m.icon}</span>
          <span class="nav-label">${esc(m.label)}</span>
          ${m.badge === 'held' && held ? `<span class="nav-count">${held}</span>` : ''}
        </a>`).join('')}
    </nav>
    <div class="side-foot"><div class="side-card">
      <div class="sc1">${esc(CONFIG.brand.name)} v${esc(CONFIG.brand.version)}</div>
      <div class="sc2">통화 화면에서 전화를 걸면 모든 화면에 함께 반영됩니다.</div>
    </div></div>`;

  const bar = $('#tabbar');
  if (bar) bar.innerHTML = CONFIG.menu.map(m => `
    <a class="tab${m.id === active ? ' is-active' : ''}" href="${ROOT + m.path}">
      ${m.badge === 'held' && held ? '<span class="pip"></span>' : ''}
      <span class="tab-ico">${m.icon}</span>${esc(m.label)}
    </a>`).join('');

  /* 상단 알림 뱃지 */
  const pip = $('.icon-btn .pip');
  if (pip) pip.style.display = held ? '' : 'none';
}

function render() {
  /* body[data-page]가 없으면 파일 경로로 어떤 페이지인지 자동 추론 */
  let key = document.body.dataset.page;

  /* 온보딩 전에는 어느 화면을 열어도 온보딩으로 보낸다 */
  const onboarded = Store.load().settings.onboarded;
  if (key === 'onboarding' && onboarded) { location.replace(L.dashboard); return; }
  if (key !== 'onboarding' && !onboarded) { location.replace(L.onboarding); return; }
  if (!key) {
    const p = location.pathname;
    if (p.includes('inquiries')) key = 'inquiries';
    else if (p.includes('settings/threshold')) key = 'threshold';
    else if (p.includes('settings/channels')) key = 'setchannels';
    else if (p.includes('settings/tone')) key = 'tone';
    else if (p.includes('settings/store')) key = 'store';
    else if (p.includes('settings/')) key = 'settings';
    else if (p.includes('channels')) key = 'channels';
    else if (p.includes('customer/detail')) key = 'customer';
    else if (p.includes('customer/')) key = 'customers';
    else if (p.includes('demo')) key = 'demo';
    else if (p.includes('storehouse')) key = 'storehouse';
    else key = 'dashboard';
  }

  /* #page가 없어도 .view 나 main 태그를 자동으로 찾아서 렌더링 */
  let host = $('#page') || $('.view') || $('main');
  if (!host && $('.main')) {
    host = document.createElement('main');
    host.className = 'view';
    host.id = 'page';
    $('.main').appendChild(host);
  }

  if (host && PAGES[key]) {
    try {
      host.innerHTML = PAGES[key]();
    } catch (err) {
      console.error('렌더링 에러 발생, 더미 데이터를 초기화합니다:', err);
      Store.reseed();
      host.innerHTML = PAGES[key]();
    }
  }
  renderNav(MENU_OF[key] || key);
  syncSettings();
}


/* ============================================================
   이벤트 핸들러 통합
   ============================================================ */
function storeFieldCoerce(type, el) {
  if (type === 'toggle') return el.checked;
  if (type === 'number') return el.value === '' ? null : Number(el.value);
  if (type === 'textarea' && el.dataset.lines) return el.value.split('\n').map(s => s.trim()).filter(Boolean);
  return el.value;
}

/* 1. 클릭 이벤트 */
document.addEventListener('click', async (e) => {
  /* 통화/채팅 탭 전환 */
  const tab = e.target.closest('[data-tab]');
  if (tab) { call.tab = tab.dataset.tab; render(); return; }

  /* 통화 시나리오 칩 */
  const sc = e.target.closest('[data-sc]');
  if (sc) { runScenario(sc.dataset.sc); return; }

  /* 전화 걸기 */
  if (e.target.closest('#dial')) {
    call.on = true; call.t0 = Date.now();
    call.turns = []; call.used = []; call.heat = 0; call.latency = []; call.card = null;
    pushTurn('ai', `안녕하세요, ${Store.load().settings.agent || CONFIG.defaults.agent}예요. 무엇을 도와드릴까요?`);
    render();
    clearInterval(call.timer);
    call.timer = setInterval(() => {
      const c = $('#clock'); if (c) c.textContent = mmss(callSecs());
    }, 1000);
    return;
  }

  /* 통화 종료 */
  if (e.target.closest('#hang')) { hangUp(); return; }

  /* 통화 중 텍스트로 말하기 */
  if (e.target.closest('#saySend')) {
    const sayEl = $('#say');
    const v = (sayEl?.value || '').trim();
    if (!v) return;
    pushTurn('cust', v);
    pushTurn('ai', '말씀 주신 내용 확인했어요. 사장님께 전달드릴게요.');
    if (Judge.score(v).value >= 35) call.heat = Math.min(100, call.heat + 20);
    render();
    const tape = $('#tape'); if (tape) tape.scrollTop = tape.scrollHeight;
    $('#say')?.focus();
    return;
  }

  /* 채팅 예시 문장 넣기 */
  const sm = e.target.closest('.sample');
  if (sm) {
    const inp = $('#inp');
    if (inp) { inp.value = SAMPLES[Number(sm.dataset.i)][1]; inp.focus(); }
    return;
  }

  /* 채팅 문의 넣기 */
  if (e.target.closest('#send')) {
    const inp = $('#inp');
    const t = (inp?.value || '').trim();
    if (!t) { inp?.focus(); return; }
    Store.add(t, $('#ch').value, $('#who').value);
    inp.value = '';
    render();
    $('#inp')?.focus();
    return;
  }

  /* 더미 데이터 다시 채우기 */
  if (e.target.closest('#reseed')) {
    if (confirm('지금 데이터를 지우고 더미 문의 18건으로 되돌릴까요?')) { Store.reseed(); render(); }
    return;
  }

  /* 전체 초기화 */
  if (e.target.closest('#reset')) {
    if (confirm('쌓인 문의를 모두 지우고 0에서 다시 시작할까요?')) { Store.reset(); render(); }
    return;
  }

  const report = e.target.closest('[data-act="report"]');
  if (report) {
    Store.setReported(report.dataset.id);
    render();
    return;
  }

  /* 승인 대기 처리 (무시하기 / 전달하기) */
  const a = e.target.closest('[data-act="handle"]');
  if (a) {
    const ta = $('#draft-' + a.dataset.id);
    const reply = ta ? ta.value.trim() : '';
    if (a.dataset.how === 'sent' && !reply) { alert('전달할 답변이 비어 있어요.'); return; }
    Store.setHandled(a.dataset.id, a.dataset.how, reply);
    render(); return;
  }

  /* AI 전화 데모에서 통화 가져오기 */
  if (e.target.closest('#pull')) {
    const btn = $('#pull'), msg = $('#pullMsg');
    const show = (html, tone) => {
      if (!msg) return;
      msg.style.display = 'block';
      msg.className = 'note' + (tone ? ' ' + tone : '');
      msg.innerHTML = html;
    };

    btn.disabled = true;
    btn.textContent = '가져오는 중…';
    show('전화 데모 서버에 연결하고 있습니다…');

    try {
      const { path, list } = await Phone.pull();
      let added = 0, dup = 0;
      for (const c of list) {
        if (Store.addCall(c).added) added++; else dup++;
      }
      render();
      const m = $('#pullMsg');
      if (m) {
        m.style.display = 'block';
        m.className = 'note';
        m.innerHTML = added
          ? `<b>통화 ${added}건을 가져왔습니다.</b> 현황·문의·고객 수치가 ${added}만큼 올라갔습니다.`
          + (dup ? ` 이미 가져온 ${dup}건은 건너뛰었습니다.` : '')
          : `새로 가져올 통화가 없습니다. (${esc(path)} · 중복 ${dup}건)`;
      }
    } catch (err) {
      const d = Store.load();
      show(`<b>통화를 가져오지 못했습니다.</b> ${esc(err.message || err)}<br><br>
        브라우저가 다른 주소의 서버를 막았을 수 있습니다(CORS). 데모 서버 응답에
        <code>Access-Control-Allow-Origin: *</code> 헤더를 넣으면 풀립니다.<br>
        현재 주소: <code>${esc(d.settings.apiUrl || '미설정')}</code> — 설정 화면에서 바꿀 수 있습니다.`, 'blue');
      btn.disabled = false;
      btn.textContent = '통화 가져오기';
    }
  }
});

/* 2. 값 변경 (change) 이벤트 */
document.addEventListener('change', (e) => {
  const t = e.target;

  /* 기본 설정 필드 */
  if (t.id === 'agent') { Store.setSetting('agent', t.value.trim() || CONFIG.defaults.agent); return; }
  if (t.id === 'tone')  { Store.setSetting('tone', t.value); return; }
  if (t.id === 'bizType')   { Store.setSetting('bizType', t.value); render(); return; }
  if (t.id === 'storeName') { Store.setSetting('storeName', t.value.trim()); render(); return; }

  /* 슬라이더 드래그 완료 시 네비게이션 배지 등 동기화 */
  if (t.matches('input[type=range][id^=th]')) {
    renderNav(MENU_OF[document.body.dataset.page] || document.body.dataset.page);
    syncSettings();
    return;
  }

  /* 매장 설정 (response / persona / hours) */
  const f = t.closest('[data-sec][data-path]');
  if (f) {
    Store.setStoreField(f.dataset.sec, f.dataset.path, storeFieldCoerce(f.dataset.type, f));
    return;
  }

  /* 영업시간 — 요일별 휴무 체크박스 */
  const wc = t.closest('[data-wk-closed]');
  if (wc) {
    const day = wc.dataset.wkClosed, sec = wc.dataset.sec;
    Store.setStoreField(sec, `weekly.${day}`, wc.checked ? { open:null, close:null } : { open:'10:00', close:'19:00' });
    render();
    return;
  }

  /* 영업시간 — 여는/닫는 시간 */
  const wt = t.closest('[data-wk]');
  if (wt) {
    const day = wt.dataset.wk, part = wt.dataset.wkPart, sec = wt.dataset.sec;
    Store.setStoreField(sec, `weekly.${day}.${part}`, wt.value || null);
    return;
  }
});

/* 3. 실시간 입력 (input) 이벤트 — 포커스를 잃지 않도록 전체 render()를 피한다 */
document.addEventListener('input', (e) => {
  const t = e.target;

  if (t.id === 'apiUrl') { Store.setSetting('apiUrl', t.value.trim()); return; }

  /* 임계값 슬라이더 (thHold, thRepeat, thHeat) */
  const r = t.closest('input[type=range][id^=th]');
  if (r) {
    Store.setSetting(r.id, Number(r.value));
    syncSettings();
    return;
  }

  /* 매장 설정 텍스트·숫자 실시간 저장 */
  const f = t.closest('[data-sec][data-path]');
  if (f && f.dataset.type !== 'toggle') {
    Store.setStoreField(f.dataset.sec, f.dataset.path, storeFieldCoerce(f.dataset.type, f));
  }
});

/* 4. 키보드 단축키 */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'say' && !e.isComposing) {
    e.preventDefault();
    $('#saySend')?.click();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && $('#inp')) {
    e.preventDefault();
    $('#send')?.click();
  }
});

/* 다른 탭에서 localStorage가 바뀌면 따라 그린다 */
window.addEventListener('storage', (e) => { if (e.key === Store.KEY) render(); });

document.addEventListener('DOMContentLoaded', render);
