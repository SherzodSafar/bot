import { useState } from 'react';

const slides = [
  {
    emoji: '🍕',
    title: 'Sizni ochlik qiynayaptimi?',
    subtitle: 'Biz issiqqina pizzalarni tezkor yetkazamiz.',
  },
  {
    emoji: '⚡️',
    title: 'Bu qanday ishlaydi?',
    subtitle: 'Tanlang, buyurtma bering va rohatlaning.',
  },
  {
    emoji: '❤️',
    title: '10,000+ odam',
    subtitle: 'Allaqachon biz bilan buyurtma qilmoqda.',
  },
];

export default function Onboarding({ onFinish }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  function handleNext() {
    if (isLast) {
      onFinish();
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-slide">
        <div className="onboarding-emoji">{slide.emoji}</div>
        <div className="onboarding-title">{slide.title}</div>
        <div className="onboarding-subtitle">{slide.subtitle}</div>
      </div>

      <div className="onboarding-footer">
        <div className="onboarding-dots">
          {slides.map((_, i) => (
            <div key={i} className={`dot ${i === index ? 'active' : ''}`} />
          ))}
        </div>
        <button className="btn-primary" onClick={handleNext}>
          {isLast ? 'Boshla' : 'Davom etish'}
        </button>
      </div>
    </div>
  );
}
