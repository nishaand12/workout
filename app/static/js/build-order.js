/* Build day order: drag landing and A/B/C letter placement.
   A drop keeps the landing index and the dragged exercise's letter.
   The end of the day and the slot before the first exercise assign no letter.
   Choosing a letter from the menu moves that exercise to the bottom of the
   group. Clearing it moves the exercise to the top. Neither re-sorts the rest.
   A chain shares one letter. Assigning it moves the whole block to the bottom
   of that group. Clearing a chain letter does not move the block. */

function takesLandingLetter(it) {
  return !!it && it.type !== "break" && it.type !== "rest" && it.type !== "video";
}

function indexBefore(items, beforeId) {
  if (beforeId == null || beforeId === "") return items.length;
  const found = items.findIndex((it) => it.id === beforeId);
  return found < 0 ? items.length : found;
}

function letterForLanding() {
  return null;
}

function insertAtLanding(items, moving, beforeId) {
  const next = (items || []).slice();
  const idx = indexBefore(next, beforeId);
  next.splice(idx, 0, ...(moving || []));
  return next;
}

function placeDroppedItems(items, movingIds, beforeId) {
  const ids = movingIds || [];
  const moving = [];
  const rest = [];
  (items || []).forEach((it) => {
    if (ids.indexOf(it.id) >= 0) moving.push(it);
    else rest.push(it);
  });
  return insertAtLanding(rest, moving, beforeId);
}

function reorderForLetter(items, id, letter) {
  const index = items.findIndex((it) => it.id === id);
  if (index < 0) return items;
  const it = items[index];
  const nextLetter = letter || "";
  it.letter = nextLetter;
  if (!nextLetter) {
    items.splice(index, 1);
    items.unshift(it);
    return items;
  }
  const rest = items.filter((row) => row.id !== id);
  let last = -1;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].letter === nextLetter) last = i;
  }
  if (last < 0) return items;
  rest.splice(last + 1, 0, it);
  items.splice(0, items.length, ...rest);
  return items;
}

function reorderChainForLetter(items, instance, letter) {
  if (!instance) return items;
  const block = (items || []).filter((it) => it && it.chainInstance === instance);
  if (!block.length) return items;
  const nextLetter = letter || "";
  block.forEach((it) => { it.letter = nextLetter; });
  if (!nextLetter) return items;
  const rest = items.filter((it) => !it || it.chainInstance !== instance);
  let last = -1;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].letter === nextLetter) last = i;
  }
  if (last < 0) return items;
  rest.splice(last + 1, 0, ...block);
  items.splice(0, items.length, ...rest);
  return items;
}

function sortByResetOrder(items) {
  items.sort((a, b) => String(a.letter || "Z").localeCompare(String(b.letter || "Z")));
  return items;
}

function nextUnusedLetter(used, letters) {
  const alphabet = letters && letters.length ? letters : ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  for (let i = 0; i < alphabet.length; i++) {
    if ((used || []).indexOf(alphabet[i]) < 0) return alphabet[i];
  }
  return "A";
}

function letterForNewItem(existing, it, letters) {
  if (!it || !it.letter) return "";
  if (!takesLandingLetter(it)) return "";
  const used = [];
  (existing || []).forEach((row) => {
    const letter = row && typeof row === "object" ? row.letter : row;
    if (letter) used.push(letter);
  });
  return nextUnusedLetter(used, letters);
}

function dragLandingIndex(rows, clientY) {
  const list = rows || [];
  for (let i = 0; i < list.length; i++) {
    const top = list[i].top;
    const height = list[i].height != null ? list[i].height : (list[i].bottom - top);
    if (clientY < top + height / 2) return { index: i, beforeId: list[i].id };
  }
  return { index: list.length, beforeId: null };
}

this.letterForLanding = letterForLanding;
this.insertAtLanding = insertAtLanding;
this.placeDroppedItems = placeDroppedItems;
this.reorderForLetter = reorderForLetter;
this.reorderChainForLetter = reorderChainForLetter;
this.sortByResetOrder = sortByResetOrder;
this.nextUnusedLetter = nextUnusedLetter;
this.letterForNewItem = letterForNewItem;
this.dragLandingIndex = dragLandingIndex;
this.takesLandingLetter = takesLandingLetter;
