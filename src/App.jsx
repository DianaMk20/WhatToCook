// App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import SearchBar from "./components/SearchBar.jsx";
import FilterBar from "./components/FilterBar.jsx";
import RecipeList from "./components/RecipeList.jsx";
import "./App.css";
import Footer from "./components/Footer.jsx";

const FAV_KEY = "wtc.favorites.v1";
const VIEW_KEY = "wtc.view.v1";
const THEME_KEY = "wtc.theme.v1";
const PAGE_SIZE = 12;

/* ---------- helpers (ingredients parsing, scaling, calories) ---------- */
function parseIngredients(meal) {
  const list = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const meas = meal[`strMeasure${i}`];
    if (ing && ing.trim())
      list.push({ ingredient: ing.trim(), measure: (meas || "").trim() });
  }
  return list;
}

const fracMap = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
function tokenToNumber(tok) {
  tok = tok.trim();
  if (fracMap[tok] != null) return fracMap[tok];
  if (/^\d+\s+\d+\/\d+$/.test(tok)) {
    const [a, b] = tok.split(/\s+/);
    const [n, d] = b.split("/").map(Number);
    return Number(a) + n / d;
  }
  if (/^\d+\/\d+$/.test(tok)) {
    const [n, d] = tok.split("/").map(Number);
    return n / d;
  }
  if (/^\d+(\.\d+)?$/.test(tok)) return Number(tok);
  return null;
}
function scaleMeasure(measure, factor) {
  if (!measure || !factor || factor === 1) return measure || "";
  return measure
    .split(/(\s+)/)
    .map((piece) => {
      const num = tokenToNumber(piece);
      if (num == null) return piece;
      const scaled = num * factor;
      return Math.round(scaled * 100) % 100 === 0
        ? String(Math.round(scaled))
        : String(Number(scaled.toFixed(2)));
    })
    .join("");
}

const KCAL_PER_G = {
  chicken: 1.65,
  beef: 2.5,
  pork: 2.42,
  lamb: 2.94,
  rice: 3.6,
  pasta: 3.57,
  sugar: 4.0,
  flour: 3.64,
  butter: 7.17,
  oil: 8.84,
  milk: 0.64,
  cream: 3.4,
  cheese: 4.0,
  egg: 1.55,
  potato: 0.77,
  bread: 2.65,
  yogurt: 0.59,
};
function categorize(nm) {
  const n = nm.toLowerCase();
  if (n.includes("chicken")) return "chicken";
  if (n.includes("beef")) return "beef";
  if (n.includes("pork")) return "pork";
  if (n.includes("lamb")) return "lamb";
  if (n.includes("rice")) return "rice";
  if (n.includes("pasta") || n.includes("spaghetti")) return "pasta";
  if (n.includes("sugar")) return "sugar";
  if (n.includes("flour")) return "flour";
  if (n.includes("butter") || n.includes("ghee")) return "butter";
  if (n.includes("oil") || n.includes("olive")) return "oil";
  if (n.includes("milk")) return "milk";
  if (n.includes("cream")) return "cream";
  if (n.includes("cheese")) return "cheese";
  if (n.includes("egg")) return "egg";
  if (n.includes("potato")) return "potato";
  if (n.includes("bread")) return "bread";
  if (n.includes("yogurt") || n.includes("yoghurt")) return "yogurt";
  return null;
}
function firstNumber(measure) {
  if (!measure) return null;
  const m = measure.match(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(\.\d+)?)/);
  if (!m) return null;
  return tokenToNumber(m[1]);
}
function gramsFromMeasure(measure, cat) {
  if (!measure || !cat) return 0;
  const m = measure.toLowerCase();

  const g = measure.match(/(\d+(\.\d+)?)\s*g/gi);
  if (g) return parseFloat(g[0]) || firstNumber(measure) || 0;
  const kg = measure.match(/(\d+(\.\d+)?)\s*kg/gi);
  if (kg) return (parseFloat(kg[0]) || 0) * 1000;

  const mlMatch = measure.match(/(\d+(\.\d+)?)\s*ml/);
  if (mlMatch) {
    const ml = parseFloat(mlMatch[1]);
    const density = cat === "oil" ? 0.92 : cat === "milk" ? 1.03 : 1.0;
    return ml * density;
  }

  const qty = firstNumber(measure) || 0;
  if (/\btbsp\b/.test(m)) {
    if (cat === "oil") return qty * 13.5;
    if (cat === "butter") return qty * 14;
    if (cat === "sugar") return qty * 12.5;
    if (cat === "flour") return qty * 8;
    if (cat === "milk") return qty * 15 * 1.03;
    return qty * 12;
  }
  if (/\btsp\b/.test(m)) {
    if (cat === "oil") return qty * 4.5;
    if (cat === "sugar") return qty * 4;
    if (cat === "flour") return qty * 2.6;
    if (cat === "milk") return qty * 5 * 1.03;
    return qty * 4;
  }
  if (/\bcup\b/.test(m)) {
    if (cat === "rice") return qty * 185;
    if (cat === "flour") return qty * 120;
    if (cat === "sugar") return qty * 200;
    if (cat === "milk") return qty * 240 * 1.03;
    if (cat === "oil") return qty * 240 * 0.92;
    return qty * 240;
  }
  if (cat === "egg") return qty * 50;
  if (measure.includes("clove")) return qty * 3;
  return 0;
}
function estimateCaloriesPerServing(ingredients, servings) {
  try {
    let total = 0;
    for (const { ingredient, measure } of ingredients) {
      const cat = categorize(ingredient);
      if (!cat || KCAL_PER_G[cat] == null) continue;
      const grams = gramsFromMeasure(measure, cat);
      total += grams * KCAL_PER_G[cat];
    }
    const per = servings > 0 ? total / servings : total;
    return Math.round(per);
  } catch {
    return null;
  }
}
/* --------------------------------------------------------------------- */

