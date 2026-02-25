import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://fmqgrqxjsoidmyafeavk.supabase.co',
    'sb_publishable_feSSpEm4OCNKEAB0SOgx0A_nuYPeW-v'
);

async function test() {
    const { data, error } = await supabase.from('orders').insert({
        id: 'TEST-1234',
        customer_phone: '911234567890',
        customer_name: 'Test',
        total_amount: 100,
        status: 'PLACED',
        source: 'WEBSITE'
    });
    console.log('Error:', error);
}

test();
