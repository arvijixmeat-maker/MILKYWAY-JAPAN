import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required environment variables.');
    console.error('Usage: $env:VITE_SUPABASE_URL="..."; $env:VITE_SUPABASE_ANON_KEY="..."; node scripts/export_supabase.js');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const outputDir = path.join(__dirname, '..', 'migration_data');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

async function exportTable(tableName) {
    console.log(`Exporting ${tableName}...`);
    const { data, error } = await supabase
        .from(tableName)
        .select('*');

    if (error) {
        console.error(`Error exporting ${tableName}:`, error);
        return;
    }

    const filePath = path.join(outputDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Saved ${data.length} records to ${filePath}`);
}

async function run() {
    await exportTable('products');
    await exportTable('reservations');
    await exportTable('quotes');
    // users table access might be restricted or empty in public schema, try it anyway
    await exportTable('users');
}

run();
