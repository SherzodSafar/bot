const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const products = [
  {
    name: 'Margarita',
    description: "Pomidor sousi, Mozarella pishlog'i, Bazalik ko'katlari, Zaytun moyi",
    imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80',
    oldPrice: 65000,
    newPrice: 49000,
    category: 'Klassik',
  },
  {
    name: 'Peperoni',
    description: "Pomidor sousi, Mozarella pishlog'i, Achchiq peperoni kolbasa, Origano",
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80',
    oldPrice: 75000,
    newPrice: 59000,
    category: 'Klassik',
  },
  {
    name: 'Qazi pizza',
    description: "Pomidor sousi, Mozarella pishlog'i, Qazi go'shti, Piyoz, Bulg'or qalampiri",
    imageUrl: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=800&q=80',
    oldPrice: 95000,
    newPrice: 79000,
    category: "Go'shtli",
  },
  {
    name: 'Pishloqli',
    description: "4 xil pishloq aralashmasi: Mozarella, Chedder, Parmezan, Gorgonzola",
    imageUrl: 'https://images.unsplash.com/photo-1548365328-9f547fb0953b?w=800&q=80',
    oldPrice: 80000,
    newPrice: 65000,
    category: 'Pishloqli',
  },
];

async function main() {
  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (!existing) {
      await prisma.product.create({ data: product });
      console.log(`Qo'shildi: ${product.name}`);
    } else {
      console.log(`Allaqachon mavjud: ${product.name}`);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed muvaffaqiyatli yakunlandi ✅");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
