
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env');
let envVars: Record<string, string> = {};

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envVars[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error("Error reading .env", e);
}

const supabaseUrl = envVars['VITE_SUPABASE_URL'] || '';
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'] || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log("Testing INSERT into reviews...");

    const { data, error } = await supabase.from('reviews').insert({
        author_name: 'Test',
        content: 'Test review',
        rating: 5,
        created_at: new Date().toISOString()
    }).select();

    if (error) {
        console.error("INSERT failed:", error.message);
        console.log("\n=== SOLUTION ===");
        console.log("Go to Supabase Dashboard > Database > Tables > reviews");
        console.log("Click on 'RLS Policies' and add an INSERT policy.");
        console.log("Or run this SQL in SQL Editor:");
        console.log(`
CREATE POLICY "Enable insert for all users" ON "public"."reviews"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);
        `);
    } else {
        console.log("INSERT succeeded:", data);
        // Clean up test
        if (data && data[0]) {
            await supabase.from('reviews').delete().eq('id', data[0].id);
            console.log("Test row cleaned up.");
        }
    }
}

testInsert();
