const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data: orders } = await supabase.from('orders').select('*').ilike('customer_name', '%dhivya%');
    console.log('Orders:', JSON.stringify(orders, null, 2));

    const { data: customers } = await supabase.from('customers').select('*').ilike('name', '%dhivya%');
    console.log('Customers:', JSON.stringify(customers, null, 2));
}

run();
