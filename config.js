/* ============================================================
   감정방패 — 설정과 데이터
   코드에 값을 박지 않고 전부 여기 모은다.
   백엔드가 붙으면 이 파일의 seed/rules 를 서버 응답으로 바꾸면 된다.
   ============================================================ */
'use strict';

const CONFIG = {

  /* ---------- 서비스 ---------- */
  brand: {
    name: '감정방패',
    owner: '야근금지연구소',
    mark: '🛡',
    version: '1.0.3',
    email: 'owner@moru.kr',
    plan: 'STANDARD'
  },

  /* 백엔드 주소 — localhost 에서 열면 http://localhost:8000 을 쓴다 (api.js) */
  api: { base: 'https://mawd-server.dlfjstizlzl.dev' },
  /* 업종 → 서버 초기 세팅 템플릿 (GET /v1/onboarding/templates) */
  templateOf: { food:'food_beverage', cafe:'food_beverage', beauty:'beauty', retail:'online_shop',
    stay:'other', service:'other', etc:'other' },

  /* ---------- 업종 ----------
     어떤 종류의 사업 매장인지 — 설정 화면에서 고르고, 사이드바·현황 상단에 표시된다. */
  bizTypes: [
    { id:'food',    icon:'🍜', label:'음식점' },
    { id:'cafe',    icon:'☕', label:'카페·베이커리' },
    { id:'beauty',  icon:'💇', label:'뷰티·미용' },
    { id:'retail',  icon:'🛍️', label:'소매·쇼핑몰' },
    { id:'stay',    icon:'🏨', label:'숙박' },
    { id:'service', icon:'🔧', label:'서비스업' },
    { id:'etc',     icon:'🏪', label:'기타 소상공인' }
  ],

  /* ---------- 메뉴 ----------
     여기만 고치면 사이드바·하단 탭바·활성 표시가 전부 따라온다.
     path 는 루트 기준 상대 경로. */
  menu: [
    { id:'dashboard', icon:'📊', label:'현황',      path:'index.html' },
    { id:'inquiries', icon:'📋', label:'문의',      path:'inquiries.html', badge:'held' },
    { id:'channels',  icon:'💬', label:'채널',      path:'channels.html' },
    { id:'customers', icon:'👤', label:'고객',      path:'customer/list.html' },
    { id:'settings',  icon:'⚙️', label:'설정',      path:'settings/main.html' },
    { id:'demo',      icon:'📞', label:'통화',      path:'demo.html' }
  ],

  /* 메뉴에 없는 하위 페이지 */
  routes: {
    customer:    'customer/detail.html',
    threshold:   'settings/threshold.html',
    setChannels: 'settings/channels.html',
    tone:        'settings/tone.html',
    store:       'settings/store.html',
    onboarding:  'onboarding/onboarding.html',
    login:       'auth/login.html'
  },

  /* ---------- 연동 플랫폼 ----------
     온보딩 첫 단계에서 고른다. kind 로 묶고, 업종 추천에 쓴다. */
  platforms: [
    { id:'musinsa',     apiSource:'musinsa',     icon:'🖤', name:'무신사',              kind:'fashion',
      connect:{ method:'paste', note:'공개된 연동 API를 확인하지 못했어요. 판매자센터 CSV 업로드 또는 데모 모드로 연동할 수 있어요.' } },
    { id:'ably',        apiSource:'ably',        icon:'👗', name:'에이블리',            kind:'fashion',
      connect:{ method:'paste', note:'에이블리 파트너스는 API를 지원하지 않아요. CSV 업로드 또는 데모 모드로 연동할 수 있어요.' } },
    { id:'smartstore',  apiSource:'naver',       icon:'🟢', name:'네이버 스마트스토어', kind:'market',
      connect:{ method:'api',
        help:'스마트스토어센터 → 커머스API에서 발급한 애플리케이션 ID·시크릿을 입력하거나, 데모 데이터로 바로 체험할 수 있어요.',
        fields:[ { key:'client_id',     label:'애플리케이션 ID',     min:3 },
          { key:'client_secret', label:'애플리케이션 시크릿', min:3, secret:true } ] } },
    { id:'coupang',     apiSource:'coupang',     icon:'📦', name:'쿠팡',                kind:'market',
      connect:{ method:'api',
        help:'Wing에서 발급한 Access Key·Secret Key와 업체코드를 입력하거나, 데모 데이터로 바로 체험할 수 있어요.',
        fields:[ { key:'access_key', label:'Access Key', min:3 },
          { key:'secret_key', label:'Secret Key', min:3, secret:true },
          { key:'vendor_id',  label:'업체코드 (Vendor ID)', min:3 } ] } },
    { id:'coupangeats', apiSource:'coupangeats', icon:'🛵', name:'쿠팡이츠',            kind:'delivery',
      connect:{ method:'paste', note:'공식 연동이 없어요. 아이디·비밀번호는 받지 않고, CSV 업로드 또는 데모 모드로 연동해요.' } },
    { id:'baemin',      apiSource:'baemin',      icon:'🍔', name:'배달의민족',          kind:'delivery',
      connect:{ method:'paste', note:'공식 연동이 없어요. 아이디·비밀번호는 받지 않고, CSV 업로드 또는 데모 모드로 연동해요.' } },
    { id:'yogiyo',      apiSource:'yogiyo',      icon:'🍽', name:'요기요',              kind:'delivery',
      connect:{ method:'paste', note:'공식 연동이 없어요. 아이디·비밀번호는 받지 않고, CSV 업로드 또는 데모 모드로 연동해요.' } }
  ],
  /* 연결로 미리 채울 수 있는 사업장 항목 */
  profileFields: [
    { key:'storeName', label:'매장명' },
    { key:'ownerName', label:'사장님 성함' },
    { key:'bizNo',     label:'사업자등록번호' }
  ],
  platformKinds: {
    fashion:  { label:'패션 플랫폼', bizType:'retail' },
    market:   { label:'마켓',        bizType:'retail' },
    delivery: { label:'배달',        bizType:'food'   }
  },

  /* ---------- 기본 설정값 ---------- */
  defaults: {
    thHold:   35,         // 이 점수 이상이면 보류(승인 대기) — 차단 단계는 없고 보류 하나로 통합
    thRepeat: 5,          // 같은 주제가 이 건수를 넘으면 반복 이슈
    thHeat:   40,         // 통화 격앙 기준
    agent:    '도우미',
    tone:     '해요체',
    apiUrl:   '',         // AI 전화 데모 서버 — 설정 화면에서 입력
    bizType:  'food',     // 업종 — 설정 화면에서 선택
    storeName: '',        // 매장명 — 비어 있으면 brand.owner 로 보여준다
    ownerName: '',        // 사장님 성함
    bizNo: '',            // 사업자등록번호 (숫자 10자리)
    platforms: [],        // 연동 플랫폼 — [{ id, connected }]
    onboarded: false      // 온보딩을 마쳤는지
  },

  /* ---------- 고객 표시 규칙 ----------
     이름을 아는 고객 / 번호만 아는 고객 / 아무것도 모르는 고객을
     같은 모양으로 보여주기 위한 설정 */
  person: {
    unknownLabel: '미등록 고객',
    unknownSub:   '식별 정보 없음',
    phoneSub:     '이름 미등록',
    phoneRe:      '^0\\d{1,2}[-\\s]?\\d{3,4}[-\\s]?(\\d{4}|\\*{4})$',
    maskPhone:    true,        // 가운데·뒷자리를 **** 로 가린다
    icons: { name:null, phone:'📞', none:'?' }
  },

  /* ---------- 채널 ---------- */
  channels: {
    /* 문의를 넣을 때 고를 수 있는 채널 */
    options: ['채널톡', '스티비', '인스타그램', '카카오채널', '전화'],
    /* 허브로 쓰는 채널 */
    hub: { icon:'💬', name:'채널톡', desc:'채팅 · 메신저 · 이메일 · 전화 상담' },
    /* 허브에 붙는 기능 */
    addons: [
      { icon:'📞', name:'통화 요약',      desc:'통화 종료 후 전사·요약을 같은 목록으로', stage:'MVP' },
      { icon:'📬', name:'공지 메일 발송', desc:'반복 이슈를 묶어 일괄 안내',             stage:'MVP' },
      { icon:'📷', name:'SNS 댓글 수집', desc:'제공 API 밖 — 별도 연동 필요',           stage:'확장' }
    ]
  },

  /* ---------- 접수 확인 ---------- */
  receipt: {
    message: '문의가 접수되었습니다. 담당자에게 전달했으며 <b>영업일 1일 이내</b> 답변드리겠습니다.',
    note: '사과 · 전달 사실 · 응답 약속 시간만 담습니다. 공감하는 척하거나 약속을 더하지 않습니다.',
    slaOptions: ['영업일 1일 이내', '영업일 3일 이내', '당일 안내'],
    toneOptions: ['해요체', '합쇼체', '간결체']
  },

  /* ---------- 답변 초안 ----------
     승인 대기 카드에 보여줄 초안. 지금은 템플릿 mock — 백엔드가 붙으면 AI 생성 문장으로 바꾼다.
     환불·보상 같은 약속은 담지 않는다 (사장님이 정하는 일). */
  drafts: {
    greet:   '안녕하세요, {store}입니다.',
    byTopic: {
      delivery: '배송 관련 문의 주셔서 감사합니다. 현재 배송 상태를 확인하고 있으며, 확인되는 대로 안내드리겠습니다.',
      refund:   '환불 관련 문의 주셔서 감사합니다. 주문 내역과 처리 상태를 확인한 뒤 안내드리겠습니다.',
      stock:    '재고 관련 문의 주셔서 감사합니다. 재고와 입고 일정을 확인한 뒤 안내드리겠습니다.',
      defect:   '불편을 드려 죄송합니다. 제품 상태를 확인할 수 있도록 사진과 주문 정보를 확인한 뒤 안내드리겠습니다.',
      usage:    '사용법 관련 문의 주셔서 감사합니다. 자세한 방법을 정리해 안내드리겠습니다.'
    },
    /* 위협·법적 조치 — 사과나 약속 없이 기록과 담당자 연락만 */
    serious:  '말씀해 주신 내용은 기록해 두었습니다. 담당자가 내용을 확인한 뒤 직접 연락드리겠습니다.',
    fallback: '문의 주셔서 감사합니다. 내용을 확인한 뒤 담당자가 안내드리겠습니다.',
    closing:  '{sla} 답변드리겠습니다.'
  },

  /* ---------- 알림 ---------- */
  notices: [
    { id:'push',  icon:'🔔', name:'긴급 카드 즉시 알림', desc:'위협 표현 감지 시', on:true },
    { id:'daily', icon:'📬', name:'하루 요약',           desc:'나머지는 묶어서 1회',     on:true }
  ],

  /* ============================================================
     판정 규칙 — 점수
     pts 가 더해질 점수, re 가 걸리는 표현.
     같은 유형이 반복되면 2배까지 가중된다.
     ============================================================ */
  rules: [
    { label:'욕설·비속어', pts: 38, tone:'red',
      re:'(씨발|시발|ㅅㅂ|개새|개같|병신|미친[놈년]|지랄|꺼져|닥쳐|최악이다|사기임|사기꾼|등신)' },
    { label:'협박·위협', pts: 38, tone:'red',
      re:'(가만\\s?안|가만있지|각오|죽여|쳐들어|찾아가|찾아갈|해코지|불지르|가만두지)' },
    { label:'법적 조치 언급', pts: 22, tone:'gold',
      re:'(소비자원|고소|변호사|법적|민사|형사|신고하|공정위|진정)' },
    { label:'여론 압박', pts: 18, tone:'gold',
      re:'(별점|평점|맘카페|커뮤니티|언론|기자|제보|리뷰[^.!?]{0,8}(깎|테러|도배|내리|남길|쓸)|SNS[^.!?]{0,6}올)' },
    { label:'반복 요구', pts: 14, tone:'gold',
      re:'(몇\\s?번째|도대체|아직도|계속|또\\s|다시\\s)' },
    { label:'무리한 요구', pts: 10, tone:'gold',
      re:'(당장|무조건|그냥\\s?환불|전액|즉시)' },
    { label:'감정 격화', pts: 10, tone:'gold',
      re:'(!{2,}|\\?{2,}|ㅡㅡ|어이가\\s?없|황당|열받)' },
    { label:'정중한 표현', pts:-12, tone:'green',
      re:'(죄송|감사|부탁드립니다|문의드립니다|안녕하세요|확인\\s?부탁)' },
    { label:'긍정 표현', pts:-20, tone:'green',
      re:'(좋아요|이뻐요|예뻐요|만족|재구매|최고|잘\\s?받았)' }
  ],

  /* ---------- 문의 주제 ---------- */
  topics: [
    { key:'delivery', icon:'🚚', name:'배송 지연',   re:'(배송|택배|발송|도착|언제\\s?와|운송장)' },
    { key:'refund',   icon:'💸', name:'환불 항의',   re:'(환불|반품|취소|결제\\s?취소|돈\\s?돌려)' },
    { key:'stock',    icon:'📦', name:'재고 문의',   re:'(재고|품절|입고|재입고|사이즈)' },
    { key:'defect',   icon:'🔧', name:'제품 하자',   re:'(불량|고장|파손|하자|깨져|망가)' },
    { key:'usage',    icon:'📘', name:'사용법 문의', re:'(사용법|어떻게\\s?쓰|설명서|방법)' }
  ],

  /* ============================================================
     긴급도 — PRD FR-19
     위협 표현 · 금전 · 반복 횟수로 매긴다. 감정 단계는 넣지 않는다.
     ============================================================ */
  urgency: {
    byRule: [
      { label:'협박·위협',      pts: 40 },
      { label:'법적 조치 언급', pts: 35 },
      { label:'여론 압박',      pts: 30 }
    ],
    money:      { pts: 25, re:'(환불|결제|입금|송금|배상|보상|청구|과금|취소)' },
    perRepeat:  { pts: 8, max: 5 },     // 반복 1회당 8점, 5회까지
    byChannel:  { '전화': 12 },          // 전화는 부담이 커서 가중
    levels: [
      { min: 60, label:'긴급', tone:'red' },
      { min: 30, label:'주의', tone:'gold' },
      { min:  0, label:'보통', tone:'gray' }
    ]
  },

  /* ============================================================
     통화 시나리오 — 고객 통화 화면의 버튼
     heat 가 격앙도 증가분, ask 가 요약 카드의 "요청" 항목
     ============================================================ */
  scenarios: [
    { id:'hours', label:'영업시간 문의', heat:0, ask:'영업시간 확인', say:'영업시간이 어떻게 돼요?',
      turns:[['cust','거기 몇 시까지 하나요?'],
        ['ai','평일은 10시부터 18시까지 운영해요. 주말은 쉽니다.']] },

    { id:'order', label:'주문 조회', heat:5, ask:'주문 배송 상태 확인', say:'주문한 머그컵 언제 와요?',
      turns:[['cust','어제 주문한 거 어떻게 됐는지 확인 좀 해주세요'],
        ['ai','주문번호 알려주시면 바로 확인해 드릴게요.']] },

    { id:'verify', label:'본인 확인', heat:0, ask:'주문자 본인 확인', say:'주문번호 1234 뒷자리 5678이요',
      turns:[['cust','주문번호 1234 뒷자리 5678이요'],
        ['ai','확인됐습니다. 도와드릴게요.']] },

    { id:'angry', label:'화난 고객', heat:45, ask:'배송 지연 항의 및 환불 요구', say:'아니 진짜 짜증나네요 벌써 며칠째예요 당장 환불해 주세요!!',
      turns:[['cust','아니 이게 말이 됩니까? 배송이 일주일째 안 오는데 도대체 언제 오나요??'],
        ['ai','많이 기다리셨겠어요. 바로 확인해서 사장님께 전달드릴게요.']] },

    { id:'legal', label:'법적 조치 언급', heat:40, ask:'법적 조치 언급 — 기록 보존 필요', say:'소비자원에 신고하겠습니다. 변호사랑 얘기 중이니 각오하세요',
      turns:[['cust','소비자원에 신고하겠습니다. 변호사랑 얘기 중이니 각오하세요'],
        ['ai','말씀 주신 내용은 그대로 기록해서 담당자에게 전달드릴게요.']] },

    { id:'close', label:'통화 마무리', heat:0, ask:'대화 종료', say:'네 알겠어요 끊을게요',
      turns:[['cust','네 알겠어요 끊을게요'],
        ['ai','문의해 주셔서 감사합니다.']] }
  ],

  /* 통화 요약 카드의 추천 대응 — 쓰인 시나리오에 따라 고른다 */
  advice: [
    { when:'legal', text:'기록을 보존하고 담당자가 직접 연락하세요. 자동 발송을 멈췄습니다.',
      threat:'법적 조치 언급 1회' },
    { when:'angry', text:'배송 지연을 먼저 사과하고 환불 처리 일정을 명확히 안내하세요.',
      threat:'리뷰 압박 언급 1회' },
    { when:null,    text:'정상 문의입니다. 일반 응대로 충분합니다.', threat:'없음' }
  ],

  /* 통화 데모에서 전화를 끊을 때 고객 이름으로 쓸 후보 — 전화번호 대신 이름으로 표시 */
  callerNames: [
    '김도윤', '이하은', '박서준', '최지우', '정예은',
    '강민준', '조유나', '윤시우', '장채원', '임도현'
  ],

  /* 채널톡 채팅 탭의 예시 문장 */
  samples: [
    ['영업시간',  '영업시간이 어떻게 되나요?'],
    ['주문 조회', '주문한 머그컵 언제 와요?'],
    ['본인 확인', '주문번호 1234 / 010-1111-5678 입니다'],
    ['불만 고조', '아 진짜 짜증나네 일주일째 안 오는데 당장 환불해줘요!!'],
    ['법적 조치', '소비자원에 신고하겠습니다. 변호사랑 얘기 중이니 각오하세요.'],
    ['욕설·비방', '진짜 최악이다 ㅋㅋ 다신 안 삼 여기 사람들 주의하세요 사기임'],
    ['칭찬',      '제품 너무 이뻐요 ㅠㅠ 잘 받았습니다 재구매 의사 100%']
  ],

  /* ============================================================
     더미 데이터 — [몇 분 전, 고객, 채널, 문의 내용]
     점수·판정·주제는 자동 계산되므로 문장만 넣으면 된다.
     백엔드가 붙으면 이 배열을 비우면 된다.
     ============================================================ */
  seed: [
    [  4, '김민수', '채널톡',     '당장 전화받아라 아니면 가만 안 둔다 리뷰 다 깎아버릴거야'],
    [ 12, '조현우', '스티비',     '소비자원에 신고하겠습니다. 변호사랑 얘기 중이니 각오하세요.'],
    [ 23, '최유진', '인스타그램', '진짜 최악이다 ㅋㅋ 다신 안 삼 여기 사람들 주의하세요 사기임'],
    [ 31, '김민수', '채널톡',     '환불 아직도 안 됐는데 도대체 언제 해주나요?? 몇 번째 묻는지 모르겠네요'],
    [ 48, '배수진', '전화',       '배송이 일주일째 안 오는데 환불해 주세요. 계속 기다리라고만 하시네요'],
    [ 62, '이서연', '채널톡',     '안녕하세요, 어제 주문한 제품 배송 조회가 안 되는데 확인 부탁드립니다.'],
    [ 75, '박지훈', '스티비',     '제품 사용법 설명서가 안 들어있어서요. 어떻게 쓰는지 알려주실 수 있나요?'],
    [ 88, '정하늘', '채널톡',     '배송 언제쯤 도착할까요? 운송장 번호 알려주시면 감사하겠습니다'],
    [ 96, '한지수', '인스타그램', '제품 너무 이뻐요 ㅠㅠ 잘 받았습니다 재구매 의사 100%'],
    [112, '오세훈', '채널톡',     '사이즈 교환 가능한가요? 한 치수 큰 걸로 부탁드립니다'],
    [128, '이서연', '채널톡',     '재고 언제 들어오나요? 품절이라고 떠서 문의드립니다'],
    [141, '강민지', '스티비',     '결제가 두 번 된 것 같은데 확인 부탁드려요'],
    [155, '윤도현', '채널톡',     '배송 지연 안내 받았는데 언제쯤 발송되나요'],
    [168, '서아람', '인스타그램', '색상 실물이랑 많이 다른가요? 구매 전에 여쭤봅니다'],
    [182, '정민재', '전화',       '주문한 상품이 파손돼서 왔습니다. 교환 절차 알려주세요'],
    [196, '노은비', '채널톡',     '주문 확인 메일이 안 와서요. 정상 접수된 게 맞을까요?'],
    [210, '임채원', '스티비',     '배송지 변경하고 싶은데 아직 가능할까요'],
    [228, '배수호', '채널톡',     '감사합니다 덕분에 잘 해결됐어요 :)']
  ],

  /* AI 전화 데모 서버에서 통화를 찾을 때 시도할 경로 */
  callPaths: ['/api/calls', '/calls', '/demo/calls', '/api/demo/calls',
    '/api/history', '/history', '/demo'],

  /* ============================================================
     매장 설정 — 실제 백엔드(테스트 콘솔) 스키마
     ============================================================ */
  storeSettings: {
    days: [
      { key:'mon', label:'월' }, { key:'tue', label:'화' }, { key:'wed', label:'수' },
      { key:'thu', label:'목' }, { key:'fri', label:'금' },
      { key:'sat', label:'토' }, { key:'sun', label:'일' }
    ],

    sections: [
      { id:'response', api:'response', icon:'🧭', label:'응대 정책', ready:true, live:true,
        note:'AI 응대 on/off, 채널, 격앙 기준, 사장님 답변 약속 시간, 채팅 자동 마무리 · 저장하면 다음 메시지(턴)부터 반영됩니다.' },
      { id:'persona', api:'persona', icon:'🗣', label:'말투', ready:true, live:true,
        note:'AI 이름, 존댓말 수준, 답변 길이, 금지 표현' },
      { id:'hours', api:'hours', icon:'🕐', label:'영업시간', ready:true, live:true,
        note:'AI는 24시간 응대하고, 영업시간은 사장님 연락 예정 시각 안내에만 쓰여요' },
      { id:'voice', api:'voice', icon:'📞', label:'전화 응대', ready:true, live:true,
        note:'음성 엔진(Vapi/OpenAI/브라우저), 말 속도, 끼어들기, 폭언 경고 횟수' },
      { id:'ai', api:'ai', icon:'🤖', label:'AI 모델', ready:true, live:true,
        note:'Liner 라우터 모델, 판단 엔진(Bivia/LLM), RAG 검색 설정' },
      { id:'data-access', api:'data-access', icon:'📦', label:'주문 조회', ready:true, live:true,
        note:'본인 확인 규칙, 택배사 실시간 배송 조회 허용 여부' },
      { id:'instagram', api:'instagram', icon:'📷', label:'인스타 댓글', ready:true, live:true,
        note:'연결된 인스타 계정의 악성 댓글 자동 숨김 · 일반 문의 공개 답글 설정' },
      { id:'notifications', api:'notifications', icon:'🔔', label:'알림', ready:true, live:true,
        note:'우선순위 기준, 조용한 시간, 푸시 알림 설정' },
      { id:'issues', api:'issues', icon:'♻️', label:'반복 이슈', ready:true, live:true,
        note:'동일 주제 반복 감지 건수 · 집계 기간' },
      { id:'knowledge', api:'context-docs / faqs', icon:'📚', label:'매장 지식 · FAQ', ready:true, live:true,
        note:'AI가 답변 근거로 참조하는 매장 소개 · 상품 · 운영 정책 · FAQ' }
    ],

    defaults: {
      response: {
        ai_enabled: true,
        channels: { chat: true, call: true },
        heat_threshold: 40,
        heat_labels: { high: 40, very_high: 70 },
        min_confidence: 0.6,
        require_grounding: true,
        max_ai_replies_per_inquiry: 5,
        owner_reply_sla_minutes: 60,
        chat_idle_minutes: 10,
        debounce_seconds: 5,
        ai_disclosure: { enabled: true, text: 'AI 상담 도우미입니다.' }
      },
      persona: {
        assistant_name: '도우미',
        formality: 'polite',
        emoji: false,
        max_reply_chars: 300,
        style_notes: '',
        banned_phrases: ['환불해 드리겠습니다', '보상해 드리겠습니다', '책임지겠습니다']
      },
      hours: {
        timezone: 'Asia/Seoul',
        weekly: {
          mon: { open:'10:00', close:'19:00' }, tue: { open:'10:00', close:'19:00' },
          wed: { open:'10:00', close:'19:00' }, thu: { open:'10:00', close:'19:00' },
          fri: { open:'10:00', close:'19:00' },
          sat: { open:null, close:null }, sun: { open:null, close:null }
        },
        holidays: []
      },
      voice: {
        enabled: true,
        tts: { engine: 'vapi', voice_name: 'coral', rate: 1.15, pitch: 1, instructions: '차분하고 따뜻하게' },
        silence_ms: 1200,
        barge_in: true,
        abuse_turn_limit: 3,
        max_call_minutes: 10,
        recording_notice: true
      },
      ai: {
        model: 'liner-gpt-router',
        judge: 'bivia',
        monthly_budget_usd: null
      },
      'data-access': {
        enabled: true,
        tools: { lookup_order: true, find_orders: true, customer_history: true, track_shipment: true },
        max_verify_attempts: 3,
        max_lookups_per_inquiry: 10
      },
      instagram: {
        enabled: true,
        auto_hide: 'abusive',
        hide_heat_gte: 80,
        auto_reply: true
      },
      notifications: {
        min_heat_to_notify: 0,
        quiet_hours: { enabled: false, start: '22:00', end: '08:00' },
        priority: { urgent_heat_gte: 70, high_heat_gte: 40, risk_flag_is_urgent: true, handoff_is_high: true },
        push: { enabled: true }
      },
      issues: {
        enabled: true,
        min_inquiries: 3,
        window_hours: 24,
        default_recipients: 'involved'
      }
    },

    fields: {
      response: [
        { path:'ai_enabled', type:'toggle',
          desc:'AI 응대 전체 스위치. false면 모든 문의를 카드로만 전달' },
        { path:'channels', type:'group', desc:'채널별 AI 응대 켜기/끄기',
          children:[
            { key:'chat', type:'toggle' },
            { key:'call', type:'toggle' }
          ] },
        { path:'heat_threshold', type:'number', min:0, max:100, unit:'점',
          desc:'이 점수 이상이면 격앙(B) 처리' },
        { path:'heat_labels', type:'group',
          desc:'카드에 보여줄 라벨 경계 (보통 < high ≤ 높음 < very_high ≤ 매우 높음)',
          children:[
            { key:'high', type:'number', min:0, max:100 },
            { key:'very_high', type:'number', min:0, max:100 }
          ] },
        { path:'min_confidence', type:'number', min:0, max:1, step:0.05,
          desc:'판단 확신이 이보다 낮으면 보류(C)' },
        { path:'require_grounding', type:'toggle',
          desc:'정책 문서 · 데이터 근거가 없으면 자동 답변 금지' },
        { path:'max_ai_replies_per_inquiry', type:'number', min:1, max:50, unit:'회',
          desc:'한 문의에서 AI가 보낼 수 있는 최대 메시지 수' },
        { path:'owner_reply_sla_minutes', type:'number', min:5, max:4320, unit:'분',
          desc:'고객에게 안내할 사장님 답변 예정 시간 ({sla} 변수)' },
        { path:'chat_idle_minutes', type:'number', min:1, max:1440, unit:'분',
          desc:'채팅에서 고객이 이만큼 말이 없으면 대화를 마무리하고 요약 카드 생성' },
        { path:'debounce_seconds', type:'number', min:1, max:30, unit:'초',
          desc:'연속 메시지를 묶어 분석하는 대기 시간' },
        { path:'ai_disclosure', type:'group', desc:'첫 응답의 AI 고지 문구',
          children:[
            { key:'enabled', type:'toggle' },
            { key:'text', type:'text' }
          ] }
      ],
      persona: [
        { path:'assistant_name', type:'text', desc:'AI가 스스로를 부르는 이름' },
        { path:'formality', type:'select', desc:'존댓말 수준',
          options:[ { value:'formal', label:'하십시오체' },
            { value:'polite', label:'해요체' },
            { value:'casual', label:'반말' } ] },
        { path:'emoji', type:'toggle', desc:'답변에 이모지 사용' },
        { path:'max_reply_chars', type:'number', min:50, max:1000, unit:'자',
          desc:'답변 최대 길이' },
        { path:'style_notes', type:'textarea',
          desc:'자유 지침 (예: "제품명은 영문으로")', placeholder:'예: "제품명은 영문으로"' },
        { path:'banned_phrases', type:'textarea', lines:true,
          desc:'AI 출력에 나오면 전송을 막는 표현 (한 줄에 하나)', placeholder:'환불해 드리겠습니다' }
      ],
      hours: [
        { path:'timezone', type:'text', readonly:true, desc:'영업시간 기준 시간대' },
        { path:'weekly', type:'weekly', desc:'요일별 여는 시간 · 닫는 시간 (AI 응대와 무관, 안내용)' },
        { path:'holidays', type:'textarea', lines:true,
          desc:'휴무일 — YYYY-MM-DD, 한 줄에 하나', placeholder:'2026-12-25' }
      ],
      voice: [
        { path:'enabled', type:'toggle', desc:'AI 전화 응대 활성화' },
        { path:'tts.engine', type:'select', desc:'음성 합성/통화 엔진',
          options:[
            { value:'vapi', label:'Vapi (실시간 통화)' },
            { value:'openai', label:'서버 TTS + 브라우저 인식' },
            { value:'browser', label:'브라우저 내장 음성' }
          ] },
        { path:'tts.voice_name', type:'select', desc:'OpenAI/서버 TTS 목소리',
          options:[
            { value:'coral', label:'coral (따뜻함)' }, { value:'nova', label:'nova' },
            { value:'alloy', label:'alloy' }, { value:'ash', label:'ash' },
            { value:'sage', label:'sage' }, { value:'shimmer', label:'shimmer' },
            { value:'echo', label:'echo' }, { value:'onyx', label:'onyx' }
          ] },
        { path:'tts.rate', type:'number', min:0.5, max:2, step:0.05, desc:'말 속도 (0.5 ~ 2.0)' },
        { path:'tts.instructions', type:'text', desc:'말투 지시 (예: 차분하고 따뜻하게)' },
        { path:'barge_in', type:'toggle', desc:'AI가 말하는 중 고객이 말하면 즉시 멈춤' },
        { path:'recording_notice', type:'toggle', desc:'통화 시작 시 AI 응대 · 녹음 고지' },
        { path:'silence_ms', type:'number', min:300, max:3000, step:100, unit:'ms', desc:'발화 종료 대기 시간' },
        { path:'abuse_turn_limit', type:'number', min:1, max:10, unit:'회', desc:'연속 욕설 시 경고 후 종료 횟수' },
        { path:'max_call_minutes', type:'number', min:1, max:60, unit:'분', desc:'최대 통화 시간' }
      ],
      ai: [
        { path:'model', type:'select', desc:'Liner API 라우터 모델',
          options:[
            { value:'liner-gpt-router', label:'GPT (liner-gpt-router)' },
            { value:'liner-claude-router', label:'Claude (liner-claude-router)' },
            { value:'liner-gemini-router', label:'Gemini (liner-gemini-router)' }
          ] },
        { path:'judge', type:'select', desc:'고객 발화 감정·위험 판단 엔진',
          options:[
            { value:'bivia', label:'Bivia (실패 시 LLM)' },
            { value:'llm', label:'LLM 직접 판단' },
            { value:'liner_decisions', label:'Liner Decisions' }
          ] },
        { path:'monthly_budget_usd', type:'number', min:0, step:1, unit:'USD', desc:'월 AI 비용 상한 (비우면 무제한)' }
      ],
      'data-access': [
        { path:'enabled', type:'toggle', desc:'AI 주문 데이터 조회 허용' },
        { path:'tools', type:'group', desc:'AI가 쓸 수 있는 조회 도구',
          children:[
            { key:'lookup_order', type:'toggle' },
            { key:'find_orders', type:'toggle' },
            { key:'customer_history', type:'toggle' },
            { key:'track_shipment', type:'toggle' }
          ] },
        { path:'max_verify_attempts', type:'number', min:1, max:5, unit:'회', desc:'본인 확인 실패 허용 횟수' },
        { path:'max_lookups_per_inquiry', type:'number', min:1, max:30, unit:'회', desc:'문의당 최대 조회 횟수' }
      ],
      instagram: [
        { path:'enabled', type:'toggle', desc:'연결된 인스타 계정의 댓글을 AI가 처리' },
        { path:'auto_hide', type:'select', desc:'악성/격앙 댓글 자동 숨김 기준',
          options:[
            { value:'abusive', label:'욕설·비하만 자동 숨김' },
            { value:'abusive_or_heated', label:'욕설 또는 격앙 점수 초과 시 숨김' },
            { value:'off', label:'자동 숨김 안 함' }
          ] },
        { path:'hide_heat_gte', type:'number', min:0, max:100, unit:'점', desc:'격앙 숨김 점수 기준' },
        { path:'auto_reply', type:'toggle', desc:'일반 문의 댓글에 AI 공개 답글' }
      ],
      notifications: [
        { path:'min_heat_to_notify', type:'number', min:0, max:100, unit:'점', desc:'이 점수 이상일 때만 알림 생성' },
        { path:'quiet_hours', type:'group', desc:'조용한 시간 (긴급 제외 무음/배지 처리)',
          children:[
            { key:'enabled', type:'toggle' },
            { key:'start', type:'text' },
            { key:'end', type:'text' }
          ] },
        { path:'priority', type:'group', desc:'감정 점수 → 우선순위 기준',
          children:[
            { key:'urgent_heat_gte', type:'number', min:0, max:100 },
            { key:'high_heat_gte', type:'number', min:0, max:100 },
            { key:'risk_flag_is_urgent', type:'toggle' },
            { key:'handoff_is_high', type:'toggle' }
          ] },
        { path:'push.enabled', type:'toggle', desc:'모바일/브라우저 FCM 푸시 알림' }
      ],
      issues: [
        { path:'enabled', type:'toggle', desc:'반복 이슈 자동 감지' },
        { path:'min_inquiries', type:'number', min:2, max:50, unit:'건', desc:'이 건수 이상 유사 문의 시 이슈 제안' },
        { path:'window_hours', type:'number', min:1, max:168, unit:'시간', desc:'집계 기간' },
        { path:'default_recipients', type:'select', desc:'공지 메일 기본 수신 대상',
          options:[
            { value:'involved', label:'문의한 고객만' },
            { value:'involved_and_list', label:'문의 고객 + 전체 구독자' }
          ] }
      ]
    }
  }
};
