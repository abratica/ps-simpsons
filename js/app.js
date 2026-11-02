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

  function stillHTML(ep) {
    if (ep.still) return '<div class="still"><img src="' + esc(ep.still) + '" alt="Still from ' + esc(ep.title) + '"></div>';
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
        '<h2 class="eptitle">' + esc(ep.title) + '</h2>' + metaHTML(ep) +
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

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
