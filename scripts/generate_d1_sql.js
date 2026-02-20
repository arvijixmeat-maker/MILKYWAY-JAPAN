import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'migration_data');
const outputDir = path.join(__dirname, '..', 'migration_sql');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

function escapeSqlString(str) {
    if (str === null || str === undefined) return 'NULL';
    if (typeof str === 'number') return str;
    if (typeof str === 'boolean') return str ? 1 : 0;
    if (typeof str === 'object') {
        // Start D1/SQLite JSON handling: Stringify and escape single quotes
        return `'${JSON.stringify(str).replace(/'/g, "''")}'`;
    }
    return `'${String(str).replace(/'/g, "''")}'`;
}

function generateInsertSql(tableName, data) {
    if (!data || data.length === 0) return '';

    const columns = Object.keys(data[0]);

    const values = data.map(row => {
        const rowValues = columns.map(col => escapeSqlString(row[col]));
        return `(${rowValues.join(', ')})`;
    });

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n${values.join(',\n')};`;
    return sql;
}

async function run() {
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

    for (const file of files) {
        const tableName = path.basename(file, '.json');

        // Skip users due to previous error
        if (tableName === 'users') continue;

        try {
            const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
            const data = JSON.parse(content);

            if (data.length > 0) {
                console.log(`Generating SQL for ${tableName}...`);
                const sql = generateInsertSql(tableName, data);
                fs.writeFileSync(path.join(outputDir, `${tableName}.sql`), sql);
                console.log(`Saved to ${path.join(outputDir, `${tableName}.sql`)}`);
            } else {
                console.log(`Skipping ${tableName} (empty)`);
            }
        } catch (e) {
            console.error(`Error processing ${file}: ${e.message}`);
        }
    }
}

run();
