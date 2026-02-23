import { Hono } from 'hono';
import { generateState, generateCodeVerifier, Google } from 'arctic';
import { initializeLucia } from '../lib/auth';
import { verifyPassword } from '../lib/password';
import { setCookie, getCookie } from 'hono/cookie';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '../../src/db/schema/auth';
import { eq } from 'drizzle-orm';

const app = new Hono<{ Bindings: Env }>();

// POST /api/auth/login - Admin email/password login
app.post('/login', async (c) => {
    try {
        const { email, password } = await c.req.json();

        if (!email || !password) {
            return c.json({ error: 'Email and password are required' }, 400);
        }

        if (!c.env.DB) {
            return c.json({ error: 'Database binding (DB) is missing in environment' }, 500);
        }

        const db = drizzle(c.env.DB);

        let existingUser;
        try {
            existingUser = await db.select().from(users).where(eq(users.email, email)).get();
        } catch (dbError: any) {
            console.error('Database query failed:', dbError);
            return c.json({ error: `Database error: ${dbError.message || 'Unknown DB error'}` }, 500);
        }

        if (!existingUser || !existingUser.passwordHash) {
            return c.json({ error: 'Invalid email or password' }, 401);
        }

        if (existingUser.role !== 'admin') {
            return c.json({ error: 'Access denied' }, 403);
        }

        let isValid = false;
        try {
            isValid = await verifyPassword(password, existingUser.passwordHash);
        } catch (verifyError: any) {
            console.error('Password verification failed internally:', verifyError);
            return c.json({ error: `Crypto error: ${verifyError.message || 'Unknown crypto error'}` }, 500);
        }

        if (!isValid) {
            return c.json({ error: 'Invalid email or password' }, 401);
        }

        try {
            const lucia = initializeLucia(c.env.DB);
            const session = await lucia.createSession(existingUser.id, {});
            const sessionCookie = lucia.createSessionCookie(session.id);

            c.header("Set-Cookie", sessionCookie.serialize(), { append: true });

            return c.json({ success: true, user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, role: existingUser.role } });
        } catch (sessionError: any) {
            console.error('Session creation failed:', sessionError);
            return c.json({ error: `Session error: ${sessionError.message || 'Unknown session error'}` }, 500);
        }
    } catch (globalError: any) {
        console.error('Global unhandled API error:', globalError);
        return c.json({ error: `Unhandled exception: ${globalError.message || 'Unknown error'}` }, 500);
    }
});

// GET /api/auth/login/google
app.get('/login/google', async (c) => {
    const google = new Google(c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, "http://localhost:5173/api/auth/login/google/callback"); // TODO: Update callback URL for production

    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const url = await google.createAuthorizationURL(state, codeVerifier, ["profile", "email"]);

    setCookie(c, "google_oauth_state", state, {
        path: "/",
        secure: c.env.ENVIRONMENT === "production",
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: "Lax"
    });

    setCookie(c, "google_code_verifier", codeVerifier, {
        path: "/",
        secure: c.env.ENVIRONMENT === "production",
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: "Lax"
    });

    return c.redirect(url.toString());
});

// GET /api/auth/login/google/callback
app.get('/login/google/callback', async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const storedState = getCookie(c, "google_oauth_state");
    const storedCodeVerifier = getCookie(c, "google_code_verifier");

    if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
        return c.json({ error: "Invalid state" }, 400);
    }

    const google = new Google(c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, "http://localhost:5173/api/auth/login/google/callback"); // TODO: Production URL

    try {
        const tokens = await google.validateAuthorizationCode(code, storedCodeVerifier);
        const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`
            }
        });
        const googleUser: any = await response.json();

        const lucia = initializeLucia(c.env.DB);
        const db = drizzle(c.env.DB);

        // Check if user exists
        const existingUser = await db.select().from(users).where(eq(users.googleId, googleUser.sub)).get();

        let userId = "";

        if (existingUser) {
            userId = existingUser.id;
        } else {
            userId = crypto.randomUUID();
            await db.insert(users).values({
                id: userId,
                googleId: googleUser.sub,
                email: googleUser.email,
                name: googleUser.name,
                avatarUrl: googleUser.picture, // Fixed mapping
                role: 'user' // Default role
            }).run();
        }

        const session = await lucia.createSession(userId, {});
        const sessionCookie = lucia.createSessionCookie(session.id);

        c.header("Set-Cookie", sessionCookie.serialize(), { append: true });

        return c.redirect("/"); // Redirect to home on success
    } catch (e) {
        console.error(e);
        return c.json({ error: "Authentication failed" }, 500);
    }
});

// GET /api/auth/me
app.get('/me', async (c) => {
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);

    if (!sessionId) {
        return c.json({ user: null });
    }

    const { session, user } = await lucia.validateSession(sessionId);

    if (session && session.fresh) {
        const sessionCookie = lucia.createSessionCookie(session.id);
        c.header("Set-Cookie", sessionCookie.serialize(), { append: true });
    }

    if (!session) {
        const sessionCookie = lucia.createBlankSessionCookie();
        c.header("Set-Cookie", sessionCookie.serialize(), { append: true });
    }

    return c.json({ user });
});

// POST /api/auth/logout
app.post('/logout', async (c) => {
    const lucia = initializeLucia(c.env.DB);
    const sessionId = getCookie(c, lucia.sessionCookieName);

    if (!sessionId) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    await lucia.invalidateSession(sessionId);
    const sessionCookie = lucia.createBlankSessionCookie();
    c.header("Set-Cookie", sessionCookie.serialize(), { append: true });

    return c.json({ success: true });
});

export default app;
