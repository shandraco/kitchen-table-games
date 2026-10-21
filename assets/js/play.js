/* The player. Reads the game from the link and runs it. No scores, no timers. */
(function () {
  "use strict";
  var K = window.KTG;
  var screen = document.getElementById("screen");
  var soundBtn = document.getElementById("sound");
  var game = K.decode(location.hash);

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function clear() { screen.textContent = ""; }
  // Answers that are only emoji are pictures, so show them big.
  function answer(text) {
    var b = el("button", { type: "button", "class": "answer" }, text);
    if (/\p{Extended_Pictographic}/u.test(text) && !/[\p{L}\p{N}]/u.test(text)) b.classList.add("emo");
    return b;
  }
  function replay(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }
  function sayBtn(text, label) {
    var b = el("button", { type: "button", "class": "say-btn", "aria-label": label || "Hear it again" }, "🔊");
    b.addEventListener("click", function () { K.speech.say(text); });
    if (!K.speech.on) b.hidden = true;
    return b;
  }
  function progress(done, total) {
    var p = el("div", { "class": "progress", "aria-label": "Turn " + Math.min(done + 1, total) + " of " + total });
    for (var i = 0; i < total; i++) p.appendChild(el("span", { "class": i < done ? "done" : i === done ? "now" : "" }));
    return p;
  }
  function feedback() { return el("p", { "class": "feedback", role: "status" }); }
  function setFeedback(node, text, good) {
    node.textContent = text;
    node.className = "feedback " + (good ? "good" : "try");
  }
  function nextButton(label, onClick) {
    var b = el("button", { type: "button", "class": "btn btn-go btn-big" }, label);
    b.addEventListener("click", onClick);
    return b;
  }

  /* ---------- Sound toggle ---------- */
  function syncSound() {
    soundBtn.setAttribute("aria-pressed", String(K.speech.on));
    document.getElementById("sound-text").textContent = K.speech.on ? "Sound on" : "Sound off";
    Array.prototype.forEach.call(document.querySelectorAll(".say-btn"), function (b) { b.hidden = !K.speech.on; });
  }
  soundBtn.addEventListener("click", function () {
    K.speech.on = !K.speech.on;
    if (!K.speech.on && K.speech.supported) window.speechSynthesis.cancel();
    syncSound();
  });

  /* ---------- Broken link ---------- */
  if (!game) {
    clear();
    screen.appendChild(el("div", { "class": "cheer", "aria-hidden": "true" }, "🧩"));
    screen.appendChild(el("h1", null, "This game link is broken."));
    screen.appendChild(el("p", { "class": "narrow" }, "Part of the link may be missing. Ask the person who sent it to copy the whole link again, or make a new game."));
    var a = el("a", { "class": "btn btn-go btn-big", href: "./" }, "Make a game");
    screen.appendChild(a);
    return;
  }

  K.speech.on = game.say && K.speech.supported;
  if (K.speech.supported) soundBtn.hidden = false;
  syncSound();

  var title = game.n || K.TYPES[game.t].name + " game";
  document.title = title + " | Kitchen Table Games";

  /* ---------- Start and end ---------- */
  function start() {
    clear();
    screen.appendChild(el("div", { "class": "cheer", "aria-hidden": "true" }, { match: "🧩", quiz: "❓", spell: "🔤", count: "🔢" }[game.t]));
    screen.appendChild(el("h1", null, title));
    var how = {
      match: "Tap two things that go together.",
      quiz: "Read the question, then tap the right answer.",
      spell: K.speech.on ? "Listen to the word, then tap its letters in order." : "Look at the word, then tap its letters in order.",
      count: "Count the pictures, then tap the number."
    }[game.t];
    screen.appendChild(el("p", { "class": "narrow" }, how));
    var b = nextButton("Start", function () {
      K.speech.say(how);
      run();
    });
    screen.appendChild(b);
    b.focus();
  }

  function finish() {
    clear();
    screen.appendChild(el("div", { "class": "cheer", "aria-hidden": "true" }, "🌟"));
    var h = el("h1", { tabindex: "-1" }, "You did it!");
    screen.appendChild(h);
    screen.appendChild(el("p", { "class": "narrow" }, "Great job. Want to play again?"));
    var row = el("div", { "class": "btn-row" });
    row.appendChild(nextButton("Play again", run));
    row.appendChild(el("a", { "class": "btn btn-plain", href: "./" }, "Make your own game"));
    screen.appendChild(row);
    K.speech.say("You did it! Great job.");
    h.focus();
  }

  function run() {
    ({ match: playMatch, quiz: playQuiz, spell: playSpell, count: playCount })[game.t]();
  }

  /* ---------- Matching ---------- */
  function playMatch() {
    clear();
    var pairs = game.items.map(function (p, i) { return { a: p[0], b: p[1], id: i }; });
    var total = pairs.length;
    var matched = 0;
    var picked = null;

    var prog = progress(0, total);
    screen.appendChild(prog);
    var board = el("div", { "class": "board" });
    var colA = el("div", { "class": "col", role: "group", "aria-label": "Things" });
    var colB = el("div", { "class": "col", role: "group", "aria-label": "Goes with" });
    board.appendChild(colA);
    board.appendChild(colB);
    screen.appendChild(board);
    var fb = feedback();
    screen.appendChild(fb);

    function card(text, id, side) {
      var b = answer(text);
      b.setAttribute("aria-pressed", "false");
      b.dataset.id = id;
      b.dataset.side = side;
      b.addEventListener("click", function () { tap(b); });
      return b;
    }
    K.shuffle(pairs).forEach(function (p) { colA.appendChild(card(p.a, p.id, "a")); });
    K.shuffle(pairs).forEach(function (p) { colB.appendChild(card(p.b, p.id, "b")); });

    function tap(b) {
      if (b.classList.contains("matched")) return;
      K.speech.say(b.textContent);
      if (!picked || picked.dataset.side === b.dataset.side) {
        if (picked) { picked.classList.remove("picked"); picked.setAttribute("aria-pressed", "false"); }
        picked = b;
        b.classList.add("picked");
        b.setAttribute("aria-pressed", "true");
        return;
      }
      var first = picked;
      picked = null;
      first.classList.remove("picked");
      first.setAttribute("aria-pressed", "false");
      if (first.dataset.id === b.dataset.id) {
        [first, b].forEach(function (n) { n.classList.add("matched"); n.setAttribute("aria-disabled", "true"); replay(n, "pop"); });
        matched += 1;
        var pair = pairs[Number(b.dataset.id)];
        setFeedback(fb, "Yes! " + pair.a + " goes with " + pair.b + ".", true);
        K.speech.say("Yes! " + pair.a + " goes with " + pair.b);
        var fresh = progress(matched, total);
        prog.replaceWith(fresh);
        prog = fresh;
        if (matched === total) setTimeout(finish, 1600);
      } else {
        replay(first, "wiggle");
        replay(b, "wiggle");
        setFeedback(fb, "Not those two. Try again!", false);
      }
    }
  }

  /* ---------- Quiz ---------- */
  function playQuiz() {
    var qs = K.shuffle(game.items);
    var i = 0;
    function show() {
      clear();
      var q = qs[i];
      screen.appendChild(progress(i, qs.length));
      var card = el("div", { "class": "prompt-card" });
      card.appendChild(el("span", { "class": "big" }, q[0]));
      card.appendChild(sayBtn(q[0], "Hear the question"));
      screen.appendChild(card);
      var answers = el("div", { "class": "answers" });
      var fb = feedback();
      var next = el("div");
      var done = false;
      K.shuffle(q.slice(1)).forEach(function (text) {
        var b = answer(text);
        b.addEventListener("click", function () {
          if (done || b.classList.contains("nope")) return;
          if (text === q[1]) {
            done = true;
            b.classList.add("right");
            replay(b, "pop");
            setFeedback(fb, "Yes! The answer is " + q[1] + ".", true);
            K.speech.say("Yes! The answer is " + q[1]);
            var last = i === qs.length - 1;
            var nb = nextButton(last ? "Finish" : "Next question", function () { i += 1; if (last) finish(); else show(); });
            next.appendChild(nb);
            nb.focus();
          } else {
            b.classList.add("nope");
            b.setAttribute("aria-disabled", "true");
            replay(b, "wiggle");
            setFeedback(fb, "Not that one. Try another!", false);
            K.speech.say("Not that one. Try another!");
          }
        });
        answers.appendChild(b);
      });
      screen.appendChild(answers);
      screen.appendChild(fb);
      screen.appendChild(next);
      K.speech.say(q[0]);
    }
    show();
  }

  /* ---------- Spelling ---------- */
  function isLetter(ch) { return /\p{L}/u.test(ch); }

  function playSpell() {
    var words = K.shuffle(game.items);
    var i = 0;
    function show() {
      clear();
      var word = words[i][0];
      var pic = words[i][1];
      var chars = Array.from(word);
      var hearOnly = K.speech.on;
      screen.appendChild(progress(i, words.length));

      var card = el("div", { "class": "prompt-card" });
      if (pic) card.appendChild(el("span", { "class": "pic" }, pic));
      if (!hearOnly) card.appendChild(el("span", { "class": "big" }, word));
      card.appendChild(sayBtn(word, "Hear the word"));
      screen.appendChild(card);

      var slots = el("div", { "class": "slots", "aria-label": "Your word so far" });
      // Each word sits in its own group so a line break never splits a word.
      var group = el("span", { "class": "slot-word" });
      slots.appendChild(group);
      var slotNodes = chars.map(function (ch) {
        if (ch === " ") {
          group = el("span", { "class": "slot-word" });
          slots.appendChild(group);
          return el("span");
        }
        var s = el("span", { "class": "slot" });
        if (!isLetter(ch)) s.textContent = ch;
        group.appendChild(s);
        return s;
      });
      screen.appendChild(slots);

      var letters = chars.filter(isLetter);
      var order = K.shuffle(letters);
      for (var t = 0; t < 5 && letters.length > 2 && order.join("") === letters.join(""); t++) order = K.shuffle(letters);

      var pos = 0;
      function skipNonLetters() { while (pos < chars.length && !isLetter(chars[pos])) pos += 1; }
      skipNonLetters();

      var tiles = el("div", { "class": "tiles", role: "group", "aria-label": "Letters" });
      var fb = feedback();
      var next = el("div");
      order.forEach(function (ch) {
        var b = el("button", { type: "button", "class": "tile" }, ch);
        b.addEventListener("click", function () {
          if (b.classList.contains("used") || pos >= chars.length) return;
          if (ch.toLowerCase() === chars[pos].toLowerCase()) {
            slotNodes[pos].textContent = chars[pos];
            replay(slotNodes[pos], "pop");
            b.classList.add("used");
            b.setAttribute("aria-hidden", "true");
            b.tabIndex = -1;
            K.speech.say(ch);
            pos += 1;
            skipNonLetters();
            fb.textContent = "";
            if (pos >= chars.length) {
              setFeedback(fb, "Yes! You spelled " + word + ".", true);
              K.speech.say("Yes! You spelled " + word);
              var last = i === words.length - 1;
              var nb = nextButton(last ? "Finish" : "Next word", function () { i += 1; if (last) finish(); else show(); });
              next.appendChild(nb);
              hint.hidden = true;
              nb.focus();
            } else {
              var nextTile = tiles.querySelector(".tile:not(.used)");
              if (nextTile) nextTile.focus();
            }
          } else {
            replay(b, "wiggle");
            setFeedback(fb, "Try a different letter.", false);
          }
        });
        tiles.appendChild(b);
      });
      screen.appendChild(tiles);

      var hint = el("button", { type: "button", "class": "link-btn" }, "Show me the next letter");
      hint.addEventListener("click", function () {
        var want = chars[pos] && chars[pos].toLowerCase();
        var match = Array.prototype.filter.call(tiles.children, function (b) {
          return !b.classList.contains("used") && b.textContent.toLowerCase() === want;
        })[0];
        if (match) { replay(match, "pop"); match.focus(); }
      });
      screen.appendChild(fb);
      screen.appendChild(next);
      screen.appendChild(hint);
      K.speech.say(word);
    }
    show();
  }

  /* ---------- Counting ---------- */
  var NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

  function playCount() {
    var c = game.items;
    var round = 0;
    var lastN = -1;
    function pick() {
      var n;
      do { n = c.from + Math.floor(Math.random() * (c.to - c.from + 1)); } while (n === lastN);
      lastN = n;
      return n;
    }
    function choices(n) {
      var pool = [];
      for (var v = c.from; v <= c.to; v++) if (v !== n) pool.push(v);
      pool.sort(function (x, y) { return Math.abs(x - n) - Math.abs(y - n) || Math.random() - 0.5; });
      return K.shuffle([n].concat(pool.slice(0, 2)));
    }
    function show() {
      clear();
      var n = pick();
      screen.appendChild(progress(round, c.rounds));
      screen.appendChild(el("h1", null, "How many?"));
      var pics = el("div", { "class": "counters", role: "group", "aria-label": "Pictures to count. Tap each one to count it." });
      var counted = 0;
      for (var k = 0; k < n; k++) {
        var s = el("span", { "aria-hidden": "true" }, c.thing);
        s.addEventListener("click", function (e) {
          var node = e.currentTarget;
          if (node.dataset.counted) return;
          counted += 1;
          node.dataset.counted = "1";
          replay(node, "pop");
          K.speech.say(NUMBER_WORDS[counted] || String(counted));
        });
        pics.appendChild(s);
      }
      if (n === 0) pics.appendChild(el("span", { "class": "hint" }, "Look carefully!"));
      screen.appendChild(pics);

      var answers = el("div", { "class": "answers nums" });
      var fb = feedback();
      var next = el("div");
      var done = false;
      choices(n).forEach(function (v) {
        var b = answer(String(v));
        b.addEventListener("click", function () {
          if (done || b.classList.contains("nope")) return;
          if (v === n) {
            done = true;
            b.classList.add("right");
            replay(b, "pop");
            var said = "Yes! There " + (n === 1 ? "is " : "are ") + NUMBER_WORDS[n] + ".";
            setFeedback(fb, "Yes! There " + (n === 1 ? "is " : "are ") + n + ".", true);
            K.speech.say(said);
            var last = round === c.rounds - 1;
            var nb = nextButton(last ? "Finish" : "Next one", function () { round += 1; if (last) finish(); else show(); });
            next.appendChild(nb);
            nb.focus();
          } else {
            b.classList.add("nope");
            b.setAttribute("aria-disabled", "true");
            replay(b, "wiggle");
            setFeedback(fb, "Not quite. Tap each picture to count it.", false);
            K.speech.say("Not quite. Tap each picture to count it.");
          }
        });
        answers.appendChild(b);
      });
      screen.appendChild(answers);
      screen.appendChild(fb);
      screen.appendChild(next);
      K.speech.say("How many?");
    }
    show();
  }

  window.addEventListener("hashchange", function () { location.reload(); });
  start();
})();
