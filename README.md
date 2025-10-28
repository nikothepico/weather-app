# Simple Weather (Open-Meteo)

This is a minimal static weather website that uses Open‑Meteo's free APIs (no API key required).

- Geocoding: https://geocoding-api.open-meteo.com
- Weather: https://api.open-meteo.com

Files:
- `index.html` — main page
- `styles.css` — simple responsive styling
- `script.js` — geocoding + weather fetch and UI logic

How to run locally (simple):

Open a terminal in the project folder (`c:\Users\Administrator\Desktop\vibecoding`) and run a simple HTTP server.

Windows PowerShell:

```powershell
# if Python 3 is installed
python -m http.server 8000

# then open http://localhost:8000 in your browser
```

Or use npm (recommended if you plan to work with Node tooling):

```powershell
# install dev dependencies once
npm install

# start the static server (serves on port 8000)
npm start

# then open http://localhost:8000 in your browser
```

Notes and next steps:
- This sample uses Open‑Meteo's "timezone=auto" so the returned timestamp is already local to the location.
- No API keys required. If you prefer a different data provider (OpenWeatherMap, Weatherbit, etc.) you can swap the fetch calls but you may need an API key.
- TODOs: caching and additional improvements. SVG icons and a 3-day forecast have been added; unit toggle (C/F) is implemented.
- Background images for weather conditions added and will be applied automatically when weather is displayed.


License: MIT-style (copy/modify freely).# weather-app
