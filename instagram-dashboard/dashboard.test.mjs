import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const scriptStart = html.indexOf("<script>");
const scriptEnd = html.lastIndexOf("</script>");
const script = html.slice(scriptStart + "<script>".length, scriptEnd);

test("dashboard inline JavaScript parses", () => {
  assert.ok(scriptStart >= 0 && scriptEnd > scriptStart, "inline dashboard script exists");
  assert.doesNotThrow(() => new vm.Script(script));
});
test("dashboard contains the expected millet recipe queue", () => {
  const ids = script.match(/id:"r[0-9]+"/g) || [];
  assert.equal(ids.length, 15, "expected 15 recipe drafts");
  assert.match(html, /Foxtail Millet Pongal/);
  assert.match(html, /Little Millet Upma/);
  assert.match(html, /Ragi Dosa/);
});
test("publishing is locked in the front-end prototype", () => {
  assert.ok(html.includes("Publish to Instagram · locked"));
  assert.ok(html.includes("temporary in this browser session only"));
  assert.ok(html.includes("https://drive.google.com/file/d/1NrklyW7oa6wXROgdQS49xJruYOzZ-GZZ/view"));
});
