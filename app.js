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
   문의 — 서버 요약 카드(사실관계·추천대응) + 승인/수정전송/보류/직접응대
   ============================================================ */
const inqHydrating = new Set();
const rawMsgsCache = {};

async function hydrateInquiries(items) {
  if (typeof Api === 'undefined' || !Api.token()) return;
  const targets = items.filter(it => it.server && !it.detail && !inqHydrating.has(it.id)).slice(0, 8);
  if (!targets.length) return;
  targets.forEach(it => inqHydrating.add(it.id));
  let updated = false;
  await Promise.all(targets.map(async it => {
    try {
      const detail = await Api.inquiryDetail(it.id);
      const d = Store.load();
      const target = d.items.find(x => x.id === it.id);
      if (target) {
        target.detail = detail;
        Store.save(d);
        updated = true;
      }
    } catch (e) { /* 무시 */ } finally {
      inqHydrating.delete(it.id);
    }
  }));
  const busy = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if (updated && !busy && document.body.dataset.page === 'inquiries') render();
}

function renderServerCardBlock(it) {
  const detail = it.detail;
  const card = detail && detail.card;
  if (!card) return `<div class="quote">${esc(Store.summary(it))}</div>`;
  const srcLabel = { order_data: '주문 데이터', customer_claim: '고객 주장' };
  const demands = (card.demands || []).length
    ? `<div style="margin-top:10px"><div class="eyebrow">고객 요구사항</div><div class="tags">${card.demands.map(x => `<span class="chip gray">${esc(x)}</span>`).join('')}</div></div>`
    : '';
  const facts = (card.facts || []).length
    ? `<div style="margin-top:10px"><div class="eyebrow">사실관계</div><div class="list">${card.facts.map(f => `
        <div class="row" style="padding:8px 11px">
          <span class="chip ${f.source === 'order_data' ? 'green' : 'gray'}">${srcLabel[f.source] || esc(f.source)}</span>
          <span class="row-body"><span class="row-t1" style="font-size:12px">${esc(f.text)}</span></span>
        </div>`).join('')}</div></div>`
    : '';
  const recs = (card.recommendations || []).length
    ? `<div style="margin-top:12px"><div class="eyebrow">AI 추천 대응안</div>${card.recommendations.map((r, idx) => `
        <div class="card" style="padding:11px;background:var(--soft-2);margin-top:6px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <b style="font-size:12.5px">${esc(r.label)}</b>
            ${r.policy_ref ? `<span class="chip blue">${esc(r.policy_ref)}</span>` : ''}
          </div>
          <div style="font-size:12px;color:var(--ink-2);line-height:1.55;margin-bottom:8px;white-space:pre-wrap">${esc(r.draft)}</div>
          <div class="btn-row">
            <button type="button" class="btn sm ghost" data-act="fill-rec" data-id="${it.id}" data-rec="${idx}">초안에 넣기</button>
            <button type="button" class="btn sm" data-act="approve" data-id="${it.id}" data-rec="${idx}">이 답변 바로 승인</button>
          </div>
        </div>`).join('')}</div>`
    : '';
  const risks = (card.risk_flags || []).length
    ? `<div class="tags" style="margin-top:8px">${card.risk_flags.map(f => `<span class="chip red">⚠ ${esc(f)}</span>`).join('')}</div>`
    : '';
  return `
    <div class="quote" style="font-weight:600">${esc(card.title)}</div>
    ${risks}${demands}${facts}${recs}`;
}

function pageInquiries() {
  const d = Store.load();
  const pending = d.items.filter(it => !it.handled);
  const handled = d.items.filter(it => it.handled);
  hydrateInquiries(pending);

  if (!d.items.length) {
    return `<div class="sec">${empty('📋', '처리할 문의가 없습니다',
      '시연 화면에서 문의를 넣으면 여기에 요약이 표시됩니다.')}
      <a class="btn block" href="${L.demo}" style="margin-top:10px">문의 넣어보기 ›</a></div>`;
  }

  const statusBadge = (it) => {
    if (it.serverStatus === 'manual') return '<span class="chip blue" style="margin-left:auto">직접 응대 중</span>';
    if (it.verdict === 'held') return `<span class="chip ${it.heatLabel === '매우 높음' ? 'red' : 'gold'}" style="margin-left:auto">${esc(it.heatLabel || '확인 필요')}</span>`;
    return '<span class="chip green" style="margin-left:auto">일반 문의</span>';
  };

  const pendingHtml = pending.length ? pending.map(it => {
    const rawMsgs = rawMsgsCache[it.id];
    return `
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px;flex-wrap:wrap">
        <span class="chip gray">${esc(it.channel)}</span>
        ${it.category ? `<span class="chip gray">${esc(it.category)}</span>` : ''}
        <span class="row-t2">${ago(it.ts)} · ${whoPlain(it.customer)}</span>
        ${statusBadge(it)}
      </div>

      <div class="eyebrow">요청 요약 카드</div>
      ${it.server ? renderServerCardBlock(it) : `<div class="quote">${esc(Store.summary(it))}</div>`}

      ${it.server ? `
        <div style="margin-top:10px">
          <button type="button" class="btn sm ghost" data-act="raw-msg" data-id="${it.id}">
            ${rawMsgs ? '대화 원문 접기' : '대화 원문 보기 (감사 로그 기록)'}
          </button>
          ${rawMsgs ? `<div class="card" style="margin-top:8px;background:var(--soft-2);padding:10px">
            ${rawMsgs.map(m => `<div style="font-size:12px;margin-bottom:6px">
              <b>${m.sender === 'customer' ? '👤 고객' : m.sender === 'owner' ? '👑 사장님' : '🛡 AI'}</b>: ${esc(m.text)}
            </div>`).join('') || '<div class="row-t2">메시지가 없습니다.</div>'}
          </div>` : ''}
        </div>` : ''}

      <div style="margin-top:12px">
        <label class="eyebrow" for="draft-${it.id}">사장님 답변</label>
        <textarea class="textarea" id="draft-${it.id}" data-draft="${it.id}" rows="4"
          placeholder="고객에게 전달할 답변을 직접 입력하거나 위 추천안을 불러오세요">${esc(it.draft || '')}</textarea>
      </div>

      <div class="btn-row" style="margin-top:13px;flex-wrap:wrap">
        <button class="btn danger" data-act="handle" data-id="${it.id}" data-how="ignored">종료(무시)</button>
        ${it.server ? `<button class="btn ghost" data-act="handle" data-id="${it.id}" data-how="manual">직접 응대(AI 끔)</button>` : ''}
        <button class="btn" data-act="handle" data-id="${it.id}" data-how="sent">답변 저장 및 전송</button>
      </div>
    </div>`;
  }).join('')
    : empty('✓', '처리할 문의가 없습니다', '새 문의가 들어오면 이곳에 표시됩니다.');

  const handledLabel = (it) => {
    if (it.handled === 'auto') return 'AI 자동 응대 완료';
    if (it.handled === 'sent') return '사장님 답변 완료';
    if (it.handled === 'manual') return '직접 응대 전환';
    return '처리하지 않음';
  };

  const handledHtml = handled.length ? `<div class="list">${handled.map(it => `
    <div class="row">
      <span class="dot ${it.handled === 'ignored' ? 'gold' : 'green'}"></span>
      <span class="row-body">
        <span class="row-t1">${who(it.customer)} · <span class="chip ${it.handled === 'auto' ? 'blue' : it.handled === 'ignored' ? 'gray' : 'green'}">${handledLabel(it)}</span></span>
        <span class="row-t2">${esc(Store.summary(it))} · ${esc(it.channel)} · ${ago(it.ts)}</span>
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

/* 통화·채팅 시연 상태 — 저장하지 않는다 */
const call = {
  on: false, callId: null, t0: 0, turns: [], used: [], heat: 0, tab: 'phone',
  latency: [], timer: null, card: null, busy: false, streaming: false, streamText: '',
  micOn: false, muted: false, ttsActive: false, error: '',
  chatId: 'demo-' + Math.random().toString(36).slice(2, 8),
  chatTurns: [], chatBusy: false, chatEnded: false, chatCard: null
};

const demoAudio = { queue: [], playing: false, audio: null, recog: null };

function callSecs() { return call.on ? Math.floor((Date.now() - call.t0) / 1000) : 0; }
function mmss(s) { return String(Math.floor(s / 60)).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0'); }

function p50(a) {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  return b[Math.floor(b.length / 2)];
}

function demoHeatThreshold() {
  const d = Store.load();
  const srv = d.store && d.store.response && d.store.response.heat_threshold;
  return typeof srv === 'number' ? srv : (d.settings.thHeat ?? CONFIG.defaults.thHeat);
}

function heatLabel(h) {
  const th = demoHeatThreshold();
  if (h >= th + 25) return { t:'매우 높음', tone:'red' };
  if (h >= th)      return { t:'높음',      tone:'red' };
  if (h >= th / 2)  return { t:'보통',      tone:'gold' };
  return { t:'낮음', tone:'green' };
}

function stopTts() {
  demoAudio.queue = [];
  demoAudio.playing = false;
  call.ttsActive = false;
  if (demoAudio.audio) {
    try { demoAudio.audio.pause(); demoAudio.audio.currentTime = 0; } catch {}
    demoAudio.audio = null;
  }
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
}

function playTts(text) {
  if (!text || call.muted) return;
  demoAudio.queue.push(text);
  if (!demoAudio.playing) drainTtsQueue();
}

async function drainTtsQueue() {
  if (demoAudio.playing || !demoAudio.queue.length || call.muted) {
    call.ttsActive = false;
    return;
  }
  demoAudio.playing = true;
  call.ttsActive = true;
  const text = demoAudio.queue.shift();
  const next = () => { demoAudio.playing = false; drainTtsQueue(); };

  if (Api.token()) {
    try {
      const r = await Api.tts(text);
      if (r && r.url && !call.muted) {
        const audio = new Audio(Api.BASE + r.url);
        demoAudio.audio = audio;
        audio.onended = () => { demoAudio.audio = null; next(); };
        audio.onerror = () => { demoAudio.audio = null; speakBrowser(text, next); };
        await audio.play();
        return;
      }
    } catch {
      // browser fallback when /tts is disabled or offline
    }
  }
  speakBrowser(text, next);
}

function speakBrowser(text, done) {
  if (call.muted || !window.SpeechSynthesisUtterance || !window.speechSynthesis) {
    done();
    return;
  }
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 1.05;
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  } catch {
    done();
  }
}

function stopMic() {
  call.micOn = false;
  if (demoAudio.recog) {
    try { demoAudio.recog.onend = null; demoAudio.recog.stop(); } catch {}
    demoAudio.recog = null;
  }
}

function toggleMic() {
  if (!call.on) return;
  if (call.micOn) { stopMic(); render(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast('이 브라우저는 음성 인식을 지원하지 않습니다. 아래 입력창을 이용해 주세요.');
    return;
  }
  const recog = new SR();
  recog.lang = 'ko-KR';
  recog.interimResults = true;
  recog.continuous = true;
  recog.onresult = ev => {
    let finalTxt = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) finalTxt += ev.results[i][0].transcript;
    }
    const clean = finalTxt.trim();
    if (clean) {
      stopTts();
      sendVoiceTurn(clean);
    }
  };
  recog.onerror = () => { call.micOn = false; render(); };
  recog.onend = () => {
    if (call.micOn && call.on) {
      try { recog.start(); } catch { call.micOn = false; render(); }
    }
  };
  demoAudio.recog = recog;
  call.micOn = true;
  try { recog.start(); } catch { call.micOn = false; toast('마이크를 시작할 수 없습니다.'); }
  render();
}

