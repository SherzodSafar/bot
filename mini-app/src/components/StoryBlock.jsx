const stories = [
  { emoji: '🔥', label: 'Aksiyalar' },
  { emoji: '🆕', label: 'Yangi' },
  { emoji: '🍕', label: 'Klassik' },
  { emoji: '🧀', label: 'Pishloqli' },
  { emoji: '🎁', label: 'Bonus' },
];

export default function StoryBlock() {
  return (
    <div className="story-row">
      {stories.map((s) => (
        <div className="story-item" key={s.label}>
          <div className="story-circle">
            <div className="story-circle-inner">{s.emoji}</div>
          </div>
          <div className="story-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
