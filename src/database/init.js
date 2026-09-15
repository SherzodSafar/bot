const { execSync } = require('child_process');
const path = require('path');
const { seedProducts } = require('../../prisma/seed');

const projectRoot = path.resolve(__dirname, '../..');

async function initDatabase() {
  console.log('🗄  Baza tekshirilmoqda...');
  execSync('npx prisma migrate deploy', { cwd: projectRoot, stdio: 'inherit' });

  const added = await seedProducts();
  if (added > 0) {
    console.log(`🍕 ${added} ta pizza bazaga qo'shildi`);
  }
  console.log('✅ Baza tayyor');
}

module.exports = { initDatabase };
