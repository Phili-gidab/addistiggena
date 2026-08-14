'use client';

export function Stars({
  value,
  onChange,
  small,
}: {
  value: number;
  onChange?: (v: number) => void;
  small?: boolean;
}) {
  const items = [1, 2, 3, 4, 5];
  if (!onChange) {
    return (
      <span className={`stars${small ? ' small' : ''}`}>
        {items.map((i) => (
          <span key={i} className={i <= Math.round(value) ? 'on' : ''}>
            ★
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className="stars">
      {items.map((i) => (
        <button key={i} type="button" className={i <= value ? 'on' : ''} onClick={() => onChange(i)}>
          ★
        </button>
      ))}
    </span>
  );
}
