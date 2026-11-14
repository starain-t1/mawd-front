# 감정방패 프로토타입 — 파일 구조와 수정 지점

## 폴더 구조

```
protecter_test/
├── index.html              현황 (대시보드)
├── inquiries.html          문의 — 승인 대기 · 차단 · 통과
├── channels.html           채널 — 채널별 수집 집계
├── demo.html               고객 통화 — 통화 시뮬레이터
│
├── store.js                ★ 데이터와 판정 엔진 (여기만 고치면 됩니다)
├── app.js                  화면 그리기 + 이벤트
├── style.css               디자인 토큰 + 반응형
│
├── customer/               고객 패키지
│   ├── list.html             목록 (데스크톱은 목록+상세 2단)
│   └── detail.html           상세 — ?id=고객이름
│
└── settings/               설정 패키지
    ├── main.html             설정 메인
    ├── threshold.html        판정 기준 (차단 · 보류 · 반복)
    ├── channels.html         채널 연결
    └── tone.html             접수 확인 문구
```

HTML은 전부 껍데기입니다. 내용은 `app.js`가 `store.js`의 데이터를 읽어 그립니다.

---

## 경로 규칙 — 깨지지 않게 하는 핵심

각 HTML의 `<body>`에 루트까지의 상대 경로가 들어 있습니다.

```html
<!-- 루트 페이지 -->
<body data-page="dashboard" data-root="">

<!-- 하위 폴더 페이지 -->
<body data-page="customers" data-root="../">
```

`app.js`는 이 값으로 링크를 만듭니다. **새 페이지를 추가하면 `data-root`를 반드시 맞춰 주세요.**

```js
const ROOT = document.body.dataset.root || '';
const L = {
  dash:    ROOT + 'index.html',
  inq:     ROOT + 'inquiries.html',
  cust:    ROOT + 'customer/list.html',
  custOne: ROOT + 'customer/detail.html',
  set:     ROOT + 'settings/main.html',
  ...
};
```

CSS와 JS도 같은 규칙입니다. 루트는 `href="style.css"`, 하위 폴더는 `href="../style.css"`.

---

## 어디를 고쳐야 하나

### 1. 더미 데이터를 바꾸고 싶을 때
`store.js` → `Store.SEED`

```js
SEED: [
  // [몇 분 전, 고객 이름, 채널, 문의 내용]
  [  4, '김민수', '채널톡', '당장 전화받아라 아니면 가만 안 둔다 ...'],
  ...
]
```

점수·판정·주제는 전부 자동 계산되므로 문장만 넣으면 됩니다.
처음 열 때 자동으로 들어가고, 설정 → **전체 비우기**로 지울 수 있습니다.

### 2. 판정 규칙(점수)을 바꾸고 싶을 때
`store.js` → `Judge.RULES`

```js
{ label:'욕설·비속어', pts: 38, tone:'red', re:/(씨발|개새|최악이다|...)/g },
{ label:'협박·위협',   pts: 38, tone:'red', re:/(가만\s?안|각오|죽여|...)/g },
```

`pts`가 점수, `re`가 걸리는 표현입니다. 같은 유형이 반복되면 2배까지 가중됩니다.

### 3. 긴급도 순위를 바꾸고 싶을 때
`store.js` → `Judge.URGENCY`, `Judge.MONEY`, `Judge.urgency()`

PRD FR-19대로 **위협 표현 · 금전 · 반복 횟수**로 매깁니다. 감정 단계는 넣지 않습니다.

### 4. 통화 시나리오를 바꾸고 싶을 때
`app.js` → `SCENARIOS`

```js
{ id:'angry', label:'화난 고객', heat:45, ask:'배송 지연 항의 및 환불 요구',
  turns:[['cust','아니 이게 말이 됩니까? ...'],
         ['ai','많이 기다리셨겠어요. ...']] }
```

`heat`가 격앙도 증가분, `ask`가 요약 카드의 "요청" 항목입니다.

