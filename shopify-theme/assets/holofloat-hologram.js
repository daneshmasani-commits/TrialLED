(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById("holo")) return;
  /* ---------- Hologram preview ---------- */
  var canvas = document.getElementById("holo"), ctx = canvas.getContext("2d");
  var N = 1100, W = 0, H = 0, dpr = 1;
  var cur = [], target = [];
  var rnd = Math.random;

  function snowflake() {
    var p = [];
    for (var i = 0; i < N; i++) {
      var arm = Math.floor(rnd() * 6), a = arm * Math.PI / 3, x, y;
      if (rnd() < 0.62) { var r = rnd() * 0.95; x = Math.cos(a) * r; y = Math.sin(a) * r; }
      else {
        var base = [0.35, 0.6, 0.8][Math.floor(rnd() * 3)], len = rnd() * (0.32 - base * 0.18), side = rnd() < 0.5 ? 1 : -1, b = a + side * Math.PI / 4;
        x = Math.cos(a) * base + Math.cos(b) * len; y = Math.sin(a) * base + Math.sin(b) * len;
      }
      p.push([x, y, (rnd() - 0.5) * 0.1]);
    }
    return p;
  }
  function gift() {
    var p = [], s = 0.5;
    var edges = [];
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { edges.push([[-1, a, b], [1, a, b]], [[a, -1, b], [a, 1, b]], [[a, b, -1], [a, b, 1]]); }); });
    for (var i = 0; i < N; i++) {
      var t = rnd(), q;
      if (i < N * 0.55) { var e = edges[i % 12]; q = [0, 1, 2].map(function (k) { return (e[0][k] + (e[1][k] - e[0][k]) * t) * s; }); q[1] += 0.12; }
      else if (i < N * 0.8) {
        var u = rnd() * 4, c = (u % 1) * 2 - 1;  // ribbon around the box
        q = u < 1 ? [0, c, 1] : u < 2 ? [0, c, -1] : u < 3 ? [1, c, 0] : [-1, c, 0];
        if (u < 2 && rnd() < 0.5) q = [c, 1, 0];
        q = q.map(function (v) { return v * s; }); q[1] += 0.12;
      } else {
        var th = rnd() * Math.PI * 2, side = rnd() < 0.5 ? 1 : -1;  // bow loops
        q = [side * (0.18 + Math.cos(th) * 0.16), -s + 0.12 - 0.14 - Math.sin(th) * 0.12, 0];
      }
      p.push(q);
    }
    return p;
  }
  function fromText(str, font) {
    var oc = document.createElement("canvas"), w = 420, h = 160; oc.width = w; oc.height = h;
    var o = oc.getContext("2d"); o.fillStyle = "#fff"; o.textAlign = "center"; o.textBaseline = "middle"; o.font = font;
    var lines = str.split("\n");
    lines.forEach(function (l, i) { o.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 62); });
    var d = o.getImageData(0, 0, w, h).data, hits = [];
    for (var y = 0; y < h; y += 2) for (var x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 128) hits.push([x, y]);
    var p = [];
    for (var i = 0; i < N; i++) { var hp = hits[Math.floor(rnd() * hits.length)] || [w / 2, h / 2]; p.push([(hp[0] - w / 2) / (w / 2) * 0.95, (hp[1] - h / 2) / (w / 2) * 0.95, (rnd() - 0.5) * 0.08]); }
    return p;
  }
  function ghost() {
    var p = [];
    for (var i = 0; i < N; i++) {
      var t = rnd() * Math.PI * 2, x, y;
      if (i < N * 0.15) {  // eyes
        var ex = i % 2 ? 0.17 : -0.17, r = Math.sqrt(rnd()) * 0.08; x = ex + Math.cos(t) * r; y = -0.2 + Math.sin(t) * r * 1.4;
      } else if (rnd() < 0.55) {  // head outline
        var a = Math.PI + rnd() * Math.PI; x = Math.cos(a) * 0.5; y = -0.1 + Math.sin(a) * 0.55;
      } else if (rnd() < 0.6) {  // sides
        x = (rnd() < 0.5 ? -0.5 : 0.5); y = -0.1 + rnd() * 0.6;
      } else {  // wavy hem
        x = -0.5 + rnd(); y = 0.5 + Math.sin((x + 0.5) * Math.PI * 4) * 0.07;
      }
      p.push([x, y, (rnd() - 0.5) * 0.12]);
    }
    return p;
  }
  var SCENES = {
    snowflake: { make: snowflake, name: "Snowflake", hue: 188 },
    gift: { make: gift, name: "Gift box", hue: 350 },
    logo: { make: function () { return fromText("YOUR\nLOGO", "800 64px Unbounded, Arial Black, sans-serif"); }, name: "Your logo", hue: 188 },
    ghost: { make: ghost, name: "Ghost", hue: 160 }
  };
  var hue = 188;

  function setScene(key) {
    target = SCENES[key].make(); hue = SCENES[key].hue;
    if (!cur.length) cur = target.map(function (v) { return v.slice(); });
    document.getElementById("stage-tag").textContent = "Live preview · " + SCENES[key].name;
    document.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.scene === key)); });
  }
  document.querySelectorAll(".chip").forEach(function (c) { c.addEventListener("click", function () { setScene(c.dataset.scene); }); });

  function resize() {
    var r = canvas.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width = Math.max(1, Math.round(r.width * dpr)); H = canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.fillStyle = "#06070c"; ctx.fillRect(0, 0, W, H);
  }
  window.addEventListener("resize", resize);

  var rot = 0, blade = 0;
  function frame() {
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.4;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(6,7,12,0.32)"; ctx.fillRect(0, 0, W, H);

    // fan: motor hub and faint blade blur
    ctx.strokeStyle = "rgba(124,244,255,0.06)"; ctx.lineWidth = 1 * dpr;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2); ctx.stroke();
    if (!reduce) {
      for (var k = 0; k < 4; k++) {
        var a = blade + k * Math.PI / 2;
        ctx.strokeStyle = "rgba(160,190,220,0.05)"; ctx.lineWidth = 3 * dpr;
        ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * R * 1.1, cy - Math.sin(a) * R * 1.1); ctx.lineTo(cx + Math.cos(a) * R * 1.1, cy + Math.sin(a) * R * 1.1); ctx.stroke();
      }
      blade += 0.37;
    }
    ctx.fillStyle = "#1a2030"; ctx.beginPath(); ctx.arc(cx, cy, 6 * dpr, 0, Math.PI * 2); ctx.fill();

    // points
    rot += reduce ? 0.003 : 0.012;
    var cs = Math.cos(rot), sn = Math.sin(rot), tilt = 0.18;
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < cur.length; i++) {
      var c = cur[i], t = target[i];
      c[0] += (t[0] - c[0]) * 0.07; c[1] += (t[1] - c[1]) * 0.07; c[2] += (t[2] - c[2]) * 0.07;
      var x = c[0] * cs - c[2] * sn, z = c[0] * sn + c[2] * cs, y = c[1];
      var y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      var s = 1.6 / (2.2 - z2), px = cx + x * R * s, py = cy + y2 * R * s;
      var flick = 0.55 + 0.45 * Math.sin(i * 12.9898 + rot * 40);
      ctx.fillStyle = "hsla(" + (hue + y * 30) + ",100%," + (60 + z2 * 20) + "%," + (0.55 * flick) + ")";
      var size = (1.3 + s) * dpr;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }
    requestAnimationFrame(frame);
  }

  resize(); setScene("snowflake");
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (document.querySelector('.chip[data-scene="logo"]').getAttribute("aria-pressed") === "true") setScene("logo"); });
  requestAnimationFrame(frame);
})();
