const test = async () => {
    const res = await fetch('http://localhost:3000/api/admin/broadcast', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            to: '919944669651', // any phone
            product: {
                image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=85',
                name: 'Test Saree'
            },
            message: 'Testing broadcast',
            shopUrl: 'http://localhost:3000/shop'
        })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
};
test();
