import { Lucia } from 'lucia';
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { users, sessions } from '../../src/db/schema/auth';
import { D1Database } from '@cloudflare/workers-types';

// This function needs to be called within the request handler where we have access to Env
export function initializeLucia(D1: D1Database) {
    const db = drizzle(D1);
    const adapter = new DrizzleSQLiteAdapter(db, sessions, users);

    return new Lucia(adapter, {
        sessionCookie: {
            attributes: {
                secure: process.env.NODE_ENV === 'production', // set to `true` when using HTTPS
            },
        },
        getUserAttributes: (attributes) => {
            return {
                googleId: attributes.googleId,
                email: attributes.email,
                name: attributes.name,
                role: attributes.role,
                avatarUrl: attributes.avatarUrl,
            };
        },
    });
}

declare module 'lucia' {
    interface Register {
        Lucia: ReturnType<typeof initializeLucia>;
        DatabaseUserAttributes: {
            googleId: string;
            email: string;
            name: string;
            role: string;
            avatarUrl: string;
        };
    }
}
