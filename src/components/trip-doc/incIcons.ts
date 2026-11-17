import hotel from '../../assets/inc-icons/hotel.svg';
import meal from '../../assets/inc-icons/meal.svg';
import special from '../../assets/inc-icons/special.svg';
import airport from '../../assets/inc-icons/airport.svg';
import car from '../../assets/inc-icons/car.svg';
import guide from '../../assets/inc-icons/guide.svg';
import ticket from '../../assets/inc-icons/ticket.svg';
import activity from '../../assets/inc-icons/activity.svg';
import privateTour from '../../assets/inc-icons/private.svg';
import stars from '../../assets/inc-icons/stars.svg';
import insurance from '../../assets/inc-icons/insurance.svg';
import wifi from '../../assets/inc-icons/wifi.svg';
import sim from '../../assets/inc-icons/sim.svg';
import exchange from '../../assets/inc-icons/exchange.svg';
import camera from '../../assets/inc-icons/camera.svg';
import other from '../../assets/inc-icons/other.svg';

/**
 * 「含まれるもの」 아이콘 — 여행 아이콘 세트(travel-icons-global-tourism, 라인 아이콘)에서 고른 SVG.
 * 작은 크기에서 선이 사라지지 않도록 원본에 테두리 두께를 조금 더해 두었다.
 * 화면에서는 CSS mask 로 민트색을 입힌다.
 */
const RULES: Array<[RegExp, string]> = [
    [/特別|スペシャル/, special],
    [/宿泊|ホテル|ゲル|숙박/, hotel],
    [/食事|朝食|昼食|夕食|식사/, meal],
    [/空港|送迎|픽업|공항/, airport],
    [/車|ドライバー|차량/, car],
    [/ガイド|가이드/, guide],
    [/入場|公演|チケット|입장/, ticket],
    [/水|ウォーター|생수/, special],
    [/ラクダ|乗馬|体験|アクティビティ|체험/, activity],
    [/プライベート|貸切|전용/, privateTour],
    [/星|天の川|별/, stars],
    [/保険|보험/, insurance],
    [/Wi-?Fi|ワイファイ|와이파이/i, wifi],
    [/SIM|携帯|유심/i, sim],
    [/両替|환전/, exchange],
    [/写真|撮影|カメラ|사진/, camera],
];

export const incIconUrl = (t: string): string => RULES.find(([re]) => re.test(t))?.[1] || other;
