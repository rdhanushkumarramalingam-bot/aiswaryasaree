export const products = [
  {
    id: 's1',
    name: 'Royal Kanjivaram Silk Saree',
    category: 'Silk Saree',
    price: 12500,
    cost: 8000,
    stock: 15,
    discount: 10,
    description: 'Authentic pure silk Kanjivaram saree with intricate gold zari borders.',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 's2',
    name: 'Banarasi Georgette Saree',
    category: 'Georgette',
    price: 4500,
    cost: 2800,
    stock: 25,
    discount: 5,
    description: 'Lightweight Banarasi Georgette with traditional motifs.',
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&auto=format&fit=crop&q=60'
  }
];

export const orders = [
  {
    id: 'ord_001',
    customer: 'Priya Sharma',
    phone: '9876543210',
    total: 11250,
    status: 'New',
    date: '2026-02-17',
    items: [
      { productId: 's1', quantity: 1, name: 'Royal Kanjivaram Silk Saree' }
    ]
  },
  {
    id: 'ord_002',
    customer: 'Rahul Verma',
    phone: '9123456780',
    total: 4275,
    status: 'Delivered',
    date: '2026-02-15',
    items: [
      { productId: 's2', quantity: 1, name: 'Banarasi Georgette Saree' }
    ]
  }
];
