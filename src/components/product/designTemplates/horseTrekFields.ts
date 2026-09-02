import type { DesignSectionDef, DesignTemplateField } from './types';

/**
 * 「몽골 승마 트레킹 상세페이지」 디자인의 편집 가능 필드 목록.
 * default는 원본 디자인(몽골 승마 트레킹 상세페이지.dc.html)의 문구를 그대로 옮긴 것.
 * 줄바꿈이 있는 textarea 값은 \n 그대로 화면에 줄바꿈으로 표시된다.
 */
export const horseTrekFields: DesignTemplateField[] = [
    // ── 01 오프닝 ──────────────────────────────────────────────
    { key: 'op_line1', label: '상단 문구', type: 'text', section: '01 오프닝', default: '旅行終了,' },
    { key: 'op_line2', label: '메인 문구', type: 'text', section: '01 오프닝', default: '冒険の始まり' },
    { key: 'op_bg1', label: '배경 사진 1 (순환)', type: 'image', section: '01 오프닝' },
    { key: 'op_bg2', label: '배경 사진 2 (순환)', type: 'image', section: '01 오프닝' },
    { key: 'op_bg3', label: '배경 사진 3 (순환)', type: 'image', section: '01 오프닝' },

    // ── 02 별하늘 히어로 ──────────────────────────────────────
    { key: 'hero_kicker', label: '작은 제목', type: 'text', section: '02 별하늘 히어로', default: '世界三大星空観測地・モンゴル' },
    { key: 'hero_title', label: '큰 제목', type: 'text', section: '02 별하늘 히어로', default: '毎晩、星空観賞' },
    { key: 'hero_body', label: '본문', type: 'textarea', section: '02 별하늘 히어로', default: '街の明かりが届かない、モンゴルの夜。\n手を伸ばせば届きそうなほど、降り注ぐ満天の星。\n今、星にいちばん近い夜を過ごしてみませんか。' },
    { key: 'hero_bg', label: '배경 사진 (은하수 아래 게르)', type: 'image', section: '02 별하늘 히어로' },
    { key: 'hero_img1', label: '하단 사진 1 (밤 캠프)', type: 'image', section: '02 별하늘 히어로' },
    { key: 'hero_img2', label: '하단 사진 2 (별 관측)', type: 'image', section: '02 별하늘 히어로' },

    // ── 03 소개 배너 ──────────────────────────────────────────
    { key: 'intro_title', label: '제목', type: 'text', section: '03 소개 배너', default: '本物のモンゴルに出会う。' },
    { key: 'intro_body', label: '본문', type: 'textarea', section: '03 소개 배너', default: 'ありきたりな旅は嫌だけど、\n新しい体験には少し不安を感じていませんか？\nMilkyway Mongoliaと一緒に、\n冒険の世界へ、安心して一歩踏み出そう。' },
    { key: 'intro_bg', label: '배경 사진 (산맥 아래 초원)', type: 'image', section: '03 소개 배너' },

    // ── 04 이용자 특전 ────────────────────────────────────────
    { key: 'perks_title', label: '제목', type: 'text', section: '04 이용자 특전', default: '2026年夏ツアーご利用者限定特典' },
    { key: 'perks_sub', label: '부제', type: 'text', section: '04 이용자 특전', default: '― 4月〜10月出発のツアーが対象 ―' },
    { key: 'perk1_img', label: '특전 1 사진', type: 'image', section: '04 이용자 특전' },
    { key: 'perk1_title', label: '특전 1 제목', type: 'text', section: '04 이용자 특전', default: '空港送迎サービス' },
    { key: 'perk1_sub', label: '특전 1 설명', type: 'text', section: '04 이용자 특전', default: '往復1回無料' },
    { key: 'perk2_img', label: '특전 2 사진', type: 'image', section: '04 이용자 특전' },
    { key: 'perk2_title', label: '특전 2 제목', type: 'text', section: '04 이용자 특전', default: 'コーヒーモカポット' },
    { key: 'perk2_sub', label: '특전 2 설명', type: 'text', section: '04 이용자 특전', default: '6名様以下のグループ限定' },
    { key: 'perk3_img', label: '특전 3 사진', type: 'image', section: '04 이용자 특전' },
    { key: 'perk3_title', label: '특전 3 제목', type: 'text', section: '04 이용자 특전', default: 'キャンプ用チェア＆テーブル' },
    { key: 'perk3_sub', label: '특전 3 설명', type: 'text', section: '04 이용자 특전', default: '6名様以下のグループ限定' },
    { key: 'perk4_img', label: '특전 4 사진', type: 'image', section: '04 이용자 특전' },
    { key: 'perk4_title', label: '특전 4 제목', type: 'text', section: '04 이용자 특전', default: 'モンゴル・ラクダソックス' },
    { key: 'perk4_sub', label: '특전 4 설명', type: 'text', section: '04 이용자 특전', default: '6名様以下のグループ限定' },
    { key: 'perk5_img', label: '특전 5 사진', type: 'image', section: '04 이용자 특전' },
    { key: 'perk5_title', label: '특전 5 제목', type: 'text', section: '04 이용자 특전', default: '毎日ミネラルウォーターをご提供' },
    { key: 'perk5_sub', label: '특전 5 설명', type: 'text', section: '04 이용자 특전', default: '※合計1L' },
    { key: 'perk6_img', label: '특전 6 사진', type: 'image', section: '04 이용자 특전' },
    { key: 'perk6_title', label: '특전 6 제목', type: 'text', section: '04 이용자 특전', default: '早朝の天の川ハンティング' },
    { key: 'perk6_sub', label: '특전 6 설명', type: 'text', section: '04 이용자 특전', default: '6名様以下のグループ限定' },
    { key: 'perk_air_img', label: '공항 배너 사진', type: 'image', section: '04 이용자 특전' },
    { key: 'perk_air_title', label: '공항 배너 제목', type: 'text', section: '04 이용자 특전', default: '투어 진행 날에 속하는 공항 이동 무료' },
    { key: 'perk_air_note', label: '공항 배너 설명', type: 'textarea', section: '04 이용자 특전', default: '* 본 투어 일정 외 이용 시 *\n공항 - 시내 편도 8만원/6명' },

    // ── 05 여행 고민 (말풍선) ─────────────────────────────────
    { key: 'worry_kicker', label: '작은 제목', type: 'text', section: '05 여행 고민', default: 'モンゴル旅行の計画…' },
    { key: 'worry_title', label: '제목', type: 'text', section: '05 여행 고민', default: 'こんな経験、きっと一度はありませんか？' },
    { key: 'worry1', label: '말풍선 1', type: 'textarea', section: '05 여행 고민', default: '一体いつ返事が来るの？返信が遅すぎる… 😧' },
    { key: 'worry2', label: '말풍선 2', type: 'textarea', section: '05 여행 고민', default: '安いと思ってたのに、現地で結局いろいろ追加料金がかかるんだ…' },
    { key: 'worry3', label: '말풍선 3', type: 'textarea', section: '05 여행 고민', default: '日本語が全然通じなくて、不安だし不便でした… 😵' },
    { key: 'worry4', label: '말풍선 4', type: 'textarea', section: '05 여행 고민', default: 'お湯が出ないって本当？🥶 私、冷たい水でシャワーなんて無理〜😭' },
    { key: 'worry5', label: '말풍선 5', type: 'textarea', section: '05 여행 고민', default: 'えっ…ゲルのトイレって汲み取り式なの！？😨' },

    // ── 06 숙소 ───────────────────────────────────────────────
    { key: 'ger_kicker', label: '작은 제목', type: 'text', section: '06 숙소', default: 'モンゴリア銀河は、違う。' },
    { key: 'ger_sub', label: '부제', type: 'text', section: '06 숙소', default: '現地視察を重ね、私たちが実際に確かめて選びました。' },
    { key: 'ger_title1', label: '제목 첫 줄', type: 'text', section: '06 숙소', default: '旅行者キャンプでも、追加料金なしで' },
    { key: 'ger_title2', label: '제목 강조 줄', type: 'text', section: '06 숙소', default: '高級ゲルに宿泊' },
    { key: 'ger_img1', label: '사진 1 (게르 내부)', type: 'image', section: '06 숙소' },
    { key: 'ger_img2', label: '사진 2 (화장실)', type: 'image', section: '06 숙소' },
    { key: 'ger_img3', label: '사진 3 (샤워실)', type: 'image', section: '06 숙소' },
    { key: 'ger_img4', label: '사진 4 (고급형 게르)', type: 'image', section: '06 숙소' },
    { key: 'ger_check1', label: '체크 항목 1', type: 'text', section: '06 숙소', default: '温水シャワー (ゲル内)' },
    { key: 'ger_check2', label: '체크 항목 2', type: 'text', section: '06 숙소', default: '洋式トイレ (ゲル内)' },
    { key: 'ger_check3', label: '체크 항목 3', type: 'text', section: '06 숙소', default: '電気使用可能' },
    { key: 'ger_note', label: '하단 주석', type: 'text', section: '06 숙소', default: '一般ゲルと高級ゲルでは、室内設備の充実度や快適さに違いがあります。' },

    // ── 07 루트 소개 + 지도 ───────────────────────────────────
    { key: 'route_intro_title', label: '인트로 제목', type: 'text', section: '07 루트/지도', default: 'それでは、ツアーで訪れる場所を詳しく見ていきましょう。' },
    { key: 'route_intro_p1', label: '인트로 문단 1', type: 'textarea', section: '07 루트/지도', default: '新しくリニューアルしたツアー日程です。' },
    { key: 'route_intro_p2', label: '인트로 문단 2', type: 'textarea', section: '07 루트/지도', default: 'モンゴルを代表する絶景を、一度に満喫できる旅です。' },
    { key: 'route_wide_img', label: '와이드 사진', type: 'image', section: '07 루트/지도' },
    { key: 'route_card_title', label: '지도 카드 제목', type: 'text', section: '07 루트/지도', default: '旅行ルート情報' },
    {
        key: 'map_stops', label: '지도 경유지', type: 'map-stops', section: '07 루트/지도',
        default: '울란바토르|ウランバートル\n체체를렉 초원|ツェツェルレグ草原\n쳉헤르 온천|ツェンヘル温泉\n테를지 국립공원|テレルジ国立公園',
        help: '한 줄에 한 곳: 지역명|표시문구|사진URL|위도,경도 (사진·좌표 생략 가능). 울란바토르·테를지·홉스굴·카라코룸·고비 등 주요 관광지는 이름만 넣으면 지도에 자동 표시되고, 미등록 지역은 마지막에 위도,경도를 넣으면 그 위치에 표시됩니다. 예: 새 캠프|新キャンプ||47.5,105.2',
    },
    { key: 'spots_label', label: '관광 스팟 라벨', type: 'text', section: '07 루트/지도', default: 'ツアーで訪れる観光スポット' },
    { key: 'spots_hint', label: '스와이프 안내', type: 'text', section: '07 루트/지도', default: '横にスワイプしてご覧ください →' },

    // ── 08 방문 여행지 카드 ──────────────────────────────────
    {
        key: 'spot_cards', label: '방문 여행지', type: 'spot-cards', section: '08 방문 여행지',
        default: 'ウランバートル|\nツェンヘル温泉|\nテレルジ国立公園|',
        help: '한 줄에 한 곳: 표시이름|사진URL. 「관광지 마스터에서 추가」를 누르면 이름과 대표 사진이 자동으로 들어갑니다.',
    },

    // ── 09 고비 히어로 ────────────────────────────────────────
    { key: 'gobi_hero_img', label: '배경 사진', type: 'image', section: '09 고비 히어로' },
    { key: 'gobi_kicker', label: '작은 제목', type: 'text', section: '09 고비 히어로', default: '최대한 빠르게 고비 핵심을 둘러보고 싶다면' },
    { key: 'gobi_title', label: '큰 제목 1줄', type: 'text', section: '09 고비 히어로', default: '고비 4박 5일' },
    { key: 'gobi_title2', label: '큰 제목 2줄', type: 'text', section: '09 고비 히어로', default: '시그니처 코스' },
    { key: 'gobi_body', label: '본문', type: 'textarea', section: '09 고비 히어로', default: '바가가즈링출로 + 욜링암\n고비 + 바양작 + 차강소브라가' },

    // ── 10 하이라이트 ─────────────────────────────────────────
    { key: 'hl_title', label: '제목', type: 'text', section: '10 하이라이트', default: '旅程のハイライト' },
    { key: 'hl_hint', label: '스와이프 안내', type: 'text', section: '10 하이라이트', default: '横にスワイプしてご覧ください →' },
    { key: 'pt1_img', label: '포인트 1 사진', type: 'image', section: '10 하이라이트' },
    { key: 'pt1_caption', label: '포인트 1 캡션', type: 'text', section: '10 하이라이트', default: '遊牧民ゲル訪問' },
    { key: 'pt2_img', label: '포인트 2 사진', type: 'image', section: '10 하이라이트' },
    { key: 'pt2_caption', label: '포인트 2 캡션', type: 'text', section: '10 하이라이트', default: '乗馬体験' },
    { key: 'pt3_img', label: '포인트 3 사진', type: 'image', section: '10 하이라이트' },
    { key: 'pt3_caption', label: '포인트 3 캡션', type: 'text', section: '10 하이라이트', default: 'ラクダ乗り体験' },
    { key: 'pt4_img', label: '포인트 4 사진', type: 'image', section: '10 하이라이트' },
    { key: 'pt4_caption', label: '포인트 4 캡션', type: 'text', section: '10 하이라이트', default: 'モンゴル伝統衣装体験' },
    { key: 'pt5_img', label: '포인트 5 사진', type: 'image', section: '10 하이라이트' },
    { key: 'pt5_caption', label: '포인트 5 캡션', type: 'text', section: '10 하이라이트', default: 'イヌワシを腕に乗せて記念撮影' },
    { key: 'and_word', label: '연결 문구', type: 'text', section: '10 하이라이트', default: 'そして,' },

    // ── 11 은하수 ─────────────────────────────────────────────
    { key: 'mw_img', label: '은하수 사진', type: 'image', section: '11 은하수' },
    { key: 'mw_caption', label: '캡션', type: 'text', section: '11 은하수', default: '夜空に輝く天の川観賞まで' },

    // ── 12 공항 도착 ──────────────────────────────────────────
    { key: 'arr_from', label: '출발지', type: 'text', section: '12 공항 도착', default: '日本の空港' },
    { key: 'arr_to', label: '도착지', type: 'text', section: '12 공항 도착', default: 'チンギス・ハーン国際空港' },
    { key: 'arr_img', label: '공항 사진', type: 'image', section: '12 공항 도착' },
    { key: 'arr_lead', label: '리드 문구', type: 'textarea', section: '12 공항 도착', default: '日本から約5時間のフライトで、\nチンギス・ハーン国際空港に到着。' },
    { key: 'arr_body', label: '픽업 안내 본문', type: 'textarea', section: '12 공항 도착', default: 'チンギス・ハーン国際空港へのお迎えが可能です。また、ご自身で手配されたウランバートル市内のホテルにご宿泊の場合は、ガイドがホテルまでお迎えに伺い、合流後そのままツアーを開始できます。  ご予約・ご相談の際に、フライトの到着時間またはホテル名・住所をお知らせください。お客様のスケジュールに合わせて、お迎え場所と時間をご案内いたします。' },
    { key: 'arr_band1', label: '민트 배너 1줄', type: 'text', section: '12 공항 도착', default: '空港送迎は、1グループにつき往復1回無料でご提供いたします♪' },
    { key: 'arr_band2', label: '민트 배너 2줄', type: 'text', section: '12 공항 도착', default: 'グループの皆様で到着時間を合わせて、無料送迎をご利用ください！' },
    { key: 'welcome_img', label: '웰컴카드 사진', type: 'image', section: '12 공항 도착' },
    { key: 'welcome_side', label: '사진 옆 문구', type: 'textarea', section: '12 공항 도착', default: 'Welcome\nTo\nMongolia' },
    { key: 'welcome_caption', label: '하단 캡션', type: 'text', section: '12 공항 도착', default: '担当ガイドが、チーム名が書かれたボードを持ってお待ちしています♪' },

    // ── 06 숙소 — 일반 게르 페이지 (모바일 v3의 2페이지 슬라이더 중 2번째) ──
    { key: 'ger_hint1', label: '슬라이드 안내 (고급)', type: 'text', section: '06 숙소', default: '横にスライドしてください' },
    { key: 'ger_std_badge', label: '일반 게르 뱃지', type: 'text', section: '06 숙소', default: '一般ゲル' },
    { key: 'ger_std_img1', label: '일반 게르 사진 1 (외관)', type: 'image', section: '06 숙소' },
    { key: 'ger_std_img2', label: '일반 게르 사진 2 (내부)', type: 'image', section: '06 숙소' },
    { key: 'ger_std_img3', label: '일반 게르 사진 3 (침구)', type: 'image', section: '06 숙소' },
    { key: 'ger_std_img4', label: '일반 게르 사진 4 (주변)', type: 'image', section: '06 숙소' },
    { key: 'ger_hint2', label: '슬라이드 안내 (일반)', type: 'text', section: '06 숙소', default: '横にスワイプしてください →' },
    { key: 'ger_std_check1', label: '일반 게르 항목 1', type: 'text', section: '06 숙소', default: '温水シャワー (共同・外部)' },
    { key: 'ger_std_check2', label: '일반 게르 항목 2', type: 'text', section: '06 숙소', default: '洋式トイレ (共同・外部)' },
    { key: 'ger_std_check3', label: '일반 게르 항목 3', type: 'text', section: '06 숙소', default: '電気使用可能' },

    // ── 14 전용차량 ───────────────────────────────────────────
    { key: 'veh_kicker', label: '작은 제목', type: 'text', section: '14 전용차량', default: 'モンゴルのオフロードを駆け抜ける、最強のタフ車両！' },
    { key: 'veh_title', label: '큰 제목', type: 'text', section: '14 전용차량', default: '専用車両' },
    { key: 'veh_sub', label: '차종 나열', type: 'text', section: '14 전용차량', default: 'プルゴン / スターレックス / アルファード' },
    { key: 'veh_body', label: '본문', type: 'textarea', section: '14 전용차량', default: 'モンゴルの広大な草原や砂漠、険しい山岳地帯を走るために使用する専用車両です。\n旅程や道路状況に合わせて最適な車両をご用意します。（最大6名様）' },
    { key: 'veh1_img', label: '차량 1 사진', type: 'image', section: '14 전용차량' },
    { key: 'veh1_name', label: '차량 1 이름', type: 'text', section: '14 전용차량', default: 'Alphard' },
    { key: 'veh2_img', label: '차량 2 사진', type: 'image', section: '14 전용차량' },
    { key: 'veh2_name', label: '차량 2 이름', type: 'text', section: '14 전용차량', default: 'Velpire' },
    { key: 'veh3_img', label: '차량 3 사진', type: 'image', section: '14 전용차량' },
    { key: 'veh3_name', label: '차량 3 이름', type: 'text', section: '14 전용차량', default: 'Starex' },
    { key: 'veh4_img', label: '차량 4 사진', type: 'image', section: '14 전용차량' },
    { key: 'veh4_name', label: '차량 4 이름', type: 'text', section: '14 전용차량', default: 'Landcriuser' },
    { key: 'veh5_img', label: '차량 5 사진', type: 'image', section: '14 전용차량' },
    { key: 'veh5_name', label: '차량 5 이름', type: 'text', section: '14 전용차량', default: 'Haice' },
    { key: 'veh_hint', label: '스와이프 안내', type: 'text', section: '14 전용차량', default: '横にスワイプしてください →' },
    { key: 'veh_note', label: '하단 주석', type: 'textarea', section: '14 전용차량', default: '※車両はランダムでの手配となります。ご希望の車種がございましたら、できる限り対応いたしますが、現地の手配状況によりご希望に添えない場合がございます。' },

    // ── 15 식사 안내 ──────────────────────────────────────────
    { key: 'meal_img1', label: '식사 사진 1 (조식)', type: 'image', section: '15 식사 안내' },
    { key: 'meal_img2', label: '식사 사진 2 (현지식)', type: 'image', section: '15 식사 안내' },
    { key: 'meal_img3', label: '식사 사진 3 (캠프식)', type: 'image', section: '15 식사 안내' },
    { key: 'meal_img4', label: '식사 사진 4 (석식)', type: 'image', section: '15 식사 안내' },
    { key: 'meal_img5', label: '식사 사진 5 (게르 식당)', type: 'image', section: '15 식사 안내' },
    { key: 'meal_img6', label: '식사 사진 6 (휴게소)', type: 'image', section: '15 식사 안내' },
    { key: 'meal_kicker', label: '작은 제목', type: 'text', section: '15 식사 안내', default: '旅の楽しみは、やっぱり食事！' },
    { key: 'meal_title1', label: '제목 앞부분', type: 'text', section: '15 식사 안내', default: 'モンゴル旅行 ' },
    { key: 'meal_title2', label: '제목 강조부분', type: 'text', section: '15 식사 안내', default: 'お食事のご案内' },
    { key: 'meal_points', label: '요약 3줄', type: 'textarea', section: '15 식사 안내', default: '朝食からしっかり満足\nモンゴル料理も食べやすく\n1日3食すべてご提供' },
    { key: 'meal_local_title', label: '현지식 제목', type: 'text', section: '15 식사 안내', default: '現地食' },
    { key: 'meal_local_body', label: '현지식 본문', type: 'textarea', section: '15 식사 안내', default: '移動中に道路沿いのローカルレストランやフードトラックなどでいただく、モンゴルの伝統料理です。 羊肉や牛肉を中心とした料理が多く、味付けは比較的シンプルで、香辛料も控えめです。' },
    { key: 'meal_camp_title', label: '캠프식 제목', type: 'text', section: '15 식사 안내', default: 'キャンプ食' },
    { key: 'meal_camp_body', label: '캠프식 본문', type: 'textarea', section: '15 식사 안내', default: '宿泊先となるゲルキャンプ内の専用レストランで提供される食事です。 外国人観光客の好みに合わせて調理されているため、比較的食べやすく、モンゴル料理に慣れていない方でも楽しみやすい食事です' },
    { key: 'meal_hint', label: '스와이프 안내', type: 'text', section: '15 식사 안내', default: '横にスワイプしてください →' },
    { key: 'sp1_img', label: '특별식 1 사진', type: 'image', section: '15 식사 안내' },
    { key: 'sp1_tags', label: '특별식 1 태그 (줄바꿈 구분)', type: 'textarea', section: '15 식사 안내', default: '#テレルジ特別料理\n#モンゴル伝統料理' },
    { key: 'sp1_title', label: '특별식 1 제목', type: 'text', section: '15 식사 안내', default: 'テレルジ特別料理：ホルホグを1回ご提供' },
    { key: 'sp1_body', label: '특별식 1 본문', type: 'textarea', section: '15 식사 안내', default: 'ホルホグは、モンゴルの遊牧民が大切なお客様をもてなす時や、家族の特別な日に食べる伝統料理です。 羊肉やジャガイモなどと一緒に熱した石を入れ、じっくり蒸し焼きにして仕上げるモンゴルならではの肉料理です。' },
    { key: 'sp1_note', label: '특별식 1 주석', type: 'text', section: '15 식사 안내', default: '※テレルジの日程でのみご提供いたします。' },
    { key: 'sp2_img', label: '특별식 2 사진', type: 'image', section: '15 식사 안내' },
    { key: 'sp2_tags', label: '특별식 2 태그 (줄바꿈 구분)', type: 'textarea', section: '15 식사 안내', default: '#モンゴルしゃぶしゃぶ\n#人気メニュー' },
    { key: 'sp2_title', label: '특별식 2 제목', type: 'text', section: '15 식사 안내', default: 'しゃぶしゃぶ：羊肉＆野菜のしゃぶしゃぶ（夕食）を1回ご提供' },
    { key: 'sp2_body', label: '특별식 2 본문', type: 'textarea', section: '15 식사 안내', default: 'ウランバートル市内観光の際に楽しめる、モンゴルでも人気のしゃぶしゃぶ。 新鮮な羊肉と野菜をスープにさっとくぐらせ、あっさりとお召し上がりいただけます。' },
    { key: 'sp2_note', label: '특별식 2 주석', type: 'text', section: '15 식사 안내', default: '※日程により、ご提供のタイミングが変更になる場合がございます。' },

    // ── 11 은하수 (모바일 v3 추가 항목) ───────────────────────
    { key: 'mw_body', label: '본문 (모바일)', type: 'textarea', section: '11 은하수', default: '街の明かりが届かないモンゴルの夜だから\n見上げるだけで天の川が広がります。' },
    { key: 'milky_img1', label: '은하수 사진 1', type: 'image', section: '11 은하수' },
    { key: 'milky_img2', label: '은하수 사진 2', type: 'image', section: '11 은하수' },
    { key: 'milky_img3', label: '은하수 사진 3', type: 'image', section: '11 은하수' },
    { key: 'milky_img4', label: '은하수 사진 4', type: 'image', section: '11 은하수' },

    // ── 12 공항 도착 (모바일 v3 웰컴 블록) ────────────────────
    { key: 'welcome_w1', label: '웰컴 단어 1', type: 'text', section: '12 공항 도착', default: 'Welcome' },
    { key: 'welcome_w2', label: '웰컴 단어 2', type: 'text', section: '12 공항 도착', default: 'To' },
    { key: 'welcome_w3', label: '웰컴 단어 3', type: 'text', section: '12 공항 도착', default: 'Mongolia' },
    { key: 'mn_icon1', label: '아이콘 1', type: 'image', section: '12 공항 도착' },
    { key: 'mn_icon2', label: '아이콘 2', type: 'image', section: '12 공항 도착' },
    { key: 'mn_icon3', label: '아이콘 3', type: 'image', section: '12 공항 도착' },
    { key: 'mn_icon4', label: '아이콘 4', type: 'image', section: '12 공항 도착' },
    { key: 'mn_icon5', label: '아이콘 5', type: 'image', section: '12 공항 도착' },
    { key: 'mn_icon6', label: '아이콘 6', type: 'image', section: '12 공항 도착' },

    // ── 16 여행의 순간들 ──────────────────────────────────────
    { key: 'moment_text1', label: '문구 1 (왼쪽)', type: 'textarea', section: '16 여행의 순간들', default: '心も体も癒される\nモンゴルで、\n美しい思い出を\nつくりませんか。' },
    { key: 'moment_text2', label: '문구 2 (오른쪽)', type: 'textarea', section: '16 여행의 순간들', default: '一緒に体験する\nモンゴルの\n特別な瞬間' },
    { key: 'moment_img1', label: '사진 1 (절벽 위)', type: 'image', section: '16 여행의 순간들' },
    { key: 'moment_img2', label: '사진 2 (캠프파이어)', type: 'image', section: '16 여행의 순간들' },
    { key: 'moment_img3', label: '사진 3 (샌드보딩)', type: 'image', section: '16 여행의 순간들' },
    { key: 'moment_img4', label: '사진 4 (허르헉 조리)', type: 'image', section: '16 여행의 순간들' },
    { key: 'moment_img5', label: '사진 5 (낙타 트레킹)', type: 'image', section: '16 여행의 순간들' },
    { key: 'moment_img6', label: '사진 6 (양털 기념품)', type: 'image', section: '16 여행의 순간들' },
    { key: 'moment_img7', label: '사진 7 (단체 점프)', type: 'image', section: '16 여행의 순간들' },
    { key: 'moment_img8', label: '사진 8 (별 관측)', type: 'image', section: '16 여행의 순간들' },

    // ── 17 포함/불포함 ────────────────────────────────────────
    { key: 'notice_bg', label: '배경 사진', type: 'image', section: '17 포함/불포함' },
    { key: 'notice_title', label: '큰 제목', type: 'text', section: '17 포함/불포함', default: 'NOTICE IT' },
    { key: 'notice_sub', label: '부제', type: 'text', section: '17 포함/불포함', default: '含まれるもの・含まれないもの' },
    { key: 'inc_title', label: '포함 제목', type: 'text', section: '17 포함/불포함', default: '含まれるもの' },
    { key: 'inc_items', label: '포함 항목 (줄바꿈 구분)', type: 'textarea', section: '17 포함/불포함', default: '- 全日程の宿泊費\n- 全日程の食事代 (ホルホグ特別料理 1回付き)\n- 日程表に記載されている観光地の入場料\n- 日程表に記載されているラクダ乗り・乗馬体験\n- 空港送迎（ピックアップ・ドロップオフ）\n- 毎日ミネラルウォーター1本付き\n- 専用車両・燃料費・ドライバー代\n- 日本語対応可能な現地ガイド' },
    { key: 'exc_title', label: '불포함 제목', type: 'text', section: '17 포함/불포함', default: '含まれないもの' },
    { key: 'exc_items', label: '불포함 항목 (줄바꿈 구분)', type: 'textarea', section: '17 포함/불포함', default: '- 国際線往復航空券\n- 各種チップ（ラクダ・乗馬体験など）\n- 個人的な費用\n- 海外旅行保険' },

    // ── 18 투어 가격 ──────────────────────────────────────────
    { key: 'price_kicker', label: '작은 제목', type: 'text', section: '18 투어 가격', default: '集まるほどお得！' },
    { key: 'price_title', label: '큰 제목', type: 'text', section: '18 투어 가격', default: 'ツアー料金' },
    { key: 'price_head', label: '표 헤더 (| 구분)', type: 'text', section: '18 투어 가격', default: '参加人数|予約金（円）|残金（円）|お一人様あたりの 合計金額' },
    { key: 'price_rows', label: '표 내용 (한 줄에 한 행, | 구분)', type: 'textarea', section: '18 투어 가격', default: '2名様の場合|20,000¥|200,000¥|200,000¥\n3名様の場合|20,000¥|200,000¥|200,000¥\n4名様の場合|20,000¥|200,000¥|200,000¥\n5名様の場合|20,000¥|200,000¥|200,000¥\n6名様の場合|20,000¥|200,000¥|200,000¥' },
    { key: 'price_tag1', label: '결제 태그 1', type: 'text', section: '18 투어 가격', default: '予約金' },
    { key: 'price_tag1_desc', label: '결제 설명 1', type: 'text', section: '18 투어 가격', default: 'PayPal決済' },
    { key: 'price_tag2', label: '결제 태그 2', type: 'text', section: '18 투어 가격', default: '残金' },
    { key: 'price_tag2_desc', label: '결제 설명 2', type: 'text', section: '18 투어 가격', default: '現地にて日本円の現金でお支払い（担当ガイドへお渡しください）' },
    { key: 'price_img', label: '하단 사진', type: 'image', section: '18 투어 가격' },

    // ── 19 예약 전 확인사항 ───────────────────────────────────
    { key: 'terms_title', label: '섹션 제목', type: 'text', section: '19 예약 전 확인사항', default: 'ご予約前に必ずご確認ください！' },
    { key: 'cancel_title', label: '취소 규정 제목', type: 'text', section: '19 예약 전 확인사항', default: 'ツアー予約金のキャンセル規定' },
    { key: 'cancel_body', label: '취소 규정 본문 (줄바꿈 구분)', type: 'textarea', section: '19 예약 전 확인사항', default: 'ツアー開始日の30日前までにキャンセルされる場合、予約金は100％返金いたします。\nツアー開始日の29日前から当日までにキャンセルされる場合、予約金は返金いたしかねます。\nゲルおよび宿泊施設は、ご利用日の30日前まで無料キャンセルが可能ですが、それ以降のキャンセルについては返金不可となります。そのため、予約金はゲルおよび宿泊施設のキャンセル料に充当されることを、あらかじめご了承ください。' },
    { key: 'cancel_box', label: '취소 규정 강조 박스 (줄바꿈 구분)', type: 'textarea', section: '19 예약 전 확인사항', default: '★ ツアー開始日の30日前まで：予約金100％返金\n★ ツアー開始日の29日前～当日：予約金の返金不可' },
    { key: 'tour_title', label: '투어 안내 제목', type: 'text', section: '19 예약 전 확인사항', default: 'ツアーについて' },
    { key: 'tour_body', label: '투어 안내 본문 (줄바꿈 구분)', type: 'textarea', section: '19 예약 전 확인사항', default: '・ホームページに掲載されているすべてのツアーには海外旅行保険が含まれておりません。必ず海外旅行保険へのご加入をおすすめいたします。\n・モンゴルでは、天候（雨など）や道路状況（道路の損傷など）、お客様の観光スタイルによって移動・ツアー時間が大きく変わる場合がございます。そのため、記載されているツアー時間はあくまで目安となります。\n・ガイドの案内や安全上の指示に従わなかったことにより発生した事故については、旅行会社として対応・補償が難しい場合がございます。\n・毎日、キャンプ到着後および夕食後は自由時間となります。自由時間中に発生した事故については対応が難しい場合がございますので、十分に安全に注意してお過ごしください。\n・夕食後はガイドの勤務終了後の個人時間となります。また、キャンプ内では過度な飲酒や騒音などにより、他のお客様のご迷惑とならないようマナーを守ってお過ごしください。\n・サービスとして無料でご提供している物品については、7〜8月の最繁忙期には一部ご用意できない場合がございます。この場合、補償・返金の対象とはなりませんので、あらかじめご了承ください。\n・万が一、予期せぬ車両故障が発生した場合は、旅行会社が速やかに代替車両を手配いたします。ただし、モンゴルは移動距離が非常に長いため、代替車両の到着までに時間がかかる場合がございます。\n・乗馬・ラクダ乗り体験の際は、動物を驚かせるような行為はお控えください。体験中は必ず手すりや手綱をしっかり握り、現地スタッフの指示に従ってください。\n・体験アクティビティに参加する際は、発生する可能性のある事故や注意事項について十分にご確認いただき、同意書にご署名のうえご参加いただきます。\n・海外旅行保険に加入したうえでツアーにご参加ください。また、乗馬・ラクダ乗りなどの体験中の事故も補償対象となる特約を追加されることをおすすめいたします。\n・携帯電話や貴重品（現金など）は必ず各自で管理し、宿泊施設やレストランなどに置いたまま席を離れないようお願いいたします。紛失した場合、当社では責任を負いかねます。' },
    { key: 'tour_banner', label: '투어 안내 배너', type: 'text', section: '19 예약 전 확인사항', default: '海外旅行保険には必ず各自でご加入ください。' },
    { key: 'gerstay_title', label: '게르 숙박 제목', type: 'text', section: '19 예약 전 확인사항', default: '旅行者向けゲル宿泊について' },
    { key: 'gerstay_lead', label: '게르 숙박 강조 문구', type: 'text', section: '19 예약 전 확인사항', default: 'モンゴリア銀河では、追加料金なしで基本的に高級ゲルをご提供しています。' },
    { key: 'gerstay_body', label: '게르 숙박 본문', type: 'textarea', section: '19 예약 전 확인사항', default: 'ただし、モンゴルという国の特性上、地域によって宿泊施設の設備に差があり、高級ゲル・ラグジュアリーゲルがない地域もございます。その場合は、一般タイプのゲルをご利用いただきます。' },
    { key: 'gt_head', label: '게르 표 헤더 (| 구분)', type: 'text', section: '19 예약 전 확인사항', default: 'ゲルタイプ|参考写真|ゲル設備' },
    { key: 'gt1_name', label: '게르 유형 1 이름', type: 'textarea', section: '19 예약 전 확인사항', default: '旅行者向けゲル\n(一般タイプ)' },
    { key: 'gt1_img', label: '게르 유형 1 사진', type: 'image', section: '19 예약 전 확인사항' },
    { key: 'gt1_spec', label: '게르 유형 1 설비', type: 'textarea', section: '19 예약 전 확인사항', default: '電気：使用可能\nシャワー：温水／屋外共用\nトイレ：洋式／屋外共用\n暖房：薪ストーブによる暖房' },
    { key: 'gt2_name', label: '게르 유형 2 이름', type: 'textarea', section: '19 예약 전 확인사항', default: '旅行者向けゲル\n(高級タイプ)' },
    { key: 'gt2_img', label: '게르 유형 2 사진', type: 'image', section: '19 예약 전 확인사항' },
    { key: 'gt2_spec', label: '게르 유형 2 설비', type: 'textarea', section: '19 예약 전 확인사항', default: '電気：使用可能\nシャワー：温水／屋外共用\nトイレ：洋式／屋外共用\n暖房：完備' },
    { key: 'gt3_name', label: '게르 유형 3 이름', type: 'textarea', section: '19 예약 전 확인사항', default: 'モダンゲル' },
    { key: 'gt3_img', label: '게르 유형 3 사진', type: 'image', section: '19 예약 전 확인사항' },
    { key: 'gt3_spec', label: '게르 유형 3 설비', type: 'textarea', section: '19 예약 전 확인사항', default: '電気：使用可能\nシャワー：ゲル内完備\nトイレ：ゲル内完備\n暖房：完備' },
    { key: 'gt4_name', label: '게르 유형 4 이름', type: 'textarea', section: '19 예약 전 확인사항', default: 'モダンペンション' },
    { key: 'gt4_img', label: '게르 유형 4 사진', type: 'image', section: '19 예약 전 확인사항' },
    { key: 'gt4_spec', label: '게르 유형 4 설비', type: 'textarea', section: '19 예약 전 확인사항', default: '電気：使用可能\nシャワー：室内完備\nトイレ：室内完備\n暖房：完備' },
    { key: 'animal_title', label: '동물 체험 제목', type: 'text', section: '19 예약 전 확인사항', default: '動物体験について' },
    { key: 'animal_body', label: '동물 체험 본문 (줄바꿈 구분)', type: 'textarea', section: '19 예약 전 확인사항', default: '・ラクダ乗り・乗馬体験の際は、落下事故に十分ご注意ください。安全のため、必ずガイドの指示に従い、急な動きや危険な行動はお控えください。\n・動物に乗る前や体験を始める前には、必ず装備の状態をご確認ください。特に写真撮影の際は、動物を驚かせないよう、急な動きには十分ご注意ください。' },

    // ── 20 FAQ ───────────────────────────────────────────────
    { key: 'faq_title', label: '큰 제목', type: 'text', section: '20 FAQ', default: 'FAQ' },
    { key: 'faq_sub', label: '부제', type: 'text', section: '20 FAQ', default: 'よくあるご質問' },
    { key: 'faq1_q', label: '질문 1', type: 'text', section: '20 FAQ', default: '飛行機の到着時間に合わせて、ツアー日程を変更できますか？' },
    { key: 'faq1_a', label: '답변 1', type: 'textarea', section: '20 FAQ', default: 'はい、可能です。\nフライトスケジュールに合わせて、ツアー日程の一部を調整することができます。\nすでに航空券をご購入済みの場合は 必ずeチケットを共有してください！' },
    { key: 'faq2_q', label: '질문 2', type: 'text', section: '20 FAQ', default: '航空券はツアー料金に含まれていますか？' },
    { key: 'faq2_a', label: '답변 2', type: 'textarea', section: '20 FAQ', default: '基本的に航空券はツアー料金に含まれておりません。 航空券はお客様ご自身でのご予約・発券をおすすめしております。  お客様のフライトスケジュールに合わせて、モンゴル現地のツアー日程を調整する現地フルパッケージツアーです。' },
    { key: 'faq3_q', label: '질문 3', type: 'text', section: '20 FAQ', default: '旅行代金はどのように支払いますか？' },
    { key: 'faq3_a', label: '답변 3', type: 'textarea', section: '20 FAQ', default: 'ご予約時に予約金をPayPalでお支払いいただきます。  残金はモンゴル到着後、宿泊先に到着してから担当ガイドへ日本円の現金でお支払いください。  お支払い後は、現金受領書にサインをして、必ず控えをお受け取りください。' },
    { key: 'faq4_q', label: '질문 4', type: 'text', section: '20 FAQ', default: 'ガイドは日本語対応可能ですか？' },
    { key: 'faq4_a', label: '답변 4', type: 'textarea', section: '20 FAQ', default: '日本語でコミュニケーションができるモンゴル人現地ガイドを手配いたします。  担当ガイドの性別はランダムでの手配となります。' },
    { key: 'faq5_q', label: '질문 5', type: 'text', section: '20 FAQ', default: 'ツアーは完全プライベートですか？' },
    { key: 'faq5_a', label: '답변 5', type: 'textarea', section: '20 FAQ', default: 'はい、当社ホームページに掲載されているすべてのツアーは、他のお客様と合流しない100％プライベートツアーです。  ツアー中はもちろん、宿泊についても他のグループと相部屋になることはなく、お客様のグループだけでご利用いただきます。' },
];

