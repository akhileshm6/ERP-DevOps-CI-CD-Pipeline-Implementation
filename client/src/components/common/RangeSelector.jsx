import React from 'react';
import { RANGE_OPTIONS } from '../../utils/format';

export function RangeSelector({ value, onChange, label = 'Period' }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {RANGE_OPTIONS.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
