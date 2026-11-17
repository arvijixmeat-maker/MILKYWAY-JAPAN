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
    }
}
