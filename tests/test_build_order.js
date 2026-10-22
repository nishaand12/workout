const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const file = path.join(__dirname, "../app/static/js/build-order.js");
const context = { console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });

const {
  letterForLanding,
  insertAtLanding,
  placeDroppedItems,
  reorderForLetter,
  reorderChainForLetter,
  sortByResetOrder,
  letterForNewItem,
  dragLandingIndex
} = context;

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

function row(id, letter, type) {
  return { id, letter, type: type || "lift", name: id };
}
function sig(items) {
  return items.map((it) => it.id + ":" + (it.letter || "-")).join(" ");
}

const rows = [
  { id: "a", top: 0, height: 40 },
  { id: "b", top: 40, height: 40 },
  { id: "c", top: 80, height: 40 }
];
function landing(rows, y) {
  const hit = dragLandingIndex(rows, y);
  return hit.index + ":" + hit.beforeId;
}
assert.strictEqual(landing(rows, 10), "0:a");
assert.strictEqual(landing(rows, 30), "1:b");
assert.strictEqual(landing(rows, 70), "2:c");
assert.strictEqual(landing(rows, 110), "3:null");
assert.strictEqual(landing([], 20), "0:null");

assert.strictEqual(letterForLanding([row("a", "A"), row("b", "B")], 0), null);
assert.strictEqual(letterForLanding([row("a", "A"), row("b", "B")], 2), null);
assert.strictEqual(letterForLanding([row("a", "A"), row("b", "A")], 1), null);
assert.strictEqual(letterForLanding([row("a", "A"), row("b", "B")], 1), null);
assert.strictEqual(letterForLanding([row("a", "B"), row("b", "A")], 1), null);
assert.strictEqual(letterForLanding([row("a", "A"), row("b", "")], 1), null);
assert.strictEqual(letterForLanding([row("a", ""), row("b", "B")], 1), null);

// Between two exercises that share a letter: keep the dragged letter.
let shared = placeDroppedItems(
  [row("a1", "A"), row("a2", "A"), row("c1", "C")],
  ["c1"],
  "a2"
);
assert.strictEqual(sig(shared), "a1:A c1:C a2:A");

// Between the last A and the first B: keep the dragged letter, and do not sort the day.
let boundary = placeDroppedItems(
  [row("a1", "A"), row("a2", "A"), row("b1", "B"), row("c1", "C")],
  ["c1"],
  "b1"
);
assert.strictEqual(sig(boundary), "a1:A a2:A c1:C b1:B");

// The letter rule does not sort the rest of a manual drop.
let unsorted = placeDroppedItems(
  [row("a1", "A"), row("b1", "B"), row("a2", "A"), row("c1", "C")],
  ["c1"],
  "b1"
);
assert.strictEqual(sig(unsorted), "a1:A c1:C b1:B a2:A");
assert.notStrictEqual(sig(unsorted), sig(sortByResetOrder(unsorted.map((it) => Object.assign({}, it)))));

// A drop before the first exercise keeps its letter.
let beforeFirst = placeDroppedItems(
  [row("a1", "A"), row("b1", "B"), row("c1", "C")],
  ["c1"],
  "a1"
);
assert.strictEqual(sig(beforeFirst), "c1:C a1:A b1:B");

// Empty space at the end keeps its letter, even when the exercise above has one.
let atEnd = placeDroppedItems(
  [row("a1", "A"), row("b1", "B"), row("c1", "C")],
  ["a1"],
  null
);
assert.strictEqual(sig(atEnd), "b1:B c1:C a1:A");

// A blank neighbor is not a letter boundary.
let besideBlank = placeDroppedItems(
  [row("a1", "A"), row("x", ""), row("b1", "B")],
  ["b1"],
  "x"
);
assert.strictEqual(sig(besideBlank), "a1:A b1:B x:-");

// Several dragged exercises keep their own letters and their order.
let block = placeDroppedItems(
  [row("a1", "A"), row("a2", "A"), row("c1", "C"), row("c2", "D")],
  ["c1", "c2"],
  "a2"
);
assert.strictEqual(sig(block), "a1:A c1:C c2:D a2:A");

