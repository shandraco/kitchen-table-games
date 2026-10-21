/* Writes the AI request from three answers. The rules in it are the same ones the built-in games follow. */
(function () {
  "use strict";
  var K = window.KTG;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "ktg-prompt";

  var KINDS = {
    catch: "Answers float slowly across the screen. My child taps the right one. Wrong answers just float away. Keep it slow and calm.",
    story: "A short adventure in 5 scenes. In each scene my child solves one small puzzle to help the hero move on.",
    sort: "My child drags or taps things into the right group, like two baskets. Show both groups clearly.",
    memory: "Cards face down in a grid, 6 to 12 cards. My child flips two at a time to find pairs that go together.",
    build: "Each right answer adds one piece to a picture (like building a rocket or a sandcastle). After 8 to 10 answers the picture is finished.",
    surprise: "Pick the kind of game you think fits best, and tell me in one line why."
  };

  function readingLine(age) {
    if (age <= 5) return "My child can't read yet. Read every instruction, question and answer out loud. Use pictures (emoji are fine) instead of words where you can. Each answer can be heard again by tapping it.";
    if (age <= 7) return "My child is just learning to read. Use short, simple words, and add a speaker button that reads each question and answer out loud.";
    return "My child can read short sentences. Keep the words simple and add a speaker button that reads the question out loud.";
  }

  function build() {
    var age = parseInt($("age").value, 10) || 5;
    var learn = $("learn").value.replace(/\s+/g, " ").trim();
    var love = $("love").value.replace(/\s+/g, " ").trim();
    var kind = KINDS[$("kind").value] || KINDS.surprise;
    var lines = [
      "Please make a small learning game for my " + age + "-year-old child, as one web page I can play right here in this chat.",
      "",
      "What it should teach: " + (learn || "[type what they should learn]") + ".",
      love ? "Make it about: " + love + ". They love this, so use it for the characters and pictures." : null,
      "Kind of game: " + kind,
      "",
      "How it should work:",
      "- " + readingLine(age),
      "- For reading out loud, use the browser's built-in speech (speechSynthesis), slowed down a little. Start with a big Start button, because browsers only speak after a tap.",
      "- About 10 short turns, then a happy ending screen with a Play again button.",
      "- Big buttons (at least 60 pixels), easy to tap on a tablet or phone. Works with touch and with a mouse.",
      "- When my child gets it wrong, be gentle: say \"try again\", let them try again, and show the right answer if they miss twice. No losing, no lives, no timers that run out, no scores to beat.",
      "- When they get it right, cheer briefly and say why it's right.",
      "- Bright, friendly look with large text. No scary, violent or sad pictures.",
      "- Everything in one file. No sign-up, no links to other websites, no ads, and don't ask for my child's name.",
      "",
      "Before you show me the game, check every question and answer to make sure each one is correct and right for a " + age + "-year-old. Then show me the game so I can play it."
    ];
    return lines.filter(function (l) { return l !== null; }).join("\n");
  }

  function update() {
    $("prompt-out").textContent = build();
    var ready = $("learn").value.trim().length > 0;
    $("prompt-status").textContent = ready ? "Ready to copy." : "Type what they should learn to finish the request.";
    $("prompt-status").className = "status" + (ready ? " ok" : "");
    $("copy-msg").textContent = "";
    K.store.set(KEY, { age: $("age").value, learn: $("learn").value, love: $("love").value, kind: $("kind").value });
  }

  var saved = K.store.get(KEY);
  if (saved) ["age", "learn", "love", "kind"].forEach(function (k) { if (typeof saved[k] === "string") $(k).value = saved[k]; });

  $("prompt-form").addEventListener("input", update);
  $("prompt-form").addEventListener("change", update);
  $("prompt-form").addEventListener("submit", function (e) { e.preventDefault(); });

  $("copy-prompt").addEventListener("click", function () {
    var msg = $("copy-msg");
    if (!$("learn").value.trim()) {
      $("learn").setAttribute("aria-invalid", "true");
      $("learn").focus();
      msg.textContent = "First, type what your child should learn.";
      return;
    }
    $("learn").removeAttribute("aria-invalid");
    function fallback() {
      var range = document.createRange();
      range.selectNodeContents($("prompt-out"));
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      msg.textContent = "The request is selected. Use Copy from your browser menu to copy it.";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(build()).then(function () { msg.textContent = "Copied. Now paste it into your AI chat app."; }, fallback);
    } else {
      fallback();
    }
  });

  update();
})();
