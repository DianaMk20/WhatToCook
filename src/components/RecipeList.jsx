import RecipeCard from "./RecipeCard.jsx";

export default function RecipeList({
  items,
  onSelect,
  onToggleFavorite,
  isFavorite,
}) {
  if (!items?.length) return null;

  return (
    <ul className="App-grid">
      {items.map((r) => (
        <li key={r.id} onClick={() => onSelect?.(r)}>
          <RecipeCard
            name={r.name}
            area={r.area}
            category={r.category}
            thumb={r.thumb}
            // ⭐ favorites
            favorite={isFavorite?.(r.id)}
            onToggleFavorite={(e) => {
              e.stopPropagation(); // don’t open modal when tapping the heart
              onToggleFavorite?.(r);
            }}
          />
        </li>
      ))}
    </ul>
  );
}
