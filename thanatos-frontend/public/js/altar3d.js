/* The Altar — Three.js (UMD global THREE). Dari altar-scene.html (Claude Design) + material sheet.
   Responsif ke panelnya, tanpa OrbitControls: orbit pelan + parallax pointer.
   State: dormant / burning / evaluating / rebirth. Reduced-motion → satu frame diam (atau PNG). */
window.Altar3D = (() => {
  const canvas = document.getElementById("altar-canvas"), still = document.getElementById("altar-still");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NOOP = { set() {}, flare() {}, start() {}, scroll() {}, freeze() {} };
  if (!canvas || !window.THREE) return NOOP;
  const T = window.THREE; let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" }); }
  catch { return NOOP; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(); scene.background = new T.Color("#08070a");
  const camera = new T.PerspectiveCamera(32, 1, .05, 50);
  const loader = new T.TextureLoader();
  const tex = (url, fallback) => { const t = loader.load(url, undefined, undefined, () => { if (fallback) fallback(); }); t.colorSpace = T.SRGBColorSpace; return t; };

  // ── tekstur: sprite ember & engrave dari design; disc digambar (dashed ring + segitiga besar)
  const radial = (size, stops) => { const cv = document.createElement("canvas"); cv.width = cv.height = size; const g = cv.getContext("2d"); const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, size, size); const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; };
  const emberFallback = radial(64, [[0, "rgba(255,200,150,1)"], [.25, "rgba(255,120,60,.9)"], [.6, "rgba(255,74,43,.25)"], [1, "rgba(255,74,43,0)"]]);
  let emberTex = tex("assets/altar/ember-sprite.png"); emberTex.onerror = null;
  const sigilTex = tex("assets/altar/sigil-engrave.png");
  const discCanvas = size => { const cv = document.createElement("canvas"); cv.width = cv.height = size; const g = cv.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, size, size); const c = size / 2, R = size / 2; g.strokeStyle = "#fff"; g.lineCap = "round"; g.lineJoin = "round";
    g.lineWidth = R * .018; g.setLineDash([R * .05, R * .06]); g.beginPath(); g.arc(c, c, R * .905, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.lineWidth = R * .02; const tr = R * .965; g.beginPath(); for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 3; const x = c + Math.cos(a) * tr, y = c + Math.sin(a) * tr; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(c, c, R * .02, 0, Math.PI * 2); g.fill(); return cv; };
  const discTex = new T.CanvasTexture(discCanvas(1024)); discTex.colorSpace = T.SRGBColorSpace;

  // ── material (material-sheet.png)
  const obsidian = new T.MeshPhysicalMaterial({ color: "#0b0709", roughness: .06, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, transmission: .55, ior: 1.52, thickness: .7, attenuationColor: new T.Color("#8f1d1d"), attenuationDistance: .35, specularIntensity: 1, side: T.DoubleSide });
  const stone = new T.MeshStandardMaterial({ color: "#1b181f", roughness: .92, metalness: 0 });
  const engrave = new T.MeshStandardMaterial({ color: "#1b181f", roughness: .85, emissive: new T.Color("#ece5d8"), emissiveMap: sigilTex, emissiveIntensity: .55, map: sigilTex });
  const discMat = engrave.clone(); discMat.map = discTex; discMat.emissiveMap = discTex;
  const iron = new T.MeshStandardMaterial({ color: "#17141a", roughness: .35, metalness: .9 });
  const bone = new T.MeshStandardMaterial({ color: "#ece5d8", roughness: .6 });
  const flameMat = new T.MeshBasicMaterial({ color: "#ffb36a", transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false });
  const flameCore = new T.MeshBasicMaterial({ color: "#ff4a2b", transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false });

  // ── geometri
  const altar = new T.Group(); scene.add(altar);
  const ringPts = [new T.Vector2(.95, 0), new T.Vector2(1.35, 0), new T.Vector2(1.35, .13), new T.Vector2(1.32, .16), new T.Vector2(.98, .16), new T.Vector2(.95, .13)];
  altar.add(new T.Mesh(new T.LatheGeometry(ringPts, 128), stone));
  const topGeo = new T.RingGeometry(.98, 1.32, 128, 1); { const uv = topGeo.attributes.uv, p = topGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 2.9 + .5, .5 - p.getY(i) / 2.9); }
  const topFace = new T.Mesh(topGeo, engrave); topFace.rotation.x = -Math.PI / 2; topFace.position.y = .1615; altar.add(topFace);
  const discGeo = new T.CircleGeometry(.95, 128); { const uv = discGeo.attributes.uv, p = discGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 1.9 + .5, .5 - p.getY(i) / 1.9); }
  const disc = new T.Mesh(discGeo, discMat); disc.rotation.x = -Math.PI / 2; disc.position.y = .0015; altar.add(disc);
  const plinth = new T.Mesh(new T.CylinderGeometry(.22, .26, .1, 96), stone); plinth.position.y = .05; altar.add(plinth);
  const bowl = []; for (let i = 0; i <= 24; i++) { const t = i / 24; bowl.push(new T.Vector2(.18 + .56 * Math.pow(t, .62), .1 + .62 * t)); }
  const inner = []; for (let i = 24; i >= 0; i--) { const t = i / 24; inner.push(new T.Vector2(Math.max(.18 + .56 * Math.pow(t, .62) - .05, .001), .1 + .62 * t - (i === 24 ? 0 : .05))); } inner[inner.length - 1] = new T.Vector2(.001, .16);
  altar.add(new T.Mesh(new T.LatheGeometry([new T.Vector2(.001, .1), ...bowl, ...inner], 160), obsidian));
  const bed = new T.Mesh(new T.CircleGeometry(.26, 64), new T.MeshStandardMaterial({ color: "#1a0806", emissive: new T.Color("#ff4a2b"), emissiveIntensity: .9, roughness: 1 })); bed.rotation.x = -Math.PI / 2; bed.position.y = .17; altar.add(bed);
  const torch = new T.Group(); torch.position.y = 1.0; altar.add(torch);
  const handle = new T.Mesh(new T.CylinderGeometry(.028, .036, .9, 48), iron); handle.position.y = .5; torch.add(handle);
  const pommel = new T.Mesh(new T.SphereGeometry(.06, 32, 24), iron); pommel.position.y = .96; torch.add(pommel);
  [.35, .75].forEach(y => { const b = new T.Mesh(new T.CylinderGeometry(.052, .052, .03, 48), bone); b.position.y = y; torch.add(b); });
  const cupMat = iron.clone(); cupMat.side = T.DoubleSide; const cup = new T.Mesh(new T.CylinderGeometry(.036, .13, .22, 48, 1, true), cupMat); cup.position.y = -.05; torch.add(cup);
  const rim = new T.Mesh(new T.TorusGeometry(.13, .01, 16, 64), bone); rim.rotation.x = Math.PI / 2; rim.position.y = -.16; torch.add(rim);
  const flame = new T.Group(); flame.position.y = -.2; torch.add(flame);
  const fOuter = new T.Mesh(new T.SphereGeometry(.1, 32, 32), flameMat); fOuter.scale.set(1, 1.9, 1); fOuter.position.y = -.2; flame.add(fOuter);
  const fCore = new T.Mesh(new T.SphereGeometry(.15, 32, 32), flameCore); fCore.scale.set(1, 2.1, 1); fCore.position.y = -.22; flame.add(fCore);
  const fTip = new T.Mesh(new T.ConeGeometry(.08, .3, 32), flameMat); fTip.rotation.x = Math.PI; fTip.position.y = -.5; flame.add(fTip);
  const flameGlow = new T.Sprite(new T.SpriteMaterial({ map: emberTex, color: "#ff8a3d", transparent: true, opacity: .7, blending: T.AdditiveBlending, depthWrite: false })); flameGlow.scale.set(1, 1.3, 1); flameGlow.position.y = -.3; flame.add(flameGlow);
  // embers: 400 titik; hitungan aktif = lerp(80,400,soul)
  const N = 400, pos = new Float32Array(N * 3), seed = new Float32Array(N); let active = 80;
  for (let i = 0; i < N; i++) { seed[i] = Math.random(); const r = Math.random() * .36, a = Math.random() * Math.PI * 2; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = .2 + Math.random() * 1.6; pos[i * 3 + 2] = Math.sin(a) * r; }
  const emberGeo = new T.BufferGeometry(); emberGeo.setAttribute("position", new T.BufferAttribute(pos, 3)); emberGeo.setDrawRange(0, active);
  const embers = new T.Points(emberGeo, new T.PointsMaterial({ map: emberTex, color: "#ff8a3d", size: .045, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true })); altar.add(embers);
  const basinGlow = new T.Sprite(new T.SpriteMaterial({ map: emberTex, color: "#ff4a2b", transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false })); basinGlow.scale.set(1.6, 1.1, 1); basinGlow.position.y = .55; altar.add(basinGlow);
  // burst (sacrifice): 60 sprite, 900ms
  const BN = 60, bpos = new Float32Array(BN * 3), bvel = []; for (let i = 0; i < BN; i++) bvel.push(new T.Vector3());
  const burstGeo = new T.BufferGeometry(); burstGeo.setAttribute("position", new T.BufferAttribute(bpos, 3));
  const burst = new T.Points(burstGeo, new T.PointsMaterial({ map: emberTex, color: "#ffd6aa", size: .08, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); altar.add(burst); let burstT = -1;
  // lighting rig
  const key = new T.PointLight("#ff4a2b", 26, 6, 2); key.position.set(0, .32, 0); scene.add(key);
  const under = new T.SpotLight("#ff6a3b", 40, 8, .9, .6, 1.5); under.position.set(0, -1.2, .2); under.target.position.set(0, 1.5, 0); scene.add(under, under.target);
  const rimL = new T.DirectionalLight("#b89cff", 1.4); rimL.position.set(-.6, 1.6, -3.2); scene.add(rimL);
  const rim2 = new T.PointLight("#b89cff", 2.5, 8, 2); rim2.position.set(1.6, .4, -2.2); scene.add(rim2);

  // ── state & animasi (motion-timing)
  const target = { keyI: 26, rimI: 1.4, rim2I: 2.5, torchZ: 0, torchY: 1.0, flameC: new T.Color("#ffb36a"), coreC: new T.Color("#ff4a2b"), glowC: new T.Color("#ff8a3d"), engraveC: new T.Color("#ece5d8"), engraveI: .55, speed: 1, bedI: .9 };
  let state = "dormant", soul = 0, flareT = -1, torchTween = null;
  function set(s, soulPct) {
    state = s; soul = Math.max(0, Math.min(1, soulPct || 0)); canvas.parentElement.classList.toggle("dormant", s === "dormant"); active = Math.round(80 + 320 * soul); if (s === "dormant") active = Math.round(active * .45);
    emberGeo.setDrawRange(0, active);
    const reb = s === "rebirth", ev = s === "evaluating", dor = s === "dormant";
    target.keyI = reb ? 18 : dor ? 9 : ev ? 14 : 26; target.rimI = reb ? 4.2 : 1.4; target.rim2I = reb ? 14 : 2.5; target.bedI = dor ? .35 : ev ? .5 : .9;
    target.speed = ev ? 0 : dor ? .35 : .4 + .6 * soul;
    target.flameC.set(reb ? "#d9c8ff" : "#ffb36a"); target.coreC.set(reb ? "#b89cff" : "#ff4a2b"); target.glowC.set(reb ? "#b89cff" : "#ff8a3d");
    target.engraveC.set(reb ? "#b89cff" : "#ece5d8"); target.engraveI = reb ? .35 : .55;
    const z = reb ? Math.PI : 0; if (torch.rotation.z !== z) torchTween = { from: torch.rotation.z, to: z, fromY: torch.position.y, toY: reb ? 1.35 : 1.0, t0: performance.now() + 400, dur: reb ? 1200 : 300 };
  }
  function flare() { flareT = performance.now(); burstT = flareT; for (let i = 0; i < BN; i++) { bpos[i * 3] = 0; bpos[i * 3 + 1] = .45; bpos[i * 3 + 2] = 0; bvel[i].set((Math.random() - .5) * .9, .6 + Math.random() * 1.6, (Math.random() - .5) * .9); } burstGeo.attributes.position.needsUpdate = true; }

  // ── kamera: front ¾ + orbit pelan + parallax
  let W = 0, H = 0, px = 0, py = 0, t = 0, raf = 0, running = false, frames = 0, scrollP = 0, introT = -1, freezeUntil = 0;
  // ── seret untuk mengorbit (mouse/jari), inersia, kembali ke orbit otomatis; ketuk → flare ──
  let dragging = false, dragYaw = 0, dragPitch = 0, vel = 0, lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0;
  canvas.style.touchAction = "pan-y"; canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", e => { dragging = true; lastX = downX = e.clientX; lastY = downY = e.clientY; downT = performance.now(); vel = 0; canvas.style.cursor = "grabbing"; try { canvas.setPointerCapture(e.pointerId); } catch {} });
  canvas.addEventListener("pointermove", e => { if (!dragging) return; const dx = e.clientX - lastX, dy = e.clientY - lastY; dragYaw += dx * .006; dragPitch = Math.max(-.22, Math.min(.22, dragPitch + dy * .0025)); vel = dx * .006; lastX = e.clientX; lastY = e.clientY; });
  const up = e => { if (!dragging) return; dragging = false; canvas.style.cursor = "grab"; if (performance.now() - downT < 260 && Math.hypot(e.clientX - downX, e.clientY - downY) < 7) flare(); };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  const base = new T.Vector3(3.4, 2.1, 4.0), look = new T.Vector3(0, .7, 0); let dist = 1;
  function resize() { const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); renderer.setSize(W, H, false); const a = W / H; camera.aspect = a;
    // hero lebar: altar di kanan, teks di kiri; potret: altar di atas-tengah, lebih jauh
    if (a > 1.25) { look.set(-1.05, .78, 0); camera.fov = 30; dist = .92; } else { look.set(0, 1.05, 0); camera.fov = 40; dist = 1.25; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, a > 1.25 ? 2 : 1.5)); camera.updateProjectionMatrix(); }
  canvas.parentElement.addEventListener("pointermove", e => { const r = canvas.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5; }, { passive: true });
  canvas.parentElement.addEventListener("pointerleave", () => { px = py = 0; });
  const lerp = (a, b, k) => a + (b - a) * k, ease = x => 1 - Math.pow(1 - x, 3), inout = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function frame(now) {
    t += 1 / 60; frames++;
    // intro: dolly dari 1.32× jarak ke jarak dasar dalam 1.6 s (ease-out); scroll: orbit + turun + redup
    const intro = introT < 0 ? 1 : Math.min(1, (now - introT) / 1600), d = dist * (1.32 - .32 * ease(intro));
    if (!dragging) { dragYaw += vel; vel *= .94; dragYaw *= .985; dragPitch *= .98; }
    const yaw = Math.sin(t * .12) * .14 + px * .35 + scrollP * .38 + dragYaw, pitch = py * .12 - scrollP * .06 + dragPitch;
    const r = base.length() * d, rh = Math.hypot(base.x, base.z) * d;
    renderer.toneMappingExposure = 1.15 - scrollP * .45; camera.position.set(Math.sin(Math.atan2(base.x, base.z) + yaw) * rh, base.y * dist + pitch * r * .5, Math.cos(Math.atan2(base.x, base.z) + yaw) * rh); camera.lookAt(look);
    altar.rotation.y = t * (Math.PI * 2 / 120);              // sigil ring: 1 putaran / 120 s
    key.intensity = lerp(key.intensity, target.keyI, .08); rimL.intensity = lerp(rimL.intensity, target.rimI, .05); rim2.intensity = lerp(rim2.intensity, target.rim2I, .05);
    flameMat.color.lerp(target.flameC, .05); flameCore.color.lerp(target.coreC, .05); flameGlow.material.color.lerp(target.glowC, .05); engrave.emissive.lerp(target.engraveC, .05); engrave.emissiveIntensity = lerp(engrave.emissiveIntensity, target.engraveI, .05); bed.material.emissiveIntensity = lerp(bed.material.emissiveIntensity, target.bedI, .06);
    if (torchTween) { const k = Math.min(1, Math.max(0, (now - torchTween.t0) / torchTween.dur)); torch.rotation.z = lerp(torchTween.from, torchTween.to, inout(k)); torch.position.y = lerp(torchTween.fromY, torchTween.toY, inout(k)); if (k >= 1) torchTween = null; }
    if (flareT > 0) { const k = (now - flareT) / 600; if (k < 1) { key.intensity = 26 + 32 * Math.sin(k * Math.PI); altar.scale.setScalar(1 + .02 * Math.sin(k * Math.PI)); } else { altar.scale.setScalar(1); flareT = -1; } }
    if (burstT > 0) { const k = (now - burstT) / 900; if (k < 1) { for (let i = 0; i < BN; i++) { bpos[i * 3] += bvel[i].x * .016; bpos[i * 3 + 1] += bvel[i].y * .016; bpos[i * 3 + 2] += bvel[i].z * .016; bvel[i].y -= .012; } burstGeo.attributes.position.needsUpdate = true; burst.material.opacity = 1 - k; } else { burst.material.opacity = 0; burstT = -1; } }
    const frozen = now < freezeUntil;
    const p = emberGeo.attributes.position, sp = frozen ? 0 : target.speed * (1 - scrollP * .6), wind = px * .004;
    for (let i = 0; i < active; i++) { let y = p.getY(i) + (.004 + seed[i] * .006) * sp; let x = p.getX(i) + Math.sin(t * 2 + seed[i] * 10) * .0008 * sp + wind * sp * (.4 + seed[i]);
      if (y > 1.9 || Math.abs(x) > .75) { y = .2; x = (Math.random() - .5) * .5; } p.setY(i, y); p.setX(i, x); } p.needsUpdate = true;
    embers.material.opacity = (.5 + .45 * soul) * (.85 + Math.sin(t * 3) * .15); fOuter.scale.y = 1.9 + Math.sin(t * 9) * .08; flameGlow.material.opacity = .62 + Math.sin(t * 7) * .08;
    renderer.render(scene, camera);
    if (frames === 2) { canvas.classList.add("on"); still?.classList.add("off"); }
    if (running && !reduce) raf = requestAnimationFrame(frame);
  }
  function scroll(pv) { scrollP = Math.max(0, Math.min(1, pv)); }
  function freeze(ms) { freezeUntil = performance.now() + ms; }
  function start() { if (running) return; running = true; resize(); addEventListener("resize", resize); introT = reduce ? -1 : performance.now();
    if (reduce) { frame(performance.now()); frame(performance.now()); return; }
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(frame); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();   // mulai segera; data hanya mengubah state
  return { set, flare, start, scroll, freeze };
})();
