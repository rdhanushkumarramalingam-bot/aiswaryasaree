require('dotenv').config({ path: '.env.local' });

async function getPhoneNumber() {
    const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,name&access_token=${process.env.WHATSAPP_ACCESS_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(data);
}
getPhoneNumber();
