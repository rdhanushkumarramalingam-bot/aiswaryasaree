const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkImageUrls() {
    console.log('--- Checking Product Images ---');
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, image_url, category');

    if (error) {
        console.error('Error:', error);
        return;
    }

    products.forEach(p => {
        console.log(`[${p.id.substring(0, 6)}] ${p.name} | Cat: ${p.category} | Img: ${p.image_url ? 'YES' : 'NO'} (${p.image_url?.substring(0, 30)}...)`);
    });
}

checkImageUrls();