### 5. 화면 내용을 바꾸고 싶을 때
`app.js`의 `pageDashboard()` · `pageInquiries()` · `pageChannels()` ·
`pageCustomers()` · `pageCustomer()` · `pageDemo()`

각 함수가 HTML 문자열을 돌려줍니다. 라우팅은 `PAGES` 객체가 `body[data-page]`로 합니다.

### 6. 색·간격을 바꾸고 싶을 때
`style.css` 맨 위 `:root` 토큰만 고치면 전 화면에 반영됩니다.

---

## 백엔드를 붙일 때

화면들은 모두 `Store`만 읽습니다. **`store.js`의 아래 네 곳만 서버 호출로 바꾸면** 나머지는 그대로 동작합니다.

| 함수 | 지금 | 백엔드 연결 후 |
|---|---|---|
| `Store.load()` | localStorage 읽기 | `GET /api/inquiries` |
| `Store.add(text, channel, customer)` | 로컬 배열에 추가 | `POST /api/inquiries` |
| `Store.setHandled(id, how)` | 로컬 플래그 변경 | `PATCH /api/inquiries/:id` |
| `Store.setSetting(k, v)` | 로컬 설정 변경 | `PUT /api/settings` |

서버가 돌려줄 문의 한 건의 모양입니다.

```json
{
  "id": "q12",
  "ts": 1794648000000,
  "customer": "김민수",
  "channel": "채널톡",
  "text": "원문 그대로",
  "score": 66,
  "verdict": "blocked",
  "hits": [{ "label": "협박·위협", "pts": 38, "tone": "red", "words": ["가만 안"] }],
  "topic": { "key": "delivery", "name": "배송 지연", "ico": "🚚" },
  "handled": null
}
```

`score` · `verdict` · `hits` · `topic`을 서버가 안 주면 클라이언트가 `Judge`로 직접 계산하므로,
**`id` · `ts` · `customer` · `channel` · `text` 다섯 개만 있어도 동작합니다.**

`verdict` 값은 `blocked` · `held` · `passed` 셋 중 하나입니다.

### AI 전화 데모 연동
`store.js` → `Phone.pull()`이 아래 경로를 차례로 시도합니다.

```
/api/calls → /calls → /demo/calls → /api/demo/calls → /api/history → /history → /demo
```

응답은 `[...]` 또는 `{calls:[...]}` `{items:[...]}` `{data:[...]}` 모두 받습니다.
통화 한 건에서 읽는 필드는 다음과 같습니다.

```json
{ "id": "c1", "phone": "010-9821-1234", "duration": 252,
  "summary": "요약문", "transcript": "전문", "ts": "2026-11-14T09:00:00Z" }
```

`summary`가 없으면 `transcript` → `text` 순으로 찾습니다.
서버 주소는 **설정 → AI 전화 데모 연동**에서 바꿉니다.

> 브라우저가 다른 주소의 서버를 막습니다(CORS).
> 데모 서버 응답에 `Access-Control-Allow-Origin: *` 헤더를 넣어야 연결됩니다.

---

## 반응형 분기점

| 폭 | 레이아웃 |
|---|---|
| < 768px | 하단 탭바, 전체폭 스택, 고객은 목록 → 상세 이동 |
| 768–1023px | 사이드바 아이콘 레일, 탭바 숨김, 통계 4열 |
| ≥ 1024px | 전체 사이드바, 고객은 목록+상세 2단 분할 |

---

## 확인된 동작

- 10개 페이지 전부 렌더 · 404 0건 · JS 오류 0건
- 폴더 간 이동(루트 ↔ customer ↔ settings) 링크 정상
- 통화 1건 종료 → 현황 3→4, 오늘 처리 18→19, 최근 알림 1위 배치
- 판정 기준 변경 → 쌓인 문의 즉시 재판정
- 전체 비우기 → 0, 더미 다시 채우기 → 18건 복원
