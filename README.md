# LifeBoard — To-Do Life Dashboard

A clean, minimal life dashboard built with pure HTML, CSS, and Vanilla JavaScript.
No frameworks, no build tools, no backend — just open `index.html` and go.

---

## Features

### Greeting
- Time-based greeting (Good morning / afternoon / evening / night)
- Updates automatically every minute

### Live Clock & Date
- Real-time HH:MM:SS clock
- Full date display (weekday, month, day, year)

### Focus Timer
- 25-minute Pomodoro-style countdown
- Start, Pause, and Reset controls
- Visual progress bar
- Urgent red state in the last 5 minutes
- Browser notification when session completes

### To-Do List
- Add, edit, complete, and delete tasks
- Priority levels: Low, Medium, High (color-coded left border)
- Categories: Work, Personal, Health, Learning, Finance
- Due dates with overdue detection
- Search tasks by title or notes
- Sort by: Date Created, Due Date, Priority, A→Z
- All tasks saved in localStorage

### Quick Links
- Add favourite websites with a label, URL, and emoji icon
- One-click to open in a new tab
- Delete links on hover
- All links saved in localStorage

### Dashboard Stats
- Total tasks, Completed, In Progress, Overdue counters
- Animated progress ring showing overall completion %

---

## Project Structure

```
index.html        ← entry point, open this in any browser
css/
  style.css       ← all styles (single CSS file)
js/
  app.js          ← all logic (single JS file)
README.md
```

---

## Tech Stack

| Layer   | Technology          |
|---------|---------------------|
| Structure | HTML5             |
| Styling   | CSS3 (no frameworks)|
| Logic     | Vanilla JavaScript  |
| Storage   | Browser localStorage|
| Backend   | None                |

---

## Running Locally

No installation or setup required.

1. Clone or download this repository
2. Open `index.html` in Chrome, Firefox, Edge, or Safari
3. That's it

---

## Deploying to GitHub Pages

### First-time setup

1. Push this repository to GitHub (using GitHub Desktop or the CLI)
2. Go to your repository on GitHub
3. Click **Settings** → **Pages** (left sidebar)
4. Under **Source**, select **Deploy from a branch**
5. Set branch to `main` (or `master`) and folder to `/ (root)`
6. Click **Save**

GitHub will publish your site at:
```
https://<your-username>.github.io/<repository-name>/
```

### Updating the live site

Every time you push new commits to `main`, GitHub Pages rebuilds and
redeploys automatically — usually within 1–2 minutes.

### Using GitHub Desktop

1. Open GitHub Desktop and open this repository
2. Make your changes in the editor
3. In GitHub Desktop, write a short commit message (e.g. `Add new task feature`)
4. Click **Commit to main**
5. Click **Push origin**
6. Your changes are live within a minute

---

## Browser Compatibility

| Browser | Supported |
|---------|-----------|
| Chrome  | ✅ |
| Firefox | ✅ |
| Edge    | ✅ |
| Safari  | ✅ |

Also works as a browser extension (MV3-compatible — no inline event handlers).

---

## License

MIT — free to use, modify, and distribute.
