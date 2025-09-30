// components/Footer.jsx
// Simple, accessible footer for the app.
// - Uses semantic <footer> and a <nav> for links
// - Back to top link targets an element with id="top" (we'll add it in App.jsx)

// src/components/Footer.jsx
import kingThumbs from "../assets/king-thumbs-up.png";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="Footer" role="contentinfo">
      <div className="Footer-links" role="navigation" aria-label="Footer">
        <span className="Footer-brand">
          <img
            src={kingThumbs}
            alt="Thumbs up king"
            className="footer-king"
            loading="lazy"
            width={54}
            height={54}
          />
          <span className="footer-tagline">Only the best for you.</span>
        </span>

        <a href="#top" title="Back to top">
          ↑ Back to top
        </a>
      </div>

      <p className="Footer-copy">© {year} WhatToCook by Diana Malek</p>
    </footer>
  );
}
