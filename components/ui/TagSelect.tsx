"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export function TagSelect({
  name,
  options,
  placeholder,
  defaultSelected = [],
}: {
  name: string;
  options: string[];
  placeholder: string;
  defaultSelected?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [extraOptions, setExtraOptions] = useState<string[]>(
    defaultSelected.filter((v) => !options.includes(v)),
  );
  const [input, setInput] = useState("");

  const allOptions = [...options, ...extraOptions];

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function addCustom() {
    const value = input.trim();
    if (!value) return;
    if (!allOptions.includes(value)) {
      setExtraOptions((prev) => [...prev, value]);
    }
    if (!selected.includes(value)) {
      setSelected((prev) => [...prev, value]);
    }
    setInput("");
  }

  return (
    <div className="flex flex-col gap-2">
      {allOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allOptions.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border-unisanta-navy bg-unisanta-navy text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-unisanta-navy/40"
                }`}
              >
                {option}
                {isSelected && <X className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder={placeholder}
          className="h-9 flex-1 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-unisanta-navy focus:ring-2 focus:ring-unisanta-navy/15"
        />
        <button
          type="button"
          onClick={addCustom}
          className="flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-600 hover:border-unisanta-navy/40"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </div>
  );
}
