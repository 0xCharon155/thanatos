/* THE SCRIBE — penjaga Buku Abu. Karakter SVG berlapis + state machine.
   States: dormant · idle · sealed · rebirth. One-shots: write · nod · shake.
   Cermin obsidian di kanan = layar telemetri (overlay HTML di atasnya). */
window.Scribe = (() => {
  const host = document.getElementById("scribe"); if (!host) return { set() {}, react() {}, write() {} };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const embers = Array.from({ length: 22 }, (_, i) => { const x = 250 + Math.random() * 420, y = 300 + Math.random() * 300, r = 1 + Math.random() * 2.2;
    return `<circle class="em" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" style="--d:${(4 + Math.random() * 5).toFixed(1)}s;--o:${(-Math.random() * 8).toFixed(1)}s"/>`; }).join("");
  host.innerHTML = `
<svg class="sc" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>
    <radialGradient id="scGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(300 430) scale(340 260)"><stop offset="0" stop-color="#ff4a2b" stop-opacity=".34"/><stop offset=".5" stop-color="#8f1d1d" stop-opacity=".16"/><stop offset="1" stop-color="#8f1d1d" stop-opacity="0"/></radialGradient>
    <radialGradient id="scViolet" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(930 200) scale(420 420)"><stop offset="0" stop-color="#b89cff" stop-opacity=".22"/><stop offset="1" stop-color="#b89cff" stop-opacity="0"/></radialGradient>
    <linearGradient id="scRobe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26212b"/><stop offset="1" stop-color="#0e0c11"/></linearGradient>
    <linearGradient id="scHood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b2530"/><stop offset="1" stop-color="#141117"/></linearGradient>
    <linearGradient id="scStone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a252f"/><stop offset="1" stop-color="#15121a"/></linearGradient>
    <linearGradient id="scSlab" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f2934"/><stop offset="1" stop-color="#1c1820"/></linearGradient>
    <linearGradient id="scGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17131c"/><stop offset=".55" stop-color="#0b090e"/><stop offset="1" stop-color="#1a1420"/></linearGradient>
    <linearGradient id="scPage" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8d0c2"/><stop offset="1" stop-color="#a79f93"/></linearGradient>
    <radialGradient id="scFlame" cx=".5" cy=".3" r=".6"><stop offset="0" stop-color="#ffd6aa"/><stop offset=".45" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ff4a2b" stop-opacity="0"/></radialGradient>
    <filter id="scBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="scSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>

  <!-- cahaya ruangan -->
  <rect class="sc-glow" x="0" y="0" width="1200" height="720" fill="url(#scGlow)"/>
  <rect class="sc-violet" x="0" y="0" width="1200" height="720" fill="url(#scViolet)"/>
  <!-- lantai: sigil samar + bayangan -->
  <ellipse cx="520" cy="655" rx="360" ry="58" fill="none" stroke="#ff4a2b" stroke-opacity=".16" stroke-width="1.5" stroke-dasharray="6 9"/>
  <ellipse cx="520" cy="655" rx="290" ry="44" fill="none" stroke="#ece5d8" stroke-opacity=".08" stroke-width="1"/>
  <ellipse cx="500" cy="690" rx="330" ry="18" fill="#000" fill-opacity=".55" filter="url(#scSoft)"/>

  <!-- cermin obsidian (layar telemetri) -->
  <g class="sc-mirror">
    <rect x="712" y="96" width="436" height="520" rx="18" fill="#08070a"/>
    <rect x="720" y="104" width="420" height="504" rx="14" fill="url(#scGlass)" stroke="#ff4a2b" stroke-opacity=".55" stroke-width="1.5"/>
    <rect x="732" y="116" width="396" height="480" rx="10" fill="none" stroke="#ece5d8" stroke-opacity=".07"/>
    <path d="M740 130 Q760 112 800 118" fill="none" stroke="#ece5d8" stroke-opacity=".18" stroke-width="2" stroke-linecap="round"/>
    <!-- tik jam di bingkai -->
    <g stroke="#ece5d8" stroke-opacity=".28" stroke-width="2" stroke-linecap="round">
      <path d="M930 104v8M930 600v8M720 356h8M1132 356h8"/>
    </g>
    <!-- pantulan api -->
    <ellipse class="sc-refl" cx="790" cy="560" rx="60" ry="26" fill="#ff4a2b" fill-opacity=".10" filter="url(#scBlur)"/>
  </g>

  <!-- lilin: obor terbalik pada tiang -->
  <g class="sc-torch">
    <path d="M232 690 L268 690 L262 676 L238 676 Z" fill="url(#scStone)"/>
    <rect x="246" y="440" width="8" height="240" rx="3" fill="#17141a"/>
    <path d="M250 440 L222 452 L222 462 L250 452 Z" fill="#17141a"/>
    <g class="sc-torchhead">
      <rect x="244" y="322" width="12" height="118" rx="5" fill="#17141a"/>
      <circle cx="250" cy="318" r="8" fill="#17141a"/>
      <rect x="240" y="352" width="20" height="6" rx="3" fill="#ece5d8"/><rect x="240" y="404" width="20" height="6" rx="3" fill="#ece5d8"/>
      <path d="M236 440 L264 440 L272 468 L228 468 Z" fill="#1d1a22"/>
      <ellipse cx="250" cy="468" rx="22" ry="4" fill="#ece5d8"/>
      <g class="sc-flame">
        <ellipse class="sc-flameglow" cx="250" cy="502" rx="42" ry="46" fill="url(#scFlame)" fill-opacity=".55" filter="url(#scSoft)"/>
        <path class="sc-flamebody" d="M250 470 C266 486 268 506 250 530 C232 506 234 486 250 470 Z" fill="url(#scFlame)"/>
        <path class="sc-flamecore" d="M250 480 C258 490 258 502 250 514 C242 502 242 490 250 480 Z" fill="#ffd6aa" fill-opacity=".85"/>
      </g>
    </g>
  </g>

  <!-- bara -->
  <g class="sc-embers" fill="#ff8a3d">${embers}</g>

  <!-- sosok: jubah, kerudung, lengan -->
  <g class="sc-figure">
    <g class="sc-body">
      <path d="M362 476 C366 380 418 300 486 296 C554 300 606 380 610 476 Z" fill="url(#scRobe)"/>
      <path d="M486 330 C482 380 480 430 484 476" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="3"/>
      <path d="M416 476 C424 410 438 368 462 334" fill="none" stroke="#ece5d8" stroke-opacity=".06" stroke-width="2"/>
      <path d="M556 476 C548 410 534 368 510 334" fill="none" stroke="#ece5d8" stroke-opacity=".06" stroke-width="2"/>
      <!-- mantel bahu -->
      <path class="sc-mantle" d="M398 318 C420 300 452 292 486 292 C520 292 552 300 574 318 C566 336 548 348 528 356 C514 348 500 344 486 344 C472 344 458 348 444 356 C424 348 406 336 398 318 Z" fill="url(#scHood)"/>
      <path d="M398 318 C420 300 452 292 486 292 C520 292 552 300 574 318" fill="none" stroke="#ece5d8" stroke-opacity=".16" stroke-width="1.5"/>
      <!-- gesper Θ -->
      <circle cx="486" cy="338" r="9" fill="none" stroke="#ece5d8" stroke-opacity=".9" stroke-width="2.2"/><path d="M480 338h12" stroke="#ece5d8" stroke-opacity=".9" stroke-width="2.4" stroke-linecap="round"/>
      <!-- lengan kiri (istirahat di halaman kiri) -->
      <g class="sc-arm-l">
        <path d="M418 322 C392 350 386 388 396 418 L426 424 C424 392 436 360 452 340 Z" fill="url(#scRobe)"/>
        <path d="M396 418 C402 428 420 430 428 426 L440 416 C432 412 412 408 396 418 Z" fill="#ece5d8"/>
      </g>
      <!-- lengan kanan (pena) -->
      <g class="sc-arm-r">
        <path d="M542 322 C574 344 588 372 584 404 L556 414 C554 384 540 362 516 344 Z" fill="url(#scRobe)"/>
        <g class="sc-hand-r">
          <path d="M556 414 C566 420 576 418 582 410 L574 398 C566 400 558 404 556 414 Z" fill="#ece5d8"/>
          <g class="sc-quill">
            <path d="M576 404 L600 352" stroke="#ece5d8" stroke-width="2.4" stroke-linecap="round"/>
            <path d="M598 356 C606 340 620 330 630 318 C618 338 612 350 604 362 Z" fill="#a79f93"/>
            <path d="M576 404 L570 412" stroke="#ff4a2b" stroke-width="2" stroke-linecap="round"/>
          </g>
        </g>
      </g>
    </g>
    <g class="sc-head">
      <path class="sc-hood" d="M486 132 C446 150 412 200 404 262 C398 300 412 328 430 340 C452 322 470 300 486 292 C502 300 520 322 542 340 C560 328 574 300 568 262 C560 200 526 150 486 132 Z" fill="url(#scHood)"/>
      <path d="M430 340 C452 322 470 300 486 292 C502 300 520 322 542 340" fill="none" stroke="#ece5d8" stroke-opacity=".28" stroke-width="2"/>
      <path class="sc-face" d="M486 176 C458 190 444 226 448 262 C452 290 468 306 486 314 C504 306 520 290 524 262 C528 226 514 190 486 176 Z" fill="#050408"/>
      <g class="sc-eyes">
        <ellipse cx="472" cy="262" rx="5.5" ry="3.2" fill="#ff8a3d"/><ellipse cx="500" cy="262" rx="5.5" ry="3.2" fill="#ff8a3d"/>
        <ellipse cx="472" cy="262" rx="12" ry="8" fill="#ff4a2b" fill-opacity=".35" filter="url(#scSoft)"/><ellipse cx="500" cy="262" rx="12" ry="8" fill="#ff4a2b" fill-opacity=".35" filter="url(#scSoft)"/>
      </g>
    </g>
  </g>

  <!-- lektern & buku (di depan sosok) -->
  <g class="sc-lectern">
    <rect x="428" y="486" width="112" height="196" rx="4" fill="url(#scStone)"/>
    <path d="M428 486 L540 486 L540 500 L428 500 Z" fill="#0d0b10"/>
    <path d="M404 682 L564 682 L570 696 L398 696 Z" fill="#1a1720"/><path d="M398 696 L570 696 L570 702 L398 702 Z" fill="#0d0b10"/>
    <g stroke="#ece5d8" stroke-opacity=".14" stroke-width="1.5" fill="none" stroke-linecap="round">
      <path d="M444 520 v140M524 520 v140"/>
      <circle cx="484" cy="590" r="16"/><path d="M474 590h20"/>
    </g>
    <path d="M318 432 L614 432 L648 476 L292 476 Z" fill="url(#scSlab)"/>
    <path d="M292 476 L648 476 L648 488 L292 488 Z" fill="#0f0d12"/>
    <g stroke="#ece5d8" stroke-opacity=".32" stroke-width="1.5" stroke-linecap="round">
      <path d="M330 482v-4M366 482v-4M402 482v-4M438 482v-4M474 482v-4M510 482v-4M546 482v-4M582 482v-4M618 482v-4"/>
    </g>
    <g class="sc-book">
      <path class="sc-cover" d="M338 418 L470 404 L602 418 L606 428 L470 416 L334 428 Z" fill="#2a1416"/>
      <g class="sc-pages">
        <path d="M346 416 L470 404 L470 432 L352 442 Z" fill="url(#scPage)"/>
        <path d="M594 416 L470 404 L470 432 L588 442 Z" fill="url(#scPage)"/>
        <g class="sc-ink" stroke="#5a5048" stroke-width="1.4" stroke-linecap="round">
          <path d="M364 419 L452 411M368 424 L440 417M372 429 L456 421M376 434 L430 429"/>
          <path d="M488 411 L576 419M488 417 L556 423M488 423 L572 431"/>
          <path class="sc-newline" d="M488 429 L540 434" stroke="#ff4a2b" stroke-opacity="0"/>
        </g>
        <path class="sc-pageturn" d="M470 404 L594 416 L588 442 L470 432 Z" fill="#c9c0b1" opacity="0"/>
      </g>
      <path class="sc-closed" d="M338 418 L470 404 L602 418 L602 426 L470 412 L338 426 Z" fill="#2a1416" opacity="0"/>
    </g>
  </g>

  <!-- area sentuh (transparan) + lapisan riak -->
  <g class="sc-ripples"></g>
  <g class="hits" fill="transparent" style="pointer-events:all">
    <path data-hit="figure" d="M396 128 L580 128 L624 486 L352 486 Z"/>
    <rect data-hit="book" x="326" y="392" width="290" height="56"/>
    <rect data-hit="torch" x="196" y="296" width="110" height="260"/>
    <rect data-hit="mirror" x="712" y="96" width="436" height="520" rx="18"/>
  </g>
</svg>`;
  const svg = host.querySelector("svg");
  // layar sempit: crop ke sosok + lilin (cermin disembunyikan lewat CSS, feed dirender di bawah)
  const mq = matchMedia("(max-width:640px)");
  const fit = () => { const narrow = mq.matches; svg.setAttribute("viewBox", narrow ? "150 90 600 620" : "0 0 1200 720"); host.classList.toggle("narrow", narrow); };
  fit(); addEventListener("resize", fit);
  // ── mata mengikuti kursor/jari; sentuhan pada bagian tubuh ──
  const eyes = host.querySelector(".sc-eyes"), pt = () => svg.createSVGPoint();
  const toSvg = e => { const p = pt(); p.x = e.clientX; p.y = e.clientY; try { return p.matrixTransform(svg.getScreenCTM().inverse()); } catch { return null; } };
  let eyeT = 0;
  const lookAt = e => { if (reduce) return; const p = toSvg(e); if (!p) return; const cx = 486, cy = 262, dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 240) * 4.5;
    eyes.setAttribute("transform", `translate(${(dx / d * k).toFixed(2)} ${(dy / d * k * .7).toFixed(2)})`); clearTimeout(eyeT); eyeT = setTimeout(() => eyes.removeAttribute("transform"), 1800); };
  host.addEventListener("pointermove", lookAt, { passive: true });
  host.addEventListener("pointerdown", lookAt, { passive: true });
  const ripple = e => { const p = toSvg(e); if (!p) return; const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", "8"); c.setAttribute("class", "sc-ripple"); host.querySelector(".sc-ripples").appendChild(c); setTimeout(() => c.remove(), 800); };
  host.querySelector(".hits").addEventListener("pointerup", e => { const hit = e.target.dataset.hit; if (!hit) return;
    if (hit === "figure") { oneshot("look", 900); oneshot("bright", 1400); }
    else if (hit === "book") oneshot("pageturn", 1200);
    else if (hit === "torch") oneshot("flare", 700);
    else if (hit === "mirror") ripple(e); });
  const oneshot = (cls, ms) => { if (reduce) return; svg.classList.remove(cls); void svg.getBBox(); svg.classList.add(cls); setTimeout(() => svg.classList.remove(cls), ms); };
  let state = "idle";
  const set = s => { state = s; svg.classList.remove("dormant", "sealed", "rebirth"); if (s !== "idle" && s !== "burning") svg.classList.add(s === "evaluating" ? "sealed" : s); };
  const write = () => { oneshot("writing", 1300); const nl = svg.querySelector(".sc-newline"); if (nl) { nl.setAttribute("stroke-opacity", "1"); setTimeout(() => nl.setAttribute("stroke-opacity", "0"), 2600); } };
  const react = (kind, verified) => {
    if (svg.classList.contains("dormant") || svg.classList.contains("sealed")) return;
    if (kind === "offer") { write(); setTimeout(() => oneshot(verified === "verified" ? "nod" : "look", 900), 1300); }
    else if (kind === "reject") oneshot("shake", 1000);
    else if (kind === "fee" || kind === "trade" || kind === "creator") write();
    else if (kind === "mint") oneshot("nod", 900);
  };
  if (!reduce) setInterval(() => { if (state === "idle" || state === "burning") oneshot("pageturn", 1200); }, 21000);
  return { set, react, write };
})();
