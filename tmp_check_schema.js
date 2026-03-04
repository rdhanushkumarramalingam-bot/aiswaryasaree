
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
    console.log('Checking database schema...');

    // Check products table columns
    const { data: cols, error: colError } = await supabase.rpc('debug_get_columns', { table_name: 'products' });
    if (colError) {
        console.log('RPC debug_get_columns failed. Trying common select.');
        const { data: prodData, error: prodError } = await supabase.from('products').select('*').limit(1);
        if (prodError) {
            console.error('Error fetching products:', prodError);
        } else {
            console.log('Product columns:', Object.keys(prodData[0] || {}));
        }
    } else {
        console.log('Columns in products:', cols.map(c => c.column_name));
    }

    // Check product_history table
    const { data: histData, error: histError } = await supabase.from('product_history').select('*').limit(1);
    if (histError) {
        console.error('Error fetching product_history:', histError);
    } else {
        console.log('product_history table exists. Columns:', Object.keys(histData[0] || {}));
    }

    // Check if total_sold column exists
    const { data: prodData, error: prodError } = await supabase.from('products').select('total_sold, alert_threshold').limit(1);
    if (prodError) {
        console.error('Error fetching inventory columns:', prodError);
    } else {
        console.log('Inventory columns exist.');
    }
}

checkSchema();
