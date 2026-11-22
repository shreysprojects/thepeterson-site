/* Peterson globe: the world written in binary on a real orthographic projection.
   Drag it, or use the arrow keys, to spin it. Choose a city to fly there and see its local time,
   daylight and distance. The night side is dimmer, from the sun's real position. The "You" marker
   is placed from the visitor's device time zone; nothing is looked up or sent anywhere.
   Land digits spell "what comes next " in ASCII along each parallel. Land outlines come from
   Natural Earth (via world-atlas), packed below as run lengths of a 720 x 360 mask.

   Performance: the ocean, glow and rim are drawn once per size; digits are pre-rendered sprites;
   drawing stops whenever the globe is off-screen or the tab is hidden. */
(() => {
  'use strict';
  const canvas = document.querySelector('#globe');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pauseButton = document.querySelector('#pauseMotion');
  const tabs = [...document.querySelectorAll('.place-tabs [role="tab"]')];
  const byId = id => document.getElementById(id);
  const card = { panel: byId('placeCard'), name: byId('placeName'), line: byId('placeLine'), note: byId('placeNote') };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const DEG = Math.PI / 180;
  const FRAME = 1000 / 60;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const normalize = lon => ((lon % 360) + 540) % 360 - 180;

  /* Land mask, 0.5 degree cells */
  const MW = 720, MH = 360;
  const land = new Uint8Array(MW * MH);
  (() => {
    let position = 0, filled = 0;
    for (const run of '7dx.5.1j.6.2.u.gs.15.w.1d.gb.1f.b.6.5.6.3.17.gc.1f.7.28.8.c.fg.5.3.1c.6.2u.60.2.9c.a.2.16.5.2u.3g.3.1.4.2b.b.97.i.2.5.2.q.5.2s.1z.i.14.4.2d.g.94.1e.b.2n.1n.6.2.8.1.e.3p.e.8l.4.j.g.1.k.h.2o.1n.k.42.d.3.4.81.4.a.9.4.4.5.c.2.n.9.2v.1p.j.49.3.4.9.7x.4.f.6.3.6.6.7.3.n.5.30.1s.d.4.5.49.a.7w.6.s.4.c.k.c.2x.1v.8.6.7.bz.8.1k.h.k.2u.1t.7.4p.7.7e.a.e.2.n.c.3.n.e.2s.21.3.2q.6.1s.c.2.7.70.7.6.6.5.5.b.9.8.7.8.1.8.4.l.2r.4i.e.1o.v.77.c.3.7.7.a.9.8.9.7.16.29.4c.d.1h.19.1a.f.5g.n.a.6.3.5.3.p.17.25.49.a.1i.1e.1b.g.3.7.5d.7.r.5.3.p.18.24.47.9.1h.1e.1h.4.f.5.4r.e.3d.23.45.7.1j.1c.6z.h.v.2.3.1.4.9.8.2.7.1.3.4.18.20.45.7.1b.1t.3.4.d.1.y.4.55.k.e.6.6.8.3.9.5.5.3.h.15.1v.48.7.1b.25.8.b.n.7.53.d.1.7.1.5.2.3.2.5.6.b.2.6.6.8.1.a.1.2.1.3.18.1t.46.7.q.7.4.2.a.2p.m.6.53.c.2.k.1.6.6.b.2.3.8.j.2.8.15.1q.2.1.46.6.q.9.3.2.4.6.1.2o.l.k.4p.b.2.t.9.8.2.4.7.w.11.1u.44.8.p.9.3.3.1.2y.7.1.d.m.1n.4.16.4.1r.4.8.q.b.1.4.8.5.11.x.1.3.1q.u.2.1u.3.1b.8.5.g.2.9.1.5.2.2z.5.12.2r.f.1w.u.d.9.6.13.u.1n.1.5.2k.d.1a.7.k.b.3.4r.12.1.12.u.11.3.n.s.a.9.8.14.q.1q.2i.j.21.c.2.4s.22.19.h.c.1.2.3.4.8.w.4.5.1.8.d.a.5.l.q.6.1.1j.2d.o.1.3.1j.4.9.c.1.4t.k.e.13.1f.4.z.4.t.5.8.1.9.a.7.1.1.9.j.q.3.3.1h.1k.s.2.u.6.1j.3.e.1.1u.3i.4.j.r.2u.3.6.x.7.1.3.6.8.c.e.y.1d.2g.14.x.1.e.a.6.8.4.58.2.o.o.2v.c.7.d.4.4.c.5.8.h.c.t.1a.2k.1a.a.3.c.5.2.9.1.f.3.9.2.62.o.2s.7.2.4.b.8.5.1.f.3.a.9.4.4.g.n.15.2o.1f.7.5.5.1c.4.63.o.4k.9.3.6.h.k.15.2n.1i.6.3.5.1d.4.65.1.5.j.4g.i.n.h.13.2n.14.2.d.7.3.2.1e.3.6f.a.5.3.48.o.c.3.8.i.10.o.3.a.5.1j.15.8.4.4.3.2.1j.2.60.2.g.5.4j.p.c.5.5.k.u.s.6.1.c.1i.k.5.k.b.7s.7.7.b.4g.2.3.d.l.6.2.m.p.z.h.1f.k.8.j.a.81.6.c.4e.2.8.8.q.r.n.y.j.1e.l.6.l.4.4.2.7r.d.2.n.43.3.a.7.3.5.i.q.n.11.d.1f.m.5.p.2.7v.k.1.k.3x.7.7.1.5.g.f.q.m.13.8.1h.m.4.8p.m.3.a.1.1.41.a.1.q.f.q.k.2r.m.5.8r.w.42.h.3.m.8.2.2.t.g.2q.n.6.8t.u.42.h.2.6.1.3.a.8.5.x.f.2o.o.7.7w.2.p.z.41.r.1.3.c.19.e.2n.p.8.7v.2.l.13.40.w.e.18.d.2n.p.8.7i.6.5.3.j.17.10.1.2y.x.g.1a.7.2o.q.7.7h.8.1.4.i.17.3.1.p.1.8.5.2u.y.g.9.1.12.5.2o.r.7.7.6.71.d.d.3.3.19.1.7.j.2.5.g.2m.y.g.8.3.3v.q.k.70.d.5.1.2.1u.h.4.1.n.2i.x.h.7.5.3u.9.1.f.b.6r.1.7.4.7.b.7.1x.2.2.d.u.2j.t.l.3.7.3t.7.4.c.d.6l.z.7.27.7.y.2g.u.v.36.4.j.4.7.b.e.6i.z.7.28.5.3.3.11.2b.v.u.34.5.1.1.s.a.f.6g.x.d.25.4.4.4.12.2b.1.2.s.u.33.8.n.2.3.9.a.3.2.6f.y.d.23.4.6.1.16.2h.o.u.33.8.k.5.3.9.9.6j.z.e.21.5.1f.2i.l.v.34.6.l.6.3.7.a.6h.10.f.1y.6.1i.2k.h.z.31.7.k.4.2.7.d.6g.11.d.1y.3.1o.2q.9.11.31.7.j.4.2.3.h.6e.13.d.1v.3.1t.2o.6.18.2q.6.1.8.j.3.e.3.2.6h.13.d.3r.2o.6.19.2o.6.5.6.i.5.2.3.4.6r.4.2.v.a.3p.3.3.2n.7.1a.2l.7.6.6.f.1.1.7c.4.1.q.9.3p.2.5.2n.6.1a.2l.7.2.b.9.7o.q.8.3r.2.5.2n.6.1a.2k.7.3.c.6.7q.p.5.3v.1.7.2l.5.1b.2j.6.5.c.5.7r.q.4.43.2n.3.19.2l.3.7.d.5.7m.1.4.q.3.44.3w.2.3.2v.b.3.7o.2.3.q.2.46.3t.3.3.2u.b.2.7q.3.3.4w.3t.4.3.2u.4.9.7r.3.4.4y.3c.6.3.9.5.33.7t.3.5.4y.39.5.1.3.3.7.a.2v.7x.3.5.50.4.2.30.2.6.b.b.2q.82.3.2.55.2.2.2y.1.8.c.c.2p.81.4.2.55.3.1.2x.1.9.b.e.2p.7z.5.2.56.2z.1.a.j.1.2.3.2s.7v.6.3.55.3d.5.1.d.2.2u.26.2.p.5.4r.7.3.55.3f.2.3.39.1s.3.6.6.m.8.4r.7.1.1.1.55.3k.39.1r.7.3.5.m.9.4p.5h.3i.3b.s.2.x.5.8.1.l.8.4r.9.2.57.36.3.5.3f.s.5.s.9.3.4.k.8.4r.a.3.56.33.5.4.3h.k.1.7.6.r.j.h.7.4r.b.5.2.1.50.31.8.2.36.1.b.j.5.7.4.q.m.g.7.4p.c.8.50.30.3f.q.2.4.7.7.5.n.o.f.8.4m.b.b.50.30.3f.o.c.1.2.7.7.l.q.e.8.4f.3.1.d.8.53.30.3f.o.b.2.3.8.7.j.r.e.8.4c.j.3.2.2.54.31.3e.o.b.2.5.8.7.h.9.7.b.f.7.1.2.48.k.3.58.2x.3i.m.e.1.6.9.5.j.1.1.3.c.7.g.a.47.m.2.58.2w.3j.k.e.3.9.8.3.9.4.3.3.15.7.3s.1.g.l.3.58.2t.3m.j.g.3.a.4.1.2.2.9.4.1.1.1a.5.3s.3.e.m.4.58.2s.3m.i.h.3.b.3.6.6.7.1a.7.3p.4.4.2.6.p.4.58.2r.3m.j.h.2.d.2.7.5.7.1a.7.3o.5.2.5.5.p.4.59.2p.3n.j.w.1.8.6.6.19.a.3k.e.7.m.4.5b.2o.3n.i.w.2.9.6.5.19.9.3l.d.8.m.3.5d.2k.3r.h.q.6.c.5.5.19.a.3m.3.2.7.1.1.6.j.5.5d.2l.3q.f.l.2.6.4.d.3.8.1b.7.3t.8.6.h.6.5e.2k.3v.9.9.h.7.2.c.3.9.58.a.6.d.a.5e.2k.3w.2.b.k.11.2.4.4.4.4q.b.6.d.9.5g.2k.3v.2.8.o.1e.4o.d.6.a.1.1.b.5g.2i.3v.8.1.q.p.1.1.3.d.3.4.4n.e.6.6.g.5i.2g.3w.z.17.2.5.4o.d.3.8.e.5n.2c.3x.z.1e.4q.l.4.1.2.1.4.5t.28.3y.11.1d.4q.k.2.2.8.5w.25.3x.14.1b.4s.h.5.1.2.63.22.3x.1b.e.4.o.4s.h.5.1.1.64.21.3y.1e.9.8.l.4u.i.3.66.20.3z.1e.9.b.i.4v.g.3.68.3.3.1s.3z.1i.6.g.3.5.4.4w.h.1.69.4.3.1r.3z.1l.2.5o.6t.3.3.1b.3.1.2.a.40.7a.6u.3.3.1a.8.1.3.5.3y.38.5.3z.6u.3.2.z.8.3.d.4.3x.39.5.3z.6v.2.3.x.p.5.3v.3b.5.3y.6v.3.3.u.r.5.3u.3c.5.3x.6v.5.3.s.s.5.3r.2m.3.r.5.3v.6x.5.3.q.u.5.3p.2m.4.s.6.3s.6z.5.3.p.u.5.2.4.3i.2o.4.s.7.4.3.3j.71.3.4.o.v.4.5.1.3h.2p.5.s.b.1.1.3i.74.2.3.p.v.3.3m.2r.4.r.1.2.8.2.2.3g.75.2.4.n.x.2.3m.2r.5.t.7.3.7.a.3.2y.4.1.70.3.5.l.12.2.3h.2s.4.t.6.4.l.2w.4.2.71.3.5.k.13.1.3g.2u.4.s.5.6.l.2u.4.3.72.3.5.j.13.1.3f.2v.6.14.i.2s.5.3.75.1.6.i.4i.2w.6.15.j.2o.7.3.7d.h.r.9.3i.2x.6.15.k.2l.9.2.7e.f.r.2.3.8.3f.2y.5.16.j.16.2.18.7u.g.p.1.8.7.3c.30.4.15.k.12.7.15.7w.g.g.5.h.5.3a.30.4.14.m.y.a.v.4.3.7z.h.d.7.h.7.38.30.5.13.n.1.3.t.b.t.5.2.80.i.c.7.j.6.38.2z.6.10.u.r.c.s.7.1.57.2.2r.i.c.6.t.6.2z.2z.7.z.u.p.f.q.6.4.56.2.2s.i.a.7.t.7.2y.30.7.y.u.o.h.p.5.4.83.i.6.9.u.8.2w.30.7.w.w.n.j.o.5.4.84.i.1.c.k.3.4.8.6.3.2s.31.6.u.x.m.k.p.5.1.m.3.7k.s.k.2.b.1.31.32.7.r.z.l.m.o.s.4.7l.q.3z.33.7.q.z.j.o.p.r.4.7n.o.3z.33.7.m.14.i.o.q.q.4.7q.k.40.33.7.k.16.g.p.5.2.l.o.5.7t.2.4.k.3q.35.6.k.16.e.s.2.4.m.n.3.83.j.3p.37.4.i.19.c.z.n.m.3.84.j.3n.39.4.d.1e.b.10.m.m.3.85.i.3o.39.3.c.1f.b.10.m.n.5.85.e.3p.3a.2.9.1i.c.z.n.m.7.86.b.3p.3b.1.5.1m.c.10.4.1.h.m.2.3.2.89.8.3p.3g.1o.b.10.3.2.h.m.2.4.1.8a.7.n.2.31.3c.1r.a.11.3.4.f.u.2.88.6.m.3.1.2.2z.3a.f.1.1d.9.11.3.6.d.p.1.5.1.89.5.j.4.3.4.2y.3a.9.6.1d.9.11.3.6.c.q.2.2.3.89.5.g.f.a.1.2.1.2k.3a.3.b.1e.8.11.2.8.9.m.1.5.4.1.1.8a.6.f.k.2.4.1.2.2l.3n.1e.7.12.2.a.5.n.2.6.3.8d.1.1.4.e.7.2.k.2m.3m.1f.5.13.1.c.3.o.1.7.2.8h.3.5.4.3.v.2n.3k.1g.5.2.2.y.4.a.2.o.1.8.2.4.1.8d.8.1.11.2m.3k.1g.4.2.3.y.4.a.1.o.1.d.4.8c.7.3.12.2l.3j.1h.2.3.4.x.5.18.8.8h.2.3.14.2j.3i.1n.4.z.3.17.9.8h.1.5.13.2k.3h.1o.4.z.3.16.1.3.5.8o.13.2l.3e.1p.4.z.4.u.2.d.3.1.1.8o.14.2l.3d.1p.3.11.5.r.3.d.3.8q.1c.2e.m.8.2h.2u.6.p.6.c.2.8q.1e.2e.i.b.2f.2m.4.6.5.o.8.93.1f.2e.5.8.1.f.2e.2m.5.5.6.m.8.94.1g.37.1.4.27.2o.5.4.6.l.8.95.1h.3c.25.2q.5.4.5.k.9.95.1h.3d.23.2s.5.3.5.j.9.95.1i.3d.22.2u.5.3.4.g.d.93.1k.3c.21.2w.6.2.4.e.e.92.1m.3b.1z.2z.7.1.3.b.h.j.1.8i.1m.3b.1y.31.7.2.1.a.j.5.1.6.1.5.2.8f.1o.3b.1x.32.8.c.i.4.a.5.2.8f.1n.3b.1w.34.a.a.h.4.2.5.2.7.2.8e.1s.37.1w.35.9.a.h.4.1.f.1.8f.1s.1.2.34.1v.37.7.b.h.4.2.4.1.a.1.6.5.82.1z.31.1u.39.8.a.f.4.7.g.7.82.21.2z.1t.3a.8.b.d.5.6.j.6.6.3.7s.21.30.1r.3c.8.a.d.5.6.k.5.4.7.7s.25.2v.1p.3e.9.8.d.5.6.k.5.3.b.j.1.74.2b.2q.1o.3f.9.c.9.5.3.1.3.7.2.2.5.4.l.h.2.71.2d.2q.1n.3g.8.h.3.7.2.1.3.8.1.c.1.1.l.f.2.6z.2g.2p.1m.3h.7.r.2.2.3.n.m.c.3.6z.2h.2p.1k.3j.6.r.2.2.1.1.1.q.k.b.2.71.2j.2n.1i.3m.4.r.2.4.1.t.h.a.3.71.2k.2m.1i.3n.3.1k.1.7.i.3.6.6.2.6v.2k.2n.1h.3p.5.1g.2.7.i.3.3.9.2.6v.2j.2n.1i.3o.8.2.4.1g.h.h.1.1.1.6u.2j.2n.1h.3q.d.1f.h.7f.2i.2n.1h.3s.2.1.b.1b.k.l.2.6q.2h.2o.1h.3y.a.4.2.4.1.3.1.u.2.1.8.5.5.l.2.6q.2g.2o.1h.45.1.5.4.2.5.5.4.r.6.6.4.o.1.6p.2f.2o.1h.4p.3.x.2.8.4.o.1.6o.2e.2p.1i.4e.3.6.3.19.5.j.2.6r.2c.2r.1i.4f.1.6.1.1c.5.m.1.6o.2b.2s.1i.6q.1.6p.29.2t.1i.53.2.i.2.7r.28.2u.1i.54.3.g.2.7s.27.2u.1i.h.1.4j.c.9.3.7s.26.2u.1j.h.2.4h.d.9.4.7s.24.2u.1k.g.3.4g.d.a.4.7s.23.2v.1k.f.4.4f.d.b.4.7t.22.2u.1l.f.4.48.4.3.d.b.5.7s.22.2u.1m.d.6.45.7.2.c.c.8.7q.21.2u.1l.c.8.44.n.b.8.16.1.6l.1z.2t.1m.b.8.45.p.9.8.1x.5x.1t.4r.2.8.1.2y.16.r.8.8.17.1.6o.1v.2t.1j.1.4o.1.32.62.1u.2t.1h.c.b.41.z.3.a.7x.1t.2t.1g.d.b.41.1c.1r.2.65.1r.2v.1e.e.b.41.1c.1r.1.67.1q.2w.1b.g.b.40.1e.7y.1q.2w.1a.i.9.40.1h.7x.1p.2x.18.j.9.3z.1j.7w.1o.2y.18.i.a.3v.1p.u.2.6y.1n.30.17.i.9.3s.1t.v.2.6x.1n.30.17.h.a.3q.1w.v.2.6w.1m.32.17.f.b.3p.1x.w.3.6t.1m.34.16.f.a.3n.22.v.2.6t.1l.35.16.g.9.3o.22.7p.1h.39.16.g.9.3n.23.7p.1f.3b.16.g.8.3o.24.7o.1c.3e.16.g.8.3o.25.7n.1a.3g.14.j.7.3o.26.7m.19.3h.12.m.3.3s.26.7k.19.3j.10.4h.27.7k.19.3j.10.4h.27.7k.19.3j.10.4h.27.7k.19.3k.z.4i.26.7k.19.3k.y.4j.27.7i.1a.3l.x.4j.27.7i.19.3n.w.4k.26.7i.18.3o.u.4n.25.7i.17.3q.s.4o.25.7i.17.3q.s.4o.24.7j.16.3s.q.4p.24.7j.15.3u.o.4r.23.7j.14.3v.n.4s.r.5.17.7j.13.3w.m.4t.n.c.13.7k.12.3x.l.4u.j.i.10.7k.13.3x.j.4w.h.l.6.1.s.7k.12.3y.g.4y.i.m.4.1.s.7l.r.1.9.40.6.57.9.v.3.2.r.7l.t.2.5.44.1.5c.5.y.1.2.2.1.p.17.2.6c.u.av.q.18.3.69.w.av.o.1a.2.69.w.ax.m.1b.1.69.x.ax.k.1d.3.65.x.ay.k.1d.3.65.w.az.j.1e.5.1.2.60.v.b2.7.1.5.1i.8.60.s.b9.1.4.3.1j.8.60.n.d4.6.63.n.d4.6.62.o.d6.4.62.o.bi.1.1i.1.4.3.63.i.bo.7.1b.4.2.2.64.i.bo.7.1a.6.67.l.bm.6.19.6.67.2.1.i.bn.5.19.6.69.1.1.g.bq.3.19.6.6c.g.d0.8.6a.i.cy.7.6c.i.cy.8.6c.g.cz.8.6c.g.cz.9.6b.g.d0.7.6d.h.jl.h.jh.k.jg.j.jh.h.7k.1.by.g.7k.4.bw.g.7l.2.bx.e.jm.d.jo.c.i.1.1.2.j2.d.f.6.j2.d.f.1.j9.b.jo.7.1.5.jp.c.jp.d.jp.d.jr.6.1.2.8wf.1.jw.4.js.6.jq.3.jv.4.jv.5.96.3.1q.2.8s.7.6d.a.2h.7.d.7.12.4.8q.6.6d.f.1n.2.o.b.7.g.9.u.b.2.89.6.6b.l.1b.q.2.2r.85.4.67.u.5.7.s.3n.84.4.63.1e.l.3u.7z.8.5f.3.d.1k.i.44.3.3.7e.4.2.b.5c.9.5.1o.g.4d.7b.5.2.c.57.25.a.4q.75.6.1.c.3v.6.5.5.1.d.d.27.b.4v.72.7.1.d.3o.3l.8.58.6m.b.2.c.2v.2.3.4.5.5.3.3s.6.5g.4w.3.1f.d.3.b.2s.4f.7.5j.4u.b.17.4.1.7.3.d.2q.a6.4r.8.k.2.15.e.2n.a8.3i.1.19.b.9.4.3.9.a.2.f.n.2i.ab.3j.3.5.7.a.1.l.1h.4.r.2i.aa.40.c.n.28.2k.a5.32.1l.i.22.2m.a5.2p.2.4.4c.2l.a6.2p.4g.2k.a9.2s.48.2h.ai.2p.42.2k.ap.24.b.5.47.2h.at.24.4o.2a.az.1t.2.8.4i.3.1.1g.a.h.b8.1o.7.8.4c.1k.d.f.ba.1p.6.d.47.1i.e.f.az.2t.3z.v.2.h.g.s.al.2x.40.h.5.4.4.b.j.v.ak.2v.4a.a.b.c.d.t.aq.2h.4v.1o.b3.2f.55.p.a.5.bd.2i.56.d.c2.2f.59.4.cd.29.hx.23.hy.m.3.3.3.3.b.z.hz.3.6.6.p.7.16.iy.a.6.h.5i2'.split('.')) {
      const length = parseInt(run, 36);
      if (filled) land.fill(1, position, position + length);
      position += length;
      filled ^= 1;
    }
  })();
  const phraseBits = Array.from('what comes next ').flatMap(ch => ch.charCodeAt(0).toString(2).padStart(8, '0').split('').map(Number));

  /* Geography and time */
  const vec = (lat, lon) => {
    const a = lat * DEG, b = lon * DEG, c = Math.cos(a);
    return [c * Math.cos(b), c * Math.sin(b), Math.sin(a)];
  };
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  function sunVector() {
    const now = new Date();
    const dayOfYear = (now - Date.UTC(now.getUTCFullYear(), 0, 0)) / 864e5;
    const declination = -23.44 * Math.cos(2 * Math.PI / 365 * (dayOfYear + 10));
    const hours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    return vec(declination, -15 * (hours - 12));
  }
  function distanceKm(a, b) {
    const dLat = (b.lat - a.lat) * DEG, dLon = (b.lon - a.lon) * DEG;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  const formatKm = km => `${Math.round(km).toLocaleString('en-GB')} km`;
  function format(timeZone, options) {
    try {
      return new Intl.DateTimeFormat('en-GB', { ...options, ...(timeZone ? { timeZone } : {}) }).format(new Date());
    } catch (error) {
      return '';
    }
  }
  const clock = timeZone => format(timeZone, { hour: '2-digit', minute: '2-digit', hour12: false });
  const weekday = timeZone => format(timeZone, { weekday: 'long' });

  // `flip` puts a label on the other side of its point, so close neighbours never overlap.
  const cities = [
    { id: 'montreal', name: 'Montréal', lat: 45.5019, lon: -73.5674, tz: 'America/Toronto' },
    { id: 'newyork', name: 'New York', lat: 40.7128, lon: -74.006, tz: 'America/New_York', flip: true },
    { id: 'london', name: 'London', lat: 51.5072, lon: -0.1276, tz: 'Europe/London' },
    { id: 'shanghai', name: 'Shanghai', lat: 31.2304, lon: 121.4737, tz: 'Asia/Shanghai' },
    { id: 'hongkong', name: 'Hong Kong', lat: 22.3193, lon: 114.1694, tz: 'Asia/Hong_Kong', flip: true },
    { id: 'singapore', name: 'Singapore', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' }
  ];
  // Reference coordinates for common device time zones, used only to place the "You" marker.
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
    if (zone) return { id: 'you', name: 'You', lat: zone[0], lon: zone[1], place: zone[2], exact: true };
    const offset = -new Date().getTimezoneOffset() / 60;
    return { id: 'you', name: 'You', lat: 30, lon: clamp(offset * 15, -179, 179), place: `UTC${offset >= 0 ? '+' : ''}${offset}`, exact: false };
  })();
  const nearest = cities.map(city => ({ city, km: distanceKm(visitor, city) })).sort((a, b) => a.km - b.km)[0];
  const visitorIsHome = nearest.km < 80;
  const places = [...cities, visitor];
  const placeById = id => places.find(place => place.id === id);

  /* Colours come from the site's own tokens. */
  const palette = (() => {
    const css = getComputedStyle(document.documentElement);
    const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    return { ivory: read('--globe', '#f8f7ef'), muted: read('--muted', '#a8b7ca'), navy: read('--navy', '#101d35') };
  })();
  function rgba(hex, alpha) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }
  function arcPoints(a, b) {
    const A = vec(a.lat, a.lon), B = vec(b.lat, b.lon);
    const omega = Math.acos(clamp(dot(A, B), -1, 1)), sine = Math.sin(omega) || 1, lift = .03 + .08 * omega / Math.PI;
    const points = [];
    for (let k = 0; k <= 72; k++) {
      const t = k / 72, s1 = Math.sin((1 - t) * omega) / sine, s2 = Math.sin(t * omega) / sine, h = 1 + lift * Math.sin(Math.PI * t);
      points.push([(A[0] * s1 + B[0] * s2) * h, (A[1] * s1 + B[1] * s2) * h, (A[2] * s1 + B[2] * s2) * h]);
    }
    return points;
  }
  const routes = [['montreal', 'london'], ['newyork', 'london'], ['london', 'shanghai'], ['shanghai', 'hongkong'], ['hongkong', 'singapore']]
    .map(([a, b]) => arcPoints(placeById(a), placeById(b)));
  const visitorRoute = visitorIsHome ? null : arcPoints(visitor, nearest.city);

  let size = 0, radius = 0, dpr = 1, cellSize = 8, spriteSize = 12;
  let cells = null, oceanLayer = null, sprites = null;
  let lon0 = -34, lat0 = 26, vLon = 0, vLat = 0;
  const SPIN = 4.5; // degrees per second
  let dragging = false, moved = 0, lastX = 0, lastY = 0, flight = null, spin = SPIN;
  let paused = false, visible = true, selected = 'montreal', frame = 0, lastTime = 0;
  let sun = sunVector(), marks = [];

  function build() {
    const width = Math.round(canvas.getBoundingClientRect().width);
    if (!width) return false;
    size = width;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    radius = size / 2 - 28;
    cellSize = clamp(radius / 30, 6, 10);
    const steps = Math.floor(radius / cellSize), centre = size / 2;
    const x = [], y = [], u = [], v = [], z = [], limb = [];
    for (let j = -steps; j <= steps; j++) {
      const vv = -j * cellSize / radius;
      if (vv * vv >= 1) continue;
      for (let i = -steps; i <= steps; i++) {
        const uu = i * cellSize / radius, r2 = uu * uu + vv * vv;
        if (r2 >= 1) continue;
        const zz = Math.sqrt(1 - r2);
        x.push(centre + i * cellSize); y.push(centre + j * cellSize);
        u.push(uu); v.push(vv); z.push(zz); limb.push(.4 + .6 * zz);
      }
    }
    cells = {
      count: x.length, x: Float32Array.from(x), y: Float32Array.from(y),
      u: Float32Array.from(u), v: Float32Array.from(v), z: Float32Array.from(z), limb: Float32Array.from(limb)
    };

    // The ocean dots and soft glow never change, so draw them once per size. No outline:
    // the globe's edge is simply where the dots end.
    oceanLayer = document.createElement('canvas');
    oceanLayer.width = canvas.width;
    oceanLayer.height = canvas.height;
    const o = oceanLayer.getContext('2d');
    o.scale(dpr, dpr);
    const glow = o.createRadialGradient(centre - radius * .35, centre - radius * .4, radius * .1, centre, centre, radius * 1.05);
    glow.addColorStop(0, rgba(palette.ivory, .07));
    glow.addColorStop(1, rgba(palette.ivory, 0));
    o.fillStyle = glow;
    o.beginPath(); o.arc(centre, centre, radius, 0, Math.PI * 2); o.fill();
    o.fillStyle = palette.muted;
    for (let k = 0; k < cells.count; k++) {
      o.globalAlpha = cells.limb[k] * .13;
      o.fillRect(cells.x[k] - .6, cells.y[k] - .6, 1.2, 1.2);
    }
    o.globalAlpha = 1;

    // Pre-render each digit once in white: drawing sprites is far cheaper than text.
    spriteSize = Math.ceil(cellSize * 1.6);
    const font = `500 ${(cellSize * 1.1).toFixed(1)}px "IBM Plex Sans", Arial, sans-serif`;
    const sprite = (digit, color) => {
      const s = document.createElement('canvas');
      s.width = s.height = Math.ceil(spriteSize * dpr);
      const g = s.getContext('2d');
      g.scale(dpr, dpr);
      g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(digit, spriteSize / 2, spriteSize / 2);
      return s;
    };
    sprites = [sprite('0', '#ffffff'), sprite('1', '#ffffff')];
    return true;
  }

  function basis() {
    const a = lat0 * DEG, b = lon0 * DEG, sa = Math.sin(a), ca = Math.cos(a), sb = Math.sin(b), cb = Math.cos(b);
    return { f: [ca * cb, ca * sb, sa], e: [-sb, cb, 0], n: [-sa * cb, -sa * sb, ca] };
  }

  function draw(now) {
    if (!cells) return;
    const { f, e, n } = basis();
    const centre = size / 2;
    const [sx, sy, sz] = sun;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(oceanLayer, 0, 0, size, size);

    const half = spriteSize / 2;
    const { count, x, y, u, v, z, limb } = cells;
    for (let k = 0; k < count; k++) {
      const uu = u[k], vv = v[k], zz = z[k];
      const wx = uu * e[0] + vv * n[0] + zz * f[0];
      const wy = uu * e[1] + vv * n[1] + zz * f[1];
      const wz = uu * e[2] + vv * n[2] + zz * f[2];
      const lat = Math.asin(wz > 1 ? 1 : wz < -1 ? -1 : wz) / DEG;
      const lon = Math.atan2(wy, wx) / DEG;
      let column = Math.floor((lon + 180) / 360 * MW);
      if (column >= MW) column -= MW; else if (column < 0) column += MW;
      let row = Math.floor((90 - lat) / 180 * MH);
      if (row >= MH) row = MH - 1; else if (row < 0) row = 0;
      if (!land[row * MW + column]) continue;
      // Night is simply quieter: the same digits, dimmer.
      const lit = clamp((wx * sx + wy * sy + wz * sz + .08) / .16, 0, 1);
      const key = Math.floor((lat + 90) / 1.5) * 240 + Math.floor((lon + 180) / 1.5);
      ctx.globalAlpha = limb[k] * (.55 + .45 * lit);
      ctx.drawImage(sprites[phraseBits[key % phraseBits.length]], x[k] - half, y[k] - half, spriteSize, spriteSize);
    }
    ctx.globalAlpha = 1;

    const project = p => {
      const pu = dot(p, e), pv = dot(p, n);
      return [centre + pu * radius, centre - pv * radius, dot(p, f), pu * pu + pv * pv];
    };
    // How much of a point shows: all of it on the near side, fading out towards the horizon,
    // so a route never hooks round the edge of the globe.
    const shown = q => clamp((q[2] + .02) / .22, 0, 1);
    ctx.lineCap = 'round';

    // Routes: faint, fine and still.
    const route = (points, alpha) => {
      const projected = points.map(project);
      ctx.strokeStyle = palette.ivory;
      ctx.lineWidth = 1;
      for (let k = 1; k < projected.length; k++) {
        const visibility = Math.min(shown(projected[k - 1]), shown(projected[k]));
        if (visibility <= 0) continue;
        ctx.globalAlpha = alpha * visibility;
        ctx.beginPath();
        ctx.moveTo(projected[k - 1][0], projected[k - 1][1]);
        ctx.lineTo(projected[k][0], projected[k][1]);
        ctx.stroke();
      }
    };
    routes.forEach(points => route(points, .3));
    if (visitorRoute && selected === 'you') route(visitorRoute, .25);
    ctx.globalAlpha = 1;

    marks = [];
    ctx.font = '500 10.5px "IBM Plex Sans", Arial, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    // Labels sit on the map like printed type: small capitals with a navy halo, no boxes.
    const label = (text, px, py, alpha, flip = false) => {
      const caps = text.toUpperCase();
      const width = ctx.measureText(caps).width;
      const onRight = (px < centre + radius * .45) !== flip;
      const left = onRight ? px + 11 : px - 11 - width;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = palette.navy;
      ctx.lineWidth = 4;
      ctx.strokeText(caps, left, py);
      ctx.fillStyle = palette.ivory;
      ctx.fillText(caps, left, py);
    };
    // Cities: a small solid point. The chosen city gets a fine ring.
    cities.forEach(city => {
      const q = project(vec(city.lat, city.lon));
      if (q[2] <= .02) return;
      const alpha = clamp(q[2] * 4, 0, 1);
      const chosen = city.id === selected;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = palette.ivory;
      ctx.beginPath(); ctx.arc(q[0], q[1], chosen ? 3.4 : 2.8, 0, Math.PI * 2); ctx.fill();
      if (chosen) {
        ctx.globalAlpha = alpha * .7;
        ctx.strokeStyle = palette.ivory; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(q[0], q[1], 7.5, 0, Math.PI * 2); ctx.stroke();
      }
      label(city.name, q[0], q[1], alpha * (chosen ? 1 : .7), city.flip);
      marks.push({ id: city.id, x: q[0], y: q[1] });
    });
    // You: shown only when its tab is chosen, labelled on the far side from nearby cities.
    if (selected === 'you') {
      const q = project(vec(visitor.lat, visitor.lon));
      if (q[2] > .02) {
        const alpha = clamp(q[2] * 4, 0, 1);
        ctx.globalAlpha = alpha * .85;
        ctx.strokeStyle = palette.ivory; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, Math.PI * 2); ctx.stroke();
        label('You', q[0], q[1], alpha, !nearest.city.flip);
        marks.push({ id: 'you', x: q[0], y: q[1] });
      }
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.globalAlpha = 1;
  }

  /* Motion: the globe always turns. Holding it stops it; letting go hands it straight back to
     the spin, with any flick carrying on and easing into it. Only Pause and the visitor's
     reduced-motion setting keep it still. */
  function step(now) {
    frame = 0;
    const dt = lastTime ? Math.min(50, now - lastTime) : FRAME;
    lastTime = now;
    const scale = dt / FRAME;
    let moving = false;
    // Drop the spin at once while held or flying; build it back up over about a second.
    const free = !dragging && !flight && !paused && !motion.matches;
    spin = free ? Math.min(SPIN, spin + SPIN * dt / 1000) : 0;
    if (flight) {
      const t = clamp((now - flight.start) / flight.duration, 0, 1);
      const k = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      lon0 = flight.lon + flight.dLon * k;
      lat0 = flight.lat + flight.dLat * k;
      moving = true;
      if (t >= 1) flight = null;
    } else if (!dragging) {
      if (Math.abs(vLon) > .01 || Math.abs(vLat) > .01) {
        lon0 += vLon * scale;
        lat0 = clamp(lat0 + vLat * scale, -65, 65);
        const decay = Math.pow(.92, scale);
        vLon *= decay; vLat *= decay;
        moving = true;
      }
      if (spin > 0) {
        lon0 -= spin * dt / 1000;
        moving = true;
      }
    }
    lon0 = normalize(lon0);
    draw(now);
    if (visible && !document.hidden && (moving || dragging || (!paused && !motion.matches))) frame = requestAnimationFrame(step);
  }

  function kick() {
    if (!frame && visible && !document.hidden && cells) {
      lastTime = 0;
      frame = requestAnimationFrame(step);
    }
  }

  function redraw() {
    if (!frame) draw(performance.now());
  }

  function flyTo(lat, lon) {
    const dLon = normalize(lon - lon0);
    const targetLat = clamp(lat * .7, -45, 50);
    vLon = vLat = 0;
    if (motion.matches) {
      lon0 = normalize(lon0 + dLon);
      lat0 = targetLat;
      redraw();
      return;
    }
    flight = { lon: lon0, lat: lat0, dLon, dLat: targetLat - lat0, start: performance.now(), duration: 1200 };
    kick();
  }

  /* City readout: one plain line */
  function renderCard() {
    tabs.forEach(tab => {
      const on = tab.dataset.city === selected;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on) card.panel.setAttribute('aria-labelledby', tab.id);
    });
    const place = placeById(selected);
    if (place.id === 'you') {
      card.name.textContent = 'You';
      card.line.textContent = visitorIsHome
        ? `${weekday()} ${clock()} · In ${nearest.city.name}`
        : `${weekday()} ${clock()} · ${formatKm(nearest.km)} from ${nearest.city.name}`;
      card.note.textContent = place.exact
        ? `Placed at ${place.place}, from your device’s time zone. Nothing is looked up or sent.`
        : 'Placed from your device’s time zone. Nothing is looked up or sent.';
      return;
    }
    const height = dot(vec(place.lat, place.lon), sun);
    const km = distanceKm(visitor, place);
    const light = height > .05 ? 'Daylight' : height > -.1 ? 'Twilight' : 'Night';
    card.name.textContent = place.name;
    card.line.textContent = `${weekday(place.tz)} ${clock(place.tz)} · ${light} · ${km < 80 ? 'You’re here' : `${formatKm(km)} from you`}`;
    card.note.textContent = '';
  }

  function choose(id, fly) {
    const place = placeById(id);
    if (!place) return;
    selected = id;
    renderCard();
    if (fly) flyTo(place.lat, place.lon); else redraw();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => choose(tab.dataset.city, true));
    tab.addEventListener('keydown', event => {
      const move = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!move) return;
      event.preventDefault();
      const next = tabs[(index + move + tabs.length) % tabs.length];
      next.focus();
      choose(next.dataset.city, true);
    });
  });

  /* Pointer and keyboard */
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left, py = event.clientY - rect.top;
    let best = null, bestDistance = 22;
    marks.forEach(mark => {
      const d = Math.hypot(mark.x - px, mark.y - py);
      if (d < bestDistance) { bestDistance = d; best = mark; }
    });
    if (best) choose(best.id, true);
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button > 0) return;
    dragging = true;
    moved = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    vLon = vLat = 0;
    flight = null;
    canvas.classList.add('is-dragging');
    try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* Pointer capture is optional. */ }
    kick();
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    const dx = event.clientX - lastX, dy = event.clientY - lastY, k = 180 / (Math.PI * radius);
    lastX = event.clientX;
    lastY = event.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    lon0 -= dx * k;
    lat0 = clamp(lat0 + dy * k, -65, 65);
    vLon = -dx * k;
    vLat = dy * k;
  });
  const endDrag = (event, cancelled) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('is-dragging');
    if (cancelled || motion.matches) vLon = vLat = 0;
    if (!cancelled && moved < 6) {
      vLon = vLat = 0;
      pick(event);
    }
    kick();
  };
  canvas.addEventListener('pointerup', event => endDrag(event, false));
  canvas.addEventListener('pointercancel', event => endDrag(event, true));
  canvas.addEventListener('keydown', event => {
    const turn = { ArrowLeft: [12, 0], ArrowRight: [-12, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[event.key];
    if (!turn) return;
    event.preventDefault();
    flight = null;
    vLon = vLat = 0;
    lon0 = normalize(lon0 + turn[0]);
    lat0 = clamp(lat0 + turn[1], -65, 65);
    redraw();
    kick();
  });

  /* Pause, visibility, size, time */
  function updatePauseButton() {
    if (!pauseButton) return;
    pauseButton.disabled = motion.matches;
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
    pauseButton.setAttribute('aria-label', paused ? 'Resume the globe' : 'Pause the globe');
  }
  if (pauseButton) pauseButton.addEventListener('click', () => {
    paused = !paused;
    updatePauseButton();
    redraw();
    kick();
  });
  motion.addEventListener('change', () => {
    vLon = vLat = 0;
    flight = null;
    updatePauseButton();
    redraw();
    kick();
  });
  updatePauseButton();

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) kick();
  }, { threshold: .01 }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  const resize = () => {
    if (build()) {
      redraw();
      kick();
    }
  };
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas); else addEventListener('resize', resize);

  setInterval(() => {
    sun = sunVector();
    renderCard();
    redraw();
  }, 20000);

  renderCard();
  resize();
  // Rebuild the digit sprites once the site font has loaded.
  if (document.fonts) document.fonts.load('500 10px "IBM Plex Sans"').then(resize, () => {});
})();
