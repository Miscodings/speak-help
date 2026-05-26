import { highlight, FILLERS } from "@/lib/highlight";

describe("FILLERS list", () => {
  test("contains core vocal fillers", () => {
    expect(FILLERS).toContain("um");
    expect(FILLERS).toContain("uh");
    expect(FILLERS).toContain("er");
    expect(FILLERS).toContain("ah");
  });

  test("contains discourse fillers", () => {
    expect(FILLERS).toContain("like");
    expect(FILLERS).toContain("basically");
    expect(FILLERS).toContain("you know");
    expect(FILLERS).toContain("literally");
    expect(FILLERS).toContain("i mean");
  });
});

describe("highlight()", () => {
  test("wraps a single filler word in a span", () => {
    const result = highlight("I was um going to the store.");
    expect(result).toContain('<span class="filler-word">um</span>');
  });

  test("is case-insensitive", () => {
    const result = highlight("Like I said, UM, that is wrong.");
    expect(result).toContain('<span class="filler-word">Like</span>');
    expect(result).toContain('<span class="filler-word">UM</span>');
  });

  test("wraps multi-word filler phrases", () => {
    const result = highlight("And you know what I mean.");
    expect(result).toContain('<span class="filler-word">you know</span>');
  });

  test("does not wrap partial word matches", () => {
    // 'so' should not match inside 'also'
    const result = highlight("I also went there.");
    expect(result).not.toContain('<span class="filler-word">so</span>');
  });

  test("escapes HTML special characters before wrapping", () => {
    const result = highlight("<script>alert(1)</script> um done");
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain("<script>");
  });

  test("returns unchanged text when no fillers present", () => {
    const clean = "The presentation impressed the entire audience.";
    expect(highlight(clean)).toBe(clean);
  });

  test("wraps multiple different fillers in one string", () => {
    const result = highlight("So basically I was like, uh, not ready.");
    expect(result).toContain('<span class="filler-word">So</span>');
    expect(result).toContain('<span class="filler-word">basically</span>');
    expect(result).toContain('<span class="filler-word">like</span>');
    expect(result).toContain('<span class="filler-word">uh</span>');
  });
});
