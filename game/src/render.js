// Canvas 2D renderer: a pseudo-3D chase view. One job: turn the world state
// into the picture — sky, ridge, scrolling terrain, runway, entities, the
// mail plane, lit instruments, and the title / game-over screens. All art is
// drawn vector shapes; there are no image assets anywhere.
import { CFG } from './config.js';
import { altitudeFeet, headingDegrees, speedKnots } from './world.js';

const W = CFG.viewW;
const H = CFG.viewH;
const CX = W / 2;
const HORIZON = CFG.horizonY;
const SPAWN_Z = 260;

function groundY(d) {
  return HORIZON + (H - HORIZON) * Math.pow(1 - d, 1.6);
}
function scaleAt(d) {
  return 0.18 + (1 - d) * 1.9;
}
function projX(d, x) {
  return CX + x * 300 * (0.25 + (1 - d) * 1.1);
}
function projY(d, alt) {
  return groundY(d) - alt * 320 * (0.2 + (1 - d));
}
function fieldColor(col, row) {
  const h = Math.abs(Math.sin(col * 127.1 + row * 311.7) * 43758.5453) % 1;
  const palette = ['#5d8a3c', '#6f9a44', '#8a9a4b', '#7fae56', '#4e7d33', '#a8a05a'];
  return palette[Math.floor(h * palette.length)];
}

