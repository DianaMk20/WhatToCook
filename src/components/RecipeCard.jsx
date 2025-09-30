export default function RecipeCard({
  name,
  area,
  category,
  thumb,
  favorite = false,
  onToggleFavorite,
}) {
  return (
    <article className="App-card">
      <img src={thumb} alt={name} className="App-thumb" loading="lazy" />

      <div
        className="card-body"
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          alignItems: "start",
        }}
      >
        <div>
          <h3 className="App-cardTitle">{name}</h3>
          <p className="App-cardMeta">
            {area} • {category}
          </p>
        </div>

        {/* ❤️ Favorite toggle (emoji) */}
        <button
          className={`fav-btn ${favorite ? "active" : ""}`}
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          title={favorite ? "Remove from favorites" : "Add to favorites"}
        >
          {favorite ? "❤️" : "🤍"}
        </button>
      </div>
    </article>
  );
}
