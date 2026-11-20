/* Approved Bright Ivory globe: fixed screen-upright digits, real geographic projection.
   City markers and routes use the brass accent (#C8A15A) reserved for live elements.
   Routes are symbolic community connections, not personal relationship records. */
(() => {
  'use strict';
  const canvas = document.querySelector('#globe');
  const ctx = canvas.getContext('2d');
  const labels = document.querySelector('#cityLabels');
  const journey = document.querySelector('#journey');
  const stage = document.querySelector('.hero-stage');
  const pauseButton = document.querySelector('#pauseMotion');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const W = 720, H = 390, CX = 360, CY = 190, R = 187.5, SCALE = 2;
  const radians = Math.PI / 180;
  const rotationPeriod = 50000;
  const frameInterval = 1000 / 30;
  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const cities = [
    { name: 'Montréal', lat: 45.5019, lon: -73.5674, labelOffset: [-80, -24] },
    { name: 'London', lat: 51.5074, lon: -0.1278, labelOffset: [8, 6] },
    { name: 'Shanghai', lat: 31.2304, lon: 121.4737, labelOffset: [8, -22] }
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
  let progress = 0, lastChapter = -1, ready = false;
  let paused = false, inView = true, frameId = 0, storyFrame = 0;
  let lastFrameTime = 0, resumedAt = 0;
  let resumedLongitude = origin.lon, paintedLongitude = origin.lon;
  let visibleCities = [], landPixels, oceanAtlas, landAtlas, textureContext;
  const samples = [];
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Globe showing Peterson member cities in Montréal, London and Shanghai.');

  const labelElements = cities.map(city => {
    const span = document.createElement('span');
    span.className = 'city-label';
    span.dataset.city = city.name;
    span.textContent = city.name;
    span.hidden = true;
    span.style.position = 'absolute';
    span.style.whiteSpace = 'nowrap';
    span.style.pointerEvents = 'none';
    labels.appendChild(span);
    return span;
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

  function longitudeAt(now) {
    if (motion.matches) return origin.lon;
    if (paused) return resumedLongitude;
    return origin.lon + ((resumedLongitude - origin.lon + (now - resumedAt) * 360 / rotationPeriod) % 360);
  }

  function view(longitude) {
    return { lon: longitude * radians, lat: origin.lat * radians };
  }

  function makeSurface() {
    const surface = document.createElement('canvas');
    surface.width = canvas.width;
    surface.height = canvas.height;
    return surface;
  }

  // The digit pattern never moves on screen. Cache both shades of each glyph
  // and switch only cells where the rotating coastline has crossed the grid.
  function prepareTexture() {
    oceanAtlas = makeSurface();
    landAtlas = makeSurface();
    const ocean = oceanAtlas.getContext('2d');
    const land = landAtlas.getContext('2d');
    for (const layer of [ocean, land]) {
      layer.scale(SCALE, SCALE);
      layer.fillStyle = '#101D35';
      layer.fillRect(0, 0, W, H);
      layer.font = '5.8px "IBM Plex Sans", sans-serif';
      layer.textAlign = 'center';
      layer.textBaseline = 'middle';
    }

    const tilt = origin.lat * radians;
    let col = 0;
    for (let sx = CX - R; sx <= CX + R; sx += 4.7, col++) {
      let row = 0;
      for (let sy = CY - R; sy <= CY + R; sy += 6.1, row++) {
        const x = (sx - CX) / R, y = (CY - sy) / R;
        const radiusSq = x * x + y * y;
        if (radiusSq >= .995) continue;
        const z = Math.sqrt(1 - radiusSq);
        const lat = Math.asin(clamp(y * Math.cos(tilt) + z * Math.sin(tilt), -1, 1)) / radians;
        const lonOffset = Math.atan2(x, z * Math.cos(tilt) - y * Math.sin(tilt)) / radians;
        const edge = .35 + .65 * Math.pow(z, .3);
        const fade = .85 + .15 * clamp((x + 1) / 1.3);
        const texture = .97 + .03 * Math.sin(row * 2.7 + col * .8);
        const opacity = edge * fade * texture;
        const digit = (row * 31 + col * 17) % 7 < 3 ? '1' : '0';
        ocean.fillStyle = `rgba(248,247,239,${(.075 * opacity).toFixed(3)})`;
        land.fillStyle = `rgba(248,247,239,${(.985 * opacity).toFixed(3)})`;
        ocean.fillText(digit, sx, sy);
        land.fillText(digit, sx, sy);
        const left = Math.round((sx - 2.35) * SCALE);
        const top = Math.round((sy - 3.05) * SCALE);
        samples.push({
          left, top,
          width: Math.round((sx + 2.35) * SCALE) - left,
          height: Math.round((sy + 3.05) * SCALE) - top,
          column: (lonOffset + 180) / 360 * landW,
          row: clamp(Math.floor((90 - lat) / 180 * landH), 0, landH - 1) * landW,
          isLand: false
        });
      }
    }
    textureContext = makeSurface().getContext('2d');
    textureContext.drawImage(oceanAtlas, 0, 0);
  }

  function drawTexture(longitude) {
    const offset = longitude / 360 * landW;
    for (const sample of samples) {
      // Wrap horizontally in the power-of-two world mask.
      const column = Math.floor(sample.column + offset) & (landW - 1);
      const isLand = landPixels[(sample.row + column) * 4 + 3] > 70;
      if (isLand === sample.isLand) continue;
      const { left, top, width, height } = sample;
      textureContext.drawImage(isLand ? landAtlas : oceanAtlas,
        left, top, width, height, left, top, width, height);
      sample.isLand = isLand;
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

  function vector(city) {
    const a = city.lat * radians, o = city.lon * radians;
    return [Math.cos(a) * Math.cos(o), Math.sin(a), Math.cos(a) * Math.sin(o)];
  }

  function drawArc(a, b, camera) {
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
    ctx.strokeStyle = 'rgba(200,161,90,.82)';
    ctx.lineWidth = .75;
    ctx.stroke();
  }

  function drawGlobe(longitude) {
    if (!textureContext) return;
    paintedLongitude = longitude;
    const camera = view(longitude);
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    drawTexture(longitude);
    routes.forEach(([a, b]) => drawArc(cities[a], cities[b], camera));
    visibleCities = [];
    cities.forEach((city, index) => {
      const p = project(city.lon, city.lat, camera);
      const label = labelElements[index];
      const visible = p.z > .025;
      label.hidden = !visible;
      label.style.display = visible ? '' : 'none';
      if (!visible) return;
      visibleCities.push(city.name);
      ctx.beginPath(); ctx.arc(p.x, p.y, 5.2, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(200,161,90,.16)'; ctx.fill();
      ctx.strokeStyle = 'rgba(200,161,90,.92)'; ctx.lineWidth = .75; ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.1, 0, 2 * Math.PI);
      ctx.fillStyle = '#C8A15A'; ctx.fill();
      label.style.left = `${(p.x + city.labelOffset[0]) / W * 100}%`;
      label.style.top = `${(p.y + city.labelOffset[1]) / H * 100}%`;
      label.style.opacity = String(clamp(p.z / .15));
    });
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
      if (id === 'storyTitle') node.innerHTML = value; else node.textContent = value;
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

  function canAnimate() {
    return ready && inView && !document.hidden && !motion.matches && !paused;
  }

  function paintFrame(now) {
    frameId = 0;
    if (!canAnimate()) return;
    const elapsed = now - lastFrameTime;
    if (elapsed >= frameInterval) {
      drawGlobe(longitudeAt(now));
      lastFrameTime = now - elapsed % frameInterval;
    }
    frameId = requestAnimationFrame(paintFrame);
  }

  function syncPlayback() {
    if (canAnimate()) {
      if (!frameId) frameId = requestAnimationFrame(paintFrame);
    } else {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }

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
    resumedLongitude = paintedLongitude;
    resumedAt = performance.now();
    paused = !paused;
    updatePauseButton();
    syncPlayback();
  });

  motion.addEventListener('change', () => {
    resumedLongitude = origin.lon;
    resumedAt = performance.now();
    drawGlobe(origin.lon);
    updatePauseButton();
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
    drawGlobe(origin.lon);
    updateStory();
    canvas.closest('.globe-wrap').dataset.ready = 'true';
    const poster = document.querySelector('#globePoster');
    if (poster) poster.hidden = true;
    ready = true;
    resumedAt = performance.now();
    lastFrameTime = resumedAt;
    syncPlayback();
  }).catch(error => {
    canvas.setAttribute('aria-label', 'Globe unavailable. Peterson member cities: Montréal, London and Shanghai.');
    labels.dataset.error = 'Globe unavailable';
    throw error;
  });
})();
