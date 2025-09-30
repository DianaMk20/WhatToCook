import { forwardRef, useEffect, useRef, useState } from "react";

export default forwardRef(function SearchBar(
  { value, onChange, loading, suggestions = [], onPick, onSubmit },
  ref
) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // close on click outside
  useEffect(() => {
    const onDocDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const disabled = value.trim().length < 2 || loading;
  const showSuggestions = open && suggestions.length > 0;

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setOpen(false);
      onSubmit?.();
    }
  };

  return (
    <div className="searchRow" ref={wrapRef}>
      <div className="searchbar">
        <input
          ref={ref}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true); // re-open as user types
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleEnter}
          placeholder="Search recipes…"
          aria-label="Search recipes"
        />

        {/* loading dot */}
        {loading && <span className="spinner" aria-hidden />}

        {/* clear button */}
        {value && (
          <button
            type="button"
            className="clear"
            aria-label="Clear search"
            title="Clear"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            ×
          </button>
        )}

        {/* suggestions */}
        {showSuggestions && (
          <ul className="suggestions" role="listbox" aria-label="Suggestions">
            {suggestions.map((s, i) => (
              <li key={`${s}-${i}`}>
                <button
                  type="button"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()} // keep input focus
                  onClick={() => {
                    onPick?.(s);
                    setOpen(false);
                    onSubmit?.();
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Search button (same as Enter) */}
      <button
        className="searchBtn"
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(false);
          onSubmit?.();
        }}
      >
        Search
      </button>
    </div>
  );
});
