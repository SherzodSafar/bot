const prisma = require('../database/connection');

async function getAllProducts(category) {
  return prisma.product.findMany({
    where: category && category !== 'Barchasi' ? { category } : undefined,
    orderBy: { id: 'asc' },
  });
}

async function getCategories() {
  const products = await prisma.product.findMany({ select: { category: true } });
  return [...new Set(products.map((p) => p.category))];
}

async function getProductById(id) {
  return prisma.product.findUnique({ where: { id: Number(id) } });
}

async function createProduct(data) {
  return prisma.product.create({ data });
}

async function updateProduct(id, data) {
  return prisma.product.update({ where: { id: Number(id) }, data });
}

async function deleteProduct(id) {
  return prisma.product.delete({ where: { id: Number(id) } });
}

module.exports = {
  getAllProducts,
  getCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
