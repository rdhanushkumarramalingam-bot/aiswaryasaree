const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(Boolean).map(line => line.split('=').map(s => s.trim())));

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
    const { data: products, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

    console.log(`Active Products Count: ${count}`);
    console.log('Product Names:', products.map(p => p.name).join(', '));
}

check();
