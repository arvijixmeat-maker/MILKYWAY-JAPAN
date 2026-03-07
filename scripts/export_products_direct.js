import fs from 'fs';

const supabaseUrl = 'https://hbcuqurqtipcnjhdyksz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiY3VxdXJxdGlwY25qaGR5a3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NDIzNzAsImV4cCI6MjA4NDAxODM3MH0.cBQLuPzsY4iFeSrv-Y_ESo0Gy2J0wU9L0JA4afhWKCM';

async function exportProducts() {
    console.log("Fetching products from Supabase REST API...");
    
    const response = await fetch(`${supabaseUrl}/rest/v1/products?select=*`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        console.error("Error fetching products:", response.status, await response.text());
        return;
    }

    const products = await response.json();
    console.log(`Found ${products.length} products.`);
    
    // Generate SQL inserts
    let sql = "BEGIN TRANSACTION;\n";
    sql += "DELETE FROM products;\n";
    
    for (const p of products) {
        const id = p.id.replace(/'/g, "''");
        const name = (p.name || '').replace(/'/g, "''");
        const description = (p.description || '').replace(/'/g, "''");
        const category = (p.category || '').replace(/'/g, "''");
        const duration = (p.duration || '').replace(/'/g, "''");
        const price = p.price || 0;
        const original_price = p.original_price || 0;
        const main_images = JSON.stringify(p.main_images || []).replace(/'/g, "''");
        const gallery_images = JSON.stringify(p.gallery_images || []).replace(/'/g, "''");
        const detail_images = JSON.stringify(p.detail_images || []).replace(/'/g, "''");
        const itinerary_images = JSON.stringify(p.itinerary_images || []).replace(/'/g, "''");
        const status = (p.status || 'active').replace(/'/g, "''");
        const is_featured = p.is_featured ? 1 : 0;
        const is_popular = p.is_popular ? 1 : 0;
        const tags = JSON.stringify(p.tags || []).replace(/'/g, "''");
        const included = JSON.stringify(p.included || []).replace(/'/g, "''");
        const excluded = JSON.stringify(p.excluded || []).replace(/'/g, "''");
        const sort_order = p.sort_order || 0;
        const view_count = p.view_count || 0;
        const booking_count = p.booking_count || 0;
        
        sql += `INSERT INTO products (id, name, description, category, duration, price, original_price, main_images, gallery_images, detail_images, itinerary_images, status, is_featured, is_popular, tags, included, excluded, sort_order, view_count, booking_count) VALUES ('${id}', '${name}', '${description}', '${category}', '${duration}', ${price}, ${original_price}, '${main_images}', '${gallery_images}', '${detail_images}', '${itinerary_images}', '${status}', ${is_featured}, ${is_popular}, '${tags}', '${included}', '${excluded}', ${sort_order}, ${view_count}, ${booking_count});\n`;
    }
    
    sql += "COMMIT;\n";
    
    fs.writeFileSync('migration_sql/seed_products.sql', sql);
    console.log("SQL seed file created at migration_sql/seed_products.sql");
}

exportProducts();
