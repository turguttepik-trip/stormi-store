/* Stormi Store TR — Spatial Showroom
   Duvar → ürün odak (kamera yaklaşır) → kasa tezgâhı → ödeme */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const STORE = "https://stormistoretr.com/";
  const FREE_SHIP = 399;

  const ALL = (window.STORMI_PRODUCTS || []).filter(p => p.img && p.price != null);
  const bySlug = Object.fromEntries(ALL.map(p => [p.slug, p]));

  /* ---------- Duvar koleksiyonları (vitrin) ---------- */
  const WALLS = [
    { id: "cok-satanlar", label: "ÇOK SATANLAR", title: "Çok Satanlar", filter: 1, cat: "Çok Satanlar", slugs: [
      "rengarenk-boyun-ipi-telefon-askisi", "van-gogh-yildizli-geceler-boyun-ipi-telefon-askisi",
      "penguenler-boyun-ipi-telefon-askisi", "ataturk-imzali-boyun-ipi-telefon-askisi",
      "marti-boyun-ipi-telefon-askisi", "edi-desenli-boyun-ipi-ve-telefon-askisi",
      "cicek-desenli-boyun-ipi-telefon-askisi"] },
    { id: "boyun-ipleri", label: "BOYUN İPLERİ", title: "Boyun İpleri", filter: 4, cat: "Boyun İpleri", slugs: [
      "kalpli-nazar-boncugu-desenli-boyun-ipi-yaka-karti-askisi-telefon-aski-ipi", "flamingo-boyun-ipi",
      "beyaz-pembe-fiyonk-desenli-boyun-ipi-yaka-karti-askisi-telefon-askisi-hemsire-doktor-kart-aski-ipi",
      "tasarim-van-gogh-yildizli-geceler-boyun-ipi-yaka-karti-askisi-telefon-askisi-kimlik-karti-ipi",
      "saglik-temali-boyun-ipi-uv-baskili-kartlik-hemsire-doktor-yaka-karti-seti",
      "galaksi-takim-yildizi-yatay-siyah-kartlik-boyun-ipi-telefon-askisi",
      "uzay-galaksi-limited-boyun-ipi-telefon-askisi-lanyard"] },
    { id: "setler", label: "SETLER", title: "Setler", filter: 2, cat: "SETLER", slugs: [
      "uzay-galaksi-limited-4-lu-set-boyun-ipi-anahtarlik-yoyo-yaka-kartligi",
      "rengarenk-4-lu-set-boyun-ipi-anahtarlik-yoyo-yaka-kartligi",
      "pembe-3-lu-fiyonk-desenli-cekmeli-yoyo-kartlik-boyun-aski-ipi-dikey-kartlik-seti",
      "yildizli-badem-agaci-4-lu-set-boyun-ipi-anahtarlik-yoyo-yaka-kartligi",
      "cicek-desenli-4-lu-set-boyun-ipi-anahtarlik-yoyo-kartlik",
      "visne-fiyonk-desenli-2-li-set-cekmeli-yoyo-dikey-yaka-karti-koruyucu"] },
    { id: "yoyo", label: "YOYO & KARTLIK", title: "Yoyo & Kartlık", filter: 3, cat: "Yoyo", slugs: [
      "burun-kedi-damla-yoyo-yaka-karti", "saglik-kahramani-damla-baski-yoyo-yaka-kartligi",
      "mor-floral-uv-baskili-cekmeli-yoyo-ve-dikey-kartlik-set-seffaf-on-yuz-kart-koruyucu",
      "katil-civciv-yoyo-yaka-kartligi-yoyo-ksrtlik",
      "kardiyoloji-boyun-ipi-seti-3lu-cekmeli-damla-yoyo-dikey-baskili-yaka-karti"] },
  ].map(w => ({ ...w, items: w.slugs.map(s => bySlug[s]).filter(p => p && p.cut) }));

  /* ---------- Yardımcılar ---------- */
  const money = n => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
  const upTR = s => s.toLocaleUpperCase("tr-TR");
  const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  const isMobile = () => innerWidth <= 760;

  function shortName(p) {
    const n = p.name.replace(/\s+/g, " ").trim();
    const cuts = [" Boyun", " Yaka", " Damla", " Lanyard", " |", " –", " Telefon", " Çekmeli", " UV"];
    let best = n.length;
    for (const c of cuts) { const i = n.indexOf(c); if (i >= 5 && i < best) best = i; }
    let s = n.slice(0, best).replace(/[\s,]+$/, "").replace(/ Desenli$/, "");
    const d = s.indexOf(" Desenli");
    if (s.length > 26 && d >= 5) s = s.slice(0, d);
    if (s.length < 7) s = n.split(" ").slice(0, 3).join(" "); // "Kedi" → "Kedi Desenli Boyun"
    return s;
  }
  // \b Türkçe harflerde (ü, ı) çalışmadığı için kendi sınırımız
  const PIECES = /(\d+)\s?['’]?\s?(lü|li|lı|lu)(?![a-zçğıöşü])/;
  function typeOf(p) {
    const n = p.name.toLocaleLowerCase("tr-TR");
    if (/kart kab|kart kılıf|kart koruyucu/.test(n) && !/boyun|yoyo/.test(n)) return "Kartlık";
    if (/\bset\b|seti/.test(n) || PIECES.test(n)) return "Set";
    if (n.includes("yoyo")) return "Yoyo yaka kartlığı";
    return "Boyun ipi";
  }
  function specs(p) {
    const n = p.name.toLocaleLowerCase("tr-TR");
    const rows = [["TÜR", typeOf(p)]];
    const m = n.match(PIECES) || n.match(/(\d+)\s?adet/);
    rows.push(["İÇERİK", m ? `${m[1]} parça` : "1 adet"]);
    if (/boyun|lanyard/.test(n)) rows.push(["KUMAŞ", "%100 saten dokuma"]);
    if (/uv bask/.test(n)) rows.push(["BASKI", "UV baskı"]);
    rows.push(["KARGO", "Aynı gün"], ["İADE", "14 gün koşulsuz"]);
    return rows;
  }
  function catLabel(p) {
    const c = (p.cats || []).find(x => x !== "Çok Satanlar") || p.cats?.[0] || "Stormi";
    return upTR(c);
  }

  /* ---------- Durum ---------- */
  const state = { mode: "wall", wall: 0, focus: -1, modal: null, scale: 1 };
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem("stormi-cart") || "[]").filter(l => bySlug[l.slug]); } catch { cart = []; }
  const saveCart = () => localStorage.setItem("stormi-cart", JSON.stringify(cart));

  const world = $("#world"), rack = $("#rack"), card = $("#card");

  /* ---------- Kamera ---------- */
  // x,y: dünya koordinatının (0,0) noktasının ekrandaki yeri. Dünya, kenarlarda boşluk kalmasın diye ekrandan geniştir.
  function setCam(x, y, s) {
    state.scale = s;
    world.style.transform = `translate3d(${x - world.offsetLeft}px,${y}px,0) scale(${s})`;
  }
  const centerX = s => innerWidth / 2 - (world.offsetWidth / 2) * s;
  function worldBox(el) {
    const r = el.getBoundingClientRect(), w = world.getBoundingClientRect(), s = state.scale;
    return { x: (r.left - w.left) / s, y: (r.top - w.top) / s, w: r.width / s, h: r.height / s };
  }
  function camWall() { setCam(centerX(1), 0, 1); }
  function camCounter() {
    const c = $("#counter"), shop = c.parentElement;
    const bottom = shop.offsetTop + c.offsetTop + c.offsetHeight;
    // sağda (mobilde altta) sepet paneli açık olduğu için tezgâh sola / yukarı kaydırılır
    const mob = isMobile();
    const s = mob ? 0.62 : 0.78;
    const shiftX = mob ? 0 : -Math.min(230, innerWidth * 0.16);
    setCam(centerX(s) + shiftX, innerHeight * (mob ? 0.44 : 0.94) - bottom * s, s);
  }
  function camFocus(el) {
    const b = worldBox(el);
    let s, tx, ty;
    if (isMobile()) {
      s = Math.min(2.2, (innerHeight * 0.26) / b.h, (innerWidth * 0.7) / b.w);
      tx = innerWidth * 0.5; ty = innerHeight * 0.32;
    } else {
      s = Math.min(1.9, (innerHeight * 0.62) / b.h, (innerWidth * 0.36) / b.w);
      tx = innerWidth * 0.33; ty = innerHeight * 0.57;
    }
    setCam(tx - (b.x + b.w / 2) * s, ty - (b.y + b.h / 2) * s, s);
    return { x: tx, y: ty }; // ürünün kamera hareketinden sonraki ekran konumu
  }

  /* ---------- Mod ---------- */
  function setMode(m) {
    state.mode = m;
    document.body.classList.remove("mode-wall", "mode-focus", "mode-counter", "mode-checkout", "mode-archive");
    document.body.classList.add("mode-" + m);
    const hints = {
      wall: "Bir ürüne tıkla · aşağı kaydır: kasa",
      focus: "← → ürünler arasında gez · ESC geri",
      counter: "Ekrandan adetleri düzenle",
      checkout: "Güvenli ödeme",
    };
    $("#hint").textContent = hints[m] || "";
  }

  /* ---------- Duvarı çiz ---------- */
  // her sekmede: küçük ürün görseli + ad + o koleksiyondaki toplam model sayısı
  const wallCount = w => ALL.filter(FILTERS[w.filter].test).length;
  function renderCollections() {
    const inArchive = state.mode === "archive";
    const nav = $("#collections");
    const first = !nav.children.length;
    nav.innerHTML = WALLS.map((w, i) => `<button data-wall="${i}" class="tab ${i === state.wall && !inArchive ? "on" : ""}" style="--i:${i}">
        <span class="tab-th"><img src="${w.items[0].cut}" alt=""></span>
        <span class="tab-tx"><b>${w.title}</b><small>${wallCount(w)} model</small></span></button>`).join("")
      + `<button data-action="catalog" class="tab tab-all ${inArchive ? "on" : ""}" style="--i:${WALLS.length}">
        <span class="tab-th grid"><i></i><i></i><i></i><i></i></span>
        <span class="tab-tx"><b>Tüm Ürünler</b><small>${ALL.length} model</small></span><span class="tab-arrow">→</span></button>`;
    nav.classList.toggle("intro", first);
    // vitrin altındaki "tümünü gör" butonu
    const w = WALLS[state.wall];
    $("#seeAll").innerHTML = `${w.title} koleksiyonunun tümünü gör <b>${wallCount(w)} model</b> <span>→</span>`;
  }
  function itemHTML(p, i) {
    const r = p.ratio || 1.4;
    const base = isMobile() ? 30 : 42; // vh
    const h = base * Math.max(0.68, Math.min(1, r / 1.45));
    const hs = hash(p.slug);
    return `<button class="item enter${typeOf(p) === "Set" ? " is-set" : ""}" data-i="${i}" style="--h:${h.toFixed(1)}vh;--d:${120 + i * 85}ms;--sw:${(5.2 + (Math.abs(hs) % 30) / 10).toFixed(1)}s;--sd:-${Math.abs(hs) % 5}s;${hangVars(p)}"
      aria-label="${p.name}, ${money(p.price)}">
      <span class="peg"></span>
      <span class="hang"><img src="${p.cut}" alt="${p.name}" draggable="false"></span>
      <span class="tag">${money(p.price)}</span>
    </button>`;
  }
  function wallItems() {
    const items = WALLS[state.wall].items;
    return isMobile() ? items.slice(0, 4) : items;
  }
  function renderWall(animateOut = true) {
    const draw = () => {
      const list = wallItems();
      rack.style.setProperty("--n", list.length);
      rack.innerHTML = list.map(itemHTML).join("");
      setTimeout(() => $$(".item", rack).forEach(el => el.classList.remove("enter")), 1800);
    };
    const old = $$(".item", rack);
    if (animateOut && old.length) {
      old.forEach((el, i) => { el.style.setProperty("--d", `${i * 40}ms`); el.classList.remove("enter"); el.classList.add("leave"); });
      setTimeout(draw, 420 + old.length * 40);
    } else draw();
    renderCollections();
  }
  function switchWall(i, then) {
    if (i === state.wall) { then && then(); return; }
    unfocus(false);
    state.wall = i;
    renderWall(true);
    if (then) setTimeout(then, 1300);
  }

  /* ---------- Ürün odak ---------- */
  function fillCard(p) {
    $("#cardEyebrow").textContent = `${catLabel(p)} · STORMİ STORE TR`;
    $("#cardTitle").textContent = upTR(shortName(p));
    $("#cardSub").textContent = p.name;
    $("#cardSpecs").innerHTML = specs(p).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
    $("#cardPrice").innerHTML = p.discount && p.discount < p.price
      ? `<s>${money(p.price)}</s>${money(p.discount)}` : money(p.price);
    $("#cardLink").href = STORE + p.slug;
    $("#cardMedia").innerHTML = `<img src="${p.cut || p.img}" alt="${p.name}">`;
    $("#cardMedia").classList.toggle("is-cut", !!p.cut);
    const add = $("#addBtn"); add.classList.remove("added"); add.textContent = "SEPETE EKLE";
    card.dataset.slug = p.slug;
  }
  function focusItem(i) {
    const items = $$(".item", rack);
    if (!items.length) return;
    i = (i + items.length) % items.length;
    const el = items[i], p = wallItems()[i];
    state.focus = i;
    closeModal(false);
    items.forEach(x => x.classList.toggle("active", x === el));
    setMode("focus");
    const at = camFocus(el);
    fillCard(p);
    // kart, ürünün durduğu yerden büyüyerek açılır (kamera yaklaşırken biraz bekler)
    openCardFrom(at.x, at.y, card.classList.contains("open") ? 0 : 380);
  }

  /* Kartı (x,y) ekran noktasından büyüterek aç — FLIP + Web Animations */
  let lastPt = { x: innerWidth / 2, y: innerHeight / 2 };
  document.addEventListener("pointerdown", e => { lastPt = { x: e.clientX, y: e.clientY }; }, true);
  function openCardFrom(x, y, delay = 0) {
    card.getAnimations().forEach(a => a.cancel());
    card.style.transition = "none";
    card.classList.add("open"); card.setAttribute("aria-hidden", "false");
    const r = card.getBoundingClientRect();
    const m = new DOMMatrix(getComputedStyle(card).transform);
    const s0 = 0.08;
    const dx = x - (r.left + r.width / 2) + (1 - s0) * m.e;
    const dy = y - (r.top + r.height / 2) + (1 - s0) * m.f;
    const anim = card.animate(
      [{ translate: `${dx}px ${dy}px`, scale: s0, opacity: 0, borderRadius: "40px" },
       { translate: `${dx * 0.04}px ${dy * 0.04}px`, scale: 1.02, opacity: 1, offset: 0.75 },
       { translate: "0px 0px", scale: 1, opacity: 1 }],
      { duration: 720, delay, easing: "cubic-bezier(.2,.85,.25,1)", fill: "backwards" });
    const restore = () => { if (!card.getAnimations().some(a => a.playState === "running")) card.style.transition = ""; };
    anim.finished.then(restore, restore);
    // içerik, kart açıldıktan sonra sırayla belirir
    [...card.children].forEach((c, i) => c.animate([{ opacity: 0, translate: "0 8px" }, { opacity: 1, translate: "0 0" }],
      { duration: 380, delay: delay + 330 + i * 40, easing: "ease-out", fill: "backwards" }));
  }
  function unfocus(moveCam = true) {
    state.focus = -1;
    card.getAnimations().forEach(a => a.cancel()); card.style.transition = "";
    card.classList.remove("open"); card.setAttribute("aria-hidden", "true");
    $$(".item.active", rack).forEach(x => x.classList.remove("active"));
    if (moveCam) { camWall(); setMode("wall"); }
  }
  function openModal(p) {
    unfocus(state.mode === "focus");
    state.modal = p.slug;
    card.classList.add("modal");
    fillCard(p);
    $("#veil").classList.add("on");
    openCardFrom(lastPt.x, lastPt.y); // tıklanan noktadan aç
  }
  function closeModal(veil = true) {
    if (!state.modal) return;
    state.modal = null;
    card.classList.remove("open", "modal");
    if (veil) $("#veil").classList.remove("on");
  }
  function openProduct(slug) {
    if (state.mode === "archive") { openModal(bySlug[slug]); return; } // panoda kal, kartı orada aç
    closeCatalog();
    const wi = WALLS.findIndex(w => w.items.some(p => p.slug === slug));
    if (wi >= 0 && state.mode !== "counter") {
      const go = () => { const idx = wallItems().findIndex(p => p.slug === slug); idx >= 0 ? focusItem(idx) : openModal(bySlug[slug]); };
      if (wi === state.wall) go(); else switchWall(wi, go);
    } else openModal(bySlug[slug]);
  }

  /* ---------- Sepet ---------- */
  function addToCart(slug, srcEl) {
    const line = cart.find(l => l.slug === slug);
    line ? line.qty++ : cart.push({ slug, qty: 1 });
    saveCart();
    flyToCart(slug, srcEl);
    renderCart();
    const btn = $("#addBtn");
    btn.classList.add("added"); btn.textContent = "EKLENDİ ✓";
    toast(`${upTR(shortName(bySlug[slug]))} sepete eklendi`, "KASAYA GİT ↓", goCounter);
  }
  function flyToCart(slug, srcEl) {
    const p = bySlug[slug];
    const from = (srcEl || card).getBoundingClientRect();
    const to = $(".cart-btn").getBoundingClientRect();
    const img = document.createElement("img");
    img.src = p.cut || p.img; img.className = "fly";
    const size = Math.min(from.height, 260);
    Object.assign(img.style, { left: from.left + from.width / 2 - size / 2 + "px", top: from.top + from.height / 2 - size / 2 + "px", width: size + "px", height: size + "px" });
    document.body.appendChild(img);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
      img.style.transform = `translate(${dx}px,${dy}px) scale(.08) rotate(25deg)`; img.style.opacity = ".4";
    }));
    setTimeout(() => { img.remove(); const b = $(".cart-btn"); b.classList.add("bump"); setTimeout(() => b.classList.remove("bump"), 350); }, 850);
  }
  const cartQty = () => cart.reduce((a, l) => a + l.qty, 0);
  const cartTotal = () => cart.reduce((a, l) => { const p = bySlug[l.slug]; return a + (p.discount && p.discount < p.price ? p.discount : p.price) * l.qty; }, 0);
  const unitPrice = p => (p.discount && p.discount < p.price ? p.discount : p.price);
  const shipLabel = total => (total >= FREE_SHIP ? "Ücretsiz" : "Ödemede hesaplanır");
  function renderCart() {
    const qty = cartQty(), total = cartTotal();
    $("#cartCount").textContent = qty;
    // tezgâhtaki ekran: büyük, okunur özet
    $("#screenQty").textContent = qty;
    $("#screenTotal").textContent = money(total);
    $("#screenShip").textContent = !qty ? "SEPET BOŞ" : total >= FREE_SHIP ? "KARGO BEDAVA" : `KARGO BEDAVAYA ${money(FREE_SHIP - total)}`;

    // sepet paneli
    $("#bagCount").textContent = qty;
    $("#bag").classList.toggle("empty", !qty);
    $("#bagList").innerHTML = qty
      ? cart.map(l => { const p = bySlug[l.slug]; return `<li data-slug="${l.slug}">
          <button class="bi-img" data-open="${l.slug}" aria-label="${p.name}"><img src="${p.cut || p.img}" alt=""></button>
          <div class="bi-info"><b>${shortName(p)}</b><small>${typeOf(p)} · ${money(unitPrice(p))}</small>
            <div class="step"><button data-dec aria-label="Azalt">−</button><span>${l.qty}</span><button data-inc aria-label="Arttır">+</button></div></div>
          <div class="bi-right"><b>${money(unitPrice(p) * l.qty)}</b><button data-remove>Kaldır</button></div></li>`; }).join("")
      : `<li class="bag-empty"><b>Sepetiniz boş</b><span>Duvardan ya da Tüm Ürünler'den bir model seçin.</span>
          <button class="btn-dark" data-action="home">ALIŞVERİŞE BAŞLA</button></li>`;
    const left = Math.max(0, FREE_SHIP - total);
    $("#shipText").innerHTML = !qty ? "399 TL üzeri siparişlerde <b>kargo bedava</b>"
      : left ? `Kargo bedava için <b>${money(left)}</b> daha ekleyin` : "<b>Kargonuz bedava.</b> Aynı gün kargoda.";
    $("#shipBar").style.width = Math.min(100, (total / FREE_SHIP) * 100) + "%";
    $("#shipMeter").classList.toggle("ok", qty && !left);
    $("#bagSub").textContent = money(total);
    $("#bagShip").textContent = qty ? shipLabel(total) : "—";
    $("#bagTotal").textContent = money(total);
    $("#checkoutBtn").disabled = !qty;

    // tezgâhın üstüne yatırılmış ürünler + adet etiketleri
    const max = isMobile() ? 3 : 6;
    $("#slab").innerHTML = cart.slice(-max).map((l, i, arr) => {
      const p = bySlug[l.slug], hs = hash(l.slug);
      const span = isMobile() ? 40 : 48; // ürünler ekranın soluna eşit aralıkla dizilir (sağda ekran var)
      const x = 8 + (arr.length > 1 ? (i * span) / (arr.length - 1) : span / 2);
      return `<div class="slab-item" style="left:${x}%;--rz:${(hs % 30) - 15}deg">
        <img class="${p.cut ? "" : "boxed"}" src="${p.cut || p.img}" alt="">
        <span class="slab-qty">×${l.qty}</span></div>`;
    }).join("");
  }
  function changeQty(slug, d) {
    const l = cart.find(x => x.slug === slug); if (!l) return;
    l.qty += d; if (l.qty <= 0) cart = cart.filter(x => x !== l);
    saveCart(); renderCart();
    if (state.mode === "checkout") fillCheckout();
  }
  function removeLine(slug) { cart = cart.filter(x => x.slug !== slug); saveCart(); renderCart(); }

  /* ---------- Kasa / ödeme ---------- */
  function goCounter() { closeModal(); unfocus(false); closeCatalog(); closeCheckout(); setMode("counter"); camCounter(); hideToast(); }
  function goHome() { closeModal(); closeCatalog(); closeCheckout(); unfocus(false); setMode("wall"); camWall(); }
  function fillCheckout() {
    const total = cartTotal();
    $("#summary").innerHTML = cart.map(l => { const p = bySlug[l.slug];
      return `<li><span class="ci-img"><img src="${p.cut || p.img}" alt=""><i>${l.qty}</i></span>
        <span class="ci-name">${shortName(p)}<small>${typeOf(p)}</small></span><b>${money(unitPrice(p) * l.qty)}</b></li>`; }).join("");
    $("#coSub").textContent = money(total);
    $("#coShip").textContent = shipLabel(total);
    $("#checkoutTotal").textContent = money(total);
  }
  function openCheckout() {
    if (!cartQty()) return;
    fillCheckout();
    $("#coGrid").hidden = false; $("#done").hidden = true;
    $("#checkout").classList.add("open"); $("#checkout").setAttribute("aria-hidden", "false");
    $("#veil").classList.add("on");
    setMode("checkout");
    setTimeout(() => $("#checkoutForm [name=name]").focus({ preventScroll: true }), 450);
  }
  // alan doğrulama: hata mesajı alanın altında, yazarken düzelir
  const RULES = {
    name: v => v.trim().split(/\s+/).length >= 2 || "Ad ve soyadınızı yazın",
    tel: v => /^0?5\d{9}$/.test(v.replace(/\D/g, "")) || "05xx xxx xx xx biçiminde cep telefonu girin",
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Geçerli bir e-posta girin",
    city: v => v.trim().length >= 2 || "İl girin",
    district: v => v.trim().length >= 2 || "İlçe girin",
    address: v => v.trim().length >= 10 || "Açık adresinizi yazın",
  };
  function checkField(el) {
    const rule = RULES[el.name]; if (!rule) return true;
    const res = rule(el.value), fld = el.closest(".fld");
    fld.classList.toggle("err", res !== true);
    let m = fld.querySelector("em"); if (!m) { m = document.createElement("em"); fld.appendChild(m); }
    m.textContent = res === true ? "" : res;
    return res === true;
  }
  $("#checkoutForm").addEventListener("input", e => {
    if (e.target.name === "tel") { // 0532 123 45 67 biçimine otomatik getir
      const d = e.target.value.replace(/\D/g, "").slice(0, 11);
      e.target.value = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean).join(" ");
    }
    if (e.target.closest(".fld.err")) checkField(e.target);
  });
  $("#checkoutForm").addEventListener("focusout", e => { if (e.target.value) checkField(e.target); });
  function closeCheckout() {
    const c = $("#checkout"); if (!c.classList.contains("open")) return;
    c.classList.remove("open"); c.setAttribute("aria-hidden", "true");
    $("#veil").classList.remove("on");
    if (state.mode === "checkout") setMode("counter");
  }
  $("#checkoutForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
    const bad = [...f.querySelectorAll("input[name]:not([type=checkbox]),textarea")].filter(el => !checkField(el));
    const terms = f.terms; terms.closest(".check").classList.toggle("err", !terms.checked);
    if (bad.length || !terms.checked) { (bad[0] || terms).focus(); return; }
    // DEMO: Form verisi hiçbir yere gönderilmez. Canlıda ikas ödeme adımına yönlendirilecek.
    f.reset();
    cart = []; saveCart(); renderCart();
    $("#coGrid").hidden = true; $("#done").hidden = false;
  });

  /* ---------- Tüm ürünler: askı panosu ---------- */
  const isBest = p => p.cats.includes("Çok Satanlar");
  const SECTIONS = [
    { label: "SETLER", test: p => p.cats.includes("SETLER") || typeOf(p) === "Set" },
    { label: "YOYO & KARTLIK", test: p => p.cats.some(c => /yoyo/i.test(c)) || typeOf(p) === "Yoyo yaka kartlığı" },
    { label: "BOYUN İPLERİ", test: p => p.cats.includes("Boyun İpleri") || typeOf(p) === "Boyun ipi" },
    { label: "AKSESUAR", test: () => true },
  ];
  // her ürün tek bir rafta durur; kartlıklar önce ayrılır, sonra set > yoyo > boyun ipi
  const sectionOf = p => (typeOf(p) === "Kartlık" ? 1 : SECTIONS.findIndex(s => s.test(p))); // kart kapları "Yoyo & Kartlık" rafında
  const FILTERS = [
    { label: "TÜMÜ", test: () => true, grouped: true },
    { label: "ÇOK SATANLAR", test: isBest },
    ...SECTIONS.map((s, i) => ({ label: s.label, test: p => sectionOf(p) === i })),
  ];
  const fold = s => s.toLocaleLowerCase("tr-TR").replace(/[çğıöşü]/g, c => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]);
  let filt = 0, query = "";
  const archive = $("#archive"), scroller = $("#archiveScroll");
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
        { root: scroller, rootMargin: "0px 0px -6% 0px" })
    : null;

  // asılma noktası: görseli kaydırıp (hx,hy) noktasını kancanın ucuna getirir
  function hangVars(p) {
    const hx = p.hang === "tab" ? 0.5 : (p.hx ?? 0.5), hy = p.hang === "tab" ? 0 : (p.hy ?? 0);
    // görsel yerinde kalır, kanca/çivi (hx,hy) noktasına taşınır → ürünler birbirine binmez
    return `--hx:${hx};--hy:${hy}`;
  }
  function pegHTML(p, i) {
    const hs = Math.abs(hash(p.slug));
    const media = p.cut
      ? `<span class="hangbox">${p.hang === "tab" ? `<span class="htab"></span>` : ""}<img class="cut" src="${p.cut}" alt="" loading="lazy" draggable="false"><span class="hook"></span></span>`
      : `<span class="frame"><img src="${p.img}" alt="" loading="lazy" draggable="false"><small>STORMİ STORE TR</small></span>`;
    return `<button class="peg-item hang-${p.hang || "loop"}" data-open="${p.slug}" style="--d:${(i % 6) * 70}ms;${hangVars(p)}" aria-label="${p.name}, ${money(p.price)}">
      <span class="swing">${media}</span>
      ${isBest(p) ? `<span class="sticker">ÇOK SATAN</span>` : ""}
      <span class="ptag"><b>${money(p.price)}</b><small>${shortName(p)}</small></span></button>`;
  }
  function renderCatalog() {
    const q = fold(query.trim());
    const match = p => !q || fold(p.name).includes(q);
    $("#archiveFilters").innerHTML = FILTERS.map((f, i) =>
      `<button data-filter="${i}" class="${i === filt ? "on" : ""}">${f.label}<i>${ALL.filter(p => f.test(p) && match(p)).length}</i></button>`).join("");
    const f = FILTERS[filt];
    const list = ALL.filter(p => f.test(p) && match(p));
    $("#archiveCount").textContent = `${list.length} ÜRÜN`;
    const groups = f.grouped
      ? SECTIONS.map((s, i) => ({ label: s.label, items: list.filter(p => sectionOf(p) === i) }))
      : [{ label: f.label, items: list }];
    const html = groups.filter(g => g.items.length).map(g =>
      `<section class="rack-section"><div class="plaque">${g.label} <b>${g.items.length}</b></div>
        <div class="pegs">${g.items.map(pegHTML).join("")}</div></section>`).join("");
    $("#archiveBody").innerHTML = html || `<div class="archive-empty">“${query}” İÇİN ÜRÜN BULUNAMADI<br>BAŞKA BİR DESEN DENE</div>`;
    $$(".peg-item", archive).forEach(el => io ? io.observe(el) : el.classList.add("in"));
  }
  function openCatalog() {
    closeModal(); closeCheckout(); unfocus(false); hideToast();
    renderCatalog();
    archive.classList.add("open"); archive.setAttribute("aria-hidden", "false");
    setMode("archive");
    renderCollections();
  }
  function closeCatalog() {
    if (!archive.classList.contains("open")) return;
    archive.classList.remove("open"); archive.setAttribute("aria-hidden", "true");
    closeModal();
    if (state.mode === "archive") { setMode("wall"); camWall(); }
    renderCollections();
  }
  $("#archiveSearch").addEventListener("input", e => { query = e.target.value; renderCatalog(); });

  /* ---------- Toast ---------- */
  let tt;
  function toast(msg, actLabel, act) {
    const t = $("#toast");
    t.innerHTML = `<span>${msg}</span>` + (actLabel ? `<button>${actLabel}</button>` : "");
    if (act) t.querySelector("button").onclick = act;
    t.classList.add("show"); clearTimeout(tt); tt = setTimeout(hideToast, 3800);
  }
  function hideToast() { $("#toast").classList.remove("show"); }

  /* ---------- Olaylar ---------- */
  document.addEventListener("click", e => {
    const t = e.target;
    const item = t.closest(".item");
    if (item) { focusItem(+item.dataset.i); return; }
    const w = t.closest("[data-wall]"); if (w) { goHome(); switchWall(+w.dataset.wall); return; }
    const f = t.closest("[data-filter]"); if (f) { filt = +f.dataset.filter; renderCatalog(); scroller.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const o = t.closest("[data-open]"); if (o) { openProduct(o.dataset.open); return; }
    const li = t.closest("#bagList li[data-slug]");
    if (li && t.closest("[data-inc]")) return changeQty(li.dataset.slug, +1);
    if (li && t.closest("[data-dec]")) return changeQty(li.dataset.slug, -1);
    if (li && t.closest("[data-remove]")) return removeLine(li.dataset.slug);
    const a = t.closest("[data-action]");
    if (a) {
      e.preventDefault();
      switch (a.dataset.action) {
        case "home": goHome(); break;
        case "back": state.modal ? closeModal() : unfocus(); break;
        case "counter": goCounter(); break;
        case "checkout": openCheckout(); break;
        case "closeCheckout": closeCheckout(); break;
        case "catalog": if (archive.classList.contains("open")) closeCatalog(); else { filt = 0; openCatalog(); } break;
        case "seeAll": filt = WALLS[state.wall].filter; openCatalog(); break;
        case "closeCatalog": closeCatalog(); break;
        case "add": addToCart(card.dataset.slug, state.modal ? $("#cardMedia") : $(".item.active .hang img")); break;
        case "prev": focusItem(state.focus - 1); break;
        case "next": focusItem(state.focus + 1); break;
      }
      return;
    }
    if (t.id === "veil") { closeModal(); closeCheckout(); return; }
    // sahnede boş yere tıklanınca odaktan çık
    if (state.mode === "focus" && t.closest("#stage")) unfocus();
  });

  document.addEventListener("keydown", e => {
    const inField = e.target.closest && e.target.closest("input,textarea");
    if (inField && e.key !== "Escape") return;
    if (inField && e.target.id === "archiveSearch" && e.target.value) return; // ESC önce aramayı temizlesin (tarayıcı varsayılanı)
    if (e.key === "Escape") {
      if ($("#checkout").classList.contains("open")) closeCheckout();
      else if (state.modal) closeModal();
      else if (archive.classList.contains("open")) closeCatalog();
      else if (state.mode === "focus") unfocus();
      else if (state.mode === "counter") goHome();
    }
    if (state.mode === "focus" && e.key === "ArrowRight") focusItem(state.focus + 1);
    if (state.mode === "focus" && e.key === "ArrowLeft") focusItem(state.focus - 1);
    if (state.mode === "wall" && e.key === "ArrowDown") goCounter();
    if (state.mode === "counter" && e.key === "ArrowUp") goHome();
  });

  // tekerlek / dokunma ile duvar ↔ kasa
  let lock = 0;
  const nav = dir => {
    if (Date.now() < lock || archive.classList.contains("open") || state.modal) return;
    if (dir > 0 && (state.mode === "wall" || state.mode === "focus")) { goCounter(); lock = Date.now() + 1300; }
    if (dir < 0 && state.mode === "counter") { goHome(); lock = Date.now() + 1300; }
  };
  addEventListener("wheel", e => { if (e.target.closest(".screen-list,.archive,.summary,.card")) return; if (Math.abs(e.deltaY) > 25) nav(Math.sign(e.deltaY)); }, { passive: true });
  let ty0 = null;
  addEventListener("touchstart", e => { ty0 = e.touches[0].clientY; }, { passive: true });
  addEventListener("touchend", e => {
    if (ty0 == null || e.target.closest(".screen-list,.archive,.card,.checkout")) return;
    const dy = ty0 - e.changedTouches[0].clientY; if (Math.abs(dy) > 70) nav(Math.sign(dy)); ty0 = null;
  }, { passive: true });

  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (state.mode === "counter" || state.mode === "checkout") camCounter();
      else if (state.mode === "focus") { const el = $$(".item", rack)[state.focus]; el && camFocus(el); }
      else camWall();
    }, 120);
  });

  /* ---------- Başlat ---------- */
  setMode("wall");
  renderWall(false);
  renderCart();
  const start = () => document.body.classList.remove("is-loading");
  Promise.race([
    Promise.all([document.fonts ? document.fonts.ready : 0, ...$$("img", rack).map(i => i.decode ? i.decode().catch(() => 0) : 0)]),
    new Promise(r => setTimeout(r, 2200)),
  ]).then(() => setTimeout(start, 150));
})();
