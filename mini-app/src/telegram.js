export function getWebApp() {
  return window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
}

export function getInitData() {
  const wa = getWebApp();
  return wa ? wa.initData : '';
}

export function getTelegramUser() {
  const wa = getWebApp();
  return wa && wa.initDataUnsafe ? wa.initDataUnsafe.user : null;
}

export function closeMiniApp() {
  const wa = getWebApp();
  if (wa) wa.close();
}

export function showAlert(message) {
  const wa = getWebApp();
  if (wa && wa.showAlert) {
    wa.showAlert(message);
  } else {
    alert(message);
  }
}

export function initTelegram() {
  const wa = getWebApp();
  if (wa) {
    wa.ready();
    wa.expand();
    wa.setHeaderColor('#ffffff');
    wa.setBackgroundColor('#ffffff');
  }
}
