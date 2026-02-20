import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.8";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "ESTIMATE_COMPLETED" | "GUIDE_ASSIGNED" | "RESERVATION_CONFIRMED" | "QUOTE_RECEIVED" | "RESERVATION_REQUESTED";
  to: string;
  data: any;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, to, data } = await req.json() as EmailRequest;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error("Gmail credentials are not set");
    }

    let subject = "";
    let html = "";

    // Email Templates - Common Style Constants
    const primaryColor = "#1eb395";
    const backgroundColor = "#f2f4f6";
    const containerStyle = `
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
            background-color: ${backgroundColor};
            padding: 40px 20px;
            color: #333d4b;
        `;
    const cardStyle = `
            max-width: 480px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 24px;
            padding: 40px 32px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
        `;
    const headingStyle = `
            font-size: 26px;
            font-weight: 700;
            color: #191f28;
            margin-bottom: 16px;
            letter-spacing: -0.5px;
            line-height: 1.3;
        `;
    const textStyle = `
            font-size: 16px;
            line-height: 1.6;
            color: #4e5968;
            margin-bottom: 24px;
        `;
    const infoBoxStyle = `
            background-color: #f9fafb;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
        `;
    const buttonStyle = `
            display: block;
            width: 100%;
            background-color: ${primaryColor};
            color: #ffffff;
            text-align: center;
            padding: 18px 0;
            font-size: 17px;
            font-weight: 600;
            border-radius: 16px;
            text-decoration: none;
            margin-top: 32px;
        `;
    const footerStyle = `
            margin-top: 40px;
            text-align: center;
            font-size: 13px;
            color: #8b95a1;
            line-height: 1.5;
        `;

    switch (type) {
      case "ESTIMATE_COMPLETED":
        subject = `[몽골리아 은하수] ${data.customerName}님, 요청하신 견적서가 도착했습니다.`;
        html = `
                    <div style="${containerStyle}">
                        <div style="${cardStyle}">
                            <h1 style="${headingStyle}">견적서 확인하고<br/>여행 준비를 시작해보세요.</h1>
                            <p style="${textStyle}">
                                안녕하세요 ${data.customerName}님,<br/>
                                요청해주신 <strong>${data.destination}</strong> 여행 견적이 작성되었습니다.<br/>
                                꼼꼼하게 준비했으니 지금 바로 확인해 보세요.
                            </p>
                            ${data.adminNote ? `
                            <div style="${infoBoxStyle}">
                                <p style="margin: 0; font-size: 15px; color: #333d4b; font-weight: 500;">💌 관리자 메시지</p>
                                <p style="margin: 8px 0 0; font-size: 14px; color: #6b7684;">${data.adminNote}</p>
                            </div>
                            ` : ''}
                            <a href="${data.estimateUrl}" style="${buttonStyle}">견적서 확인하기</a>
                        </div>
                        <div style="${footerStyle}">
                            본 메일은 발신 전용입니다.<br/>
                            © 몽골리아 은하수
                        </div>
                    </div>
                `;
        break;

      case "GUIDE_ASSIGNED":
        subject = `[몽골리아 은하수] ${data.customerName}님, 가이드와 숙소가 배정되었습니다.`;
        html = `
                    <div style="${containerStyle}">
                        <div style="${cardStyle}">
                            <span style="display:inline-block; padding: 6px 12px; background-color: #e6f7f3; color: ${primaryColor}; border-radius: 8px; font-size: 13px; font-weight: 700; margin-bottom: 16px;">배정 완료</span>
                            <h1 style="${headingStyle}">가이드와 숙소 배정이<br/>완료되었습니다! 🎉</h1>
                            <p style="${textStyle}">
                                설레는 여행이 더욱 가까워졌어요.<br/>
                                ${data.customerName}님의 여행을 책임질<br/>
                                가이드 정보를 확인해 주세요.
                            </p>
                            <div style="${infoBoxStyle}">
                                <p style="margin: 0 0 12px; font-size: 14px; color: #8b95a1; font-weight: 600;">담당 가이드 정보</p>
                                <p style="margin: 0 0 4px; font-size: 17px; color: #191f28; font-weight: 600;">👤 ${data.guideName}</p>
                                <p style="margin: 0; font-size: 15px; color: #4e5968;">📞 ${data.guidePhone}</p>
                            </div>
                            <a href="https://www.mongolia-milkyway.com/mypage" style="${buttonStyle}">배정 내역 확인하기</a>
                        </div>
                        <div style="${footerStyle}">
                            본 메일은 발신 전용입니다.<br/>
                            © 몽골리아 은하수
                        </div>
                    </div>
                `;
        break;

      case "QUOTE_RECEIVED":
        subject = `[몽골리아 은하수] ${data.customerName}님, 견적 요청이 정상적으로 접수되었습니다.`;
        html = `
                    <div style="${containerStyle}">
                        <div style="${cardStyle}">
                            <h1 style="${headingStyle}">견적 요청이<br/>성공적으로 접수되었습니다. ✅</h1>
                            <p style="${textStyle}">
                                안녕하세요 ${data.customerName}님,<br/>
                                몽골리아 은하수를 찾아주셔서 감사합니다.<br/>
                                <br/>
                                보내주신 일정을 바탕으로<br/>
                                전문 상담사가 <strong>24시간 이내</strong>에<br/>
                                최적의 맞춤 견적서를 보내드리겠습니다.
                            </p>
                            <a href="https://www.mongolia-milkyway.com/mypage" style="${buttonStyle}" target="_blank">내 요청 내역 보기</a>
                        </div>
                        <div style="${footerStyle}">
                            본 메일은 발신 전용입니다.<br/>
                            © 몽골리아 은하수
                        </div>
                    </div>
                `;
        break;

      case "RESERVATION_REQUESTED":
        subject = `[몽골리아 은하수] ${data.customerName}님, 입금 안내 드립니다.`;
        html = `
                    <div style="${containerStyle}">
                        <div style="${cardStyle}">
                            <span style="display:inline-block; padding: 6px 12px; background-color: #fff9e6; color: #ff9f00; border-radius: 8px; font-size: 13px; font-weight: 700; margin-bottom: 16px;">입금 대기</span>
                            <h1 style="${headingStyle}">예약 확정을 위해<br/>예약금을 입금해 주세요.</h1>
                            <p style="${textStyle}">
                                <strong>${data.productName}</strong> 여행 예약을 신청해주셔서 감사합니다.<br/>
                                아래 계좌로 예약금을 입금해주시면<br/>
                                예약이 최종 확정됩니다.
                            </p>
                            <div style="${infoBoxStyle}">
                                <p style="margin: 0 0 12px; font-size: 14px; color: #8b95a1; font-weight: 600;">입금하실 계좌</p>
                                <p style="margin: 0 0 6px; font-size: 18px; color: ${primaryColor}; font-weight: 700;">${data.bankAccount?.bankName} ${data.bankAccount?.accountNumber}</p>
                                <p style="margin: 0 0 16px; font-size: 15px; color: #333d4b;">예금주: ${data.bankAccount?.accountHolder}</p>
                                <div style="border-top: 1px solid #e5e8eb; margin: 16px 0;"></div>
                                <p style="margin: 16px 0 6px; font-size: 14px; color: #8b95a1; font-weight: 600;">입금하실 금액</p>
                                <p style="margin: 0; font-size: 20px; color: #191f28; font-weight: 700;">${data.depositAmount}원</p>
                            </div>
                            <p style="font-size: 13px; color: #8b95a1; text-align: center; margin-bottom: 0;">
                                24시간 내 미입금 시 자동 취소될 수 있습니다.
                            </p>
                            <a href="https://www.mongolia-milkyway.com/mypage/reservations" style="${buttonStyle}">예약 내역 확인하기</a>
                        </div>
                        <div style="${footerStyle}">
                            본 메일은 발신 전용입니다.<br/>
                            © 몽골리아 은하수
                        </div>
                    </div>
                `;
        break;

      default:
        throw new Error("Invalid email type");
    }

    // Create nodemailer transporter with Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"몽골리아 은하수" <${GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });

    console.log("Email sent:", info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
