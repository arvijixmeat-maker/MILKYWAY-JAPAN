
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hbcuqurqtipcnjhdyksz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiY3VxdXJxdGlwY25qaGR5a3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NDIzNzAsImV4cCI6MjA4NDAxODM3MH0.cBQLuPzsY4iFeSrv-Y_ESo0Gy2J0wU9L0JA4afhWKCM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFaqs() {
    console.log("Checking FAQ categories...");
    const { data: catData, error: catError } = await supabase.from('faq_categories').select('*');
    if (catError) console.error("Category Error:", catError);
    else console.log(`Found ${catData.length} categories.`);

    console.log("Checking FAQs...");
    const { data: faqData, error: faqError } = await supabase.from('faqs').select('*');
    if (faqError) console.error("FAQ Error:", faqError);
    else console.log(`Found ${faqData.length} FAQs.`);
}

checkFaqs();
