/* The maker: one form per game type. Drafts save on this device as you type. */
(function () {
  "use strict";
  var K = window.KTG;

  var FORMS = {
    match: {
      title: "Make a matching game",
      intro: "Write pairs of things that go together. Your child taps one thing, then the thing it goes with.",
      row: "pair",
      start: 3,
      fields: [
        { label: "This thing", hint: "cow" },
        { label: "goes with", hint: "moo" }
      ],
      example: [["🐮", "moo"], ["🐶", "woof"], ["🐱", "meow"], ["🦆", "quack"]]
    },
    quiz: {
      title: "Make a quiz",
      intro: "Write a question, the right answer, and one to three wrong answers. The game mixes up the order.",
      row: "question",
      start: 2,
      fields: [
        { label: "Question", hint: "What is 2 + 3?" },
        { label: "Right answer", hint: "5" },
        { label: "Wrong answer", hint: "4" },
        { label: "Another wrong answer (you can skip this)", hint: "6" },
        { label: "One more wrong answer (you can skip this)", hint: "" }
      ],
      example: [["What is 2 + 3?", "5", "4", "6"], ["What color is the sky?", "blue", "green", "red"], ["Which one is a fruit?", "banana", "carrot", "bread"]]
    },
    spell: {
      title: "Make a spelling game",
      intro: "Write the words your child is learning. The game says each word, and your child taps its letters in order.",
      row: "word",
      start: 3,
      fields: [
        { label: "Word", hint: "cat" },
        { label: "Picture or clue (you can skip this)", hint: "🐱" }
      ],
      example: [["cat", "🐱"], ["dog", "🐶"], ["sun", "☀️"], ["fish", "🐟"]]
    },
    count: {
      title: "Make a counting game",
      intro: "Choose the numbers and a picture. The game shows some pictures, and your child taps how many there are."
    }
  };

  var params = new URLSearchParams(location.search);
  var type = FORMS[params.get("type")] ? params.get("type") : "match";
  var spec = FORMS[type];
  var draftKey = "ktg-draft-" + type;

  var form = document.getElementById("maker");
  var box = document.getElementById("type-fields");
  var statusEl = document.getElementById("status");
  var ready = document.getElementById("ready");

  document.title = spec.title + " | Kitchen Table Games";
  document.getElementById("make-title").textContent = spec.title;
  document.getElementById("make-intro").textContent = spec.intro;

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- Toast with undo ---------- */
  var toast = document.getElementById("toast");
  var toastTimer = null;
  var undoFn = null;
  function showToast(text, undo) {
    document.getElementById("toast-text").textContent = text;
    undoFn = undo;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; undoFn = null; }, 8000);
  }
  document.getElementById("toast-undo").addEventListener("click", function () {
    if (undoFn) undoFn();
    undoFn = null;
    toast.hidden = true;
  });

  /* ---------- Row-based forms (match, quiz, spell) ---------- */
  var list, addBtn;
  var rowId = 0;

  function addRow(values, beforeNode) {
    rowId += 1;
    var li = el("li", { "class": "row" });
    var head = el("div", { "class": "row-head" });
    head.appendChild(el("span", null, spec.row.charAt(0).toUpperCase() + spec.row.slice(1)));
    var remove = el("button", { type: "button", "class": "link-btn" }, "Remove");
    remove.addEventListener("click", function () { removeRow(li); });
    head.appendChild(remove);
    li.appendChild(head);
    var fields = el("div", { "class": "row-fields" });
    spec.fields.forEach(function (f, i) {
      var id = "r" + rowId + "f" + i;
      var lab = el("label", { "for": id }, f.label);
      var input = el("input", { type: "text", id: id, maxlength: "60", autocomplete: "off", spellcheck: "true" });
      if (f.hint) input.setAttribute("placeholder", "e.g. " + f.hint);
      input.value = (values && values[i]) || "";
      lab.appendChild(input);
      fields.appendChild(lab);
    });
    li.appendChild(fields);
    list.insertBefore(li, beforeNode || null);
    return li;
  }

  function removeRow(li) {
    var next = li.nextSibling;
    var values = readRow(li);
    li.remove();
    changed();
    showToast("Removed that " + spec.row + ".", function () {
      addRow(values, next && next.parentNode === list ? next : null);
      changed();
    });
    addBtn.focus();
  }

  function readRow(li) {
    return Array.prototype.map.call(li.querySelectorAll("input"), function (i) { return i.value; });
  }

  function readRows() {
    return Array.prototype.map.call(list.children, readRow);
  }

  function setRows(rows) {
    list.textContent = "";
    rows.forEach(function (r) { addRow(r); });
  }

  function buildRowForm() {
    list = el("ol", { "class": "rows" });
    box.appendChild(list);
    addBtn = el("button", { type: "button", "class": "btn btn-plain" }, "Add another " + spec.row);
    addBtn.addEventListener("click", function () {
      if (list.children.length >= K.TYPES[type].max) return;
      var li = addRow();
      li.querySelector("input").focus();
      changed();
    });
    var exampleBtn = el("button", { type: "button", "class": "link-btn" }, "Fill in an example for me");
    exampleBtn.addEventListener("click", function () {
      var before = readRows();
      setRows(spec.example);
      changed();
      showToast("Example filled in. Change anything you like.", function () { setRows(before); changed(); });
    });
    var row = el("div", { "class": "btn-row" });
    row.appendChild(addBtn);
    row.appendChild(exampleBtn);
    box.appendChild(row);
    box.appendChild(el("p", { "class": "hint" }, "Tip: you can use emoji, like 🐮 or 🍎, as pictures."));

    var draft = K.store.get(draftKey);
    var rows = draft && Array.isArray(draft.rows) && draft.rows.length ? draft.rows : [];
    while (rows.length < spec.start) rows.push([]);
    setRows(rows);
  }

  /* ---------- Counting form ---------- */
  var count = { from: 1, to: 10, thing: K.THINGS[0], rounds: 10 };

  function stepper(label, key, low, high) {
    var wrap = el("div", { "class": "field" });
    var id = "step-" + key;
    wrap.appendChild(el("span", { "class": "field-label", id: id }, label));
    var s = el("div", { "class": "stepper", role: "group", "aria-labelledby": id });
    var minus = el("button", { type: "button", "aria-label": "One less" }, "−");
    var out = el("output", { "aria-live": "polite" }, String(count[key]));
    var plus = el("button", { type: "button", "aria-label": "One more" }, "+");
    function set(v) {
      count[key] = Math.min(high, Math.max(low, v));
      out.textContent = String(count[key]);
      changed();
    }
    minus.addEventListener("click", function () { set(count[key] - 1); });
    plus.addEventListener("click", function () { set(count[key] + 1); });
    s.appendChild(minus); s.appendChild(out); s.appendChild(plus);
    wrap.appendChild(s);
    return wrap;
  }

  function buildCountForm() {
    var draft = K.store.get(draftKey);
    if (draft && draft.count) Object.keys(count).forEach(function (k) { if (draft.count[k] != null) count[k] = draft.count[k]; });
    box.appendChild(stepper("Smallest number", "from", 0, 18));
    box.appendChild(stepper("Biggest number", "to", 2, 20));
    box.appendChild(stepper("How many turns", "rounds", 3, 20));
    var fs = el("fieldset", { "class": "things field" });
    fs.appendChild(el("legend", null, "What should your child count?"));
    K.THINGS.forEach(function (t) {
      var lab = el("label");
      var input = el("input", { type: "radio", name: "thing", value: t, "aria-label": t });
      if (t === count.thing) input.checked = true;
      input.addEventListener("change", function () { count.thing = t; changed(); });
      lab.appendChild(input);
      lab.appendChild(el("span", { "aria-hidden": "true" }, t));
      fs.appendChild(lab);
    });
    box.appendChild(fs);
  }

  /* ---------- Shared ---------- */
  var nameInput = document.getElementById("game-name");
  var sayBox = document.getElementById("say");

  function collect() {
    var game = { v: 1, t: type, n: nameInput.value, say: sayBox.checked };
    game.items = type === "count" ? { from: count.from, to: count.to, thing: count.thing, rounds: count.rounds } : readRows();
    return game;
  }

  // Finds rows that are started but not finished, so we can point at them.
  function problems() {
    if (type === "count") {
      return count.to - count.from < 2 ? [{ msg: "The biggest number needs to be at least 2 more than the smallest." }] : [];
    }
    var out = [];
    Array.prototype.forEach.call(list.children, function (li, i) {
      var inputs = li.querySelectorAll("input");
      var v = readRow(li).map(function (s) { return s.trim(); });
      var any = v.some(Boolean);
      inputs.forEach(function (inp) { inp.removeAttribute("aria-invalid"); });
      if (!any) return;
      var n = i + 1;
      if (type === "match" && (!v[0] || !v[1])) out.push({ input: inputs[v[0] ? 1 : 0], msg: "Pair " + n + " needs both sides filled in." });
      if (type === "quiz") {
        if (!v[0]) out.push({ input: inputs[0], msg: "Question " + n + " needs a question." });
        else if (!v[1]) out.push({ input: inputs[1], msg: "Question " + n + " needs the right answer." });
        else if (!v[2] && !v[3] && !v[4]) out.push({ input: inputs[2], msg: "Question " + n + " needs at least one wrong answer to choose from." });
      }
      if (type === "spell" && v[0].replace(/[^\p{L}]/gu, "").length < 2) out.push({ input: inputs[0], msg: "Word " + n + " needs at least 2 letters." });
    });
    return out;
  }

  function changed() {
    var game = collect();
    K.store.set(draftKey, type === "count" ? { count: count, n: game.n, say: game.say } : { rows: game.items, n: game.n, say: game.say });
    var ok = K.validate(game);
    var min = K.TYPES[type].min;
    if (type === "count") {
      statusEl.textContent = ok ? "Ready. Numbers " + count.from + " to " + count.to + ", " + count.rounds + " turns." : problems()[0].msg;
    } else {
      var n = ok ? ok.items.length : 0;
      statusEl.textContent = n >= min
        ? n + " " + spec.row + (n === 1 ? "" : "s") + " ready."
        : "Add at least " + min + " " + spec.row + (min === 1 ? "" : "s") + " to make the game.";
      if (addBtn) addBtn.disabled = list.children.length >= K.TYPES[type].max;
    }
    statusEl.className = "status" + (ok ? " ok" : "");
    ready.hidden = true;
  }

  function restoreShared() {
    var draft = K.store.get(draftKey);
    if (!draft) return;
    if (typeof draft.n === "string") nameInput.value = draft.n;
    if (typeof draft.say === "boolean") sayBox.checked = draft.say;
  }

  form.addEventListener("input", changed);
  form.addEventListener("change", changed);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var issues = problems();
    var game = K.validate(collect());
    if (issues.length || !game) {
      issues.forEach(function (p) { if (p.input) p.input.setAttribute("aria-invalid", "true"); });
      statusEl.className = "status";
      statusEl.textContent = issues.length ? issues[0].msg : statusEl.textContent;
      var first = issues.filter(function (p) { return p.input; })[0];
      if (first) first.input.focus();
      return;
    }
    var url = new URL("play.html#" + K.encode(game), location.href).href;
    document.getElementById("play-link").href = url;
    document.getElementById("share-link").textContent = url;
    document.getElementById("copy-msg").textContent = "";
    ready.hidden = false;
    ready.focus();
    ready.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });

  document.getElementById("copy-btn").addEventListener("click", function () {
    var url = document.getElementById("share-link").textContent;
    var msg = document.getElementById("copy-msg");
    function fallback() {
      var range = document.createRange();
      range.selectNodeContents(document.getElementById("share-link"));
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      msg.textContent = "The link is selected. Press and hold it, or use Copy, to copy it.";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { msg.textContent = "Link copied. Paste it into a text or email."; }, fallback);
    } else {
      fallback();
    }
  });

  if (type === "count") buildCountForm(); else buildRowForm();
  restoreShared();
  var saved = K.store.set("ktg-test", 1);
  document.getElementById("draft-note").textContent = saved
    ? "Your words are saved on this device as you type, so you can come back later."
    : "This browser won't save your words, so make the game before you leave this page.";
  changed();
})();
