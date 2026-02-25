const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://fmqgrqxjsoidmyafeavk.supabase.co',
    'sb_publishable_feSSpEm4OCNKEAB0SOgx0A_nuYPeW-v'
);

async function placeOrderTest() {
    try {
        const { data: prods } = await supabase.from('products').select('*').limit(1);
        const item = prods[0];

        const orderId = `WEB-${Date.now().toString().slice(-6)}`;

        const { error: orderError } = await supabase.from('orders').insert({
            id: orderId,
            customer_phone: '911234567890',
            customer_name: 'Test',
            delivery_address: 'Test Addr',
            status: 'PLACED',
            total_amount: item.price,
            payment_method: 'COD',
            source: 'WEBSITE',
            created_at: new Date()
        });

        if (orderError) {
            console.error('Order Error:', orderError);
            return;
        }

        const items = [{
            order_id: orderId,
            product_id: item.id,
            product_name: item.name,
            quantity: 1,
            price_at_time: item.price
        }];

        const { error: itemsError } = await supabase.from('order_items').insert(items);
        if (itemsError) {
            console.error('Items Error:', itemsError);
            return;
        }

        console.log('Order placed successfully! ID:', orderId);
    } catch (e) {
        console.error('Catch Error:', e);
    }
}

placeOrderTest();