/* ---------- 왼쪽: 고객 ---------- */
function paneCall() {
  const tapeItems = call.turns.map(t => `
    <div class="msg ${t[0] === 'cust' ? 'them' : 'ai'}">
      <div class="msg-av">${t[0] === 'cust' ? '👤' : '🛡'}</div>
      <div class="bubble">${esc(t[1])}</div>
    </div>`).join('')
    + (call.streaming ? `
      <div class="msg ai">
        <div class="msg-av">🛡</div>
        <div class="bubble">${esc(call.streamText || '답변 생성 중…')}</div>
      </div>` : '');

  const tape = tapeItems || `<div class="ph">${call.on
    ? '마이크를 켜거나 상황 버튼/입력창으로 고객이 말하게 해보세요.'
    : '전화 걸기를 누르면 실제 AI 통화가 시작됩니다.'}</div>`;

  const chips = SCENARIOS.map(sc => `
    <button data-sc="${sc.id}" class="${sc.heat >= 40 ? 'hot' : ''}"
      ${call.on && !call.busy ? '' : 'disabled'}>${esc(sc.label)}</button>`).join('');

  const chatTape = call.chatTurns.length
    ? call.chatTurns.map(m => `
      <div class="msg ${m.role === 'customer' ? 'them' : 'ai'}">
        <div class="msg-av">${m.role === 'customer' ? '👤' : '🛡'}</div>
        <div class="bubble">${esc(m.text)}${m.meta ? `<div class="row-t2" style="margin-top:4px;font-size:11px">${esc(m.meta)}</div>` : ''}</div>
      </div>`).join('')
    : `<div class="ph">채널톡 고객 메시지를 보내면 AI 방패가 즉시 응대·판정합니다.</div>`;

  return `
  <div class="card">
    <div class="seg">
      <button data-tab="phone" aria-selected="${call.tab === 'phone'}">📞 전화</button>
      <button data-tab="chat"  aria-selected="${call.tab === 'chat'}">💬 채널톡 채팅</button>
    </div>

    ${call.tab === 'phone' ? `
      <div class="call-head">
        <span class="ttl">고객 통화</span>
        <span class="chip ${call.on ? 'red' : 'gray'}">${call.on ? (call.busy ? 'AI 응답 중' : '통화 중') : '대기'}</span>
        ${call.on ? `
          <button type="button" class="btn sm ghost" id="micBtn">${call.micOn ? '🎙 마이크 끄기' : '🎙 마이크'}</button>
          <button type="button" class="btn sm ghost" id="muteBtn">${call.muted ? '🔇 음소거 해제' : '🔊 소리'}</button>
        ` : ''}
        <span class="call-time" id="clock">${mmss(callSecs())}</span>
      </div>

      ${call.error ? `<div class="notice err" style="margin-bottom:8px">${esc(call.error)}</div>` : ''}

      <div class="tape" id="tape">${tape}</div>

      <div class="chips-row">${chips}</div>

      <div class="send-row">
        <input class="input" id="say" placeholder="말 대신 입력해도 됩니다"
               ${call.on && !call.busy ? '' : 'disabled'}>
        <button class="btn" id="saySend" ${call.on && !call.busy ? '' : 'disabled'}>보내기</button>
      </div>

      ${call.on
    ? `<button class="btn block btn-hang" id="hang" ${call.busy ? 'disabled' : ''}>통화 종료 · 요약 카드 보내기</button>`
    : `<button class="btn block btn-call" id="dial">${call.busy ? '연결 중…' : '📞 전화 걸기'}</button>`}
    ` : `
      <div class="call-head">
        <span class="ttl">채널톡 채팅</span>
        <span class="chip ${call.chatEnded ? 'gray' : 'green'}">${call.chatEnded ? '종료됨' : '연결됨'}</span>
        <button type="button" class="btn sm ghost" id="chatNew" style="margin-left:auto">새 대화</button>
      </div>
      <div class="tape" id="chatTape" style="height:240px">${chatTape}</div>
      <textarea class="textarea" id="inp" rows="2" style="margin-top:8px"
        placeholder="고객이 보낸 메시지를 입력하면 AI가 응대하고 보류 여부를 판정합니다."></textarea>
      <div class="demo-row">
        <input class="input" id="who" placeholder="고객 이름 (선택)" style="flex:1">
        <select class="input select" id="ch" aria-label="채널">
          ${CONFIG.channels.options.filter(c => c !== '전화').map(c => `<option>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn" id="send" style="flex:1" ${call.chatBusy ? 'disabled' : ''}>${call.chatBusy ? '처리 중…' : '보내기 · 방패 판정'}</button>
        ${Api.token() && call.chatTurns.length && !call.chatEnded
          ? `<button class="btn ghost" id="chatEnd" ${call.chatBusy ? 'disabled' : ''}>대화 종료 · 요약</button>` : ''}
      </div>
      <div class="eyebrow" style="margin-top:14px">예시 문장</div>
      <div class="tags">${SAMPLES.map(([n], i) =>
    `<button class="tag-ui sample" data-i="${i}">${esc(n)}</button>`).join('')}</div>
    `}
  </div>`;
}

/* ---------- 오른쪽: 사장님 화면 ---------- */
function paneOwner() {
  const d = Store.load();
  const st = d.settings;
  const storePersona = (d.store && d.store.persona) || {};
  const storeResp = (d.store && d.store.response) || {};
  const agentVal = storePersona.agent_name || st.agent || CONFIG.defaults.agent;
  const formalityVal = storePersona.formality || 'polite';
  const heatVal = typeof storeResp.heat_threshold === 'number' ? storeResp.heat_threshold : (st.thHeat ?? CONFIG.defaults.thHeat);
  const lat = p50(call.latency);

  const activeCard = call.tab === 'chat' ? (call.chatCard || call.card) : call.card;
  const card = activeCard ? (() => {
    const c = activeCard, hl = heatLabel(c.heat || 0);
    const hasVerdict = c.verdict != null;
    const m = hasVerdict ? Judge.meta(c.verdict) : { label: c.statusLabel || '요약 완료', tone: 'blue' };
    const factsHtml = (c.facts || []).map(f =>
      `<div class="kv"><span class="kv-k">${esc(f.k)}</span><span class="kv-v">${esc(f.v)}</span></div>`).join('');
    const demandsHtml = (c.demands && c.demands.length)
      ? `<div class="kv"><span class="kv-k">요구</span><span class="kv-v">${esc(c.demands.join(', '))}</span></div>` : '';
    const flagsHtml = (c.risk_flags && c.risk_flags.length)
      ? `<div class="tags" style="margin-top:8px">${c.risk_flags.map(fl => `<span class="chip red">${esc(fl)}</span>`).join('')}</div>` : '';
    return `
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px">
        <span class="chip gray">${c.channelLabel || '📞 통화'}</span>
        <span class="row-t2">${whoPlain(c.who)} · ${c.secs != null ? mmss(c.secs) : (c.turns + '턴')}</span>
        <span class="chip ${m.tone}" style="margin-left:auto">${m.label}${c.score != null ? ` · ${c.score}점` : ''}</span>
      </div>
      <div class="eyebrow">📋 요약 카드</div>
      <div class="kv"><span class="kv-k">요청</span><span class="kv-v">${esc(c.ask)}</span></div>
      ${demandsHtml}
      ${factsHtml}
      <div class="kv"><span class="kv-k">감정</span><span class="kv-v">${hl.t} (격앙 ${c.heat ?? 0})</span></div>
      ${c.threat ? `<div class="kv"><span class="kv-k">위협</span><span class="kv-v">${esc(c.threat)}</span></div>` : ''}
      <div class="kv"><span class="kv-k">턴 수</span><span class="kv-v">${c.turns}턴</span></div>
      <div style="margin-top:12px">
        <div class="eyebrow">🤖 추천 대응</div>
        <div class="note">${esc(c.advice)}</div>
      </div>
      ${flagsHtml}
      ${c.hits && c.hits.length ? `<div style="margin-top:11px">${hitChips(c.hits)}</div>` : ''}
      <a class="btn block" href="${L.inquiries}" style="margin-top:12px">수신함에서 보기 ›</a>
    </div>`;
  })() : `<div class="drop">${call.tab === 'chat'
    ? '대화가 끝나거나 보류되면 요약 카드가 여기에 나타납니다.'
    : '통화가 끝나면 요약 카드가 여기에 나타납니다.<br>통화 중에는 사장님이 아무것도 보지 않아도 됩니다.'}</div>`;

  const formalityOpts = (CONFIG.storeSettings.fields.persona.find(f => f.k === 'formality') || {}).opts || [
    ['formal', '격식체'], ['polite', '공손한 해요체'], ['casual', '친근한 반말·응대']
  ];

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
          <div class="mv">${call.tab === 'chat' ? call.chatTurns.length : call.turns.length}</div></div>
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
            <input class="input" id="agent" value="${esc(agentVal)}">
          </div>
          <div>
            <label class="label" for="tone">말투</label>
            <select class="input select" id="tone">
              ${formalityOpts.map(([k, lb]) =>
    `<option value="${esc(k)}" ${formalityVal === k ? 'selected' : ''}>${esc(lb)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-top:12px">
          <div class="th-label">격앙 기준 <b id="vHeat">${heatVal}</b></div>
          <input class="range gold" type="range" id="thHeat" min="0" max="100" value="${heatVal}">
          <div class="hint">이 값을 넘으면 통화를 격앙 상태로 보고 요약 카드에 위협 항목을 남깁니다.</div>
        </div>
      </div>
    </div>
  </div>`;
}

function pageDemo() {
  return `<div class="demo-grid">${paneCall()}${paneOwner()}</div>`;
}

/* ---------- 통화·채팅 동작 ---------- */
function pushTurn(who, text) {
  call.turns.push([who, text]);
  if (who === 'ai') call.latency.push(180 + Math.floor(Math.random() * 420));
}

function scrollTape() {
  const tape = $('#tape');
  if (tape) tape.scrollTop = tape.scrollHeight;
  const ct = $('#chatTape');
  if (ct) ct.scrollTop = ct.scrollHeight;
}

async function dialCall() {
  if (call.on || call.busy) return;
  stopTts();
  call.busy = true;
  call.error = '';
  call.turns = [];
  call.used = [];
  call.heat = 0;
  call.latency = [];
  call.card = null;
  call.callId = null;
  call.streaming = false;
  call.streamText = '';
  render();

  if (Api.token()) {
    try {
      const r = await Api.startCall();
      call.callId = r.call_id;
      call.on = true;
      call.t0 = Date.now();
      call.busy = false;
      call.timer = setInterval(() => { const el = $('#clock'); if (el) el.textContent = mmss(callSecs()); }, 500);
      if (r.greeting_text) {
        call.turns.push(['ai', r.greeting_text]);
        playTts(r.greeting_text);
      }
      render();
      scrollTape();
      return;
    } catch (e) {
      call.error = '서버 통화 연결 실패 (' + (e.message || '오류') + ') · 로컬 시연으로 전환합니다.';
    }
  }

  call.on = true;
  call.t0 = Date.now();
  call.busy = false;
  call.turns = [['ai', '안녕하세요, 무엇을 도와드릴까요?']];
  call.timer = setInterval(() => { const el = $('#clock'); if (el) el.textContent = mmss(callSecs()); }, 500);
  render();
  scrollTape();
}

async function readCallTurnSse(callId, text, handlers) {
  let doneCalled = false;
  try {
    const res = await Api.callTurnStream(callId, text);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = (errJson.error && errJson.error.message) || errJson.message || `HTTP ${res.status}`;
      handlers.onError(msg);
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const blocks = buf.split(/\r?\n\r?\n/);
      buf = blocks.pop() || '';
      for (const blk of blocks) {
        let ev = 'message', dataStr = '';
        for (const ln of blk.split(/\r?\n/)) {
          if (ln.startsWith('event:')) ev = ln.slice(6).trim();
          else if (ln.startsWith('data:')) dataStr += ln.slice(5).trim();
        }
        if (!dataStr) continue;
        let payload = {};
        try { payload = JSON.parse(dataStr); } catch { payload = { text: dataStr }; }
        if (ev === 'state') handlers.onState && handlers.onState(payload);
        else if (ev === 'sentence') handlers.onSentence && handlers.onSentence(payload.text ?? payload.sentence ?? '');
        else if (ev === 'metrics') handlers.onMetrics && handlers.onMetrics(payload);
        else if (ev === 'done') { doneCalled = true; handlers.onDone && handlers.onDone(payload); }
        else if (ev === 'error') { doneCalled = true; handlers.onError && handlers.onError(payload.message || payload.error || '스트림 오류'); }
      }
    }
    if (!doneCalled) handlers.onDone && handlers.onDone({});
  } catch (err) {
    if (!doneCalled) handlers.onError((err && err.message) || '연결 오류');
  }
}

async function sendVoiceTurn(text, scId) {
  const clean = (text || '').trim();
  if (!clean || !call.on || call.busy) return;
  stopTts();
  if (scId && !call.used.includes(scId)) call.used.push(scId);
  call.error = '';

  if (Api.token() && call.callId) {
    call.turns.push(['cust', clean]);
    call.busy = true;
    call.streaming = true;
    call.streamText = '';
    render();
    scrollTape();
    const tStart = performance.now();
    let gotFirst = false;

    await readCallTurnSse(call.callId, clean, {
      onState() {},
      onSentence(s) {
        if (!s) return;
        if (!gotFirst) {
          gotFirst = true;
          call.latency.push(Math.round(performance.now() - tStart));
        }
        call.streamText += (call.streamText ? ' ' : '') + s;
        playTts(s);
        render();
        scrollTape();
      },
      onMetrics(m) {
        if (m && typeof m.first_sentence_ms === 'number' && !gotFirst) {
          gotFirst = true;
          call.latency.push(Math.round(m.first_sentence_ms));
        }
        if (m && typeof m.heat_score === 'number') call.heat = m.heat_score;
        else if (m && typeof m.heat === 'number') call.heat = m.heat;
      },
      onDone(d) {
        const reply = (d && (d.full_reply || d.reply)) || call.streamText || '말씀 감사합니다. 확인해 드리겠습니다.';
        if (d && typeof d.heat_score === 'number') call.heat = d.heat_score;
        else if (d && typeof d.heat === 'number') call.heat = d.heat;
        call.streaming = false;
        call.streamText = '';
        call.busy = false;
        call.turns.push(['ai', reply]);
        if (!gotFirst) call.latency.push(Math.round(performance.now() - tStart));
        render();
        scrollTape();
      },
      onError(msg) {
        call.streaming = false;
        call.streamText = '';
        call.busy = false;
        call.error = msg || '응답 중 오류가 발생했습니다.';
        render();
      }
    });
    return;
  }

  // 오프라인 / 미로그인 fallback
  pushTurn('cust', clean);
  const j = Judge.score(clean, demoHeatThreshold());
  call.heat = Math.min(100, Math.max(call.heat, j.score));
  pushTurn('ai', j.verdict === 'held'
    ? '말씀하신 내용 확인했습니다. 담당 사장님께 바로 전달해 드리겠습니다.'
    : '문의 주신 내용 확인했습니다. 순서대로 안내해 드리겠습니다.');
  render();
  scrollTape();
}

function runScenario(id) {
  const sc = SCENARIOS.find(x => x.id === id);
  if (!sc || !call.on || call.busy) return;
  if (Api.token() && call.callId && sc.say) {
    sendVoiceTurn(sc.say, sc.id);
    return;
  }
  sc.turns.forEach(([w, t]) => pushTurn(w, t));
  call.heat = Math.min(100, call.heat + sc.heat);
  if (!call.used.includes(sc.id)) call.used.push(sc.id);
  render();
  scrollTape();
}

function buildServerSummaryCard(detail, fallbackWho, secs, turnsCount, channelLabel) {
  const card = (detail && (detail.card || (detail.inquiry && detail.inquiry.card))) || null;
  const inq = (detail && detail.inquiry) || detail || {};
  const rawScore = (inq.heat && inq.heat.score) ?? inq.score ?? call.heat;
  const isHeld = inq.status === 'pending' || inq.status === 'manual' || inq.route === 'B' || inq.route === 'C';
  const recs = (card && card.recommendations) || [];
  const facts = [];
  if (card && card.facts) {
    if (card.facts.order_data) facts.push({ k: '주문 정보', v: card.facts.order_data });
    if (card.facts.customer_claim) facts.push({ k: '고객 주장', v: card.facts.customer_claim });
  }
  return {
    who: inq.customer_name || fallbackWho || '고객',
    secs,
    ask: (card && card.summary) || inq.title || inq.summary || '통화 요약 완료',
    demands: (card && card.demands) || [],
    facts,
    threat: (card && card.risk_flags && card.risk_flags.join(', ')) || '',
    advice: recs.length ? recs.map(r => r.label + ': ' + r.draft).join(' / ') : (inq.reply || '요약이 완료되었습니다.'),
    risk_flags: (card && card.risk_flags) || [],
    heat: rawScore,
    turns: turnsCount,
    score: rawScore,
    verdict: isHeld ? 'held' : 'pass',
    hits: (inq.heat && inq.heat.reasons) || [],
    channelLabel: channelLabel || '📞 통화'
  };
}

async function hangUp() {
  const secs = callSecs();
  stopTts();
  stopMic();
  clearInterval(call.timer);
  call.timer = null;

  if (Api.token() && call.callId) {
    const cid = call.callId;
    call.busy = true;
    call.on = false;
    render();
    try {
      await Api.endCall(cid);
      let detail = null;
      for (let i = 0; i < 8; i++) {
        detail = await Api.getCall(cid);
        if (detail && (detail.card || detail.status === 'done' || detail.status === 'ended')) break;
        await new Promise(r => setTimeout(r, 700));
      }
      call.card = buildServerSummaryCard(detail, '전화 고객', secs, call.turns.length, '📞 통화');
      await Store.pullServer().catch(() => {});
    } catch (e) {
      call.error = '통화 요약 조회 실패: ' + (e.message || '오류');
    }
    call.busy = false;
    render();
    return;
  }

  const said = call.turns.filter(t => t[0] === 'cust').map(t => t[1]).join(' ');
  const names = CONFIG.callerNames;
  const caller = names[Math.floor(Math.random() * names.length)];
  const used = SCENARIOS.filter(s => call.used.includes(s.id));
  const ask = used.map(s => s.ask).join(' / ') || '일반 문의';
  const adv = CONFIG.advice.find(a => a.when && call.used.includes(a.when))
    || CONFIG.advice.find(a => a.when === null)
    || { text: '정상 문의입니다. 일반 응대로 충분합니다.', threat: '없음' };
  const added = Store.add(said || '통화 문의', '전화', caller);
  const it = added.items[0];
  call.card = {
    who: caller, secs, ask,
    threat: adv.threat, advice: adv.text,
    heat: call.heat, turns: call.turns.length,
    score: it.score, verdict: it.verdict, hits: it.hits,
    channelLabel: '📞 통화'
  };
  call.on = false;
  render();
}

async function sendDemoChat() {
  const ta = $('#inp');
  const txt = ta && ta.value.trim();
  if (!txt || call.chatBusy) return;
  const who = ($('#who') && $('#who').value.trim()) || '고객';
  const ch = ($('#ch') && $('#ch').value) || '네이버';

  if (Api.token()) {
    call.chatBusy = true;
    call.chatTurns.push({ role: 'customer', text: txt });
    ta.value = '';
    render();
    scrollTape();
    const t0 = performance.now();
    try {
      const r = await Api.sendChatMessage(call.chatId, txt, who);
      call.latency.push(Math.round(performance.now() - t0));
      const route = r.route || 'A';
      const heat = (r.heat && r.heat.score) ?? r.heat_score ?? call.heat;
      call.heat = heat;
      const meta = `경로 ${route} · 격앙 ${heat}점${r.status ? ' · ' + r.status : ''}`;
      if (r.reply) call.chatTurns.push({ role: 'ai', text: r.reply, meta });
      else call.chatTurns.push({ role: 'ai', text: '담당자 확인을 위해 보류되었습니다.', meta });
      if (r.card || r.inquiry) {
        call.chatCard = buildServerSummaryCard(r, who, null, call.chatTurns.length, '💬 채널톡');
      }
      await Store.pullServer().catch(() => {});
    } catch (e) {
      toast('채팅 전송 실패: ' + (e.message || '오류'));
    }
    call.chatBusy = false;
    render();
    scrollTape();
    return;
  }

  const r = Store.add(txt, ch, who === '고객' ? '' : who);
  call.chatTurns.push({ role: 'customer', text: txt });
  const it = r.items[0];
  call.heat = it.score;
  call.chatTurns.push({
    role: 'ai',
    text: it.verdict === 'held' ? '사장님 확인 대기(보류)로 분류되었습니다.' : '자동 응대 가능으로 분류되었습니다.',
    meta: `${it.score}점 · ${Judge.meta(it.verdict).label}`
  });
  ta.value = '';
  toast(`${it.score}점 · ${Judge.meta(it.verdict).label}`);
  render();
  scrollTape();
}

async function endDemoChat() {
  if (!Api.token() || call.chatBusy || call.chatEnded) return;
  call.chatBusy = true;
  render();
  try {
    const r = await Api.endChat(call.chatId);
    call.chatEnded = true;
    const detail = await Api.getChat(call.chatId).catch(() => r);
    call.chatCard = buildServerSummaryCard(detail || r, ($('#who') && $('#who').value.trim()) || '채널톡 고객', null, call.chatTurns.length, '💬 채널톡');
    await Store.pullServer().catch(() => {});
    toast('대화를 종료하고 요약 카드를 생성했습니다.');
  } catch (e) {
    toast('대화 종료 실패: ' + (e.message || '오류'));
  }
  call.chatBusy = false;
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
        <div class="row-t2">${biz.icon} ${esc(biz.label)} · ${esc(d.settings.email || b.email)}</div>
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
    <button class="btn ghost block" data-auth="logout" style="margin-top:12px">로그아웃</button>
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

const chState = {
  loaded: false, loading: false,
  commerce: [], ig: null, orders: [],
  creds: {}, busy: {}
};

async function hydrateChannels(force = false) {
  if (!Api.token() || chState.loading || (chState.loaded && !force)) return;
  chState.loading = true;
  try {
    const [cc, ig, ord] = await Promise.allSettled([
      Api.commerceConnections(),
      Api.instagramConnection(),
      Api.orders({ limit: 8 })
    ]);
    if (cc.status === 'fulfilled') chState.commerce = (cc.value && (Array.isArray(cc.value) ? cc.value : cc.value.connections)) || [];
    if (ig.status === 'fulfilled') chState.ig = ig.value || null;
    if (ord.status === 'fulfilled') chState.orders = (ord.value && (ord.value.items || ord.value.orders || (Array.isArray(ord.value) ? ord.value : []))) || [];
    chState.loaded = true;
  } finally {
    chState.loading = false;
    render();
  }
}

function pageSetChannels() {
  const c = CONFIG.channels;
  const d = Store.load();
  const integ = d.integrations || {};
  if (Api.token() && !chState.loaded && !chState.loading) {
    setTimeout(() => hydrateChannels(false), 0);
  }

  const ctConnected = !!integ.channeltalk;
  const igConnected = !!(chState.ig && (chState.ig.connected || chState.ig.username || chState.ig.ig_user_id));
  const bySrc = Object.fromEntries((chState.commerce || []).map(x => [x.source, x]));
  const apiPlatforms = CONFIG.platforms.filter(p => p.apiSource);

  return `
  <div class="sec"><div class="note blue">
    ${esc(c.hub.name)}·인스타그램·커머스 계정을 연결하면 <b>문의 수신과 주문 대조</b>가 자동으로 동작합니다.
  </div></div>

  <div class="sec">
    <div class="eyebrow">허브 — 채널톡</div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:12px">
        <div class="ico-box">${c.hub.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="row-t1"><span class="dot ${ctConnected ? 'green' : 'gray'}"></span>${esc(c.hub.name)}</div>
          <div class="row-t2">${esc(c.hub.desc)}</div>
        </div>
        <span class="chip ${ctConnected ? 'green' : 'gray'}">${ctConnected ? '연결됨' : '미연결'}</span>
      </div>
      <div class="set-row">
        <div>
          <label class="label" for="ctKey">Access Key</label>
          <input class="input" id="ctKey" placeholder="x-access-key" autocomplete="off">
        </div>
        <div>
          <label class="label" for="ctSecret">Access Secret</label>
          <input class="input" id="ctSecret" type="password" placeholder="x-access-secret" autocomplete="off">
        </div>
      </div>
      <button type="button" class="btn block" id="ctConnect" style="margin-top:10px" ${chState.busy.ct ? 'disabled' : ''}>
        ${chState.busy.ct ? '저장 중…' : (ctConnected ? '키 다시 저장하기' : '채널톡 연결하기')}
      </button>
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">인스타그램 댓글 · DM</div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:12px">
        <div class="ico-box">📷</div>
        <div style="flex:1;min-width:0">
          <div class="row-t1"><span class="dot ${igConnected ? 'green' : 'gray'}"></span>Instagram 비즈니스/크리에이터</div>
          <div class="row-t2">${igConnected ? `@${esc(chState.ig.username || chState.ig.ig_user_id || '연결됨')}` : '댓글 악성 감지 · 숨김 · DM 응대'}</div>
        </div>
        <span class="chip ${igConnected ? 'green' : 'gray'}">${igConnected ? '연결됨' : '미연결'}</span>
      </div>
      ${igConnected ? `
        <button type="button" class="btn ghost sm" id="igDisconnect" ${chState.busy.ig ? 'disabled' : ''}>연결 해제</button>
      ` : `
        <div class="btn-row" style="margin-bottom:10px">
          <a class="btn" href="${esc(Api.instagramOAuthUrl())}" style="flex:1;text-align:center">Instagram OAuth로 연결</a>
        </div>
        <div class="send-row">
          <input class="input" id="igToken" type="password" placeholder="또는 Graph API Access Token 직접 입력">
          <button type="button" class="btn ghost" id="igSaveToken" ${chState.busy.ig ? 'disabled' : ''}>토큰 연결</button>
        </div>
      `}
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">커머스 주문 연동 (${apiPlatforms.length}개)</div>
    ${apiPlatforms.map(p => {
      const src = p.apiSource;
      const conn = bySrc[src];
      const ok = !!(conn && conn.status === 'connected');
      const hasConn = !!conn;
      const busy = !!chState.busy[src];
      const cred = chState.creds[src] || {};
      const syncTs = conn && (conn.last_synced_at || conn.last_sync_at);
      return `
      <div class="card" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div class="ico-box">${p.icon}</div>
          <div style="flex:1;min-width:0">
            <div class="row-t1">${esc(p.name)}</div>
            <div class="row-t2">${hasConn
              ? `모드: ${esc(conn.mode || 'api')} · 주문 ${conn.order_count ?? 0}건${syncTs ? ' · ' + esc(String(syncTs).slice(0, 16).replace('T', ' ')) : ''}`
              : esc((p.connect && p.connect.help) || 'API 키 또는 데모 데이터로 연결')}</div>
          </div>
          <span class="chip ${ok ? 'green' : conn && conn.status === 'error' ? 'red' : 'gray'}">${ok ? '연결됨' : conn && conn.status === 'error' ? '오류' : '미연결'}</span>
        </div>
        ${conn && conn.last_error ? `<div class="notice err" style="margin-bottom:8px">${esc(conn.last_error)}</div>` : ''}
        ${hasConn ? `
          <div class="btn-row">
            <button type="button" class="btn sm" data-sync-src="${esc(src)}" ${busy ? 'disabled' : ''}>${busy ? '동기화 중…' : '지금 주문 동기화'}</button>
            <button type="button" class="btn sm ghost" data-demo-src="${esc(src)}" ${busy ? 'disabled' : ''}>데모 모드 전환</button>
            <button type="button" class="btn sm ghost" data-del-src="${esc(src)}" ${busy ? 'disabled' : ''}>해제</button>
          </div>
        ` : `
          ${(p.connect && p.connect.fields ? p.connect.fields : []).map(f => `
            <div class="field">
              <label class="label">${esc(f.label)}</label>
              <input class="input" type="${f.secret ? 'password' : 'text'}" data-ch-cred="${esc(src)}:${esc(f.key)}"
                     value="${esc(cred[f.key] || '')}" placeholder="${esc(f.label)}">
            </div>`).join('')}
          <div class="btn-row">
            ${(p.connect && p.connect.fields && p.connect.fields.length) ? `
              <button type="button" class="btn sm" data-conn-src="${esc(src)}" ${busy ? 'disabled' : ''}>API 키로 연결</button>` : ''}
            <button type="button" class="btn sm ghost" data-demo-src="${esc(src)}" ${busy ? 'disabled' : ''}>데모 데이터로 연결</button>
          </div>
        `}
      </div>`;
    }).join('')}
  </div>

  <div class="sec">
    <div class="eyebrow">동기화된 최근 주문 (${chState.orders.length}건)</div>
    <div class="card">
      ${chState.orders.length ? `
        <div class="list" style="margin-bottom:12px">
          ${chState.orders.slice(0, 8).map(o => `
            <div class="row">
              <span class="row-body">
                <span class="row-t1">${esc(o.customer_name || '고객')} · ${esc(o.item_name || o.product_name || o.order_no)}</span>
                <span class="row-t2">${esc(o.source || '')} · #${esc(o.order_no)} · ${esc(o.status || '')}</span>
              </span>
            </div>`).join('')}
        </div>` : `<div class="row-t2" style="margin-bottom:10px">아직 가져온 주문이 없습니다. 위에서 커머스를 동기화하거나 CSV로 가져오세요.</div>`}
      <label class="label" for="orderCsv">CSV로 주문 직접 가져오기 (헤더 포함)</label>
      <textarea class="textarea" id="orderCsv" rows="3" placeholder="주문번호,고객명,상품,상태,연락처&#10;ORD-9001,김서연,머그컵 세트,배송중,010-1234-5678"></textarea>
      <button type="button" class="btn sm ghost" id="orderImportBtn" style="margin-top:8px">주문 가져오기</button>
    </div>
  </div>`;
}

function pageTone() {
  const r = CONFIG.receipt, d = Store.load();
  const resp = (d.store && d.store.response) || {};
  const per = (d.store && d.store.persona) || {};
  const slaMin = resp.owner_reply_sla_minutes ?? 1440;
  const slaOpts = [
    [120, '당일 안내 (2시간 이내)'],
    [1440, '영업일 1일 이내'],
    [4320, '영업일 3일 이내']
  ];
  const formality = per.formality || 'polite';
  const toneOpts = [
    ['polite', '해요체 (공손·부드러운 응대)'],
    ['formal', '합쇼체 (정중·격식 있는 응대)'],
    ['casual', '간결체 (담백·친근한 응대)']
  ];
  return `
  <div class="sec"><div class="note">
    손님에게 나가는 자동 접수/안내의 <b>응답 약속 시간</b>과 <b>AI 말투</b>를 정합니다.
    클릭하면 서버 매장 설정에 즉시 반영됩니다.
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
      ${slaOpts.map(([min, label]) => `
        <button type="button" class="row" data-sla-min="${min}" style="width:100%;text-align:left;background:transparent;border:0">
          <span class="row-body"><span class="row-t1">${esc(label)}</span></span>
          ${slaMin === min ? '<span class="chip solid">선택됨</span>' : '<span class="chev">›</span>'}
        </button>`).join('')}
    </div>
  </div>

  <div class="sec">
    <div class="eyebrow">말투</div>
    <div class="list">
      ${toneOpts.map(([val, label]) => `
        <button type="button" class="row" data-formality="${esc(val)}" style="width:100%;text-align:left;background:transparent;border:0">
          <span class="row-body"><span class="row-t1">${esc(label)}</span></span>
          ${formality === val ? '<span class="chip solid">선택됨</span>' : '<span class="chev">›</span>'}
        </button>`).join('')}
    </div>
    <div class="hint">통화 화면의 매장 설정과 연동됩니다.</div>
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

const kbState = { loaded: false, loading: false, docs: [], faqs: [] };

async function hydrateKnowledge(force = false) {
  if (!Api.token() || kbState.loading || (kbState.loaded && !force)) return;
  kbState.loading = true;
  try {
    const [docs, faqs] = await Promise.allSettled([Api.contextDocs(), Api.faqs()]);
    if (docs.status === 'fulfilled') kbState.docs = (docs.value && (docs.value.docs || docs.value)) || [];
    if (faqs.status === 'fulfilled') kbState.faqs = (faqs.value && (faqs.value.faqs || faqs.value)) || [];
    kbState.loaded = true;
  } finally {
    kbState.loading = false;
    render();
  }
}

function renderKnowledgeSection() {
  if (Api.token() && !kbState.loaded && !kbState.loading) {
    setTimeout(() => hydrateKnowledge(false), 0);
  }
  const docKinds = [
    ['business', '매장 소개 · 영업 안내', '매장명, 위치, 대표 메뉴/상품, 영업시간 등'],
    ['offerings', '상품 · 서비스 카탈로그', '주력 상품, 가격대, 옵션, 주의사항'],
    ['policies', '교환 · 환불 · 운영 정책', '환불 기준, 배송 기간, AS 정책']
  ];
  const byKind = Object.fromEntries((kbState.docs || []).map(d => [d.kind, d]));

  return `
  <div class="sec">
    <div class="eyebrow">매장 지식 문서</div>
    ${docKinds.map(([kind, title, hint]) => {
      const doc = byKind[kind] || {};
      const val = doc.content_md || doc.content || '';
      return `
      <div class="card" style="margin-bottom:10px">
        <div class="row-t1">${esc(title)} <code>${esc(kind)}</code></div>
        <div class="row-t2" style="margin-bottom:8px">${esc(hint)}</div>
        <textarea class="textarea" rows="4" id="doc-${esc(kind)}" placeholder="마크다운 또는 일반 텍스트로 작성">${esc(val)}</textarea>
        <div class="btn-row" style="margin-top:8px">
          <button type="button" class="btn sm" data-doc-save="${esc(kind)}">저장</button>
          <button type="button" class="btn sm ghost" data-doc-reset="${esc(kind)}">기본값으로 복원</button>
        </div>
      </div>`;
    }).join('')}
  </div>

  <div class="sec">
    <div class="eyebrow">자주 묻는 질문 (FAQ ${kbState.faqs.length}개)</div>
    <div class="card" style="margin-bottom:10px">
      <div class="field">
        <label class="label" for="faqQ">질문</label>
        <input class="input" id="faqQ" placeholder="예: 주차 가능한가요?">
      </div>
      <div class="field" style="margin-bottom:8px">
        <label class="label" for="faqA">답변</label>
        <textarea class="textarea" id="faqA" rows="2" placeholder="예: 건물 뒤편에 1시간 무료 주차 가능합니다."></textarea>
      </div>
      <button type="button" class="btn sm" id="faqAddBtn">FAQ 추가</button>
    </div>
    ${kbState.faqs.length ? `
      <div class="list">
        ${kbState.faqs.map(f => `
          <div class="row" style="align-items:flex-start">
            <span class="row-body">
              <span class="row-t1">${esc(f.question)}</span>
              <span class="row-t2">${esc(f.answer)}</span>
            </span>
            <button type="button" class="btn sm ghost" data-faq-toggle="${esc(f.id)}" data-active="${f.is_active !== false ? '1' : '0'}">${f.is_active !== false ? '사용중' : '꺼짐'}</button>
            <button type="button" class="btn sm ghost" data-faq-del="${esc(f.id)}">삭제</button>
          </div>`).join('')}
      </div>` : `<div class="note">등록된 FAQ가 없습니다. 위에서 추가하면 AI 응대에 즉시 반영됩니다.</div>`}
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

  const body = sec.id === 'knowledge'
    ? renderKnowledgeSection()
    : fields.map(f => f.type === 'weekly' ? storeWeekly(f, sec.id) : storeControl(f, sec.id)).join('');

  return `
  <div class="sec"><div class="note blue">
    <b>${esc(sec.label)}</b> ${sec.live ? '<span class="chip green">실제 반영</span>' : ''} — ${esc(sec.note || '')}<br>
    ${Api.token() ? '바꾸면 서버에 자동 저장되며 다음 메시지·통화 턴부터 즉시 반영됩니다.' : '로그인하면 서버에 저장되고, 오프라인 상태에서는 이 브라우저에만 저장됩니다.'}
  </div></div>

  <div class="sec">
    <div class="eyebrow">매장 설정</div>
    <div class="list">${rail}</div>
  </div>

  <div class="sec">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div class="eyebrow" style="margin-bottom:0">${esc(sec.label)} <code style="font-weight:400">${esc(sec.api)}</code></div>
      ${sec.id !== 'knowledge' && Api.token() ? `<button type="button" class="btn sm ghost" id="resetStoreSection" data-sec="${esc(sec.id)}">기본값 복원</button>` : ''}
    </div>
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
    body = `<div class="ob-got">${esc(c.note)}</div>
      ${p.apiSource ? `<button type="button" class="btn sm ghost" style="margin-top:8px" data-ob-demo="${p.id}">데모 데이터로 연결</button>` : ''}`;
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
      <div class="btn-row">
        <button type="button" class="btn" style="flex:1" data-ob-connect="${p.id}" ${loading ? 'disabled' : ''}>
          ${loading ? '연결 중…' : '연결하기'}
        </button>
        ${p.apiSource ? `<button type="button" class="btn ghost" data-ob-demo="${p.id}" ${loading ? 'disabled' : ''}>데모 연결</button>` : ''}
      </div>`;
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

async function obConnect(id, mode = 'api') {
  ob.conn[id] = { state: 'loading' }; render();
  const r = await Store.connectPlatform(id, ob.creds[id] || {}, mode);
  if (r.ok) { ob.conn[id] = { state: 'ok', profile: r.profile }; delete ob.creds[id]; }   // 키는 바로 버린다
  else ob.conn[id] = { state: 'error', why: r.why };
  render();
}

async function obFinish() {
  const btns = $$('[data-ob="finish"]');
  btns.forEach(b => { b.disabled = true; });
  try {
    /* 평일 영업시간 저장 → 업종 템플릿으로 매장 문서 · FAQ · 문의 카테고리 초안 채우기 (이게 세팅 완료 표시라 마지막) */
    const st = await Api.settings();
    const weekly = Object.assign({}, st.hours.weekly);
    ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => { weekly[day] = [{ open: ob.open, close: ob.close }]; });
    await Api.patchSettings('hours', { weekly });
    await Api.applyTemplate(CONFIG.templateOf[obBizId()] || 'other', ob.storeName.trim() || undefined);
  } catch (e) {
    btns.forEach(b => { b.disabled = false; });
    if (e.status === 401) { location.replace(L.login); return; }
    alert('초기 세팅을 저장하지 못했어요. ' + e.message);
    return;
  }
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
  if (cn) { if (!cn.disabled) obConnect(cn.dataset.obConnect, 'api'); return; }
  const dm = e.target.closest('[data-ob-demo]');
  if (dm) { if (!dm.disabled) obConnect(dm.dataset.obDemo, 'demo'); return; }
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
   로그인 · 회원가입 — 서버 계정. 가입하면 새 매장이 생기고 초기 세팅으로 간다
   ============================================================ */
const auth = { mode: 'login', busy: false, err: '', email: '', store: '' };

function pageLogin() {
  const b = CONFIG.brand, signup = auth.mode === 'signup';
  return `
  <div class="ob-wrap">
    <div class="ob-head">
      <div class="brand-mark">${b.mark}</div>
      <div><div class="ob-name">${esc(b.name)}</div><div class="ob-sub">${esc(b.owner)}</div></div>
    </div>
    <div class="seg" style="margin-bottom:16px">
      <button type="button" data-auth="login" aria-selected="${!signup}">로그인</button>
      <button type="button" data-auth="signup" aria-selected="${signup}">회원가입</button>
    </div>
    <h2 class="ob-t">${signup ? '매장 계정 만들기' : '로그인'}</h2>
    <p class="ob-d">${signup ? '가입하면 매장이 만들어지고, 업종을 고르면 AI 응대 설정이 바로 채워져요.' : '사장님 계정으로 로그인해 주세요.'}</p>
    <form class="card" id="authForm" novalidate>
      ${signup ? `<div class="field">
        <label class="label" for="auStore">매장명</label>
        <input class="input" id="auStore" autocomplete="organization" placeholder="예: 모루 의류" value="${esc(auth.store)}" required>
      </div>` : ''}
      <div class="field">
        <label class="label" for="auEmail">이메일</label>
        <input class="input" id="auEmail" type="email" autocomplete="email" value="${esc(auth.email)}" required>
      </div>
      <div class="field" style="margin-bottom:0">
        <label class="label" for="auPw">비밀번호</label>
        <input class="input" id="auPw" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" ${signup ? 'minlength="8" placeholder="8자 이상"' : ''} required>
      </div>
      ${auth.err ? `<div class="hint bad" role="alert" style="margin-top:10px">${esc(auth.err)}</div>` : ''}
      <button type="submit" class="btn block" style="margin-top:14px" ${auth.busy ? 'disabled' : ''}>
        ${auth.busy ? '잠시만요…' : signup ? '가입하고 시작하기' : '로그인'}</button>
    </form>
    <div class="ob-foot">
      <button type="button" class="ob-skip" data-auth="mode">${signup ? '이미 계정이 있어요 · 로그인' : '처음이에요 · 회원가입'}</button>
    </div>
  </div>`;
}

async function authSubmit() {
  auth.email = ($('#auEmail')?.value || '').trim();
  auth.store = ($('#auStore')?.value || '').trim();
  const pw = $('#auPw')?.value || '';
  if (!auth.email || !pw || (auth.mode === 'signup' && !auth.store)) { auth.err = '빈 칸을 채워 주세요.'; render(); return; }
  if (auth.mode === 'signup' && pw.length < 8) { auth.err = '비밀번호는 8자 이상이에요.'; render(); return; }
  auth.busy = true; auth.err = ''; render();
  try {
    const me = auth.mode === 'signup' ? await Api.signup(auth.email, pw, auth.store) : await Api.login(auth.email, pw);
    Store.applyMe(me);
    location.replace(me.setup.done ? L.dashboard : L.onboarding);
  } catch (e) {
    auth.busy = false;
    auth.err = e.status === 401 ? '이메일 또는 비밀번호가 맞지 않아요.'
      : e.status === 409 ? '이미 가입된 이메일이에요. 로그인해 주세요.'
      : e.status ? e.message : '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
    render();
    $('#auPw')?.focus();
  }
}

document.addEventListener('submit', (e) => {
  if (e.target.id === 'authForm') { e.preventDefault(); authSubmit(); }
});
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-auth]');
  if (!a) return;
  if (a.dataset.auth === 'login' || a.dataset.auth === 'signup') {
    auth.mode = a.dataset.auth; auth.err = ''; render();
  }
  if (a.dataset.auth === 'mode') { auth.mode = auth.mode === 'login' ? 'signup' : 'login'; auth.err = ''; render(); }
  if (a.dataset.auth === 'logout') {
    Api.logout().then(() => location.replace(L.login));
  }
});

/* 화면 아래 잠깐 뜨는 안내 */
function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast'; el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);max-width:calc(100% - 32px);background:#222;color:#fff;padding:10px 14px;border-radius:10px;font-size:13px;z-index:999;box-shadow:0 4px 16px rgba(0,0,0,.2)';
    document.body.appendChild(el);
  }
  el.textContent = msg; el.style.display = 'block';
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.style.display = 'none'; }, 4000);
}
window.addEventListener('mawd:error', (e) => toast(e.detail));
window.addEventListener('mawd:updated', () => render());

const seenAlerts = new Set();
let lastAlertAt = new Date(Date.now() - 60000).toISOString();

async function pollAlertsOnce() {
  if (!Api.token()) return;
  try {
    const res = await Api.alerts(lastAlertAt);
    const list = (res && (res.alerts || res.items || (Array.isArray(res) ? res : []))) || [];
    for (const al of list) {
      if (seenAlerts.has(al.id)) continue;
      seenAlerts.add(al.id);
      if (al.created_at && al.created_at > lastAlertAt) lastAlertAt = al.created_at;
      const urgent = al.severity === 'urgent' || al.level === 'urgent' || al.type === 'heated';
      toast(`${urgent ? '🚨 ' : '🔔 '}${al.title || al.message || '새 알림이 도착했습니다.'}`);
    }
  } catch { /* ignore polling failure */ }
}

/* 시작: 로그인 확인 → 서버 데이터 받기 → 그리기. 로그인 안 했으면 로그인 화면, 세팅 전이면 초기 세팅 */
async function boot() {
  const key = document.body.dataset.page;
  if (key === 'login') {
    if (Api.token()) { try { const me = await Api.me(); location.replace(me.setup.done ? L.dashboard : L.onboarding); return; } catch (e) { /* 만료 */ } }
    render(); return;
  }
  try {
    const me = await Api.me();
    Store.applyMe(me);
    if (key === 'onboarding' && !ob.storeName) ob.storeName = me.tenant.name;
    if (me.setup.done && key !== 'onboarding') {
      await Store.pullServer().catch(e => toast('서버 데이터를 받지 못했어요. ' + e.message));
    }
  } catch (e) {
    if (e.status === 401) { Api.setToken(null); location.replace(L.login); return; }
    toast('서버에 연결하지 못했어요. 이 브라우저에 저장된 데이터로 보여드려요.');
  }
  render();
  if (key !== 'onboarding') {
    pollAlertsOnce();
    /* 새 문의·알림 확인 — 입력 중이면 화면을 다시 그리지 않는다 */
    setInterval(async () => {
      const sig = () => JSON.stringify(Store.load().items.map(i => [i.id, i.score, i.handled, i.updatedAt]));
      const before = sig();
      try { await Store.pullServer(); } catch (e) { return; }
      await pollAlertsOnce();
      const busy = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (!busy && before !== sig()) render();
    }, 15000);
  }
}

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
  login:       pageLogin,
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
  if (key !== 'login') {
    if (key === 'onboarding' && onboarded) { location.replace(L.dashboard); return; }
    if (key !== 'onboarding' && !onboarded) { location.replace(L.onboarding); return; }
  }
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

  /* 전화 걸기 · 종료 · 마이크 · 음소거 */
  if (e.target.closest('#dial')) { dialCall(); return; }
  if (e.target.closest('#hang')) { hangUp(); return; }
  if (e.target.closest('#micBtn')) { toggleMic(); return; }
  if (e.target.closest('#muteBtn')) {
    call.muted = !call.muted;
    if (call.muted) stopTts();
    render();
    return;
  }

  /* 통화 중 텍스트로 말하기 */
  if (e.target.closest('#saySend')) {
    const sayEl = $('#say');
    const v = (sayEl?.value || '').trim();
    if (!v) return;
    sayEl.value = '';
    await sendVoiceTurn(v);
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

  /* 채팅 문의 넣기 · 새 대화 · 종료 */
  if (e.target.closest('#send')) { await sendDemoChat(); $('#inp')?.focus(); return; }
  if (e.target.closest('#chatEnd')) { await endDemoChat(); return; }
  if (e.target.closest('#chatNew')) {
    call.chatId = 'demo-' + Math.random().toString(36).slice(2, 8);
    call.chatTurns = [];
    call.chatEnded = false;
    call.chatCard = null;
    render();
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

  /* 추천 답변 초안 불러오기 */
  const fillBtn = e.target.closest('[data-act="fill-rec"]');
  if (fillBtn) {
    const id = fillBtn.dataset.id, idx = Number(fillBtn.dataset.rec);
    const it = Store.load().items.find(x => String(x.id) === String(id));
    const rec = it && it.detail && it.detail.card && it.detail.card.recommendations && it.detail.card.recommendations[idx];
    if (rec && rec.draft) {
      const ta = $('#draft-' + id);
      if (ta) { ta.value = rec.draft; ta.focus(); }
      Store.setDraft(id, rec.draft);
    }
    return;
  }

  /* 추천 답변 바로 승인 */
  const appBtn = e.target.closest('[data-act="approve"]');
  if (appBtn) {
    const id = appBtn.dataset.id, idx = Number(appBtn.dataset.rec);
    const it = Store.load().items.find(x => String(x.id) === String(id));
    const rec = it && it.detail && it.detail.card && it.detail.card.recommendations && it.detail.card.recommendations[idx];
    if (rec) {
      Store.setHandled(id, 'sent', rec.draft, { type: 'approve', recommendation_index: idx });
      toast('추천 답변으로 승인했습니다.');
      render();
    }
    return;
  }

  /* 대화 원문 보기 / 접기 (감사 로그 기록) */
  const rawBtn = e.target.closest('[data-act="raw-msg"]');
  if (rawBtn) {
    const id = rawBtn.dataset.id;
    if (rawMsgsCache[id]) { delete rawMsgsCache[id]; render(); return; }
    if (!confirm('욕설 마스킹을 해제하고 대화 원문을 조회합니다. 조회 이력이 감사 로그에 남습니다. 계속할까요?')) return;
    try {
      const msgs = await Api.inquiryMessages(id, true);
      rawMsgsCache[id] = Array.isArray(msgs) ? msgs : (msgs.messages || msgs.items || []);
      render();
    } catch (err) {
      toast('원문을 불러오지 못했습니다: ' + (err.message || '오류'));
    }
    return;
  }

  /* 승인 대기 처리 (종료 / 직접 응대 / 답변 전송) */
  const a = e.target.closest('[data-act="handle"]');
  if (a) {
    const ta = $('#draft-' + a.dataset.id);
    const reply = ta ? ta.value.trim() : '';
    if (a.dataset.how === 'sent' && !reply) { alert('전달할 답변이 비어 있어요.'); return; }
    Store.setHandled(a.dataset.id, a.dataset.how, reply);
    render(); return;
  }

  /* 응답 SLA / 말투 설정 (settings/tone.html) */
  const slaBtn = e.target.closest('[data-sla-min]');
  if (slaBtn) {
    Store.setStoreField('response', 'owner_reply_sla_minutes', Number(slaBtn.dataset.slaMin));
    toast('응답 약속 시간이 저장되었습니다.');
    render();
    return;
  }
  const formBtn = e.target.closest('[data-formality]');
  if (formBtn) {
    const val = formBtn.dataset.formality;
    Store.setStoreField('persona', 'formality', val);
    const labelMap = { polite:'해요체', formal:'합쇼체', casual:'간결체' };
    if (labelMap[val]) Store.setSetting('tone', labelMap[val]);
    toast('말투가 저장되었습니다.');
    render();
    return;
  }

  /* 매장 설정 기본값 복원 */
  const rstSec = e.target.closest('#resetStoreSection');
  if (rstSec) {
    const sec = rstSec.dataset.sec;
    if (!confirm(`"${sec}" 설정을 기본값으로 되돌릴까요?`)) return;
    try {
      await Api.resetSettings([sec]);
      await Store.pullServer();
      toast('기본값으로 복원했습니다.');
      render();
    } catch (err) {
      toast('복원 실패: ' + (err.message || '오류'));
    }
    return;
  }

  /* 매장 지식 문서 & FAQ CRUD (settings/store.html?s=knowledge) */
  const docSave = e.target.closest('[data-doc-save]');
  if (docSave) {
    const kind = docSave.dataset.docSave;
    const ta = $('#doc-' + kind);
    try {
      await Api.putContextDoc(kind, { content_md: (ta && ta.value) || '' });
      toast('지식 문서를 저장했습니다.');
      await hydrateKnowledge(true);
    } catch (err) {
      toast('저장 실패: ' + (err.message || '오류'));
    }
    return;
  }
  const docReset = e.target.closest('[data-doc-reset]');
  if (docReset) {
    const kind = docReset.dataset.docReset;
    try {
      await Api.resetContextDoc(kind);
      toast('기본 문서로 복원했습니다.');
      await hydrateKnowledge(true);
    } catch (err) {
      toast('복원 실패: ' + (err.message || '오류'));
    }
    return;
  }
  if (e.target.closest('#faqAddBtn')) {
    const q = ($('#faqQ')?.value || '').trim();
    const ans = ($('#faqA')?.value || '').trim();
    if (!q || !ans) { toast('질문과 답변을 모두 입력해 주세요.'); return; }
    try {
      await Api.createFaq({ question: q, answer: ans, is_active: true });
      $('#faqQ').value = '';
      $('#faqA').value = '';
      toast('FAQ를 추가했습니다.');
      await hydrateKnowledge(true);
    } catch (err) {
      toast('추가 실패: ' + (err.message || '오류'));
    }
    return;
  }
  const faqTog = e.target.closest('[data-faq-toggle]');
  if (faqTog) {
    const id = faqTog.dataset.faqToggle;
    const active = faqTog.dataset.active === '1';
    try {
      await Api.patchFaq(id, { is_active: !active });
      await hydrateKnowledge(true);
    } catch (err) {
      toast('변경 실패: ' + (err.message || '오류'));
    }
    return;
  }
  const faqDel = e.target.closest('[data-faq-del]');
  if (faqDel) {
    try {
      await Api.deleteFaq(faqDel.dataset.faqDel);
      toast('FAQ를 삭제했습니다.');
      await hydrateKnowledge(true);
    } catch (err) {
      toast('삭제 실패: ' + (err.message || '오류'));
    }
    return;
  }

  /* 채널 연결 관리 (settings/channels.html) */
  if (e.target.closest('#ctConnect')) {
    const k = ($('#ctKey')?.value || '').trim();
    const sec = ($('#ctSecret')?.value || '').trim();
    if (!k || !sec) { toast('Access Key와 Secret을 모두 입력해 주세요.'); return; }
    chState.busy.ct = true; render();
    try {
      await Api.connectChannelTalk(k, sec);
      const me = await Api.me();
      Store.applyMe(me);
      toast('채널톡을 연결했습니다.');
    } catch (err) {
      toast('채널톡 연결 실패: ' + (err.message || '오류'));
    }
    chState.busy.ct = false; render();
    return;
  }
  if (e.target.closest('#igSaveToken')) {
    const tok = ($('#igToken')?.value || '').trim();
    if (!tok) { toast('Access Token을 입력해 주세요.'); return; }
    chState.busy.ig = true; render();
    try {
      await Api.connectInstagram(tok);
      toast('인스타그램을 연결했습니다.');
      await hydrateChannels(true);
    } catch (err) {
      toast('연결 실패: ' + (err.message || '오류'));
    }
    chState.busy.ig = false; render();
    return;
  }
  if (e.target.closest('#igDisconnect')) {
    chState.busy.ig = true; render();
    try {
      await Api.disconnectInstagram();
      chState.ig = null;
      toast('인스타그램 연결을 해제했습니다.');
      await hydrateChannels(true);
    } catch (err) {
      toast('해제 실패: ' + (err.message || '오류'));
    }
    chState.busy.ig = false; render();
    return;
  }
  const connSrc = e.target.closest('[data-conn-src]');
  if (connSrc) {
    const src = connSrc.dataset.connSrc;
    const creds = chState.creds[src] || {};
    chState.busy[src] = true; render();
    try {
      await Api.upsertCommerceConnection(src, { mode: 'api', credentials: creds });
      delete chState.creds[src];
      toast(`${src} API 연결 및 주문 동기화 완료`);
      await hydrateChannels(true);
    } catch (err) {
      toast('연결 실패: ' + (err.message || '오류'));
    }
    chState.busy[src] = false; render();
    return;
  }
  const demoSrc = e.target.closest('[data-demo-src]');
  if (demoSrc) {
    const src = demoSrc.dataset.demoSrc;
    chState.busy[src] = true; render();
    try {
      await Api.upsertCommerceConnection(src, { mode: 'demo' });
      toast(`${src} 데모 데이터로 연결했습니다.`);
      await hydrateChannels(true);
    } catch (err) {
      toast('연결 실패: ' + (err.message || '오류'));
    }
    chState.busy[src] = false; render();
    return;
  }
  const syncSrc = e.target.closest('[data-sync-src]');
  if (syncSrc) {
    const src = syncSrc.dataset.syncSrc;
    chState.busy[src] = true; render();
    try {
      const r = await Api.syncCommerce(src);
      toast(`동기화 완료 (${r.upserted ?? r.fetched ?? 0}건 반영)`);
      await hydrateChannels(true);
    } catch (err) {
      toast('동기화 실패: ' + (err.message || '오류'));
    }
    chState.busy[src] = false; render();
    return;
  }
  const delSrc = e.target.closest('[data-del-src]');
  if (delSrc) {
    const src = delSrc.dataset.delSrc;
    chState.busy[src] = true; render();
    try {
      await Api.deleteCommerceConnection(src);
      toast(`${src} 연동을 해제했습니다.`);
      await hydrateChannels(true);
    } catch (err) {
      toast('해제 실패: ' + (err.message || '오류'));
    }
    chState.busy[src] = false; render();
    return;
  }
  if (e.target.closest('#orderImportBtn')) {
    let csv = ($('#orderCsv')?.value || '').trim();
    if (!csv) { toast('CSV 내용을 입력해 주세요.'); return; }
    if (!csv.includes('주문번호') && !csv.toLowerCase().includes('order')) {
      csv = '주문번호,고객명,상품,상태,연락처\n' + csv;
    }
    try {
      const r = await Api.importOrders({ source: 'csv', csv, dry_run: false });
      toast(`주문 ${r.upserted ?? r.parsed ?? ''}건을 가져왔습니다.`);
      $('#orderCsv').value = '';
      await hydrateChannels(true);
    } catch (err) {
      toast('가져오기 실패: ' + (err.message || '오류'));
    }
    return;
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

  /* 기본 설정 필드 (시연 우측 패널에서도 서버 persona/response에 즉시 반영) */
  if (t.id === 'agent') {
    const v = t.value.trim() || CONFIG.defaults.agent;
    Store.setSetting('agent', v);
    Store.setStoreField('persona', 'agent_name', v);
    return;
  }
  if (t.id === 'tone') {
    const val = t.value;
    if (['formal', 'polite', 'casual'].includes(val)) {
      Store.setStoreField('persona', 'formality', val);
      const labelMap = { polite:'해요체', formal:'합쇼체', casual:'간결체' };
      Store.setSetting('tone', labelMap[val]);
    } else {
      Store.setSetting('tone', val);
    }
    return;
  }
  if (t.id === 'bizType')   { Store.setSetting('bizType', t.value); render(); return; }
  if (t.id === 'storeName') { Store.setSetting('storeName', t.value.trim()); render(); return; }

  /* 슬라이더 드래그 완료 시 네비게이션 배지 및 서버 heat_threshold 동기화 */
  if (t.matches('input[type=range][id^=th]')) {
    if (t.id === 'thHeat' || t.id === 'thHold') {
      Store.setStoreField('response', 'heat_threshold', Number(t.value));
    }
    renderNav(MENU_OF[document.body.dataset.page] || document.body.dataset.page);
    syncSettings();
    return;
  }

  /* 매장 설정 (response / persona / hours / voice / ai / data-access / notifications / issues) */
  const f = t.closest('[data-sec][data-path]');
  if (f) {
    Store.setStoreField(f.dataset.sec, f.dataset.path, storeFieldCoerce(f.dataset.type, f));
    return;
  }

  /* 영업시간 — 요일별 휴무 체크박스 */
  const wc = t.closest('[data-wk-closed]');
  if (wc) {
    const day = wc.dataset.wkClosed, sec = wc.dataset.sec;
    Store.setStoreField(sec, `weekly.${day}`, wc.checked ? [] : [{ open:'10:00', close:'19:00' }]);
    render();
    return;
  }

  /* 영업시간 — 여는/닫는 시간 */
  const wt = t.closest('[data-wk]');
  if (wt) {
    const day = wt.dataset.wk, part = wt.dataset.wkPart, sec = wt.dataset.sec;
    const cur = Store.load().store?.[sec]?.weekly?.[day];
    const base = Array.isArray(cur) ? (cur[0] || { open:'10:00', close:'19:00' }) : (cur || { open:'10:00', close:'19:00' });
    const next = Object.assign({}, base, { [part]: wt.value || '09:00' });
    Store.setStoreField(sec, `weekly.${day}`, Array.isArray(cur) || !cur ? [next] : next);
    return;
  }
});

/* 3. 실시간 입력 (input) 이벤트 — 포커스를 잃지 않도록 전체 render()를 피한다 */
document.addEventListener('input', (e) => {
  const t = e.target;

  if (t.id === 'apiUrl') { Store.setSetting('apiUrl', t.value.trim()); return; }

  /* 채널 연결 API 키 입력 버퍼 */
  if (t.dataset && t.dataset.chCred) {
    const [src, key] = t.dataset.chCred.split(':');
    (chState.creds[src] = chState.creds[src] || {})[key] = t.value;
    return;
  }

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

document.addEventListener('DOMContentLoaded', boot);
