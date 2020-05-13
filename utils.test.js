const {
  normalizeToAngleBracketComponent,
  waitForFileNameContains,
  watcherFn,
  hasMatchFunctions,
} = require("./utils");

describe("normalizeToAngleBracketComponent", () => {
  it("ok", () => {
    expect(normalizeToAngleBracketComponent("foo-bar")).toBe("FooBar");
    expect(normalizeToAngleBracketComponent("foo-bar/baz-boo")).toBe(
      "FooBar::BazBoo"
    );
    expect(normalizeToAngleBracketComponent("foo.boo")).toBe("foo.boo");
  });
});

describe("waitForFileNameContains", () => {
  it("ok", async () => {
    try {
      const waiter = waitForFileNameContains("foo", 100);
      expect(hasMatchFunctions()).toBe(true);
      watcherFn("fos", 2);
      expect(hasMatchFunctions()).toBe(true);
      watcherFn("foo", 2);
      expect(hasMatchFunctions()).toBe(false);
      await waiter;
    } catch (e) {
      expect(e.toString()).toBe(null);
    }
  });
  it("failing", async () => {
    try {
      const waiter = waitForFileNameContains("foo", 100);
      watcherFn("foz", 1);
      expect(hasMatchFunctions()).toBe(true);
      await waiter;
    } catch (e) {
      expect(hasMatchFunctions()).toBe(false);
    }
  });
  it("removing", async () => {
    const waiter = waitForFileNameContains("foo", 100);
    expect(hasMatchFunctions()).toBe(true);
    watcherFn("foo", 2);
    expect(hasMatchFunctions()).toBe(false);
    await waiter;
  });
  it("has default timeout", async () => {
    const waiter = waitForFileNameContains("foo");
    expect(hasMatchFunctions()).toBe(true);
    watcherFn("foo", 2);
    expect(hasMatchFunctions()).toBe(false);
    await waiter;
    expect(1).toBe(1);
  });
});
