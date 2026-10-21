// Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
require("../assets/js/core.js");
const K = globalThis.KTG;

const roundTrip = (g) => K.decode("#" + K.encode(g));

test("every game type survives a trip through the link", () => {
  const games = [
    { v: 1, t: "match", n: "Animal sounds", say: true, items: [["🐮", "moo"], ["🐶", "woof"]] },
    { v: 1, t: "quiz", n: "", say: false, items: [["What is 2 + 3?", "5", "4", "6"]] },
    { v: 1, t: "spell", n: "Week 3", say: true, items: [["cat", "🐱"], ["ice cream", ""]] },
    { v: 1, t: "count", n: "", say: true, items: { from: 1, to: 10, thing: "🍎", rounds: 10 } }
  ];
  for (const g of games) assert.deepStrictEqual(roundTrip(g), K.validate(g));
});

test("accented letters and emoji survive", () => {
  const g = { v: 1, t: "spell", n: "Español", say: true, items: [["niño", "👦"], ["über", ""]] };
  assert.strictEqual(roundTrip(g).items[0][0], "niño");
});

test("broken or edited links return null instead of crashing", () => {
  for (const bad of ["", "#", "#abc", "#%%%", "#" + btoa("not json"), "#" + K.encode({ v: 2, t: "quiz", items: [] }), "#" + K.encode({ v: 1, t: "hack", items: [] })]) {
    assert.strictEqual(K.decode(bad), null, bad);
  }
});

test("half-filled rows are dropped, and too few rows means no game", () => {
  assert.strictEqual(K.validate({ v: 1, t: "match", items: [["cow", "moo"], ["dog", ""]] }), null);
  const g = K.validate({ v: 1, t: "match", items: [["cow", "moo"], ["dog", ""], ["cat", "meow"]] });
  assert.strictEqual(g.items.length, 2);
});

test("a quiz needs a wrong answer, and wrong answers that repeat the right one are dropped", () => {
  assert.strictEqual(K.validate({ v: 1, t: "quiz", items: [["Q?", "yes"]] }), null);
  assert.strictEqual(K.validate({ v: 1, t: "quiz", items: [["Q?", "yes", "Yes"]] }), null);
  assert.deepStrictEqual(K.validate({ v: 1, t: "quiz", items: [["Q?", "yes", "no", "no", "YES"]] }).items[0], ["Q?", "yes", "no"]);
});

test("spelling words lose digits and symbols, and need two letters", () => {
  assert.strictEqual(K.validate({ v: 1, t: "spell", items: [["a", ""]] }), null);
  assert.strictEqual(K.validate({ v: 1, t: "spell", items: [["c4t!", ""]] }).items[0][0], "ct");
});

test("counting clamps numbers, swaps a reversed range and refuses a tiny one", () => {
  const g = K.validate({ v: 1, t: "count", items: { from: 50, to: -3, thing: "<script>", rounds: 999 } });
  assert.deepStrictEqual(g.items, { from: 0, to: 20, thing: "🍎", rounds: 20 });
  assert.strictEqual(K.validate({ v: 1, t: "count", items: { from: 4, to: 5 } }), null);
});

test("text is trimmed, squashed and capped at 60 characters", () => {
  const long = "x".repeat(200);
  const g = K.validate({ v: 1, t: "match", n: "  a   b  ", items: [[long, " moo "], ["a", "b"]] });
  assert.strictEqual(g.n, "a b");
  assert.strictEqual(g.items[0][0].length, 60);
  assert.strictEqual(g.items[0][1], "moo");
});

test("too many rows are cut to the limit", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ["q" + i, "a", "b"]);
  assert.strictEqual(K.validate({ v: 1, t: "quiz", items: rows }).items.length, 20);
});

test("a full 20-question quiz still makes a link short enough to text", () => {
  const rows = Array.from({ length: 20 }, () => ["What is the biggest animal that lives in the sea?", "blue whale", "shark", "octopus", "dolphin"]);
  const len = K.encode(K.validate({ v: 1, t: "quiz", items: rows })).length;
  assert.ok(len < 8000, "hash length " + len);
});
