import { Hono } from 'hono';

type Env = {
    BUCKET: any;
};

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
    try {
        const body = await c.req.parseBody();
        const file = body['file'];
        const folder = body['folder'] || 'common';

        if (!file || typeof file === 'string') {
            return c.json({ error: 'No file uploaded' }, 400);
        }

        // Generate a unique filename
        const ext = file.name.split('.').pop() || 'webp';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}.${ext}`;
        const filePath = `${folder}/${fileName}`;

        // Convert the file to an ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Ensure R2 bucket is bound
        if (!c.env.BUCKET) {
            console.error('R2 BUCKET is not defined in environment bindings');
            return c.json({ error: 'Storage not configured properly' }, 500);
        }

        // Upload to Cloudflare R2
        await c.env.BUCKET.put(filePath, arrayBuffer, {
            httpMetadata: {
                contentType: file.type,
            },
        });

        // The public URL requires a custom domain or a dev URL for R2 if not using workers.dev.
        // Assuming we serve them directly from the bucket via Cloudflare Pages or a custom subdomain
        // For Cloudflare Pages, we might need a separate route to serve them, or an R2 custom domain.
        // If the user hasn't set up an R2 Custom Domain, returning a path that the Pages can intercept:
        const publicUrl = `/api/images/${filePath}`;

        return c.json({ success: true, url: publicUrl });

    } catch (e: any) {
        console.error('File upload API error:', e);
        return c.json({ error: e.message || 'File upload failed' }, 500);
    }
});

export default app;
