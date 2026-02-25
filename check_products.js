const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProducts() {
    console.log('--- Checking Products ---');
    const { data, error, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log(`Total Products: ${count}`);
    if (data && data.length > 0) {
        console.log('Sample Product:', data[0]);
        console.log('Products:', data.map(p => ({ id: p.id, name: p.name, active: p.is_active })));
    } else {
        console.log('No products found.');
    }
}

checkProducts();
