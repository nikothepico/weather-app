// Simple weather app using Open-Meteo (no API key required)
// Geocoding: https://geocoding-api.open-meteo.com/v1/search?name=NAME&count=1
// Weather: https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current_weather=true&daily=...&timezone=auto

const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const statusEl = document.getElementById('status');
const weatherEl = document.getElementById('weather');
const locEl = document.getElementById('loc');
const tempEl = document.getElementById('temp');
const descEl = document.getElementById('desc');
const windEl = document.getElementById('wind');
const timeEl = document.getElementById('time');
const unitCBtn = document.getElementById('unit-c');
const unitFBtn = document.getElementById('unit-f');
const forecastEl = document.getElementById('forecast');
const forecastCardsEl = document.getElementById('forecast-cards');

const UNIT_KEY = 'weather_unit';
let currentUnit = localStorage.getItem(UNIT_KEY) || 'C';
let lastFetched = null; // store last fetched data for unit toggling

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  await lookupCity(city);
});

// Unit toggle handlers
unitCBtn.addEventListener('click', () => setUnit('C'));
unitFBtn.addEventListener('click', () => setUnit('F'));

function setUnit(u){
  if (u === currentUnit) return;
  currentUnit = u;
  localStorage.setItem(UNIT_KEY, currentUnit);
  unitCBtn.classList.toggle('active', currentUnit === 'C');
  unitFBtn.classList.toggle('active', currentUnit === 'F');
  unitCBtn.setAttribute('aria-pressed', currentUnit === 'C');
  unitFBtn.setAttribute('aria-pressed', currentUnit === 'F');
  // re-render last fetched temps if available
  if (lastFetched) {
    renderWeather(lastFetched.place, lastFetched.current);
    if (lastFetched.daily) renderForecast(lastFetched.daily);
  }
}

async function lookupCity(city){
  setStatus('Looking up location...', true);
  hideWeather();
  hideForecast();
  try{
    const geo = await geocode(city);
    if (!geo) { setStatus('Location not found. Try a different city.', false); return; }
    setStatus(`Found: ${geo.name}, ${geo.country} — fetching weather...`, true);
    const resp = await fetchWeather(geo.latitude, geo.longitude);
    if (!resp) { setStatus('Could not get weather for that location.', false); return; }
    lastFetched = { place: geo, current: resp.current_weather, daily: resp.daily };
    renderWeather(geo, resp.current_weather);
    if (resp.daily) renderForecast(resp.daily);
    setStatus('', false);
  }catch(err){
    console.error(err);
    setStatus('Error fetching data. Check your network and try again.', false);
  }
}

function setStatus(msg, loading=false){
  statusEl.textContent = msg || '';
  statusEl.style.opacity = msg ? '1' : '0.9';
}

function hideWeather(){
  weatherEl.classList.add('hidden');
}

function showWeather(){
  weatherEl.classList.remove('hidden');
}

async function geocode(name){
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0]; // contains name, latitude, longitude, country, etc.
}

async function fetchWeather(lat, lon){
  // request current weather plus a short daily forecast (3 days)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=3&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather request failed');
  const data = await res.json();
  return data;
}

function renderWeather(place, current){
  const { temperature, windspeed, winddirection, weathercode, time } = current;
  locEl.textContent = `${place.name}${place.admin1 ? ', ' + place.admin1 : ''}${place.country ? ', ' + place.country : ''}`;
  tempEl.textContent = formatTemp(temperature);
  const icon = codeToIcon(weathercode);
  const iconEl = document.getElementById('icon');
  if (iconEl && icon) {
    iconEl.src = icon.src;
    iconEl.alt = icon.alt;
    iconEl.setAttribute('aria-hidden', 'false');
  }
  descEl.textContent = `${codeToText(weathercode)}`;
  windEl.textContent = `Wind: ${windstr(windspeed, winddirection)}`;
  timeEl.textContent = `Local time: ${formatLocalTime(time)}`;

  // Apply a background based on weather code and local time (day/night)
  try{
    applyBackground(weathercode, time);
  }catch(e){
    console.warn('Background apply error', e);
  }

  showWeather();
 }function renderForecast(daily){
  if (!daily || !daily.time) { hideForecast(); return; }
  forecastCardsEl.innerHTML = '';
  const days = daily.time.map((t, i) => ({
    date: t,
    tmin: daily.temperature_2m_min[i],
    tmax: daily.temperature_2m_max[i],
    code: (daily.weathercode && daily.weathercode[i]) || null
  }));

  days.forEach(d => {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    const dt = new Date(d.date);
    const dateLabel = dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const ic = codeToIcon(d.code || 3);
    card.innerHTML = `
      <div class="date">${dateLabel}</div>
      <div class="icon"><img src="${ic.src}" alt="${ic.alt}"></div>
      <div class="tmax">${formatTemp(d.tmax)}</div>
      <div class="tmin">${formatTemp(d.tmin)}</div>
    `;
    forecastCardsEl.appendChild(card);
  });
  showForecast();
}

