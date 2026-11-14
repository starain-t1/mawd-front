/* ============================================================
   감정방패 — 백엔드(MAWD API) 연결
   로그인 토큰은 localStorage 에 두고 Authorization: Bearer 로 보낸다.
   서버 주소: localhost 에서 열면 로컬 서버, 아니면 운영 서버.
   바꾸려면 콘솔에서 localStorage.setItem('mawd.api', 'https://...')
   ============================================================ */
'use strict';

const Api = {
  BASE: (() => {
    try { const o = localStorage.getItem('mawd.api'); if (o) return o.replace(/\/+$/, ''); } catch (e) { /* 무시 */ }
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:8000' : CONFIG.api.base;
  })(),
  TOKEN_KEY: 'mawd.token',

  token() { try { return localStorage.getItem(this.TOKEN_KEY); } catch (e) { return null; } },
  setToken(t) { try { t ? localStorage.setItem(this.TOKEN_KEY, t) : localStorage.removeItem(this.TOKEN_KEY); } catch (e) { /* 무시 */ } },

  headers(hasBody) {
    const h = { Accept: 'application/json' };
    const t = this.token();
    if (t) h.Authorization = 'Bearer ' + t;
    if (hasBody) h['Content-Type'] = 'application/json';
    return h;
  },

  async req(method, path, body) {
    const res = await fetch(this.BASE + '/v1' + path, {
      method,
      headers: this.headers(body !== undefined),
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (json && ((json.error && json.error.message) || json.message || (typeof json.error === 'string' ? json.error : ''))) || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.code = json && json.error && json.error.code;
      throw err;
    }
    return json;
  },

  /* ---------- 로그인 ---------- */
  async login(email, password) { const r = await this.req('POST', '/auth/login', { email, password }); this.setToken(r.token); return r; },
  async signup(email, password, store_name) { const r = await this.req('POST', '/auth/signup', { email, password, store_name }); this.setToken(r.token); return r; },
  async logout() { try { await this.req('POST', '/auth/logout'); } catch (e) { /* 이미 끊김 */ } this.setToken(null); },
  me() { return this.req('GET', '/me'); },

  /* ---------- 초기 세팅 ---------- */
  templates() { return this.req('GET', '/onboarding/templates'); },
  applyTemplate(template, store_name) { return this.req('POST', '/onboarding/apply', { template, store_name }); },

  /* ---------- 매장 설정 · 대시보드 · 문의 ---------- */
  settings() { return this.req('GET', '/settings'); },
  patchSettings(section, body) { return this.req('PATCH', '/settings/' + section, body); },
  resetSettings(sections) { return this.req('POST', '/settings/reset', { sections }); },
  dashboardSummary() { return this.req('GET', '/dashboard/summary'); },
  inquiries(limit = 100) { return this.req('GET', '/inquiries?limit=' + limit); },
  inquiryDetail(id) { return this.req('GET', `/inquiries/${id}`); },
  inquiryMessages(id, raw = false) { return this.req('GET', `/inquiries/${id}/messages?raw=${raw ? 'true' : 'false'}`); },
  inquiryAction(id, action) { return this.req('POST', `/inquiries/${id}/actions`, action); },

  /* ---------- 실시간 AI 전화 (F9) ---------- */
  startCall() { return this.req('POST', '/calls'); },
  endCall(id) { return this.req('POST', `/calls/${id}/end`); },
  getCall(id) { return this.req('GET', `/calls/${id}`); },
  tts(text) { return this.req('POST', '/tts', { text }); },
  callTurnStream(id, text, signal) {
    return fetch(this.BASE + `/v1/calls/${id}/turns`, {
      method: 'POST',
      headers: this.headers(true),
      credentials: 'include',
      signal,
      body: JSON.stringify({ text })
    });
  },

  /* ---------- 실시간 채팅 데모 (채널톡 경로) ---------- */
  sendChatMessage(chatId, text, customer_name) {
    const body = customer_name ? { text, customer_name } : { text };
    return this.req('POST', `/chats/${encodeURIComponent(chatId)}/messages`, body);
  },
  getChat(chatId) { return this.req('GET', `/chats/${encodeURIComponent(chatId)}`); },
  endChat(chatId) { return this.req('POST', `/chats/${encodeURIComponent(chatId)}/end`); },

  /* ---------- 커머스 연동 · 주문 (F13) ---------- */
  commercePlatforms() { return this.req('GET', '/commerce/platforms'); },
  commerceConnections() { return this.req('GET', '/commerce/connections'); },
  upsertCommerceConnection(source, body) { return this.req('PUT', `/commerce/connections/${encodeURIComponent(source)}`, body); },
  deleteCommerceConnection(source) { return this.req('DELETE', `/commerce/connections/${encodeURIComponent(source)}`); },
  syncCommerce(source) { return this.req('POST', `/commerce/connections/${encodeURIComponent(source)}/sync`); },
  orders(params = {}) {
    const qs = new URLSearchParams();
    if (params.source) qs.set('source', params.source);
    if (params.q) qs.set('q', params.q);
    if (params.limit) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return this.req('GET', '/orders' + (s ? '?' + s : ''));
  },
  importOrders(body) { return this.req('POST', '/orders/import', body); },

  /* ---------- 채널톡 · 인스타그램 연동 ---------- */
  connectChannelTalk(access_key, access_secret) { return this.req('PUT', '/integrations/channeltalk', { access_key, access_secret }); },
  instagramConnection() { return this.req('GET', '/instagram/connection'); },
  connectInstagram(access_token) { return this.req('PUT', '/instagram/connection', { access_token }); },
  disconnectInstagram() { return this.req('DELETE', '/instagram/connection'); },
  instagramOAuthUrl() { return this.BASE + '/v1/instagram/oauth/start'; },

  /* ---------- 매장 지식 문서 · FAQ ---------- */
  contextDocs() { return this.req('GET', '/context-docs'); },
  putContextDoc(kind, body) { return this.req('PUT', `/context-docs/${encodeURIComponent(kind)}`, body); },
  resetContextDoc(kind) { return this.req('DELETE', `/context-docs/${encodeURIComponent(kind)}`); },
  faqs() { return this.req('GET', '/faqs'); },
  createFaq(body) { return this.req('POST', '/faqs', body); },
  patchFaq(id, body) { return this.req('PATCH', `/faqs/${id}`, body); },
  deleteFaq(id) { return this.req('DELETE', `/faqs/${id}`); },

  /* ---------- 알림 ---------- */
  alerts(after, limit = 20) {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (after) qs.set('after', after);
    return this.req('GET', '/alerts?' + qs.toString());
  },
  ackAlert(id) { return this.req('POST', `/alerts/${id}/ack`); }
};
