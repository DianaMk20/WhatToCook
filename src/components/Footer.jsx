// components/Footer.jsx
// Simple, accessible footer for the app.
// - Uses semantic <footer> and a <nav> for links
// - Back to top link targets an element with id="top" (we'll add it in App.jsx)

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="Footer" role="contentinfo">
      <div className="Footer-links" role="navigation" aria-label="Footer">
        <span className="Footer-brand">
          <img
            src="/king-thumbs-up.png"
            alt="Thumbs up king"
            className="footer-king"
            loading="lazy"
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
