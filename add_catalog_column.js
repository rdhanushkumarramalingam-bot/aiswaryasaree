const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addCatalogColumn() {
  console.log('Adding product_catalog_image_id column...');
  
  // First, let's try to select the column to see if it exists
  try {
    const { data, error } = await supabase
      .from('products')
      .select('product_catalog_image_id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column "product_catalog_image_id" does not exist')) {
        console.log('Column does not exist. Please add it manually via Supabase Dashboard:');
        console.log('1. Go to Supabase Dashboard');
        console.log('2. Navigate to Table Editor > products');
        console.log('3. Click "Add column"');
        console.log('4. Name: product_catalog_image_id, Type: text');
        console.log('5. Save the column');
        return;
      } else {
        console.error('Other error:', error.message);
        return;
      }
    }
    
    console.log('Column already exists!');
    console.log('Sample data:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

addCatalogColumn();