function showForecast(){
  forecastEl.classList.remove('hidden');
}

function hideForecast(){
  forecastEl.classList.add('hidden');
}

function formatTemp(tempC){
  if (currentUnit === 'C') return `${Math.round(tempC)}°C`;
  return `${Math.round(cToF(tempC))}°F`;
}

function cToF(c){
  return (c * 9 / 5) + 32;
}

function windstr(speed, dir){
  return `${speed} m/s ${dir ? '(' + Math.round(dir) + '°)' : ''}`;
}

function formatLocalTime(t){
  try{
    // API provides an ISO timestamp in the location's timezone when timezone=auto
    const dt = new Date(t);
    return dt.toLocaleString();
  }catch(e){
    return t;
  }
}

// Minimal mapping from Open-Meteo weather codes to text & emoji
function codeToText(code){
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Light snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    81: 'Moderate showers',
    82: 'Violent showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail'
  };
  return map[code] || 'Unknown';
}

function codeToIcon(code){
  // map Open-Meteo weather codes to icon filenames and alt text
  // returns { src, alt }
  if (code === 0) return { src: 'icons/sun.svg', alt: 'Clear sky' };
  if (code === 1 || code === 2) return { src: 'icons/partly-cloudy.svg', alt: 'Partly cloudy' };
  if (code === 3) return { src: 'icons/cloud.svg', alt: 'Overcast' };
  if (code >= 45 && code <= 48) return { src: 'icons/fog.svg', alt: 'Fog' };
  if (code >= 51 && code <= 67) return { src: 'icons/rain.svg', alt: 'Rain' };
  if (code >= 71 && code <= 75) return { src: 'icons/snow.svg', alt: 'Snow' };
  if (code >= 80 && code <= 82) return { src: 'icons/rain.svg', alt: 'Rain showers' };
  if (code >= 95) return { src: 'icons/thunder.svg', alt: 'Thunderstorm' };
  return { src: 'icons/cloud.svg', alt: 'Weather' };
}

// Map weather codes + local time to page background classes
function codeToBackground(code, timeStr){
  // Determine day vs night by local hour (reasonable assumption: day 06-17 inclusive)
  let hour = 12;
  try{
    const d = new Date(timeStr);
    if (!isNaN(d)) hour = d.getHours();
  }catch(e){ /* keep default */ }
  const isDay = hour >= 6 && hour < 18;

  console.log('Weather code:', code, 'Is day:', isDay); // Debug log

  // choose background key - code 1 (Mainly clear) should also use clear-day/night
  if (code === 0 || code === 1) return isDay ? 'bg-clear-day' : 'bg-clear-night';
  if (code === 2) return 'bg-partly-cloudy';
  if (code === 3) return 'bg-cloudy';
  if (code >= 45 && code <= 48) return 'bg-fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'bg-rain';
  if (code >= 71 && code <= 75) return 'bg-snow';
  if (code >= 95) return 'bg-thunder';
  return isDay ? 'bg-clear-day' : 'bg-clear-night';
}

function applyBackground(code, timeStr){
  const cls = codeToBackground(code, timeStr);
  const body = document.body;
  // remove existing bg-* classes
  Array.from(body.classList).forEach(c => {
    if (c.startsWith('bg-')) body.classList.remove(c);
  });
  body.classList.add(cls);
}

// Small convenience: search when pressing Enter in input (handled by form),
// and support a sample default on page load (commented out).

// Optional: auto-focus input
cityInput.focus();

// Initialize unit UI
setUnit(currentUnit);

// Uncomment to prefill for testing:
// cityInput.value = 'New York';
// lookupCity('New York');
