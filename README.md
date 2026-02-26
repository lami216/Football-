# Football Broadcast Physics Engine

A lightweight HTML/CSS/JS app (GitHub Pages friendly) with a separate admin panel and match broadcast view.

## Files
- `admin.html` — control panel only
- `match.html` — broadcast view only (scoreboard, arena, schedule)
- `index.html` — quick launcher links
- `styles.css` — shared styling + visual themes
- `app-admin.js` — localStorage config + match control logic
- `app-match.js` — Matter.js physics engine + scoring/timer/overlays

## How to use
1. Open `admin.html`.
2. Set team names, upload logos, choose duration/theme, and set schedule date/time.
3. Click **Save Settings**.
4. Click **Start Match** to set running state and start timestamp.
5. Click **Open Match View** to open `match.html` in a separate tab.
6. Use **Reset Match** in admin to clear score and respawn balls.

## Notes
- Team logos are user-uploaded at runtime and stored as base64 in `localStorage`.
- No binary image files are required in the repository.
- Broadcast clock maps real duration (15-60 sec) to a 0:00 → 90:00 match clock.