function drawSky(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, '#2f6fb4');
  g.addColorStop(0.55, '#7fb2dd');
  g.addColorStop(1, '#ffd9a0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON + 1);
  // Sun with a warm glow, low over the ridge.
  const sunX = W * 0.78;
  const sunY = HORIZON - 96;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 130);
  glow.addColorStop(0, 'rgba(255, 236, 170, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 214, 120, 0.55)');
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
  // Mountain ridge silhouette on the horizon.
  ctx.fillStyle = '#5b6f92';
  ctx.beginPath();
  ctx.moveTo(0, HORIZON);
  const n = world.ridge.length;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * W;
    const peak = world.ridge[i % n] * 74;
    ctx.lineTo(x, HORIZON - peak);
    ctx.lineTo(x + (W / n) / 2, HORIZON - peak * 0.35);
  }
  ctx.lineTo(W, HORIZON);
  ctx.closePath();
  ctx.fill();
  // Snow caps on the tallest peaks.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.5) / n) * W;
    const peak = world.ridge[i] * 74;
    if (peak > 52) {
      ctx.beginPath();
      ctx.moveTo(x - 16, HORIZON - peak + 14);
      ctx.lineTo(x, HORIZON - peak);
      ctx.lineTo(x + 16, HORIZON - peak + 14);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawCloud(ctx, c, t) {
  const d = c.d;
  const x = projX(d, c.x + Math.sin(t * 0.05 + c.size * 5) * 0.05);
  const y = projY(d, c.alt);
  const s = scaleAt(d) * 42 * c.size;
  ctx.fillStyle = `rgba(255,255,255,${0.35 + (1 - d) * 0.55})`;
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.42, 0, 0, Math.PI * 2);
  ctx.ellipse(x - s * 0.55, y + s * 0.1, s * 0.6, s * 0.32, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.55, y + s * 0.08, s * 0.65, s * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
}

function roadXAt(zWorld) {
  return 0.55 * Math.sin(zWorld * 0.012);
}
function riverXAt(zWorld) {
  return -0.92 + 0.14 * Math.sin(zWorld * 0.008 + 1.3);
}

function drawGround(ctx, world) {
  // Base ground first so the terrain spans the full width even where the
  // perspective strips narrow near the horizon.
  ctx.fillStyle = '#557a35';
  ctx.fillRect(0, HORIZON, W, H - HORIZON);
  // Field strips, scrolling toward the camera as distance grows.
  const rows = 26;
  const scroll = world.distance / 9;
  for (let r = 0; r < rows; r++) {
    const dTop = 1 - r / rows;
    const dBot = 1 - (r + 1) / rows;
    const dMid = (dTop + dBot) / 2;
    const yTop = groundY(dTop);
    const yBot = groundY(dBot);
    if (yBot - yTop < 0.5) continue;
    const rowIdx = Math.floor(scroll + r);
    const zMid = world.distance + dMid * SPAWN_Z;
    // Lateral field columns.
    for (let col = -5; col < 5; col++) {
      const x0 = projX(dMid, col * 0.5);
      const x1 = projX(dMid, (col + 1) * 0.5);
      ctx.fillStyle = fieldColor(col, rowIdx);
      ctx.fillRect(x0, yTop, x1 - x0 + 1, yBot - yTop + 1);
    }
    // Winding road (dark strip) and river (blue band) on top of the fields.
    const roadC = projX(dMid, roadXAt(zMid));
    const roadW = 30 * scaleAt(dMid);
    ctx.fillStyle = '#4a4640';
    ctx.fillRect(roadC - roadW / 2, yTop, roadW, yBot - yTop + 1);
    ctx.fillStyle = '#e8d44f';
    ctx.fillRect(roadC - 1.5, yTop, 3, yBot - yTop + 1);
    const riverC = projX(dMid, riverXAt(zMid));
    const riverW = 46 * scaleAt(dMid);
    ctx.fillStyle = '#3f7fb8';
    ctx.fillRect(riverC - riverW / 2, yTop, riverW, yBot - yTop + 1);
  }
  // Runway: visible while the plane is still near the airfield (first ~450
  // distance units). A grey strip with white centre dashes and edge lights.
  const runwayEnd = 430;
  if (world.distance < runwayEnd) {
    for (let r = 0; r < rows; r++) {
      const dTop = 1 - r / rows;
      const dBot = 1 - (r + 1) / rows;
      const dMid = (dTop + dBot) / 2;
      const zMid = world.distance + dMid * SPAWN_Z;
      if (zMid > runwayEnd || zMid < -10) continue;
      const yTop = groundY(dTop);
      const yBot = groundY(dBot);
      const hw = 0.17;
      const x0 = projX(dMid, -hw);
      const x1 = projX(dMid, hw);
      ctx.fillStyle = '#3c3f45';
      ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop + 1);
      const dashOn = Math.floor(zMid / 18) % 2 === 0;
      if (dashOn) {
        ctx.fillStyle = '#f2f2f2';
        ctx.fillRect(projX(dMid, -0.012), yTop, projX(dMid, 0.012) - projX(dMid, -0.012), yBot - yTop + 1);
      }
      ctx.fillStyle = '#ffd94a';
      ctx.fillRect(x0 - 2, yTop, 3, yBot - yTop + 1);
      ctx.fillRect(x1 - 1, yTop, 3, yBot - yTop + 1);
    }
    // Runway threshold numbers ahead.
    const dThr = Math.max(0, (runwayEnd - world.distance) / SPAWN_Z);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `bold ${Math.round(10 + scaleAt(dThr) * 22)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('09', projX(dThr, 0), groundY(dThr) - 8);
  }
}

function drawRing(ctx, e, t) {
  const d = Math.max(0, e.z / SPAWN_Z);
  const x = projX(d, e.x);
  const y = projY(d, e.alt);
  const s = scaleAt(d);
  const r = 46 * s;
  if (r < 3) return;
  const pulse = 1 + Math.sin(t * 4 + e.spin) * 0.06;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.rotate(Math.sin(e.spin * 0.5) * 0.12);
  // Glow halo, then the golden torus (two ellipses: outer gold, inner sky).
  ctx.strokeStyle = 'rgba(255, 217, 74, 0.35)';
  ctx.lineWidth = r * 0.42;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.82, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#f7b500';
  ctx.lineWidth = Math.max(2, r * 0.2);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.82, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#fff3c4';
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.94, r * 0.76, 0, -0.6, 1.1);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `bold ${Math.max(8, r * 0.34)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✈', 0, 1);
  ctx.restore();
}

function drawStorm(ctx, e, t) {
  const d = Math.max(0, e.z / SPAWN_Z);
  const x = projX(d, e.x);
  const y = projY(d, e.alt);
  const s = scaleAt(d);
  const r = 52 * s;
  if (r < 3) return;
  ctx.fillStyle = 'rgba(38, 38, 52, 0.92)';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.ellipse(x - r * 0.6, y + r * 0.14, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.6, y + r * 0.12, r * 0.6, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(90, 90, 120, 0.8)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.2, y - r * 0.28, r * 0.5, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lightning flicker inside the cloud.
  if (Math.sin(t * 7 + e.spin * 3) > 0.72) {
    ctx.strokeStyle = '#ffe95e';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.1, y + r * 0.2);
    ctx.lineTo(x + r * 0.08, y + r * 0.55);
    ctx.lineTo(x - r * 0.05, y + r * 0.62);
    ctx.lineTo(x + r * 0.15, y + r * 1.0);
    ctx.stroke();
  }
  ctx.fillStyle = '#ff6b5e';
  ctx.font = `bold ${Math.max(9, r * 0.3)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('⚡', x, y - r * 0.62);
}

function drawBalloon(ctx, e, t) {
  const d = Math.max(0, e.z / SPAWN_Z);
  const x = projX(d, e.x);
  const y = projY(d, e.alt);
  const s = scaleAt(d);
  const r = 34 * s;
  if (r < 3) return;
  const sway = Math.sin(t * 1.2 + e.spin) * r * 0.08;
  ctx.save();
  ctx.translate(x + sway, y);
  // Envelope: striped hot-air balloon.
  const colors = ['#e8452c', '#ffd94a', '#e8452c', '#2f6fb4'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (0.75 - Math.abs(i - 1.5) * 0.18), r * 0.9, 0, Math.PI * (0.5 + i * 0.25), Math.PI * (0.75 + i * 0.25));
    ctx.fill();
  }
  ctx.fillStyle = '#e8452c';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.1, r * 0.78, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.2, r * 0.3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Ropes + basket.
  ctx.strokeStyle = '#5a4632';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, r * 0.55);
  ctx.lineTo(-r * 0.3, r * 1.15);
  ctx.moveTo(r * 0.5, r * 0.55);
  ctx.lineTo(r * 0.3, r * 1.15);
  ctx.stroke();
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-r * 0.34, r * 1.12, r * 0.68, r * 0.5);
  ctx.restore();
}

function drawBird(ctx, e, t) {
  const d = Math.max(0, e.z / SPAWN_Z);
  const x = projX(d, e.x) + Math.sin(t * 2 + e.flap) * 12 * scaleAt(d);
  const y = projY(d, e.alt) + Math.sin(t * 3 + e.flap * 0.5) * 6 * scaleAt(d);
  const s = scaleAt(d);
  const span = 26 * s;
  if (span < 2) return;
  const flap = Math.sin(e.flap) * 0.9;
  ctx.strokeStyle = '#22242e';
  ctx.lineWidth = Math.max(1.5, 3 * s);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - span, y - flap * span * 0.5);
  ctx.quadraticCurveTo(x - span * 0.4, y + span * 0.15, x, y);
  ctx.quadraticCurveTo(x + span * 0.4, y + span * 0.15, x + span, y - flap * span * 0.5);
  ctx.stroke();
}

function drawTower(ctx, e, t) {
  const d = Math.max(0, e.z / SPAWN_Z);
  const baseY = groundY(d);
  const x = projX(d, e.x);
  const s = scaleAt(d);
  const h = 130 * s;
  const w = 34 * s;
  if (h < 4) return;
  ctx.fillStyle = '#7a3b2e';
  ctx.beginPath();
  ctx.moveTo(x - w, baseY);
  ctx.lineTo(x - w * 0.25, baseY - h);
  ctx.lineTo(x + w * 0.25, baseY - h);
  ctx.lineTo(x + w, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.8, baseY - h * 0.33);
  ctx.lineTo(x + w * 0.8, baseY - h * 0.33);
  ctx.moveTo(x - w * 0.6, baseY - h * 0.66);
  ctx.lineTo(x + w * 0.6, baseY - h * 0.66);
  ctx.stroke();
  // Blinking red beacon.
  if (Math.sin(t * 4 + e.spin) > 0) {
    ctx.fillStyle = '#ff2e2e';
    ctx.beginPath();
    ctx.arc(x, baseY - h - 4 * s, Math.max(2, 5 * s), 0, Math.PI * 2);
    ctx.fill();
  }
  // Dish on the side.
  ctx.fillStyle = '#d8d8d8';
  ctx.beginPath();
  ctx.arc(x + w * 0.5, baseY - h * 0.55, Math.max(2, 7 * s), 0, Math.PI * 2);
  ctx.fill();
}

function drawEntities(ctx, world, t) {
  // Far first so near objects overlap them.
  const sorted = [...world.entities].sort((a, b) => b.z - a.z);
  for (const e of sorted) {
    if (e.kind === 'ring') drawRing(ctx, e, t);
    else if (e.kind === 'storm') drawStorm(ctx, e, t);
    else if (e.kind === 'balloon') drawBalloon(ctx, e, t);
    else if (e.kind === 'bird') drawBird(ctx, e, t);
    else if (e.kind === 'tower') drawTower(ctx, e, t);
  }
}

function drawPlane(ctx, world, t) {
  const p = world.plane;
  const d = 0;
  const px = projX(d, p.x);
  const py = projY(d, p.alt);
  const s = 1.0;
  // Ground shadow, shrinking and fading as the plane climbs.
  const shScale = Math.max(0.15, 1 - p.alt * 0.8);
  ctx.fillStyle = `rgba(10, 20, 10, ${0.28 * shScale})`;
  ctx.beginPath();
  ctx.ellipse(px, H - 14, 74 * shScale, 12 * shScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(p.bank * 0.42);
  ctx.scale(s, s);
  const blink = Math.sin(t * 6) > 0;
  // Wings (rear view): broad main wing + tailplane.
  ctx.fillStyle = '#c8442c';
  ctx.beginPath();
  ctx.moveTo(-118, 6);
  ctx.quadraticCurveTo(-60, -6, -16, 2);
  ctx.lineTo(16, 2);
  ctx.quadraticCurveTo(60, -6, 118, 6);
  ctx.quadraticCurveTo(118, 16, 60, 16);
  ctx.lineTo(-60, 16);
  ctx.quadraticCurveTo(-118, 16, -118, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a82f1d';
  ctx.beginPath();
  ctx.moveTo(-46, -34);
  ctx.lineTo(46, -34);
  ctx.lineTo(30, -22);
  ctx.lineTo(-30, -22);
  ctx.closePath();
  ctx.fill();
  // Fuselage: rounded body tapering to the tail.
  const body = ctx.createLinearGradient(0, -52, 0, 26);
  body.addColorStop(0, '#ffd94a');
  body.addColorStop(0.55, '#f7b500');
  body.addColorStop(1, '#d18f00');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.quadraticCurveTo(20, -52, 22, -18);
  ctx.quadraticCurveTo(24, 8, 14, 24);
  ctx.quadraticCurveTo(0, 30, -14, 24);
  ctx.quadraticCurveTo(-24, 8, -22, -18);
  ctx.quadraticCurveTo(-20, -52, 0, -58);
  ctx.closePath();
  ctx.fill();
  // Cockpit windows and mail stripe.
  ctx.fillStyle = '#16324a';
  ctx.beginPath();
  ctx.ellipse(0, -34, 13, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-4, -38, 5, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f6fb4';
  ctx.fillRect(-22, -6, 44, 7);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MAIL', 0, 1);
  // Vertical fin + tail.
  ctx.fillStyle = '#c8442c';
  ctx.beginPath();
  ctx.moveTo(-12, -52);
  ctx.lineTo(0, -86);
  ctx.lineTo(12, -52);
  ctx.closePath();
  ctx.fill();
  // Propeller blur (the plane flies away from us, engine at the nose — here
  // shown as a spinning disc shimmer above the tail for readability).
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -88, 16 + Math.sin(t * 30) * 3, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Navigation lights: red left, green right, blinking white tail.
  ctx.fillStyle = '#ff2e2e';
  ctx.beginPath();
  ctx.arc(-116, 10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2eff5e';
  ctx.beginPath();
  ctx.arc(116, 10, 4, 0, Math.PI * 2);
  ctx.fill();
  if (blink) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -86, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Invulnerability flicker: draw the plane ghosted half the time.
  if (world.invuln > 0 && Math.floor(t * 12) % 2 === 0) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.translate(px, py);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 120, 40, p.bank * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function gauge(ctx, x, y, r, label, valueText, frac, color) {
  ctx.save();
  ctx.translate(x, y);
  // Lit instrument: dark face, glowing rim, tick marks, needle.
  ctx.fillStyle = 'rgba(8, 18, 30, 0.82)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 8), Math.sin(a) * (r - 8));
    ctx.lineTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
    ctx.stroke();
  }
  const needle = Math.PI * 0.75 + Math.max(0, Math.min(1, frac)) * Math.PI * 1.5;
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(needle) * (r - 12), Math.sin(needle) * (r - 12));
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, r * 0.55);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(valueText, 0, -r * 0.28);
  ctx.restore();
}

function drawHUD(ctx, world, ui) {
  const t = world.time;
  // Top bar.
  ctx.fillStyle = 'rgba(8, 18, 30, 0.66)';
  ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`SCORE ${Math.floor(world.score)}`, 18, 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`RUN ${world.run}  ·  RINGS ${world.rings}/${CFG.ringsPerRun}  ·  ${Math.floor(world.distance / 100)} km`, 18, 54);
  // Ring progress dots.
  for (let i = 0; i < CFG.ringsPerRun; i++) {
    ctx.fillStyle = i < world.rings ? '#ffd94a' : 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(300 + i * 18, 48, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Compass strip (heading).
  const hdg = headingDegrees(world);
  ctx.save();
  ctx.translate(CX, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(-150, -20, 300, 40);
  const dirs = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
  for (const [label, deg] of dirs) {
    let rel = ((deg - hdg + 540) % 360) - 180;
    if (Math.abs(rel) < 150) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, rel * 1.4, 6);
    }
  }
  for (let off = -150; off <= 150; off += 15) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(off - 1, -18, 2, off % 45 === 0 ? 10 : 5);
  }
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(-7, -32);
  ctx.lineTo(7, -32);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${String(hdg).padStart(3, '0')}°`, 0, 52);
  ctx.restore();
  // Fuel gauge (top right) + hull hearts.
  const fuelFrac = world.fuel / CFG.fuelMax;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(W - 250, 16, 150, 16);
  ctx.fillStyle = fuelFrac > 0.5 ? '#7dff8a' : fuelFrac > 0.25 ? '#ffd94a' : '#ff6b5e';
  ctx.fillRect(W - 250, 16, 150 * fuelFrac, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FUEL', W - 250, 46);
  ctx.fillText(`${Math.ceil(world.fuel)}%`, W - 96, 30);
  for (let i = 0; i < CFG.hullMax; i++) {
    ctx.fillStyle = i < world.hull ? '#ff6b5e' : 'rgba(255,255,255,0.25)';
    ctx.font = '22px sans-serif';
    ctx.fillText('♥', W - 96 + i * 26, 56);
  }
  // Lit instrument gauges, bottom corners.
  gauge(ctx, 74, H - 74, 56, 'SPEED kt', String(speedKnots(world)), world.speed / CFG.maxSpeed, '#7dff8a');
  gauge(ctx, W - 74, H - 74, 56, 'ALT ft', String(altitudeFeet(world)), world.plane.alt, '#9fd8ff');
  // Boost hint.
  if (world.phase === 'play' && world.time < 6) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Arrows / WASD or mouse to steer  ·  SPACE = boost  ·  P = pause', CX, H - 18);
  }
  // Floating event messages.
  ctx.textAlign = 'center';
  world.messages.forEach((m, i) => {
    const a = m.t > 2 ? 1 - (m.t - 2) / 0.6 : 1;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = m.color;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(m.text, CX, 108 + i * 30);
    ctx.globalAlpha = 1;
  });
  // Mute indicator.
  if (ui.muted) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🔇 MUTED (M)', W - 14, H - 14);
  }
}