export default function App() {
  const [searchText, setSearchText] = useState("");
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  // Run an immediate search with the current searchText
  const runSearchNow = async () => {
    const q = searchText.trim();
    if (q.length < 2) return; // keep the "min 2 chars" rule

    // cancel any in-flight request (from debounce)
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError("");
      const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMeals(Array.isArray(data?.meals) ? data.meals : []);
    } catch (e) {
      if (e.name !== "AbortError")
        setError(e.message || "Failed to load recipes");
    } finally {
      setLoading(false);
    }
  };

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) || "search";
    } catch {
      return "search";
    }
  });

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || "dark";
    } catch {
      return "dark";
    }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  const [filterCuisine, setFilterCuisine] = useState("");
  const [filterDiet, setFilterDiet] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const BASE_SERVINGS = 2;
  const [servings, setServings] = useState(BASE_SERVINGS);

  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {}
  }, [view]);

  const clearFilters = () => {
    setFilterCuisine("");
    setFilterDiet("");
  };
  const clearSearch = () => {
    abortRef.current?.abort();
    setSearchText("");
    setMeals([]);
    setError("");
  };

  useEffect(() => {
    if (searchText.length < 2) {
      setMeals([]);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const id = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(
          searchText.trim()
        )}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMeals(Array.isArray(data?.meals) ? data.meals : []);
      } catch (e) {
        if (e.name !== "AbortError")
          setError(e.message || "Failed to load recipes");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [searchText]);

  const results = useMemo(
    () =>
      meals.map((m) => ({
        id: m.idMeal,
        name: m.strMeal,
        area: m.strArea,
        category: m.strCategory,
        thumb: m.strMealThumb,
        instructions: m.strInstructions || "",
        ingredients: parseIngredients(m),
      })),
    [meals]
  );

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (filterCuisine && r.area !== filterCuisine) return false;
      if (filterDiet && r.category !== filterDiet) return false;
      return true;
    });
  }, [results, filterCuisine, filterDiet]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [searchText, filterCuisine, filterDiet]);
  const visibleItems = useMemo(
    () => filteredResults.slice(0, visible),
    [filteredResults, visible]
  );

  const inputRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !/input|textarea|select/i.test(e.target.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nameSuggestions = useMemo(
    () =>
      Array.from(new Set(results.map((r) => r.name))).filter((n) =>
        n.toLowerCase().includes(searchText.toLowerCase())
      ),
    [results, searchText]
  );
  const handlePickSuggestion = (text) => setSearchText(text);

  const toggleFavorite = (recipe) => {
    setFavorites((prev) => {
      const exists = prev.find((f) => f.id === recipe.id);
      return exists
        ? prev.filter((f) => f.id !== recipe.id)
        : [...prev, recipe];
    });
  };
  const isFavorite = (id) => favorites.some((f) => f.id === id);
  const clearFavorites = () => setFavorites([]);

  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 200;
      const hasResults =
        view === "search" && filteredResults.length > 0 && !loading;
      setShowScrollTop(scrolled && hasResults);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [view, filteredResults.length, loading]);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleShare = async (recipe) => {
    const text = `Check out this recipe: ${recipe.name} (${recipe.area} • ${recipe.category})`;
    const shareData = { title: recipe.name, text, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard?.writeText(
          `${text}\n${window.location.href}`
        );
        alert("Link copied to clipboard!");
      }
    } catch {}
  };

  const handlePrint = (recipe, scaledLines, kcalPerServing) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const html = `
<!doctype html><html><head><meta charset="utf-8"/>
<title>${recipe.name} — WhatToCook</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:24px;color:#111}
h1{margin:0 0 6px}.meta{color:#555;margin:0 0 14px}
img{max-width:100%;border-radius:10px;margin:12px 0}
.badge{display:inline-block;padding:4px 8px;border-radius:999px;background:#ffe9d9;border:1px solid #f0d3bf}
ul{padding-left:18px}
</style></head><body>
<h1>${recipe.name}</h1>
<p class="meta">${recipe.area} • ${recipe.category}</p>
<img src="${recipe.thumb}" alt="${recipe.name}"/>
<p><span class="badge">≈ ${
      kcalPerServing ?? "—"
    } kcal / serving (est.)</span></p>
<h3>Ingredients</h3>
<ul>${scaledLines.map((l) => `<li>${l}</li>`).join("")}</ul>
<h3>Instructions</h3>
<p>${(recipe.instructions || "").replace(/\n/g, "<br/>")}</p>
<script>window.print();</script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="centered" id="top">
      <div className="App">
        <h1 className="sr-only">WhatToCook</h1>
        <h2 className="App-headline">Comfort Food Made Simple</h2>

        {/* Tabs + THEME TOGGLE beside Favorites */}
        <nav className="tabs" aria-label="View navigation">
          {view === "favorites" && (
            <button
              className="tab"
              onClick={() => setView("search")}
              aria-label="Go to Home"
            >
              🏠︎ Home
            </button>
          )}

          <button
            className={`tab ${view === "favorites" ? "active" : ""}`}
            onClick={() => setView("favorites")}
            aria-current={view === "favorites" ? "page" : undefined}
          >
            <span className="tabLabel">
              <span className="tabEmoji" role="img" aria-label="heart">
                ❤️
              </span>
              Favorites
            </span>
            {favorites.length > 0 && (
              <span className="badge">{favorites.length}</span>
            )}
          </button>

          {/* Compact theme toggle */}
          <button
            className={`switch2 ${theme}`}
            role="switch"
            aria-checked={theme === "dark"}
            aria-label="Toggle light / dark mode"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && e.preventDefault()
            }
            title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          >
            <span className="iconSun" aria-hidden>
              ☀︎
            </span>
            <span className="iconMoon" aria-hidden>
              ☾
            </span>
            <span className="knob2" />
          </button>
        </nav>

        {/* SEARCH VIEW */}
        {view === "search" && (
          <>
            <p className="App-help">
              Type at least 2 characters to search by <em>name</em>.
            </p>

            <SearchBar
              ref={inputRef}
              value={searchText}
              onChange={setSearchText}
              loading={loading}
              suggestions={searchText.length >= 2 ? nameSuggestions : []}
              onPick={handlePickSuggestion}
              onSubmit={runSearchNow}
            />

            <FilterBar
              cuisine={filterCuisine}
              onCuisineChange={setFilterCuisine}
              diet={filterDiet}
              onDietChange={setFilterDiet}
            />

            {/* Meta row */}
            <div className="App-meta">
              <div className="App-metaLeft">
                {searchText ? (
                  <span>Query: “{searchText}”</span>
                ) : (
                  <span>
                    Try: <code>chicken</code>, <code>curry</code>
                  </span>
                )}
                {filteredResults.length ? (
                  <span> • Results: {filteredResults.length}</span>
                ) : null}
                {(filterCuisine || filterDiet) && (
                  <span>
                    {" • Filters:"}
                    {filterCuisine ? ` ${filterCuisine}` : " (any cuisine)"}
                    {filterDiet ? `, ${filterDiet}` : ""}
                  </span>
                )}
              </div>
              {(searchText || filterCuisine || filterDiet) && (
                <div className="results-header actions">
                  {searchText && (
                    <button className="link-reset" onClick={clearSearch}>
                      ✖ Clear search
                    </button>
                  )}
                  {(filterCuisine || filterDiet) && (
                    <button className="link-reset" onClick={clearFilters}>
                      ✖ Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {error && <div className="App-error">Error: {error}</div>}

            {loading ? (
              <ul className="App-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i}>
                    <article className="App-card">
                      <div
                        className="App-thumb skeleton"
                        style={{ height: 160, borderRadius: 10 }}
                      />
                      <div
                        className="skeleton"
                        style={{ height: 18, borderRadius: 6, marginTop: 10 }}
                      />
                      <div
                        className="skeleton"
                        style={{
                          height: 14,
                          borderRadius: 6,
                          width: "60%",
                          marginTop: 8,
                        }}
                      />
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <RecipeList
                items={visibleItems}
                onSelect={(r) => {
                  setSelectedRecipe(r);
                  setServings(BASE_SERVINGS);
                }}
                onToggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            )}

            {searchText &&
              !loading &&
              filteredResults.length === 0 &&
              !error && (
                <p className="App-emptyMsg">
                  No recipes found for “{searchText}”.
                </p>
              )}

            {visible < filteredResults.length && !loading && (
              <div className="App-loadMore">
                <button
                  type="button"
                  onClick={() =>
                    setVisible((v) =>
                      Math.min(v + PAGE_SIZE, filteredResults.length)
                    )
                  }
                  aria-label="Show more results"
                >
                  See more ({filteredResults.length - visible} left)
                </button>
              </div>
            )}
          </>
        )}

        {/* FAVORITES VIEW */}
        {view === "favorites" && (
          <div className="results-wrapper">
            <div
              className="results-header"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <h2
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <img
                  src="/king-love.png"
                  alt=""
                  className="kingIcon kingIcon--header"
                />
                Favorites
              </h2>
              {favorites.length > 0 && (
                <div className="actions">
                  <button className="link-reset" onClick={clearFavorites}>
                    ✖ Clear favorites
                  </button>
                </div>
              )}
            </div>

            {favorites.length === 0 ? (
              <div className="App-empty">
                <span>No favorites yet.</span>
                <div className="empty-actions">
                  <button className="btn" onClick={() => setView("search")}>
                    Add some from Search →
                  </button>
                </div>
              </div>
            ) : (
              <RecipeList
                items={favorites}
                onSelect={(r) => {
                  setSelectedRecipe(r);
                  setServings(BASE_SERVINGS);
                }}
                onToggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            )}
          </div>
        )}

        <Footer />
      </div>

      {/* MODAL */}
      {selectedRecipe &&
        (() => {
          const factor = servings / BASE_SERVINGS;
          const scaledLines = selectedRecipe.ingredients.map(
            ({ measure, ingredient }) =>
              `${scaleMeasure(measure, factor)} ${ingredient}`.trim()
          );
          const kcalPerServing = estimateCaloriesPerServing(
            selectedRecipe.ingredients.map((x) => ({
              ingredient: x.ingredient,
              measure: scaleMeasure(x.measure, factor),
            })),
            servings
          );

          return (
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="recipe-title"
            >
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h2 id="recipe-title" className="modal-title">
                      {selectedRecipe.name}
                    </h2>
                    <p className="modal-meta">
                      {selectedRecipe.area} • {selectedRecipe.category}
                    </p>
                  </div>
                  <div className="modal-actions">
                    <button
                      className="iconBtn"
                      title="Share"
                      aria-label="Share recipe"
                      onClick={() => handleShare(selectedRecipe)}
                    >
                      ↗
                    </button>
                    <button
                      className="iconBtn"
                      title="Print"
                      aria-label="Print recipe"
                      onClick={() =>
                        handlePrint(selectedRecipe, scaledLines, kcalPerServing)
                      }
                    >
                      🖨
                    </button>
                    <button
                      className="iconBtn"
                      title="Close"
                      aria-label="Close modal"
                      onClick={() => setSelectedRecipe(null)}
                    >
                      ✖
                    </button>
                  </div>
                </div>

                <img
                  src={selectedRecipe.thumb}
                  alt={selectedRecipe.name}
                  className="modal-thumb"
                />

                <div className="modal-body">
                  <div className="servingsRow">
                    <div
                      className="servingsControl"
                      role="group"
                      aria-label="Adjust servings"
                    >
                      <button
                        onClick={() => setServings((s) => Math.max(1, s - 1))}
                        aria-label="Decrease servings"
                      >
                        −
                      </button>
                      <span>{servings}</span>
                      <button
                        onClick={() => setServings((s) => Math.min(24, s + 1))}
                        aria-label="Increase servings"
                      >
                        +
                      </button>
                    </div>
                    <span className="nutrition">
                      ≈ {kcalPerServing ?? "—"} kcal / serving (est.)
                    </span>
                  </div>

                  <h3>Ingredients</h3>
                  <ul>
                    {scaledLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>

                  <h3>Instructions</h3>
                  <p>{selectedRecipe.instructions}</p>
                </div>
              </div>
            </div>
          );
        })()}

      {showScrollTop && (
        <button
          className="scrollTopBtn"
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}
