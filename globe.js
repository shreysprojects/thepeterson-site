/* Approved Bright Ivory globe: fixed screen-upright digits, real geographic projection.
   City markers and routes use the brass accent (#C8A15A) reserved for live elements.
   Routes are symbolic community connections, not personal relationship records.

   Interaction: drag (or use the arrow keys) to spin, choose a city to fly to it, live local
   times, real day and night shading, and a "You" marker placed from the visitor's device
   time zone. Nothing about the visitor is looked up or sent anywhere.
   The digits spell "what comes next " in ASCII, read row by row. */
(() => {
  'use strict';
  const canvas = document.querySelector('#globe');
  const ctx = canvas.getContext('2d');
  const labels = document.querySelector('#cityLabels');
  const card = document.querySelector('#cityCard');
  const hint = document.querySelector('#globeHint');
  const journey = document.querySelector('#journey');
  const stage = document.querySelector('.hero-stage');
  const pauseButton = document.querySelector('#pauseMotion');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const W = 720, H = 390, CX = 360, CY = 190, R = 187.5, SCALE = 2;
  const radians = Math.PI / 180;
  const rotationPeriod = 50000;
  const frameInterval = 1000 / 30;
  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const normalize = lon => ((lon % 360) + 540) % 360 - 180;
  const cities = [
    { id: 'montreal', name: 'Montréal', lat: 45.5019, lon: -73.5674, tz: 'America/Toronto', side: 'left', dy: -14 },
    { id: 'london', name: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London', side: 'right', dy: 15 },
    { id: 'shanghai', name: 'Shanghai', lat: 31.2304, lon: 121.4737, tz: 'Asia/Shanghai', side: 'right', dy: -12 }
  ];
  const routes = [[0, 1], [1, 2]];
  const chapters = [
    {
      label: '01 / Community',
      title: 'A world of<br> possibility.',
      body: 'Members in Montréal, London and Shanghai, united by a shared ambition to build what comes next.',
      metric: '3 cities · 3 countries'
    },
    {
      label: '02 / Global reach',
      title: 'Members across<br> 3 countries.',
      body: 'Across disciplines and borders, a shared standard of ability, judgment and contribution.',
      metric: 'Montréal · London · Shanghai'
    },
    {
      label: '03 / Connection',
      title: 'Connections of<br> consequence.',
      body: 'Exchange insight, find collaborators and contribute to the ambitions of your peers.',
      metric: 'An international community'
    }
  ];
  const origin = cities[0];
  const landW = 2048, landH = 1024;
  const phraseBits = Array.from('what comes next ').flatMap(ch => ch.charCodeAt(0).toString(2).padStart(8, '0').split(''));

  // Reference coordinates for common device time zones. Used only to place the "You" marker.
  const zones = {
    'America/New_York': [40.71, -74.01, 'New York'], 'America/Toronto': [43.65, -79.38, 'Toronto'], 'America/Montreal': [45.5, -73.57, 'Montréal'],
    'America/Chicago': [41.88, -87.63, 'Chicago'], 'America/Denver': [39.74, -104.99, 'Denver'], 'America/Phoenix': [33.45, -112.07, 'Phoenix'],
    'America/Los_Angeles': [34.05, -118.24, 'Los Angeles'], 'America/Vancouver': [49.28, -123.12, 'Vancouver'], 'America/Halifax': [44.65, -63.57, 'Halifax'],
    'America/Mexico_City': [19.43, -99.13, 'Mexico City'], 'America/Bogota': [4.71, -74.07, 'Bogotá'], 'America/Lima': [-12.05, -77.04, 'Lima'],
    'America/Sao_Paulo': [-23.55, -46.63, 'São Paulo'], 'America/Argentina/Buenos_Aires': [-34.6, -58.38, 'Buenos Aires'], 'America/Santiago': [-33.45, -70.67, 'Santiago'],
    'Europe/London': [51.51, -0.13, 'London'], 'Europe/Dublin': [53.35, -6.26, 'Dublin'], 'Europe/Lisbon': [38.72, -9.14, 'Lisbon'], 'Europe/Paris': [48.86, 2.35, 'Paris'],
    'Europe/Madrid': [40.42, -3.7, 'Madrid'], 'Europe/Amsterdam': [52.37, 4.9, 'Amsterdam'], 'Europe/Brussels': [50.85, 4.35, 'Brussels'], 'Europe/Berlin': [52.52, 13.4, 'Berlin'],
    'Europe/Zurich': [47.38, 8.54, 'Zurich'], 'Europe/Rome': [41.9, 12.5, 'Rome'], 'Europe/Stockholm': [59.33, 18.07, 'Stockholm'], 'Europe/Warsaw': [52.23, 21.01, 'Warsaw'],
    'Europe/Athens': [37.98, 23.73, 'Athens'], 'Europe/Istanbul': [41.01, 28.98, 'Istanbul'], 'Europe/Kyiv': [50.45, 30.52, 'Kyiv'], 'Europe/Kiev': [50.45, 30.52, 'Kyiv'],
    'Europe/Moscow': [55.76, 37.62, 'Moscow'], 'Africa/Casablanca': [33.57, -7.59, 'Casablanca'], 'Africa/Lagos': [6.52, 3.38, 'Lagos'], 'Africa/Cairo': [30.04, 31.24, 'Cairo'],
    'Africa/Nairobi': [-1.29, 36.82, 'Nairobi'], 'Africa/Johannesburg': [-26.2, 28.05, 'Johannesburg'], 'Asia/Jerusalem': [31.77, 35.21, 'Jerusalem'], 'Asia/Riyadh': [24.71, 46.68, 'Riyadh'],
    'Asia/Dubai': [25.2, 55.27, 'Dubai'], 'Asia/Karachi': [24.86, 67.01, 'Karachi'], 'Asia/Kolkata': [22.57, 88.36, 'Kolkata'], 'Asia/Calcutta': [22.57, 88.36, 'Kolkata'],
    'Asia/Dhaka': [23.81, 90.41, 'Dhaka'], 'Asia/Bangkok': [13.76, 100.5, 'Bangkok'], 'Asia/Jakarta': [-6.21, 106.85, 'Jakarta'], 'Asia/Singapore': [1.35, 103.82, 'Singapore'],
    'Asia/Kuala_Lumpur': [3.14, 101.69, 'Kuala Lumpur'], 'Asia/Hong_Kong': [22.32, 114.17, 'Hong Kong'], 'Asia/Shanghai': [31.23, 121.47, 'Shanghai'], 'Asia/Taipei': [25.03, 121.57, 'Taipei'],
    'Asia/Seoul': [37.57, 126.98, 'Seoul'], 'Asia/Tokyo': [35.68, 139.69, 'Tokyo'], 'Australia/Perth': [-31.95, 115.86, 'Perth'], 'Australia/Sydney': [-33.87, 151.21, 'Sydney'],
    'Australia/Melbourne': [-37.81, 144.96, 'Melbourne'], 'Australia/Brisbane': [-27.47, 153.03, 'Brisbane'], 'Pacific/Auckland': [-36.85, 174.76, 'Auckland'], 'Pacific/Honolulu': [21.31, -157.86, 'Honolulu']
  };
  const visitor = (() => {
    let timeZone = '';
    try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (error) { timeZone = ''; }
    const zone = zones[timeZone];
    if (zone) return { id: 'you', name: 'You', lat: zone[0], lon: zone[1], place: zone[2], exact: true, side: 'right', dy: 14 };
    const offset = -new Date().getTimezoneOffset() / 60;
    return { id: 'you', name: 'You', lat: 30, lon: clamp(offset * 15, -179, 179), place: `UTC${offset >= 0 ? '+' : ''}${offset}`, exact: false, side: 'right', dy: 14 };
  })();
  function distanceKm(a, b) {
    const dLat = (b.lat - a.lat) * radians, dLon = (b.lon - a.lon) * radians;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  const nearest = cities.map(city => ({ city, km: distanceKm(visitor, city) })).sort((a, b) => a.km - b.km)[0];
  const visitorIsHome = nearest.km < 80;
  const places = [...cities, visitor];
  const formatKm = km => `${Math.round(km).toLocaleString('en-GB')} km`;
  const formatCoordinates = place => `${Math.abs(place.lat).toFixed(2)}° ${place.lat >= 0 ? 'N' : 'S'} · ${Math.abs(place.lon).toFixed(2)}° ${place.lon >= 0 ? 'E' : 'W'}`;
  function clock(timeZone) {
    try {
      return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, ...(timeZone ? { timeZone } : {}) }).format(new Date());
    } catch (error) {
      return '';
    }
  }

  let progress = 0, lastChapter = -1, ready = false;
  let paused = false, inView = true, frameId = 0, storyFrame = 0;
  let lastFrameTime = 0, lastStepTime = 0;
  let longitude = origin.lon, velocity = 0, holdUntil = 0, holdTimer = 0, flight = null;
  let dragging = false, dragStartX = 0, dragStartLongitude = 0, lastMoveX = 0, lastMoveTime = 0, dragDistance = 0;
  let selected = null, visibleMarkers = [], landPixels, textureContext, sun = sunPosition();
  const surfaces = [];
  const samples = [];
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Globe showing Peterson member cities in Montréal, London and Shanghai. Drag it, or use the arrow keys, to spin it.');

  const labelElements = places.map(place => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = place.id === 'you' ? 'city-label is-visitor' : 'city-label';
    button.dataset.city = place.id;
    button.setAttribute('aria-pressed', 'false');
    const name = document.createElement('span');
    name.className = 'city-name';
    name.textContent = place.name;
    button.append(name);
    if (place.id === 'you') {
      button.setAttribute('aria-label', 'You, placed from your time zone. Show details.');
    } else {
      const time = document.createElement('span');
      time.className = 'city-time';
      button.append(time);
    }
    button.hidden = true;
    button.addEventListener('click', () => select(place.id, true));
    labels.appendChild(button);
    return button;
  });

  function buildLandMask(data) {
    const mask = document.createElement('canvas');
    mask.width = landW; mask.height = landH;
    const m = mask.getContext('2d', { willReadFrequently: true });
    m.fillStyle = '#fff';
    const polygon = rings => {
      m.beginPath();
      for (const ring of rings) {
        ring.forEach(([lon, lat], i) => {
          const x = (lon + 180) / 360 * landW, y = (90 - lat) / 180 * landH;
          i ? m.lineTo(x, y) : m.moveTo(x, y);
        });
        m.closePath();
      }
      m.fill('evenodd');
    };
    for (const f of data.features) {
      if (f.geometry.type === 'Polygon') polygon(f.geometry.coordinates);
      if (f.geometry.type === 'MultiPolygon') f.geometry.coordinates.forEach(polygon);
    }
    landPixels = m.getImageData(0, 0, landW, landH).data;
  }

  function currentChapter() {
    return Math.min(chapters.length - 1, Math.floor(progress * chapters.length));
  }

  // Where the sun is overhead right now, accurate to a few degrees.
  function sunPosition(date = new Date()) {
    const dayOfYear = (date - Date.UTC(date.getUTCFullYear(), 0, 0)) / 864e5;
    const declination = -23.44 * Math.cos(2 * Math.PI / 365 * (dayOfYear + 10)) * radians;
    const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    return { lon: -15 * (hours - 12) * radians, sinDec: Math.sin(declination), cosDec: Math.cos(declination) };
  }

  // Sine of the sun's elevation at a point. Below zero is night.
  function sunHeight(latRad, lonRad) {
    return Math.sin(latRad) * sun.sinDec + Math.cos(latRad) * sun.cosDec * Math.cos(lonRad - sun.lon);
  }

  function makeSurface() {
    const surface = document.createElement('canvas');
    surface.width = canvas.width;
    surface.height = canvas.height;
    return surface;
  }

  // The digit pattern never moves on screen. Cache each glyph in four shades (ocean or land,
  // day or night) and redraw only the cells whose shade changes as the globe turns.
  function prepareTexture() {
    const shades = [
      opacity => `rgba(248,247,239,${(.075 * opacity).toFixed(3)})`,
      opacity => `rgba(248,247,239,${(.04 * opacity).toFixed(3)})`,
      opacity => `rgba(248,247,239,${(.985 * opacity).toFixed(3)})`,
      opacity => `rgba(212,152,58,${(.92 * opacity).toFixed(3)})`
    ];
    const layers = shades.map(() => {
      const surface = makeSurface();
      surfaces.push(surface);
      const layer = surface.getContext('2d');
      layer.scale(SCALE, SCALE);
      layer.fillStyle = '#101D35';
      layer.fillRect(0, 0, W, H);
      layer.font = '5.8px "IBM Plex Sans", sans-serif';
      layer.textAlign = 'center';
      layer.textBaseline = 'middle';
      return layer;
    });

    const tilt = origin.lat * radians;
    const columns = Math.floor(2 * R / 4.7) + 1;
    let col = 0;
    for (let sx = CX - R; sx <= CX + R; sx += 4.7, col++) {
      let row = 0;
      for (let sy = CY - R; sy <= CY + R; sy += 6.1, row++) {
        const x = (sx - CX) / R, y = (CY - sy) / R;
        const radiusSq = x * x + y * y;
        if (radiusSq >= .995) continue;
        const z = Math.sqrt(1 - radiusSq);
        const latRad = Math.asin(clamp(y * Math.cos(tilt) + z * Math.sin(tilt), -1, 1));
        const lonOffset = Math.atan2(x, z * Math.cos(tilt) - y * Math.sin(tilt));
        const edge = .35 + .65 * Math.pow(z, .3);
        const fade = .85 + .15 * clamp((x + 1) / 1.3);
        const texture = .97 + .03 * Math.sin(row * 2.7 + col * .8);
        const opacity = edge * fade * texture;
        const digit = phraseBits[(row * columns + col) % phraseBits.length];
        layers.forEach((layer, shade) => {
          layer.fillStyle = shades[shade](opacity);
          layer.fillText(digit, sx, sy);
        });
        const left = Math.round((sx - 2.35) * SCALE);
        const top = Math.round((sy - 3.05) * SCALE);
        samples.push({
          left, top,
          w: Math.round((sx + 2.35) * SCALE) - left,
          h: Math.round((sy + 3.05) * SCALE) - top,
          column: (lonOffset / radians + 180) / 360 * landW,
          row: clamp(Math.floor((90 - latRad / radians) / 180 * landH), 0, landH - 1) * landW,
          lonOffset,
          sinLat: Math.sin(latRad),
          cosLat: Math.cos(latRad),
          shade: 0
        });
      }
    }
    textureContext = makeSurface().getContext('2d');
    textureContext.drawImage(surfaces[0], 0, 0);
  }

  function drawTexture(longitudeDeg) {
    const offset = longitudeDeg / 360 * landW;
    const turn = longitudeDeg * radians;
    for (const sample of samples) {
      // Wrap horizontally in the power-of-two world mask.
      const column = Math.floor(sample.column + offset) & (landW - 1);
      const land = landPixels[(sample.row + column) * 4 + 3] > 70;
      const night = sample.sinLat * sun.sinDec + sample.cosLat * sun.cosDec * Math.cos(sample.lonOffset + turn - sun.lon) < -.03;
      const shade = (land ? 2 : 0) + (night ? 1 : 0);
      if (shade === sample.shade) continue;
      const { left, top, w, h } = sample;
      textureContext.drawImage(surfaces[shade], left, top, w, h, left, top, w, h);
      sample.shade = shade;
    }
    ctx.drawImage(textureContext.canvas, 0, 0, W, H);
  }

  function project(lon, lat, camera, elevation = 1) {
    const d = lon * radians - camera.lon, a = lat * radians;
    const x = Math.cos(a) * Math.sin(d);
    const y = Math.sin(a) * Math.cos(camera.lat) - Math.cos(a) * Math.cos(d) * Math.sin(camera.lat);
    const z = Math.sin(a) * Math.sin(camera.lat) + Math.cos(a) * Math.cos(d) * Math.cos(camera.lat);
    return { x: CX + R * x * elevation, y: CY - R * y * elevation, z };
  }

  function vector(place) {
    const a = place.lat * radians, o = place.lon * radians;
    return [Math.cos(a) * Math.cos(o), Math.sin(a), Math.cos(a) * Math.sin(o)];
  }

  function drawArc(a, b, camera, color, width, dash) {
    const va = vector(a), vb = vector(b);
    const omega = Math.acos(clamp(va.reduce((sum, v, i) => sum + v * vb[i], 0), -1, 1));
    const denominator = Math.sin(omega);
    let pen = false;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const wa = Math.sin((1 - t) * omega) / denominator, wb = Math.sin(t * omega) / denominator;
      const v = va.map((n, j) => wa * n + wb * vb[j]);
      const lon = Math.atan2(v[2], v[0]) / radians, lat = Math.asin(clamp(v[1], -1, 1)) / radians;
      const p = project(lon, lat, camera, 1 + .045 * Math.sin(t * Math.PI));
      if (p.z <= .025) { pen = false; continue; }
      pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      pen = true;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawGlobe(longitudeDeg) {
    if (!textureContext) return;
    const camera = { lon: longitudeDeg * radians, lat: origin.lat * radians };
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    drawTexture(longitudeDeg);
    routes.forEach(([a, b]) => drawArc(cities[a], cities[b], camera, 'rgba(200,161,90,.82)', .75));
    if (!visitorIsHome) drawArc(visitor, nearest.city, camera, 'rgba(248,247,239,.45)', .6, [1.5, 2.5]);
    visibleMarkers = [];
    places.forEach((place, index) => {
      const p = project(place.lon, place.lat, camera);
      const label = labelElements[index];
      const visible = p.z > .025;
      label.hidden = !visible || (place.id === 'you' && visitorIsHome);
      if (!visible) return;
      visibleMarkers.push({ id: place.id, x: p.x, y: p.y });
      if (place.id === 'you') {
        ctx.beginPath(); ctx.arc(p.x, p.y, 5.2, 0, 2 * Math.PI);
        ctx.setLineDash([1.6, 1.6]);
        ctx.strokeStyle = 'rgba(248,247,239,.85)'; ctx.lineWidth = .7; ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, 2 * Math.PI);
        ctx.fillStyle = '#F8F7EF'; ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, 5.2, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(200,161,90,.16)'; ctx.fill();
        ctx.strokeStyle = 'rgba(200,161,90,.92)'; ctx.lineWidth = .75; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.1, 0, 2 * Math.PI);
        ctx.fillStyle = '#C8A15A'; ctx.fill();
      }
      if (place.id === selected) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(200,161,90,.6)'; ctx.lineWidth = .6; ctx.stroke();
      }
      label.style.left = `${(p.x + (place.side === 'left' ? -10 : 10)) / W * 100}%`;
      label.style.top = `${(p.y + place.dy) / H * 100}%`;
      label.style.transform = place.side === 'left' ? 'translate(-100%, -50%)' : 'translateY(-50%)';
      label.style.opacity = String(clamp(p.z / .15));
    });
  }

  function renderCard() {
    if (!card || !selected) return;
    const place = places.find(item => item.id === selected);
    const [eyebrow, time, detail, note] = ['.city-card-eyebrow', '.city-card-time', '.city-card-detail', '.city-card-note'].map(selector => card.querySelector(selector));
    if (place.id === 'you') {
      eyebrow.textContent = place.exact ? `You · near ${place.place}` : `You · ${place.place}`;
      time.textContent = clock();
      detail.textContent = visitorIsHome ? `You are in ${nearest.city.name}.` : `${formatKm(nearest.km)} from ${nearest.city.name}, the nearest Peterson city.`;
      note.textContent = 'Placed from your time zone. Nothing is sent.';
    } else {
      const height = sunHeight(place.lat * radians, place.lon * radians);
      const light = height > .05 ? 'Daylight' : height > -.1 ? 'Twilight' : 'Night';
      const km = distanceKm(visitor, place);
      eyebrow.textContent = `${place.name} · ${formatCoordinates(place)}`;
      time.textContent = clock(place.tz);
      detail.textContent = `${light} · ${km < 80 ? 'You are here' : `${formatKm(km)} from you`}`;
      note.textContent = '';
    }
    card.hidden = false;
  }

  function updateTimes() {
    sun = sunPosition();
    cities.forEach((city, index) => {
      const time = clock(city.tz);
      const label = labelElements[index];
      label.querySelector('.city-time').textContent = time;
      label.setAttribute('aria-label', `${city.name}, ${time} local time. Show on the globe.`);
    });
    if (selected) renderCard();
    if (ready && !frameId) drawGlobe(longitude);
  }

  function dismissHint() {
    if (hint) hint.classList.add('is-dismissed');
  }

  function select(id, fly) {
    const place = places.find(item => item.id === id);
    if (!place) return;
    selected = id;
    labelElements.forEach(label => label.setAttribute('aria-pressed', String(label.dataset.city === id)));
    renderCard();
    dismissHint();
    if (fly) flyTo(place.lon);
    else if (ready && !frameId) drawGlobe(longitude);
  }

  function closeCard() {
    selected = null;
    if (card) card.hidden = true;
    labelElements.forEach(label => label.setAttribute('aria-pressed', 'false'));
    if (ready && !frameId) drawGlobe(longitude);
  }

  function flyTo(target) {
    const delta = normalize(target - longitude);
    velocity = 0;
    if (motion.matches || !ready) {
      longitude = normalize(longitude + delta);
      hold(8000);
      if (ready) drawGlobe(longitude);
      return;
    }
    flight = { from: longitude, delta, start: performance.now(), duration: 1100 };
    syncPlayback();
  }

  function updateCopy() {
    const chapter = currentChapter();
    if (chapter === lastChapter) return;
    const animate = lastChapter !== -1 && !motion.matches;
    lastChapter = chapter;
    const copy = chapters[chapter];
    for (const [id, value] of [['storyLabel', copy.label], ['storyTitle', copy.title], ['storyBody', copy.body], ['storyMetric', copy.metric]]) {
      const node = document.getElementById(id);
      if (!node) continue;
      node.getAnimations().forEach(animation => animation.cancel());
      if (id === 'storyTitle') {
        node.innerHTML = value;
        if (animate && typeof window.petersonDecode === 'function') {
          window.petersonDecode(node, { duration: 700 });
          continue;
        }
      } else {
        node.textContent = value;
      }
      if (animate && node.animate) node.animate([{ opacity: .2 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    }
    document.querySelectorAll('[data-beat]').forEach(button => {
      const active = Number(button.dataset.beat) === chapter;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
  }

  function scrollRange() { return Math.max(1, journey.offsetHeight - stage.offsetHeight); }
  function scrollOffset() {
    return parseFloat(getComputedStyle(stage).top) || 0;
  }
  function getScrollProgress() {
    if (scrollRange() <= 1) return progress;
    return clamp((scrollY - journey.offsetTop + scrollOffset()) / scrollRange());
  }
  function updateStory() {
    storyFrame = 0;
    progress = getScrollProgress();
    updateCopy();
  }

  function queueStory() {
    if (!storyFrame) storyFrame = requestAnimationFrame(updateStory);
  }

  addEventListener('scroll', queueStory, { passive: true });
  addEventListener('resize', queueStory);
  document.querySelectorAll('[data-beat]').forEach(button => button.addEventListener('click', () => {
    const chapter = Number(button.dataset.beat);
    if (!Number.isInteger(chapter) || chapter < 0 || chapter >= chapters.length) return;
    const target = chapter === 0 ? 0 : (chapter + 0.5) / chapters.length;
    if (scrollRange() <= 1) {
      progress = target;
      updateCopy();
      return;
    }
    scrollTo({
      top: journey.offsetTop - scrollOffset() + target * scrollRange(),
      behavior: motion.matches ? 'instant' : 'smooth'
    });
  }));

  // Motion: the globe turns on its own unless paused, dragged, flying to a city,
  // coasting after a drag, or resting after someone touched it.
  function hold(ms) {
    holdUntil = performance.now() + ms;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(syncPlayback, ms + 30);
  }

  function autoRotating(now) {
    return !motion.matches && !paused && !dragging && !flight && now >= holdUntil;
  }

  function moving(now) {
    return dragging || Boolean(flight) || velocity !== 0 || autoRotating(now);
  }

  function paintFrame(now) {
    frameId = 0;
    if (!ready || !inView || document.hidden) return;
    const dt = lastStepTime ? Math.min(100, now - lastStepTime) : 16;
    lastStepTime = now;
    let interacting = dragging;
    if (flight) {
      const t = clamp((now - flight.start) / flight.duration);
      const eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      longitude = normalize(flight.from + flight.delta * eased);
      interacting = true;
      if (t >= 1) { flight = null; hold(8000); }
    } else if (!dragging && velocity !== 0) {
      longitude = normalize(longitude + velocity * dt);
      velocity *= Math.pow(.92, dt / 16);
      interacting = true;
      if (Math.abs(velocity) < .0005) { velocity = 0; hold(5000); }
    } else if (autoRotating(now)) {
      longitude = normalize(longitude + dt * 360 / rotationPeriod);
    }
    if (interacting || now - lastFrameTime >= frameInterval) {
      drawGlobe(longitude);
      lastFrameTime = now;
    }
    if (moving(now)) frameId = requestAnimationFrame(paintFrame);
  }

  function syncPlayback() {
    if (ready && inView && !document.hidden && moving(performance.now())) {
      if (!frameId) {
        lastStepTime = 0;
        frameId = requestAnimationFrame(paintFrame);
      }
    } else if (frameId && !dragging && !flight && velocity === 0) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }

  function pickAt(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * W;
    const y = (event.clientY - rect.top) / rect.height * H;
    let best = null, bestDistance = 18;
    for (const marker of visibleMarkers) {
      const distance = Math.hypot(marker.x - x, marker.y - y);
      if (distance < bestDistance) { best = marker; bestDistance = distance; }
    }
    if (best) select(best.id, true);
  }

  canvas.addEventListener('pointerdown', event => {
    if (!ready || event.button > 0) return;
    dragging = true;
    dragDistance = 0;
    dragStartX = lastMoveX = event.clientX;
    dragStartLongitude = longitude;
    lastMoveTime = performance.now();
    velocity = 0;
    flight = null;
    canvas.classList.add('is-dragging');
    try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* Pointer capture is optional. */ }
    syncPlayback();
  });

  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    const degreesPerPixel = W / canvas.getBoundingClientRect().width / R / radians;
    const now = performance.now();
    dragDistance = Math.max(dragDistance, Math.abs(event.clientX - dragStartX));
    longitude = normalize(dragStartLongitude - (event.clientX - dragStartX) * degreesPerPixel);
    if (now > lastMoveTime) velocity = -(event.clientX - lastMoveX) * degreesPerPixel / (now - lastMoveTime);
    lastMoveX = event.clientX;
    lastMoveTime = now;
    if (dragDistance > 4) dismissHint();
  });

  function endDrag(event, cancelled) {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('is-dragging');
    if (cancelled || motion.matches || performance.now() - lastMoveTime > 90) velocity = 0;
    velocity = clamp(velocity, -.6, .6);
    if (!cancelled && dragDistance < 5) {
      velocity = 0;
      pickAt(event);
    }
    hold(5000);
    syncPlayback();
  }
  canvas.addEventListener('pointerup', event => endDrag(event, false));
  canvas.addEventListener('pointercancel', event => endDrag(event, true));

  canvas.addEventListener('keydown', event => {
    const step = { ArrowLeft: 20, ArrowRight: -20 }[event.key];
    if (step === undefined || !ready) return;
    event.preventDefault();
    dismissHint();
    flyTo(longitude + step);
  });

  if (card) card.querySelector('.city-card-close')?.addEventListener('click', closeCard);

  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncPlayback();
  });
  observer.observe(canvas);
  document.addEventListener('visibilitychange', syncPlayback);

  function updatePauseButton() {
    if (!pauseButton) return;
    pauseButton.disabled = motion.matches;
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.textContent = paused ? 'Resume globe' : 'Pause globe';
    pauseButton.setAttribute('aria-label', motion.matches ? 'Globe rotation off for reduced motion' : pauseButton.textContent);
  }

  if (pauseButton) pauseButton.addEventListener('click', () => {
    paused = !paused;
    updatePauseButton();
    syncPlayback();
  });

  motion.addEventListener('change', () => {
    velocity = 0;
    flight = null;
    updatePauseButton();
    if (ready) drawGlobe(longitude);
    syncPlayback();
  });
  updatePauseButton();

  Promise.all([
    fetch('assets/land.geojson').then(response => {
      if (!response.ok) throw new Error('Peterson globe geography could not be loaded.');
      return response.json();
    }),
    document.fonts.load('5.8px "IBM Plex Sans"')
  ]).then(([geo]) => {
    buildLandMask(geo);
    prepareTexture();
    ready = true;
    updateTimes();
    updateStory();
    canvas.closest('.globe-wrap').dataset.ready = 'true';
    const poster = document.querySelector('#globePoster');
    if (poster) poster.hidden = true;
    setInterval(updateTimes, 30000);
    syncPlayback();
  }).catch(error => {
    canvas.setAttribute('aria-label', 'Globe unavailable. Peterson member cities: Montréal, London and Shanghai.');
    labels.dataset.error = 'Globe unavailable';
    throw error;
  });
})();
