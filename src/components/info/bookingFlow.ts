/**
 * ご予約の流れ — the five steps shown on /booking-flow and mirrored in its HowTo JSON-LD.
 * Every statement follows what the booking / payment screens and notification mails actually do
 * (quote form, Payment, ReservationComplete, functions/api/reservations.ts, notifications/email.ts).
 * Keep it in sync when those change.
 */
export interface BookingFlowStep {
    title: string;
    text: string;
    /** Timing chip under the step. */
    when: string;
}

export const BOOKING_FLOW_STEPS: BookingFlowStep[] = [
    {
        title: 'ツアーを選ぶ・お見積もり',
        text: 'ツアー商品からお選びいただくか、お見積もりフォームでご希望の人数・期間・ご予算・行きたい場所をお知らせください。お見積もりは無料です。',
        when: 'いつでも',
    },
    {
        title: 'プランのご提案',
        text: 'お見積もりをご依頼いただいた場合は、担当者が内容を確認し、オーダーメイドのお見積もりをお送りします。ツアー商品をそのままご予約いただく場合、このステップは不要です。',
        when: '24時間以内',
    },
    {
        title: 'ご予約・予約金のお支払い',
        text: 'プランが決まりましたら、サイトからご予約をお申し込みください（Googleアカウントでのログインが必要です）。お申し込み後、ご入力いただいたメールアドレス宛にPayPalの請求書をお送りします。メール内のリンクから、クレジットカード等で予約金をお支払いください。予約金の額はツアーと人数により異なり、ご予約画面でご確認いただけます。お支払いの完了をもってご予約確定となります。予約金はホテルおよび宿泊施設の前払金として使用するため、キャンセルの場合も返金不可となります。期限までにお支払いが確認できない場合、ご予約がキャンセルとなることがございます。',
        when: '請求書に記載の期限内',
    },
    {
        title: '出発前のご案内',
        text: 'ご入金の確認後、宿泊・車両・ガイドなどの現地手配を進め、確定日程表・海外旅行契約書・担当ガイドの情報を順番にメールでご案内します。ご予約状況はマイページからもご確認いただけます。ご質問はLINEやチャットでお気軽にどうぞ。',
        when: 'ご入金確認後、順次',
    },
    {
        title: 'モンゴルへ出発',
        text: '確定日程表に沿って、ご旅行をお楽しみください。現地でお支払いいただく残金がある場合は、旅行当日にガイドへ直接お渡しください。お支払い方法の詳細は、ご出発前に改めてご案内します。',
        when: '旅行当日',
    },
];
