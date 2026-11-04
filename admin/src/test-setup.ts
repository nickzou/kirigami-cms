// CodeMirror measures text with ranges, which jsdom does not implement. These
// stand-ins say "nothing to measure", which is enough to type and read text in
// tests (what real layout looks like is checked in a browser).
if (typeof Range !== "undefined") {
  const noRects = () => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* () {},
  });
  Range.prototype.getClientRects ??= noRects as never;
  Range.prototype.getBoundingClientRect ??= (() => new DOMRect()) as never;
}
