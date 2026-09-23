# O'z OCR xizmatimiz (Tesseract)

Telegram antispam boti uchun rasm ichidagi matnni o'qiydigan bepul xizmat.
Tillar: o'zbek (lotin), rus (kirill). `OCR_LANGS` orqali o'zgartirish mumkin.

## Endpointlar

| Yo'l | Usul | Kalit | Vazifasi |
|---|---|---|---|
| `/`, `/health` | GET | — | holat; uxlab qolgan xizmatni uyg'otish uchun ham |
| `/ocr` | POST | `X-Api-Key` | rasm → matn (`file`, `base64` yoki `url`) |
| `/stats` | GET | `X-Api-Key` | so'rovlar soni, o'rtacha vaqt |

Javob: `{"ok": true, "text": "...", "ms": 2800, "langs": "uzb+rus"}`

## Muhit o'zgaruvchilari

| Nomi | Standart | Izoh |
|---|---|---|
| `OCR_SECRET` | — | **majburiy**, bot bilan bir xil kalit |
| `OCR_LANGS` | `uzb+rus` | Tesseract tillari |
| `OCR_PSM` | `11` | sahifa tahlili rejimi (11 = tarqoq matn, bannerlar uchun) |
| `OCR_THRESH` | `2` | binarizatsiya: 2 = Sauvola (lokal). Rangli fondagi oq yozuv uchun (Telegram skrinshotlari) |
| `OCR_MIN_SHORT` | `800` | rasmning qisqa tomoni kamida shuncha px bo'lguncha kattalashtiriladi |
| `OCR_MAX_SIDE` | `3000` | uzun tomoni bundan oshmaydi |

## O'lchovlar (Render bepul tarifi: 0.1 CPU, 512 MB)

- Banner/e'lon rasmi: **3–3.5 s**
- Telefon skrinshoti (574×1280, ko'p matnli): **~16–18 s**
- Xotira: ~51 MB (Tesseract) + Python
- Sinov to'plami: 9/9 to'g'ri (6 ta spam + 1 ta toza e'lon, lotin va kirill + 2 ta tungi rejim skrinshoti binafsha xabar pufagida)
