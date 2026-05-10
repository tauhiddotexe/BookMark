import { useId } from "react";

import { formatStars } from "@/lib/format";

const OPTIONS = ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];

export function StarPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const group = useId();

  return (
    <div className="star-picker">
      {OPTIONS.map((option) => (
        <label key={option} className={value === option ? "star-option is-active" : "star-option"}>
          <input type="radio" name={group} value={option} checked={value === option} onChange={(event) => onChange(event.target.value)} />
          <span className="star-option-value">{formatStars(option)}</span>
          <span className="star-option-label">{option}</span>
        </label>
      ))}
    </div>
  );
}
