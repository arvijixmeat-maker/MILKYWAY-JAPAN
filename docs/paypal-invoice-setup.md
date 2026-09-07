# PayPal 인보이스 운영 설정

고객 결제 경로는 예약 1건당 하나의 PayPal 인보이스만 사용한다.

- 예약 생성 시 인보이스 1건을 만들고 고객 이메일로 전송한다.
- My예약의 결제 버튼은 새 결제를 만들지 않고 같은 인보이스의 결제 화면을 연다.
- 예약금은 인원과 관계없이 예약 1건당 `20,000 JPY`다.
- PayPal의 `INVOICING.INVOICE.PAID` 웹훅이 전액 결제를 확인하면 예약 상태가 자동으로 `confirmed`로 변경된다.

## Cloudflare Pages 환경 변수

다음 값은 Preview와 Production 환경에 각각 Secret으로 등록한다.

- `PAYPAL_CLIENT_ID`
- `PAYPAL_SECRET_KEY`
- `PAYPAL_BUSINESS_EMAIL`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_ENVIRONMENT`: 테스트는 `sandbox`, 운영은 `live`
- `RESEND_API_KEY`

## PayPal Developer Dashboard

사용 중인 REST 앱에 아래 웹훅을 등록한다.

- URL: `https://mongolryokou.com/api/webhooks/paypal`
- Event: `INVOICING.INVOICE.PAID`

등록 후 생성된 Webhook ID를 Cloudflare의 `PAYPAL_WEBHOOK_ID`에 저장한다. 웹훅 ID가 없거나 서명 검증에 실패하면 결제 상태를 변경하지 않는다.

## 일본어 설정

인보이스의 상품명·설명·약관은 일본어로 생성하며, 받는 사람의 언어를 `ja-JP`로 지정한다. PayPal 계정에 로그인한 고객은 PayPal 계정의 언어 설정이 PayPal 자체 버튼과 공통 UI에 우선 적용될 수 있으므로, 판매자 PayPal 계정의 기본 언어도 일본어로 설정한다.
