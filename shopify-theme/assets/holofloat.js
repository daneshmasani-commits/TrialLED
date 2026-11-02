(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cfg = window.HoloFloat || {};
  var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || "/";
  var money = function (cents) {
    var n = (cents / 100).toFixed(2);
    return (cfg.moneyFormat || "£{{amount}}").replace(/\{\{\s*\w+\s*\}\}/, n);
  };
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Announcement ---------- */
  var at = $("announce-text");
  if (at && !reduce && cfg.announcements && cfg.announcements.length > 1) {
    var mi = 0;
    setInterval(function () {
      at.style.opacity = 0;
      setTimeout(function () { mi = (mi + 1) % cfg.announcements.length; at.textContent = cfg.announcements[mi]; at.style.opacity = 1; }, 400);
    }, 4000);
  }

  /* ---------- Delivery dates ---------- */
  function addWorkingDays(d, n) { var r = new Date(d); while (n > 0) { r.setDate(r.getDate() + 1); var w = r.getDay(); if (w !== 0 && w !== 6) n--; } return r; }
  function addDays(d, n) { var r = new Date(d); r.setDate(r.getDate() + n); return r; }
  var fmt = function (d) { return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); };
  var today = new Date();
  if ($("d-order")) {
    var dl = document.querySelector(".timeline");
    var ship = Number(dl.dataset.ship || 2), dmin = Number(dl.dataset.min || 7), dmax = Number(dl.dataset.max || 12);
    $("d-order").textContent = fmt(today);
    $("d-ship").textContent = fmt(addWorkingDays(today, ship));
    $("d-deliver").textContent = fmt(addDays(today, dmin)) + " – " + fmt(addDays(today, dmax));
  }

  /* ---------- Product form ---------- */
  var form = $("product-form");
  var product = null;
  if (form) {
    product = JSON.parse($("product-json").textContent);
    var bundleIdx = Number(form.dataset.bundleIndex), plugIdx = Number(form.dataset.plugIndex);
    var selected = function (name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; };
    var current = function () {
      var want = [];
      if (bundleIdx >= 0) want[bundleIdx] = selected("bundle");
      if (plugIdx >= 0) want[plugIdx] = selected("plug");
      return product.variants.find(function (v) {
        return v.options.every(function (o, i) { return want[i] === undefined || want[i] === o; });
      }) || product.variants[0];
    };
    var render = function () {
      var v = current();
      $("price-now").textContent = money(v.price);
      var was = $("price-was"), save = $("price-save");
      if (v.compare_at_price && v.compare_at_price > v.price) {
        was.hidden = save.hidden = false;
        was.textContent = money(v.compare_at_price);
        save.textContent = "SAVE " + Math.round((1 - v.price / v.compare_at_price) * 100) + "%";
      } else { was.hidden = save.hidden = true; }
      if ($("plug-name")) $("plug-name").textContent = selected("plug");
      var btn = $("add");
      btn.disabled = !v.available;
      btn.textContent = v.available ? cfg.addLabel || "Add to basket" : "Sold out";
      form.querySelector('[name="id"]').value = v.id;
      if (history.replaceState && form.dataset.updateUrl === "true") {
        var u = new URL(location.href); u.searchParams.set("variant", v.id); history.replaceState(null, "", u);
      }
    };
    form.querySelectorAll('input[name="bundle"], input[name="plug"]').forEach(function (el) { el.addEventListener("change", render); });
    render();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("add"), err = $("add-error");
      btn.disabled = true; err.hidden = true;
      var items = [{ id: Number(form.querySelector('[name="id"]').value), quantity: 1 }];
      post("cart/add.js", { items: items })
        .then(function () { return refreshCart(); })
        .then(openCart)
        .catch(function (x) { err.textContent = (x && x.description) || "Sorry, that couldn't be added. Please try again."; err.hidden = false; })
        .then(function () { btn.disabled = false; render(); });
    });
  }

  /* ---------- Basket (Shopify AJAX Cart API) ---------- */
  var drawer = $("drawer"), scrim = $("scrim");
  var prot = cfg.protection; // { variantId, title, price } or null
  var lastFocus = null;
  function post(path, body) {
    return fetch(root + path, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); });
  }
  function openCart() { lastFocus = document.activeElement; drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); scrim.hidden = false; $("close-cart").focus(); }
  function closeCart() { if (!drawer.classList.contains("open")) return; drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); scrim.hidden = true; if (lastFocus) lastFocus.focus(); }

  function refreshCart() {
    return fetch(root + "cart.js", { headers: { Accept: "application/json" } }).then(function (r) { return r.json(); }).then(renderCart);
  }
  function renderCart(cart) {
    var body = $("cart-body");
    body.innerHTML = "";
    var mainItems = cart.items.filter(function (it) { return !prot || it.variant_id !== prot.variantId; });
    var hasProt = prot && cart.items.some(function (it) { return it.variant_id === prot.variantId; });
    if (!mainItems.length) {
      var p = document.createElement("p"); p.className = "empty"; p.textContent = "Your basket is empty."; body.appendChild(p);
      // Never leave delivery protection on its own in the basket.
      if (hasProt) { post("cart/change.js", { id: String(prot.variantId), quantity: 0 }).then(renderCart); return; }
    }
    mainItems.forEach(function (item) {
      var row = document.createElement("div"); row.className = "line-item";
      var name = document.createElement("strong");
      name.textContent = item.options_with_values && item.options_with_values.length && item.options_with_values[0].name !== "Title" ? item.options_with_values[0].value : item.product_title;
      var price = document.createElement("span"); price.textContent = money(item.final_line_price);
      var meta = document.createElement("small");
      var rest = (item.options_with_values || []).slice(1).map(function (o) { return o.value; });
      meta.textContent = [item.product_type || item.product_title].concat(rest).join(" · ") + (item.quantity > 1 ? " · Qty " + item.quantity : "");
      var rm = document.createElement("button"); rm.type = "button"; rm.className = "remove"; rm.textContent = "Remove";
      rm.addEventListener("click", function () { rm.disabled = true; post("cart/change.js", { id: item.key, quantity: 0 }).then(renderCart); });
      row.append(name, price, meta, rm); body.appendChild(row);
    });
    if (mainItems.length && prot) {
      var lab = document.createElement("label"); lab.className = "protect";
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "protection"; cb.checked = hasProt;
      cb.addEventListener("change", function () {
        cb.disabled = true;
        (cb.checked ? post("cart/add.js", { items: [{ id: prot.variantId, quantity: 1 }] }) : post("cart/change.js", { id: String(prot.variantId), quantity: 0 }))
          .then(refreshCart);
      });
      var txt = document.createElement("span");
      var st = document.createElement("strong"); st.textContent = (prot.title || "Delivery protection") + " " + money(prot.price);
      var sm = document.createElement("small"); sm.textContent = prot.blurb || "Free replacement if your parcel is lost, stolen or damaged.";
      txt.append(st, sm); lab.append(cb, txt); body.appendChild(lab);
    }
    $("subtotal").textContent = money(cart.total_price);
    var count = mainItems.reduce(function (n, it) {
      var m = /^(\d+)/.exec(it.options_with_values && it.options_with_values[0] ? it.options_with_values[0].value : "");
      return n + it.quantity * (m ? Number(m[1]) : 1);
    }, 0);
    $("cart-count").textContent = count;
    var co = $("checkout");
    co.setAttribute("aria-disabled", String(!mainItems.length));
    co.tabIndex = mainItems.length ? 0 : -1;
    return cart;
  }
  if (drawer) {
    $("open-cart").addEventListener("click", function () { refreshCart(); openCart(); });
    $("close-cart").addEventListener("click", closeCart);
    scrim.addEventListener("click", closeCart);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeCart(); });
    $("checkout").addEventListener("click", function (e) { if (this.getAttribute("aria-disabled") === "true") e.preventDefault(); });
    refreshCart();
  }
})();
