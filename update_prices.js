const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateAllPrices() {
    console.log('Updating all product prices to ₹1...');
    const { data, error } = await supabase
        .from('products')
        .update({ price: 1 })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // match all rows

    if (error) {
        console.error('❌ Error:', error.message);
    } else {
        console.log('✅ All product prices updated to ₹1 successfully!');
    }
}

updateAllPrices();
