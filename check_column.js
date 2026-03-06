const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndAddColumn() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('product_catalog_image_id')
      .limit(1);
    
    if (error && error.message.includes('column "product_catalog_image_id" does not exist')) {
      console.log('Column does not exist. Please add it manually via Supabase Dashboard:');
      console.log('1. Go to Supabase Dashboard');
      console.log('2. Navigate to Table Editor > products');
      console.log('3. Click "Add column"');
      console.log('4. Name: product_catalog_image_id, Type: text');
    } else if (!error) {
      console.log('Column already exists!');
      console.log('Sample data:', data);
    } else {
      console.log('Error:', error.message);
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
}

checkAndAddColumn();
