import { useId } from "react";

import { formatStars } from "@/lib/format";

const OPTIONS = ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];

export function StarPicker({ value, onChange }: { value: string | number | null; onChange: (value: string) => void }) {
  const stringValue = value?.toString() ?? "";
  const group = useId();

  return (
    <div className="star-picker">
      {OPTIONS.map((option) => (
        <label key={option} className={stringValue === option ? "star-option is-active" : "star-option"}>
          <input type="radio" name={group} value={option} checked={stringValue === option} onChange={(event) => onChange(event.target.value)} />
          <span className="star-option-value">{formatStars(option)}</span>
          <span className="star-option-label">{option}</span>
        </label>
      ))}
    </div>
  );
}