/**
 * 관리자에서 복제·삭제하는 단위인 섹션 목록 (템플릿의 실제 렌더 순서와 같아야 한다).
 * fieldSections는 그 섹션이 포함하는 매니페스트 section 이름 — 복제 시 이 필드들이 함께 복사된다.
 * repeatable: false는 한 상품에 하나만 있는 게 자연스러운 섹션(오프닝/히어로 등).
 */
export const horseTrekSectionDefs: DesignSectionDef[] = [
    { id: '01 오프닝', fieldSections: ['01 오프닝'] },
    { id: '02 별하늘 히어로', fieldSections: ['02 별하늘 히어로'] },
    { id: '03 소개 배너', fieldSections: ['03 소개 배너'] },
    { id: '04 이용자 특전', fieldSections: ['04 이용자 특전'] },
    { id: '05 여행 고민', fieldSections: ['05 여행 고민'] },
    { id: '06 숙소', fieldSections: ['06 숙소'], repeatable: true },
    { id: '14 전용차량', fieldSections: ['14 전용차량'], repeatable: true },
    { id: '15 식사 안내', fieldSections: ['15 식사 안내'], repeatable: true },
    { id: '07 루트/지도', fieldSections: ['07 루트/지도', '08 방문 여행지'] },
    { id: '09 고비 히어로', fieldSections: ['09 고비 히어로'], repeatable: true },
    { id: '10 하이라이트', fieldSections: ['10 하이라이트'], repeatable: true },
    { id: '11 은하수', fieldSections: ['11 은하수'], repeatable: true },
    { id: '12 공항 도착', fieldSections: ['12 공항 도착'] },    { id: '16 여행의 순간들', fieldSections: ['16 여행의 순간들'], repeatable: true },
    { id: '17 포함/불포함', fieldSections: ['17 포함/불포함'] },
    { id: '18 투어 가격', fieldSections: ['18 투어 가격'] },
    { id: '19 예약 전 확인사항', fieldSections: ['19 예약 전 확인사항'] },
    { id: '20 FAQ', fieldSections: ['20 FAQ'] },
];
