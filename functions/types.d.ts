import { D1Database, R2Bucket } from '@cloudflare/workers-types';

declare global {
    interface Env {
        DB: D1Database;
        BUCKET: R2Bucket;
        GOOGLE_CLIENT_ID: string;
        GOOGLE_CLIENT_SECRET: string;
        ENVIRONMENT: string;
        /** Claude API 키 — AI 견적 초안 · 관광지 자동 채우기 */
        ANTHROPIC_API_KEY?: string;
        /** 채널톡 Open API 키 (선택 — 없으면 관리자 화면에서 저장한 값을 쓴다) */
        CHANNEL_ACCESS_KEY?: string;
        CHANNEL_ACCESS_SECRET?: string;
        CHANNEL_WEBHOOK_TOKEN?: string;
    }
}
