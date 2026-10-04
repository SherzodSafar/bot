# sizni-service

`sizni_tekshir.py` ni Render'da (bepul) ishlatish: hisoblaydi bazasida yo'q, lekin
guruhga oxirgi 6 oyda yozgan a'zolarni `/sizni@HisoblaydiBot` bilan tekshirib,
odam qo'shganlarni bazaga qo'shadi.

- Veb-sahifa: `https://<xizmat>.onrender.com/?key=<WEB_KEY>` — Telegramga kirish,
  baza yuklash, Boshlash / Davom / To'xtatish / Natija.
- Buyruqlar Telegramda ham ishlaydi ("Saqlangan xabarlar"da): `/sizni_boshla`,
  `/sizni_davom`, `/sizni_toxtat`, `/sizni_holat`, `/sizni_natija`.
- Holat har 5 daqiqada "Saqlangan xabarlar"ga (`#sizni_holat`) zaxiralanadi.

Muhit o'zgaruvchilari: `API_ID`, `API_HASH`, `ADMIN_ID`, `GROUP_ID`, `WEB_KEY`.
