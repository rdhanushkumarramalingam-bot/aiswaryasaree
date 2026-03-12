require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('*');

        if (error) {
            console.error('Database Error:', error);
        } else {
            console.log('App Settings:', data);
        }
    } catch (e) {
        console.error('Fatal Error:', e);
    }
}

test();
