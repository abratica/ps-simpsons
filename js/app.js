(function () {
  "use strict";

  var app = document.getElementById("app");
  var back = document.getElementById("back");
  var indexCache = null;
  var epCache = {};

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function fmtDate(iso, opts) {
    var p = iso.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return d.toLocaleDateString("en-US", opts || { month: "long", day: "numeric", year: "numeric" });
  }
  var SHORT = { month: "short", day: "numeric", year: "numeric" };

  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }
  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    return getJSON("index.json").then(function (j) { indexCache = j; return j; });
  }
  function loadEpisode(id) {
    if (epCache[id]) return Promise.resolve(epCache[id]);
    return getJSON("episodes/" + id + ".json").then(function (j) { epCache[id] = j; return j; });
  }

  function epCode(season, episode) { return "Season " + season + " · Episode " + episode; }

  // The Simpsons on TMDB is series 456; episode pages follow /season/N/episode/N.
  function tmdbURL(ep) { return "https://www.themoviedb.org/tv/456/season/" + ep.season + "/episode/" + ep.episode; }

  // TMDB still sizes: w92, w185, w300, original. tmdbStill holds the API's still_path, e.g. "/abc123.jpg".
  var TMDB_IMG = "https://image.tmdb.org/t/p/";
  function stillImg(o, sizes, eager) {
    var alt = ' alt="Still from ' + esc(o.title) + '"';
    var load = eager ? "" : ' loading="lazy"';
    // Andrew's own screenshot wins; TMDB's still is the fallback.
    if (o.still) return '<img src="' + esc(o.still) + '"' + alt + load + ' decoding="async">';
    if (o.tmdbStill && /^\/[\w.-]+\.(jpg|jpeg|png|webp)$/i.test(o.tmdbStill)) {
      var p = esc(o.tmdbStill);
      return '<img src="' + TMDB_IMG + 'w300' + p + '" srcset="' + TMDB_IMG + 'w300' + p + ' 300w, ' +
        TMDB_IMG + 'original' + p + ' 1920w" sizes="' + sizes + '"' + alt + load + ' decoding="async">';
    }
    return "";
  }
  // A still, or a little sky with clouds when there isn't one yet.
  function stillBox(o, cls, sizes, eager) {
    var img = stillImg(o, sizes, eager);
    return '<div class="' + cls + (img ? "" : " nostill") + '">' + (img || '<span class="cloud c1"></span><span class="cloud c2"></span>') + '</div>';
  }

  var TAG_COLORS = { "Sight gag": "#E58A00", "Reference": "#0A84D6", "In-joke": "#7B4FD6", "Running gag": "#D6338A",
    "Setup": "#2E9E5B", "Callback": "#0F9AA0", "Goof": "#E0453A", "Worth discussing": "#5B6B85" };

  function setChrome(isEpisode) {
    document.body.classList.toggle("has-back", isEpisode);
    back.hidden = !isEpisode;
  }

  /* ---------- Home ---------- */
  function renderHome() {
    setChrome(false);
    return loadIndex().then(function (idx) {
      var all = [];
      (idx.seasons || []).forEach(function (s) { s.episodes.forEach(function (e) { all.push({ s: s, e: e }); }); });
      var ready = all.filter(function (x) { return x.e.ready; });
      var featId = (idx.current && idx.current.id) || (ready.length ? ready[ready.length - 1].e.id : null);
      return (featId ? loadEpisode(featId) : Promise.resolve(null)).then(function (ep) {
        var html = "";
        if (ep) {
          html += '<p class="kicker">Newest episode</p>' +
            '<a class="hero" href="#/ep/' + esc(ep.id) + '">' + stillBox(ep, "still", "(max-width: 640px) 100vw, 608px", true) +
            '<div class="hb"><p class="code">' + esc(epCode(ep.season, ep.episode)) + '</p>' +
            '<h2 class="eptitle">' + esc(ep.title) + '</h2>' +
            '<p class="date">Aired ' + esc(fmtDate(ep.airDate, SHORT)) + '</p>' +
            '<span class="btn">Read about this episode</span></div></a>';
        }
        (idx.seasons || []).forEach(function (s) {
          html += '<section class="season"><div class="shead"><h2>Season ' + s.season + '</h2><span>' +
            esc(s.years) + ' · ' + s.episodes.length + ' episodes</span></div><div class="grid">';
          s.episodes.forEach(function (e) {
            var inner = stillBox(e, "tstill", "(max-width: 640px) 50vw, 300px") +
              '<p class="tn">E' + e.episode + '</p><p class="tt">' + esc(e.title) + '</p>' +
              (e.ready ? "" : '<p class="soon">Coming soon</p>');
            html += e.ready
              ? '<a class="tile" href="#/ep/' + esc(e.id) + '">' + inner + '</a>'
              : '<div class="tile off" aria-disabled="true">' + inner + '</div>';
          });
          html += '</div></section>';
        });
        app.innerHTML = html;
        document.title = "PS Simpsons";
      });
    });
  }

  /* ---------- Episode ---------- */
  function renderEpisode(id) {
    setChrome(true);
    return loadEpisode(id).then(function (ep) {
      // Number the sources in order of first use.
      var order = [], num = {};
      ep.sections.forEach(function (sec) {
        sec.items.forEach(function (it) {
          (it.src || []).forEach(function (k) {
            if (!(k in num) && ep.sources[k]) { order.push(k); num[k] = order.length; }
          });
        });
      });
      function cites(src) {
        if (!src || !src.length) return "";
        return '<span class="cites">' + src.filter(function (k) { return k in num; }).map(function (k) {
          return '<a href="' + esc(ep.sources[k].url) + '" target="_blank" rel="noopener" aria-label="Source ' + num[k] + ': ' + esc(ep.sources[k].title) + '">' + num[k] + '</a>';
        }).join("") + '</span>';
      }
      function card(title, count, body, extra) {
        return '<details class="card' + (extra || "") + '"><summary><h3>' + esc(title) + '</h3><span class="n">' + count +
          '</span><span class="chev" aria-hidden="true">›</span></summary><div class="cbody">' + body + '</div></details>';
      }

      var chips = '<div class="chips">' +
        '<span><b>Aired</b>' + esc(fmtDate(ep.airDate, SHORT)) + '</span>' +
        (ep.writer ? '<span><b>Written by</b>' + esc(ep.writer) + '</span>' : '') +
        (ep.director ? '<span><b>Directed by</b>' + esc(ep.director) + '</span>' : '') +
        (ep.prodCode ? '<span><b>Prod. code</b>' + esc(ep.prodCode) + '</span>' : '') +
        (ep.runtime ? '<span><b>Runtime</b>' + esc(ep.runtime) + '</span>' : '') + '</div>';

      var html = '<div class="ehero">' + stillBox(ep, "still", "(max-width: 640px) 100vw, 640px", true) +
        '<div class="eh"><p class="code">' + esc(epCode(ep.season, ep.episode)) + '</p><h2 class="eptitle">' + esc(ep.title) + '</h2></div></div>' +
        '<div class="epbody">' + chips;

      ep.sections.forEach(function (sec) {
        var body = sec.note ? '<p class="note">' + esc(sec.note) + '</p>' : "";
        if (sec.style === "steps") {
          body += '<ol class="steps">' + sec.items.map(function (it) { return '<li>' + esc(it.text) + cites(it.src) + '</li>'; }).join("") + '</ol>';
        } else {
          body += '<ul class="items">' + sec.items.map(function (it) {
            var meta = "";
            if (it.tag || it.time || it.confirmed === false) {
              meta = '<div class="itag">' +
                (it.tag ? '<span class="tag" style="--t:' + (TAG_COLORS[it.tag] || "#5B6B85") + '">' + esc(it.tag) + '</span>' : '') +
                (it.time ? '<span class="time">' + esc(it.time) + '</span>' : '') +
                (it.confirmed === false ? '<span class="flag">Unconfirmed</span>' : '') + '</div>';
            }
            return '<li>' + meta + '<p>' + esc(it.text) + cites(it.src) + '</p></li>';
          }).join("") + '</ul>';
        }
        html += card(sec.title, sec.items.length, body);
      });

      html += card("Sources", order.length, '<ol class="srclist">' + order.map(function (k) {
        return '<li><a href="' + esc(ep.sources[k].url) + '" target="_blank" rel="noopener">' + esc(ep.sources[k].title) + '</a></li>';
      }).join("") + '</ol>', " small") +
        '<a class="tmdb" href="' + tmdbURL(ep) + '" target="_blank" rel="noopener">View on TMDB <span aria-hidden="true">↗</span></a></div>';

      app.innerHTML = html;
      document.title = ep.title + " · PS Simpsons";
      window.scrollTo(0, 0);
    });
  }

  function route() {
    var m = location.hash.match(/^#\/ep\/(s\d{2}e\d{2})$/);
    var p = m ? renderEpisode(m[1]) : renderHome();
    p.catch(function (err) {
      app.innerHTML = '<p class="status">Couldn’t load that. Pull to refresh or try again in a minute.</p>';
      if (window.console) console.error(err);
    });
  }

  window.addEventListener("hashchange", route);
  route();

  /* ---------- Install bar (same pattern as PS Sports) ----------
     Android/Chrome: once Chrome allows it, the bar's Install button opens Chrome's real install prompt.
     Until then (and on iPhone, which has no prompt) the bar's How button opens a short guide.
     × hides it for this visit only; it comes back next time until the app is on the home screen. */
  var DISMISS_KEY = "ps-simpsons-install-dismissed";
  try { localStorage.removeItem(DISMISS_KEY); } catch (e) {}
  var deferredPrompt = null;
  var ua = navigator.userAgent || "";
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);

  function isInstalled() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  }
  function dismissed() {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; } catch (e) { return false; }
  }
  function removeBar() {
    var old = document.querySelector(".install-bar");
    if (old) old.remove();
  }
  function installBar(label, onGo) {
    if (isInstalled() || dismissed()) return;
    removeBar();
    var bar = document.createElement("div");
    bar.className = "install-bar";
    bar.innerHTML = '<img src="icons/icon-192.png?v=3" alt="" width="40" height="40">' +
      '<span class="install-text"><b>Get the PS Simpsons app</b><span>The weekly study guide on your home screen</span></span>' +
      '<button type="button" class="install-go">' + label + '</button>' +
      '<button type="button" class="install-x" aria-label="Not now">×</button>';
    bar.querySelector(".install-go").addEventListener("click", onGo);
    bar.querySelector(".install-x").addEventListener("click", function () {
      try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch (e) {}
      bar.remove();
    });
    document.body.appendChild(bar);
  }

  var MORE = '<span class="install-chip" aria-label="menu">⋮</span>';
  var DOTS = '<span class="install-chip" aria-label="three dots">•••</span>';
  var SHARE = '<span class="install-chip"><svg width="13" height="15" viewBox="0 0 13 15" aria-hidden="true"><path d="M6.5 1v8.5M3.5 4l3-3 3 3M2.5 6.5H1.5v7.5h10V6.5h-1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

  function guideSteps() {
    if (isAndroid) return ["Tap the " + MORE + " menu at the top right of Chrome",
      "Tap <b>Add to home screen</b> (or <b>Install app</b>)",
      "Tap <b>Install</b>. PS Simpsons shows up with your other apps"];
    if (/CriOS/.test(ua)) return ["Tap the <b>Share</b> button " + SHARE + " in the address bar at the top",
      "Tap <b>Add to Home Screen</b> (you may need to tap <b>More</b> first)",
      "Tap <b>Add</b>. PS Simpsons shows up with your other apps"];
    var safariVer = +((ua.match(/Version\/(\d+)/) || [])[1] || 0);
    // iOS 26 moved Safari's Share button behind the ••• menu next to the address bar.
    if (safariVer >= 26) return ["Tap the " + DOTS + " button next to the address bar",
      "Tap <b>Share</b> " + SHARE + ", then scroll down and tap <b>Add to Home Screen</b>",
      "Keep <b>Open as Web App</b> switched on and tap <b>Add</b>"];
    return ["Tap the <b>Share</b> button " + SHARE + " at the bottom of Safari",
      "Scroll down and tap <b>Add to Home Screen</b>",
      "Tap <b>Add</b>. PS Simpsons shows up with your other apps"];
  }
  function showGuide() {
    var sheet = document.createElement("div");
    sheet.className = "install-sheet";
    sheet.innerHTML = '<div class="install-card" role="dialog" aria-label="Add PS Simpsons to your Home Screen">' +
      '<h2>Add PS Simpsons to your Home Screen</h2><ol>' +
      guideSteps().map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ol>' +
      '<p class="install-note">It takes about 10 seconds, and then PS Simpsons opens full screen like any other app.</p>' +
      '<button type="button" class="install-done">Got it</button></div>';
    sheet.addEventListener("click", function (ev) {
      if (ev.target === sheet || ev.target.closest(".install-done")) sheet.remove();
    });
    document.body.appendChild(sheet);
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    installBar("Install", function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; removeBar(); }, function () {});
    });
  });
  window.addEventListener("appinstalled", removeBar);
  if ((isIOS || isAndroid) && !isInstalled()) {
    setTimeout(function () { if (!deferredPrompt) installBar("How", showGuide); }, 1500);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
