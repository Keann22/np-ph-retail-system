export type Product = {
  id: string;
  name: string;
  sku: string;
  price: string;
  cost: string;
  stock: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  image: string;
}

export const productsData: Product[] = [
    {
      id: 'prod-001',
      name: 'AeroGrip Silicon Utensil Set',
      sku: 'AG-SUS-001',
      price: '₱49.99',
      cost: '₱20.00',
      stock: 120,
      status: 'In Stock',
      image: 'https://picsum.photos/seed/AG-SUS-001/64/64',
    },
    {
      id: 'prod-002',
      name: 'DuraCast Iron Skillet',
      sku: 'DC-CIS-12',
      price: '₱79.99',
      cost: '₱35.00',
      stock: 75,
      status: 'In Stock',
      image: 'https://picsum.photos/seed/DC-CIS-12/64/64',
    },
    {
      id: 'prod-003',
      name: 'FlexiBoard Cutting Mats (Set of 3)',
      sku: 'FB-CM-S3',
      price: '₱24.99',
      cost: '₱10.00',
      stock: 200,
      status: 'In Stock',
      image: 'https://picsum.photos/seed/FB-CM-S3/64/64',
    },
    {
      id: 'prod-004',
      name: 'AquaPure Water Filter Pitcher',
      sku: 'AP-WFP-2L',
      price: '₱34.99',
      cost: '₱15.00',
      stock: 5,
      status: 'Low Stock',
      image: 'https://picsum.photos/seed/AP-WFP-2L/64/64',
    },
    {
      id: 'prod-005',
      name: 'EcoSprout Bamboo Steamer',
      sku: 'ES-BS-10',
      price: '₱29.99',
      cost: '₱12.50',
      stock: 0,
      status: 'Out of Stock',
      image: 'https://picsum.photos/seed/ES-BS-10/64/64',
    },
    {
      id: 'prod-006',
      name: 'Precision Digital Kitchen Scale',
      sku: 'PD-KS-01',
      price: '₱19.99',
      cost: '₱8.00',
      stock: 150,
      status: 'In Stock',
      image: 'https://picsum.photos/seed/PD-KS-01/64/64',
    },
    {
      id: 'prod-007',
      name: 'Gourmet Chef Knife',
      sku: 'GC-CK-08',
      price: '₱99.99',
      cost: '₱40.00',
      stock: 12,
      status: 'Low Stock',
      image: 'https://picsum.photos/seed/GC-CK-08/64/64',
    },
  ];

export type Sale = {
    name: string;
    email: string;
    amount: string;
    avatar: string;
};

export const recentSalesData: Sale[] = [
    { name: 'Olivia Martin', email: 'olivia.martin@email.com', amount: '+₱1,999.00', avatar: 'https://picsum.photos/seed/101/40/40' },
    { name: 'Jackson Lee', email: 'jackson.lee@email.com', amount: '+₱39.00', avatar: 'https://picsum.photos/seed/102/40/40' },
    { name: 'Isabella Nguyen', email: 'isabella.nguyen@email.com', amount: '+₱299.00', avatar: 'https://picsum.photos/seed/103/40/40' },
    { name: 'William Kim', email: 'will@email.com', amount: '+₱99.00', avatar: 'https://picsum.photos/seed/104/40/40' },
    { name: 'Sofia Davis', email: 'sofia.davis@email.com', amount: '+₱39.00', avatar: 'https://picsum.photos/seed/105/40/40' },
  ];
