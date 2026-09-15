const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.resolve(__dirname, '..', '.env');

function readExistingEnv() {
  if (!fs.existsSync(envPath)) return {};
  const values = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  return values;
}

function mask(value) {
  if (!value) return '';
  return value.length <= 12 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function createPrompter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const pendingLines = [];
  const waiters = [];
  let closed = false;

  rl.on('line', (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else pendingLines.push(line);
  });

  rl.on('close', () => {
    closed = true;
    while (waiters.length > 0) waiters.shift()('');
  });

  function nextLine() {
    if (pendingLines.length > 0) return Promise.resolve(pendingLines.shift());
    if (closed) return Promise.resolve('');
    return new Promise((resolve) => waiters.push(resolve));
  }

  async function ask(question, currentValue) {
    const hint = currentValue ? ` [hozirgi: ${mask(currentValue)}]` : '';
    process.stdout.write(`${question}${hint}\n> `);

    const line = await nextLine();
    return line.trim() || currentValue || '';
  }

  return { ask, close: () => rl.close() };
}

async function main() {
  const existing = readExistingEnv();
  const prompter = createPrompter();

  console.log('\n🍕 Pizza Delivery — sozlash\n');
  console.log('Quyidagi 3 ta savolga javob bering (Enter = hozirgi qiymatni saqlash).\n');

  const databaseUrl = await prompter.ask(
    '1) Neon PostgreSQL connection string (postgresql://... bilan boshlanadi):',
    existing.DATABASE_URL
  );

  const botToken = await prompter.ask('\n2) BotFather dan olingan Bot Token:', existing.BOT_TOKEN);

  console.log('\n3) ngrok authtoken (ixtiyoriy).');
  console.log('   Kiritsangiz, ngrok dastur bilan birga avtomatik ishga tushadi.');
  console.log('   https://dashboard.ngrok.com/get-started/your-authtoken');
  console.log("   Kerak bo'lmasa — Enter bosing.");
  const ngrokToken = await prompter.ask('', existing.NGROK_AUTHTOKEN);

  prompter.close();

  const errors = [];
  if (!databaseUrl.startsWith('postgres')) {
    errors.push("DATABASE_URL 'postgresql://' bilan boshlanishi kerak");
  }
  if (!botToken.includes(':')) {
    errors.push("BOT_TOKEN noto'g'ri ko'rinishda (123456:ABC-DEF... bo'lishi kerak)");
  }
  if (errors.length > 0) {
    console.error('\n❌ Xato:');
    errors.forEach((e) => console.error(`   - ${e}`));
    console.error("\nQaytadan urinib ko'ring: npm run setup\n");
    process.exit(1);
  }

  const content = [
    `DATABASE_URL="${databaseUrl}"`,
    `BOT_TOKEN=${botToken}`,
    `NGROK_AUTHTOKEN=${ngrokToken}`,
    'MINIAPP_URL=',
    'PORT=4000',
    'ADMIN_API_KEY=pizza_admin_2024',
    '',
  ].join('\n');

  fs.writeFileSync(envPath, content, { mode: 0o600 });

  console.log('\n✅ .env fayli yaratildi\n');
  console.log('Endi hammasini ishga tushiring:\n');
  console.log('   npm run dev:all\n');
}

main().catch((err) => {
  console.error('Sozlashda xato:', err.message);
  process.exit(1);
});