// A break dropped between two A's stays a break, not a letter in that group.
let brk = placeDroppedItems(
  [row("a1", "A"), row("a2", "A"), row("br", "", "break")],
  ["br"],
  "a2"
);
assert.strictEqual(sig(brk), "a1:A br:- a2:A");
assert.strictEqual(brk[1].type, "break");

// Cross-day insert uses the same landing rule.
let foreign = insertAtLanding(
  [row("a1", "A"), row("b1", "B")],
  [row("d1", "C")],
  "b1"
);
assert.strictEqual(sig(foreign), "a1:A d1:C b1:B");

// A chain letter moves the whole block to the bottom of that group.
let chain = [
  row("a1", "A"),
  Object.assign(row("c1", ""), { chainInstance: "warm" }),
  Object.assign(row("c2", ""), { chainInstance: "warm" }),
  row("a2", "A"),
  row("b1", "B")
];
reorderChainForLetter(chain, "warm", "A");
assert.strictEqual(sig(chain), "a1:A a2:A c1:A c2:A b1:B");

// Clearing a chain letter leaves the block where it is.
reorderChainForLetter(chain, "warm", "");
assert.strictEqual(sig(chain), "a1:A a2:A c1:- c2:- b1:B");

// A chain letter nobody else has stays put.
let aloneChain = [
  row("a1", "A"),
  Object.assign(row("c1", ""), { chainInstance: "warm" }),
  Object.assign(row("c2", ""), { chainInstance: "warm" })
];
reorderChainForLetter(aloneChain, "warm", "D");
assert.strictEqual(sig(aloneChain), "a1:A c1:D c2:D");

// Changing a letter moves that exercise to the bottom of the group and leaves the rest put.
let regroup = [row("c1", "C"), row("a1", "A"), row("b1", "B"), row("a2", "A")];
reorderForLetter(regroup, "b1", "A");
assert.strictEqual(sig(regroup), "c1:C a1:A a2:A b1:A");

// The same letter still moves to the bottom of that group.
let already = [row("a1", "A"), row("a2", "A"), row("b1", "B")];
reorderForLetter(already, "a1", "A");
assert.strictEqual(sig(already), "a2:A a1:A b1:B");

// A letter nobody else has stays where it is.
let alone = [row("a1", "A"), row("b1", "B"), row("c1", "C")];
reorderForLetter(alone, "b1", "D");
assert.strictEqual(sig(alone), "a1:A b1:D c1:C");

// Clearing a letter moves that exercise to the top.
let cleared = [row("a1", "A"), row("b1", "B"), row("c1", "C")];
reorderForLetter(cleared, "b1", "");
assert.strictEqual(sig(cleared), "b1:- a1:A c1:C");

// Non-contiguous group: bottom is after the last exercise with that letter.
let scattered = [row("b1", "B"), row("a1", "A"), row("c1", "C"), row("a2", "A")];
reorderForLetter(scattered, "b1", "A");
assert.strictEqual(sig(scattered), "a1:A c1:C a2:A b1:A");

// Reset Order still sorts the whole day by letter. A blank sorts last.
let reset = [row("c1", "C"), row("a1", "A"), row("x", ""), row("b1", "B"), row("a2", "A")];
sortByResetOrder(reset);
assert.strictEqual(sig(reset), "a1:A a2:A b1:B c1:C x:-");

// A new exercise still receives the next unused letter.
assert.strictEqual(letterForNewItem([row("a", "A"), row("c", "C")], row("n", "A"), LETTERS), "B");
assert.strictEqual(letterForNewItem([], row("n", "A"), LETTERS), "A");
assert.strictEqual(
  letterForNewItem(LETTERS.map((letter, i) => row("e" + i, letter)), row("n", "A"), LETTERS),
  "A"
);
assert.strictEqual(letterForNewItem([row("a", "A")], row("br", "A", "break"), LETTERS), "");
assert.strictEqual(letterForNewItem([row("a", "A")], row("br", "", "break"), LETTERS), "");

// A shared letter is still two exercises.
assert.strictEqual(shared.length, 3);
assert.notStrictEqual(shared[0], shared[1]);

console.log("build order ok");
