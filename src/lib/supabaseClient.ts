// Superseded by src/lib/api.ts
// import { createClient } from '@supabase/supabase-js'

// export const supabase = createClient(...)
export const supabase = {
    // Mock for transition
    from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
    storage: { from: () => ({ upload: () => Promise.resolve({}), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }), getSession: () => Promise.resolve({ data: { session: null } }), signOut: () => Promise.resolve() }
} as any;
