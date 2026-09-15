const { registerBotHandlers } = require('../controllers/botController');

function setupBotRoutes() {
  registerBotHandlers();
}

module.exports = setupBotRoutes;
