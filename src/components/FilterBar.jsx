/**
 * FilterBar.jsx
 * Custom scrollable dropdowns with optional type-to-filter search.
 */
import { useEffect, useMemo, useRef, useState } from "react";

const CUISINES = [
  "American",
  "British",
  "Canadian",
  "Chinese",
  "Croatian",
  "Dutch",
  "Egyptian",
  "Filipino",
  "French",
  "Greek",
  "Indian",
  "Irish",
  "Italian",
  "Jamaican",
  "Japanese",
  "Kenyan",
  "Malaysian",
  "Mexican",
  "Moroccan",
  "Polish",
  "Portuguese",
  "Russian",
  "Spanish",
  "Thai",
  "Tunisian",
  "Turkish",
  "Unknown",
  "Vietnamese",
];

const CATEGORIES = [
  "Beef",
  "Breakfast",
  "Chicken",
  "Dessert",
  "Goat",
  "Lamb",
  "Miscellaneous",
  "Pasta",
  "Pork",
  "Seafood",
  "Side",
  "Starter",
  "Vegan",
  "Vegetarian",
];

function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Any",
  searchable = true,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Filtered options
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.toLowerCase().includes(term));
  }, [q, options]);

  const selectedLabel = value || placeholder;

  return (
    <div className="select" ref={wrapRef}>
      <span className="select-label">{label}</span>
      <button
        type="button"
        className="select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selectedLabel}</span>
        <span className="select-caret">▾</span>
      </button>

      {open && (
        <div
          className="select-panel"
          role="dialog"
          aria-label={`${label} menu`}
        >
          {searchable && (
            <div className="select-searchWrap">
              <input
                className="select-search"
                placeholder={`Search ${label.toLowerCase()}…`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div role="listbox" className="select-list" tabIndex={-1}>
            <button
              type="button"
              className="select-option"
              aria-selected={value === ""}
              onClick={() => {
                onChange("");
                setOpen(false);
                setQ("");
              }}
            >
              {placeholder}
            </button>

            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                className="select-option"
                aria-selected={value === opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                  setQ("");
                }}
              >
                {opt}
              </button>
            ))}

            {filtered.length === 0 && (
              <div
                className="select-option"
                style={{ opacity: 0.7, cursor: "default" }}
              >
                No matches
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FilterBar({
  cuisine,
  onCuisineChange,
  diet,
  onDietChange,
}) {
  return (
    <div className="filters">
      <Select
        label="Cuisine"
        value={cuisine}
        onChange={onCuisineChange}
        options={CUISINES}
        placeholder="Any cuisine"
        searchable
      />
      <Select
        label="Category"
        value={diet}
        onChange={onDietChange}
        options={CATEGORIES}
        placeholder="Any category"
        searchable
      />
    </div>
  );
}
