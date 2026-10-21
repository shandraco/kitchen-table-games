/*
  Shared helpers for the maker and the player.

  A game is a small object. It is turned into text and put after the # in the
  link, so it never reaches any server: browsers do not send the part after #.

  Game shape (version 1):
    { v: 1, t: "match" | "quiz" | "spell" | "count", n: "Game name", say: true, items: ... }

    match  items: [[left, right], ...]                 2 to 8 pairs
    quiz   items: [[question, right, wrong, ...], ...]  1 to 20 questions, 1 to 3 wrong answers
    spell  items: [[word, picture], ...]                1 to 20 words, picture is optional
    count  items: { from, to, thing, rounds }           numbers 0 to 20
*/
(function (root) {
  "use strict";

  var MAX_TEXT = 60;

  var TYPES = {
    match: { name: "Matching", min: 2, max: 8 },
    quiz: { name: "Quiz", min: 1, max: 20 },
    spell: { name: "Spelling", min: 1, max: 20 },
    count: { name: "Counting", min: 1, max: 1 }
  };

  var THINGS = ["🍎", "⭐", "🐟", "🚗", "🌸", "🐞", "🧁", "⚽", "🦆", "🍓", "🎈", "🐶"];

  function clean(value) {
    if (typeof value !== "string" && typeof value !== "number") return "";
    return String(value).replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
  }

  function toInt(value, low, high, fallback) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return fallback;
    return Math.min(high, Math.max(low, n));
  }

  // Returns a safe copy of the game, or null if it cannot be played.
  function validate(game) {
    if (!game || typeof game !== "object" || game.v !== 1 || !TYPES[game.t]) return null;
    var out = { v: 1, t: game.t, n: clean(game.n), say: game.say !== false };
    var rows = Array.isArray(game.items) ? game.items : [];
    var spec = TYPES[game.t];

    if (game.t === "match") {
      out.items = rows.filter(Array.isArray).map(function (r) {
        return [clean(r[0]), clean(r[1])];
      }).filter(function (r) { return r[0] && r[1]; });
    } else if (game.t === "quiz") {
      out.items = rows.filter(Array.isArray).map(function (r) {
        var right = clean(r[1]);
        var seen = [right.toLowerCase()];
        var wrong = r.slice(2, 5).map(clean).filter(function (w) {
          var key = w.toLowerCase();
          if (!w || seen.indexOf(key) >= 0) return false;
          seen.push(key);
          return true;
        });
        return [clean(r[0]), right].concat(wrong);
      }).filter(function (r) { return r[0] && r[1] && r.length >= 3; });
    } else if (game.t === "spell") {
      out.items = rows.filter(Array.isArray).map(function (r) {
        return [clean(r[0]).replace(/[^\p{L}' -]/gu, ""), clean(r[1])];
      }).filter(function (r) { return r[0].replace(/[ '-]/g, "").length >= 2; });
    } else {
      var c = game.items && typeof game.items === "object" ? game.items : {};
      var from = toInt(c.from, 0, 20, 1);
      var to = toInt(c.to, 0, 20, 10);
      if (to < from) { var swap = from; from = to; to = swap; }
      if (to - from < 2) return null;
      out.items = {
        from: from,
        to: to,
        thing: THINGS.indexOf(c.thing) >= 0 ? c.thing : THINGS[0],
        rounds: toInt(c.rounds, 3, 20, 10)
      };
      return out;
    }

    out.items = out.items.slice(0, spec.max);
    return out.items.length >= spec.min ? out : null;
  }

  function encode(game) {
    var bytes = new TextEncoder().encode(JSON.stringify(game));
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // Returns a validated game, or null for a broken or edited link.
  function decode(text) {
    try {
      var b64 = String(text).replace(/^#/, "").replace(/-/g, "+").replace(/_/g, "/");
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return validate(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (e) {
      return null;
    }
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Storage can be blocked (private windows, strict settings). The site must work anyway.
  var store = {
    get: function (key) {
      try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    }
  };

  // Reading aloud. Browsers only speak after the first tap, so the player starts with a tap.
  var speech = {
    on: true,
    supported: typeof window !== "undefined" && "speechSynthesis" in window,
    say: function (text) {
      if (!speech.on || !speech.supported || !text) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  root.KTG = { TYPES: TYPES, THINGS: THINGS, validate: validate, encode: encode, decode: decode, shuffle: shuffle, store: store, speech: speech };
})(typeof window !== "undefined" ? window : globalThis);
