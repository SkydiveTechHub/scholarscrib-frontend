import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeEntities,
  parseQuestionMarkup,
  questionPlainText,
} from "../src/lib/question-markup";

const t = (text: string) => ({ type: "text", text });
const sup = (text: string) => ({ type: "sup", children: [t(text)] });
const sub = (text: string) => ({ type: "sub", children: [t(text)] });

test("number bases become subscripts (real provider text)", () => {
  assert.deepEqual(
    parseQuestionMarkup("Evaluate (212)<sub>3</sub>  - (121)<sub>3</sub>  + (222)<sub>3</sub>"),
    [t("Evaluate (212)"), sub("3"), t(" - (121)"), sub("3"), t(" + (222)"), sub("3")],
  );
});

test("powers become superscripts (real provider text)", () => {
  assert.deepEqual(parseQuestionMarkup("Factorise (4a + 3)<sup>2</sup>  - (3a - 2)<sup>2</sup>"), [
    t("Factorise (4a + 3)"),
    sup("2"),
    t(" - (3a - 2)"),
    sup("2"),
  ]);
});

test("Word equation brackets are dropped and caret powers raised", () => {
  assert.deepEqual(
    parseQuestionMarkup("Evaluate ((〖81〗<sup>(3/4)</sup> -〖27〗<sup>(1/3)</sup>)))/(3×2^3 )"),
    [t("Evaluate ((81"), sup("(3/4)"), t(" -27"), sup("(1/3)"), t(")))/(3×2"), sup("3"), t(" )")],
  );
});

test("caret exponents: signed numbers, letters and bracketed groups", () => {
  assert.deepEqual(parseQuestionMarkup("x^2 + 2^(1/3) + e^{-x} + 10^-3"), [
    t("x"),
    sup("2"),
    t(" + 2"),
    sup("1/3"),
    t(" + e"),
    sup("-x"),
    t(" + 10"),
    sup("-3"),
  ]);
});

test("a caret with nothing to raise stays as it is", () => {
  assert.deepEqual(parseQuestionMarkup("Use the ^ key, or ^2"), [t("Use the ^ key, or ^2")]);
  assert.deepEqual(parseQuestionMarkup("x^ab"), [t("x^ab")]);
});

test("stray line breaks mid-sentence collapse to a space", () => {
  assert.deepEqual(
    parseQuestionMarkup("A binary operation ⊗\n is defined by m ⊗ n on the set ∈\n R."),
    [t("A binary operation ⊗ is defined by m ⊗ n on the set ∈ R.")],
  );
});

test("<br> and block tags become line breaks, without doubling or trailing", () => {
  assert.deepEqual(parseQuestionMarkup("<p>Line one</p><p>Line two</p><br>"), [
    t("Line one"),
    { type: "br" },
    t("Line two"),
  ]);
});

test("unknown tags never become markup", () => {
  assert.deepEqual(parseQuestionMarkup('x<script>alert(1)</script><img src="a" onerror="b">'), [
    t('x<script>alert(1)</script><img src="a" onerror="b">'),
  ]);
});

test("comparisons in maths are not read as tags", () => {
  assert.deepEqual(parseQuestionMarkup("If a<b and c>d, then x < 3"), [
    t("If a<b and c>d, then x < 3"),
  ]);
});

test("transparent wrappers keep their content; bold and italic are kept", () => {
  assert.deepEqual(parseQuestionMarkup('<span style="x">The <b>main</b> <em>idea</em></span>'), [
    t("The "),
    { type: "b", children: [t("main")] },
    t(" "),
    { type: "i", children: [t("idea")] },
  ]);
});

test("unclosed and stray closing tags do not break the text", () => {
  assert.deepEqual(parseQuestionMarkup("x<sup>2 + y</sub>"), [t("x"), sup("2 + y")]);
});

test("entities are decoded, including inside a power", () => {
  assert.equal(decodeEntities("a &amp; b &lt; c &#215; d &#x221A; &nbsp;e"), "a & b < c × d √  e");
  assert.deepEqual(parseQuestionMarkup("10<sup>&minus;3</sup>"), [t("10"), sup("−3")]);
});

test("empty input yields nothing", () => {
  assert.deepEqual(parseQuestionMarkup(""), []);
  assert.deepEqual(parseQuestionMarkup(null), []);
  assert.deepEqual(parseQuestionMarkup("  <sup></sup> "), []);
});

test("plain text uses Unicode scripts where every character has one", () => {
  assert.equal(questionPlainText("(212)<sub>3</sub> + x<sup>2</sup>"), "(212)₃ + x²");
  assert.equal(questionPlainText("2^(1/3) and 13<sub>m</sub>"), "2^(1/3) and 13ₘ");
  assert.equal(questionPlainText("10<sup>-3</sup>"), "10⁻³");
  assert.equal(questionPlainText("a<sup>bc</sup>"), "a^(bc)");
});
