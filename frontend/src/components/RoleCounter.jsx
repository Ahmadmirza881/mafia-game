import React from 'react';
import { sounds } from '../utils/soundEffects';

export function RoleCounter({ label, icon, value, min = 0, max = 50, onChange, disabled = false }) {
  const handleDecrement = () => {
    if (value > min && !disabled) {
      sounds.playClick();
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max && !disabled) {
      sounds.playClick();
      onChange(value + 1);
    }
  };

  return (
    <div className="counter-box">
      <div className="counter-label">
        {icon && <span className="counter-icon">{icon}</span>}
        <span>{label}</span>
      </div>

      <div className="counter-controls">
        <button
          type="button"
          className="counter-btn"
          onClick={handleDecrement}
          disabled={value <= min || disabled}
          aria-label={`Decrease ${label}`}
        >
          -
        </button>

        <span className="counter-value">{value}</span>

        <button
          type="button"
          className="counter-btn"
          onClick={handleIncrement}
          disabled={value >= max || disabled}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
