const { registerBotHandlers, setupMenuButton } = require('../controllers/botController');

async function setupBotRoutes(miniAppUrl) {
  registerBotHandlers(miniAppUrl);
  await setupMenuButton();
}

module.exports = setupBotRoutes;
