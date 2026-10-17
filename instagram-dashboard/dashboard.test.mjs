import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const scriptMatch = html.match(/<script>([\\s\\S]*?)<\\/script>/);
test("dashboard inline JavaScript parses", () => {
  assert.ok(scriptMatch, "inline dashboard script exists");
  assert.doesNotThrow(() => new vm.Script(scriptMatch[1]));
});
test("dashboard contains the expected millet recipe queue", () => {
  const ids = [...scriptMatch[1].matchAll(/id:"r\\d+"/g)];
  assert.equal(ids.length, 15, "expected 15 recipe drafts");
  assert.match(html, /Foxtail Millet Pongal/);
  assert.match(html, /Little Millet Upma/);
  assert.match(html, /Ragi Dosa/);
});
test("publishing is locked in the front-end prototype", () => {
  assert.match(html, /Publish to Instagram · locked/);
  assert.match(html, /temporary in-page state only/);
  assert.match(html, /drive\\.google\\.com\\/file\\/d\\/1NrklyW7oa6wXROgdQS49xJruYOzZ-GZZ/);
});
