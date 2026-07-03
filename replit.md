# Vedantam Play School Website

A modern, colorful single-page preschool website for **Vedantam Play School** — built with pure HTML5, CSS3, and Vanilla JavaScript. No frameworks, no build tools.

## Stack
- **HTML5** — semantic, single-page (`index.html`)
- **CSS3** — custom properties, grid, flexbox, animations (`css/style.css`, `css/responsive.css`)
- **Vanilla JS** — lightweight, no dependencies (`js/script.js`)
- **Google Fonts** — Nunito

## Project Structure
```
index.html          Main single-page document
css/
  style.css         Core styles, layout, components
  responsive.css    Breakpoints (1100px, 900px, 640px, 380px)
js/
  script.js         Navbar, slider, gallery filter, form, scroll reveal
images/             (placeholder — add real images here)
```

## Design Theme
| Token    | Hex       | Usage                     |
|----------|-----------|---------------------------|
| Green    | `#5FBF3A` | Primary, CTAs, accents    |
| Sky Blue | `#27A9E1` | Secondary accents          |
| Orange   | `#F9A825` | Highlights, badges         |
| Purple   | `#8E44AD` | Variety accents            |

Font: **Nunito** (Google Fonts CDN)

## Sections
1. Sticky Navbar (scroll-aware, mobile hamburger)
2. Hero (animated floating cards, stats)
3. About School (image grid)
4. Why Choose Us (feature cards)
5. Programs (Playgroup → UKG)
6. Facilities (8-item grid)
7. Gallery (filter by category)
8. Testimonials (auto-sliding carousel)
9. Admission Process (4-step + enquiry form)
10. Contact (cards + map placeholder)
11. Footer (multi-column)

## Running
```
python3 -m http.server 5000
```
Open `http://localhost:5000` in your browser.

## To Customise
- **Real images**: Drop photos into `/images/` and update `src` attributes in `index.html`
- **Content**: Edit text directly in `index.html`
- **Colors**: Change CSS variables in `:root` inside `css/style.css`
- **Logo**: Replace the inline SVG in `index.html` with your actual logo image

## User Preferences
- Pure HTML/CSS/JS only — no React, Bootstrap, Tailwind, jQuery, or any framework
- Colors: Green #5FBF3A, Sky Blue #27A9E1, Orange #F9A825, Purple #8E44AD
- Font: Nunito (Google Fonts)