function drawTitle(ctx, world, ui) {
  ctx.fillStyle = 'rgba(6, 14, 26, 0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('SKY COURIER', CX, 168);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('— RING RUNNER —', CX, 222);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '20px sans-serif';
  ctx.fillText('Fly the mail plane through golden rings. Dodge storms, balloons, birds and towers.', CX, 268);
  ctx.fillText('Rings refill your fuel. Finish 12 rings to complete a delivery run — then it gets faster.', CX, 296);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('ARROWS / WASD or MOUSE — steer & climb   ·   SPACE — boost   ·   P — pause   ·   M — mute', CX, 348);
  const blink = Math.sin(world.time * 4) > -0.2;
  if (blink) {
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('PRESS ENTER OR CLICK TO TAKE OFF', CX, 420);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Runway 09 is clear. ${ui.best > 0 ? `Best score: ${ui.best}` : 'First flight — good luck, courier!'}`, CX, 470);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '15px sans-serif';
  ctx.fillText('An original game — all art drawn in code, all sounds synthesised.', CX, 640);
}

function drawGameOver(ctx, world, ui) {
  ctx.fillStyle = 'rgba(6, 10, 20, 0.62)';
  ctx.fillRect(0, 0, W, H);
  // Panel.
  ctx.fillStyle = 'rgba(10, 22, 38, 0.92)';
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 3;
  const pw = 620;
  const ph = 430;
  ctx.beginPath();
  ctx.roundRect(CX - pw / 2, 120, pw, ph, 18);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b5e';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('FLIGHT OVER', CX, 192);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText(world.overReason || 'The run is finished.', CX, 228);
  // Big grade letter.
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 110px sans-serif';
  ctx.fillText(`GRADE ${world.grade}`, CX, 348);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`SCORE ${Math.floor(world.score)}`, CX, 402);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '19px sans-serif';
  ctx.fillText(
    `Rings ${world.stats.collected}  ·  Near misses ${world.stats.nearMisses}  ·  Hits taken ${world.stats.hits}  ·  Distance ${Math.floor(world.distance / 100)} km  ·  Run ${world.run}`,
    CX, 442,
  );
  if (world.score >= ui.best && world.score > 0) {
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('★ NEW BEST SCORE ★', CX, 478);
  } else if (ui.best > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '18px sans-serif';
    ctx.fillText(`Best score: ${ui.best}`, CX, 478);
  }
  const blink = Math.sin(world.time * 4) > -0.2;
  if (blink) {
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('PRESS ENTER TO FLY AGAIN', CX, 522);
  }
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(6, 10, 20, 0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', CX, H / 2);
  ctx.font = '20px sans-serif';
  ctx.fillText('Press P to resume', CX, H / 2 + 40);
}

// Main entry: draw one frame for the current world state.
export function render(ctx, world, ui) {
  const t = world.time;
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake * 14;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawSky(ctx, world);
  for (const c of world.clouds) drawCloud(ctx, c, t);
  drawGround(ctx, world);
  drawEntities(ctx, world, t);
  if (world.phase !== 'title') drawPlane(ctx, world, t);
  ctx.restore();
  if (world.phase === 'play' || world.phase === 'paused' || world.phase === 'over') drawHUD(ctx, world, ui);
  if (world.phase === 'title') drawTitle(ctx, world, ui);
  if (world.phase === 'over') drawGameOver(ctx, world, ui);
  if (world.phase === 'paused') drawPaused(ctx);
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255, 40, 30, ${world.flash * 0.45})`;
    ctx.fillRect(0, 0, W, H);
  }
}
