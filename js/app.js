(function () {
  "use strict";

  var app = document.getElementById("app");
  var dateline = document.getElementById("dateline");
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

  function epCode(ep) { return "Season " + ep.season + " · Episode " + ep.episode; }

  // The Simpsons on TMDB is series 456; episode pages follow /season/N/episode/N.
  function tmdbHTML(ep) {
    var url = "https://www.themoviedb.org/tv/456/season/" + ep.season + "/episode/" + ep.episode;
    return '<a class="extlink" href="' + url + '" target="_blank" rel="noopener">View on TMDB <span aria-hidden="true">↗</span></a>';
  }

  // TMDB still sizes: w92, w185, w300, original. tmdbStill holds the API's still_path, e.g. "/abc123.jpg".
  var TMDB_IMG = "https://image.tmdb.org/t/p/";

  function stillHTML(ep) {
    var alt = 'alt="Still from ' + esc(ep.title) + '"';
    // Andrew's own screenshot wins; TMDB's still is the fallback.
    if (ep.still) return '<div class="still"><img src="' + esc(ep.still) + '" ' + alt + '></div>';
    if (ep.tmdbStill && /^\/[\w.-]+\.(jpg|jpeg|png|webp)$/i.test(ep.tmdbStill)) {
      var p = esc(ep.tmdbStill);
      return '<div class="still"><img src="' + TMDB_IMG + 'w300' + p + '" srcset="' +
        TMDB_IMG + 'w300' + p + ' 300w, ' + TMDB_IMG + 'original' + p + ' 1920w" ' +
        'sizes="(max-width: 640px) 100vw, 608px" loading="lazy" decoding="async" ' + alt + '></div>';
    }
    return '<div class="still" role="img" aria-label="Episode still placeholder">Episode still</div>';
  }

  function metaHTML(ep) {
    return '<dl class="meta">' +
      '<dt>Aired</dt><dd>' + esc(fmtDate(ep.airDate)) + '</dd>' +
      '<dt>Written by</dt><dd>' + esc(ep.writer) + '</dd>' +
      '<dt>Directed by</dt><dd>' + esc(ep.director) + '</dd>' +
      (ep.prodCode ? '<dt>Prod. code</dt><dd>' + esc(ep.prodCode) + '</dd>' : '') +
      '</dl>';
  }

  function setRecordingLine(idx) {
    if (idx.current && idx.current.recording) {
      dateline.textContent = "Recording " + fmtDate(idx.current.recording, { weekday: "long", month: "short", day: "numeric" });
    } else {
      dateline.textContent = "";
    }
  }

  /* ---------- Home ---------- */
  function renderHome() {
    document.body.classList.remove("has-back");
    back.hidden = true;
    return loadIndex().then(function (idx) {
      setRecordingLine(idx);
      var curId = idx.current && idx.current.id;
      return (curId ? loadEpisode(curId) : Promise.resolve(null)).then(function (ep) {
        var html = "";
        if (ep) {
          html += '<h2 class="label">This week</h2>' +
            '<a class="card" href="#/ep/' + esc(ep.id) + '">' + stillHTML(ep) +
            '<p class="epnum">' + esc(epCode(ep).toUpperCase()) + '</p>' +
            '<h3 class="eptitle">' + esc(ep.title) + '</h3></a>' +
            metaHTML(ep) +
            '<a class="cta" href="#/ep/' + esc(ep.id) + '">Open the study guide</a>';
        }
        html += '<section class="archive"><h2 class="label">All episodes</h2>';
        (idx.seasons || []).forEach(function (s) {
          var ready = s.episodes.filter(function (e) { return e.ready; }).length;
          var open = s.episodes.some(function (e) { return e.id === curId; });
          html += '<details class="season"' + (open ? " open" : "") + '><summary><span>Season ' + s.season +
            '<small>' + esc(s.years) + ' · ' + s.episodes.length + ' episodes · ' + ready + ' ready</small></span>' +
            '<span class="chev" aria-hidden="true">›</span></summary><ul class="eplist">';
          s.episodes.forEach(function (e) {
            var status = "";
            if (e.id === curId) status = '<span class="pill">THIS WEEK</span>';
            else if (e.id === idx.upNext) status = '<span class="s">Up next</span>';
            var inner = '<span class="n">E' + e.episode + '</span><span class="t">' + esc(e.title) + '</span>' + status;
            html += e.ready
              ? '<li><a href="#/ep/' + esc(e.id) + '">' + inner + '</a></li>'
              : '<li class="off"><span class="row">' + inner + '</span></li>';
          });
          html += '</ul></details>';
        });
        html += '</section>';
        app.innerHTML = html;
        document.title = "PS Simpsons";
      });
    });
  }

  /* ---------- Episode ---------- */
  function renderEpisode(id) {
    document.body.classList.add("has-back");
    back.hidden = false;
    return Promise.all([loadIndex(), loadEpisode(id)]).then(function (res) {
      var idx = res[0], ep = res[1];
      setRecordingLine(idx);

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
          return '<a href="' + esc(ep.sources[k].url) + '" target="_blank" rel="noopener" aria-label="Source ' + num[k] + ': ' + esc(ep.sources[k].title) + '">[' + num[k] + ']</a>';
        }).join("") + '</span>';
      }

      var html = stillHTML(ep) +
        '<p class="epnum">' + esc(epCode(ep).toUpperCase()) + '</p>' +
        '<h2 class="eptitle">' + esc(ep.title) + '</h2>' + metaHTML(ep) + tmdbHTML(ep) +
        '<div class="sections">';

      ep.sections.forEach(function (sec, i) {
        html += '<details class="sec"' + (i === 0 ? " open" : "") + '><summary><span>' + esc(sec.title) +
          '<span class="count">' + sec.items.length + '</span></span><span class="chev" aria-hidden="true">›</span></summary><div class="body">';
        if (sec.note) html += '<p class="note">' + esc(sec.note) + '</p>';
        if (sec.style === "steps") {
          html += '<ol class="steps">' + sec.items.map(function (it) {
            return '<li>' + esc(it.text) + cites(it.src) + '</li>';
          }).join("") + '</ol>';
        } else {
          html += '<ul class="items">' + sec.items.map(function (it) {
            var tag = '';
            if (it.tag || it.time || it.confirmed === false) {
              tag = '<div class="itag">' + (it.tag ? '<span>' + esc(it.tag) + '</span>' : '') +
                (it.time ? '<span class="time">' + esc(it.time) + '</span>' : '') +
                (it.confirmed === false ? '<span class="flag">Unconfirmed</span>' : '') + '</div>';
            }
            return '<li>' + tag + '<div class="itext">' + esc(it.text) + cites(it.src) + '</div></li>';
          }).join("") + '</ul>';
        }
        html += '</div></details>';
      });

      html += '<details class="sec"><summary><span>Sources<span class="count">' + order.length +
        '</span></span><span class="chev" aria-hidden="true">›</span></summary><div class="body"><ol class="srclist">' +
        order.map(function (k) {
          return '<li><a href="' + esc(ep.sources[k].url) + '" target="_blank" rel="noopener">' + esc(ep.sources[k].title) + '</a></li>';
        }).join("") + '</ol></div></details></div>';

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
