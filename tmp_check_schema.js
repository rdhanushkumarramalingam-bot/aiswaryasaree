const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
    console.log('Checking orders table schema...');
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching orders:', error);
    } else if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        const fs = require('fs');
        fs.writeFileSync('schema_output.txt', JSON.stringify(columns, null, 2));
        console.log('Schema saved to schema_output.txt');
    } else {
        console.log('No orders found to inspect schema.');
    }
}

checkSchema();
