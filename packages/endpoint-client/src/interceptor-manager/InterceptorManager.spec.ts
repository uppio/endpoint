import { describe, it } from "vitest";
import InterceptorManager from "./InterceptorManager";
import type { Intercept } from "../types";

const getStringManager = (config?: { maxLoop?: number }) =>
  new InterceptorManager<Intercept<string>>(config);
describe("InterceptorManager", () => {
  it("should execute interceptors", async ({ expect }) => {
    const stringManager = getStringManager();
    stringManager.use({ fulfilled: (_ctx, d) => d + "a" });
    stringManager.use({ fulfilled: (_ctx, d) => d + "b" });
    stringManager.use({ fulfilled: (_ctx, d) => d + "c" });

    const d = await stringManager.run("input/");
    expect(d).toBe("input/abc");
  });

  it("should execute async interceptors", async ({ expect }) => {
    const stringManager = getStringManager();
    stringManager.use({ fulfilled: (_ctx, d) => d + "a" });
    stringManager.use({
      fulfilled: (_ctx, d) => new Promise((r) => r((d += "b"))),
    });
    stringManager.use({ fulfilled: (_ctx, d) => d + "c" });

    const d = await stringManager.run(Promise.resolve("input/"));
    expect(d).toBe("input/abc");
  });

  it("should throw exception at input exception", async ({ expect }) => {
    const stringManager = getStringManager();
    stringManager.use({ fulfilled: (_ctx, d) => d + "a" });
    stringManager.use({ fulfilled: (_ctx, d) => d + "b" });
    stringManager.use({ fulfilled: (_ctx, d) => d + "c" });

    await expect(
      async () =>
        await stringManager.run(Promise.reject(new Error("input error"))),
    ).rejects.toThrow("input error");
  });

  it("should throw exception at intercept exception", async ({ expect }) => {
    const stringManager = getStringManager();
    stringManager.use({ fulfilled: (_ctx, d) => d + "a" });
    stringManager.use({
      fulfilled: () => {
        throw new Error("intercept b error");
      },
    });
    stringManager.use({ fulfilled: (_ctx, d) => d + "c" });

    await expect(async () => await stringManager.run("input/")).rejects.toThrow(
      "intercept b error",
    );
  });

  it("should handle exceptions", async ({ expect }) => {
    const stringManager = getStringManager();
    stringManager.use({
      fulfilled: (_ctx, d) => d + "a",
    });
    stringManager.use({
      fulfilled: (_ctx, d) => d + "b",
      rejected: () => "rej-before-b/",
    });
    stringManager.use({
      fulfilled: (_ctx, d) => d + "c",
      rejected: () => "rej-before-c/",
    });

    const d = await stringManager.run(Promise.reject(new Error("input error")));
    expect(d).toBe("rej-before-b/bc");
  });
  it("should handle interceptor exceptions", async ({ expect }) => {
    const stringManager = getStringManager();
    stringManager.use({
      fulfilled: (_ctx) => {
        throw new Error("intercept a error");
      },
    });
    stringManager.use({
      fulfilled: (_ctx, d) => d + "b",
    });
    stringManager.use({
      fulfilled: (_ctx, d) => d + "c",
      rejected: () => "rej-before-c/",
    });

    const d = await stringManager.run("input/");
    expect(d).toBe("rej-before-c/c");
  });

  it("should restart interceptors", async ({ expect }) => {
    const stringManager = getStringManager();
    stringManager.use({ fulfilled: (_ctx, d) => d + "a" });
    stringManager.use({
      fulfilled: (_ctx, d) => {
        if (_ctx.loop === 1) {
          _ctx.reset();
          return "newloop/";
        }
        expect(_ctx.loop).toBe(2);
        return d + "b";
      },
    });
    stringManager.use({ fulfilled: (_ctx, d) => d + "c" });

    const d = await stringManager.run("input/");
    expect(d).toBe("newloop/abc");
  });

  it("should save meta", async ({ expect }) => {
    const stringManager = getStringManager();
    stringManager.use({
      fulfilled: (_ctx, d) => {
        _ctx.meta.set("test_key", "/meta-a/");
        return d + "a";
      },
    });
    stringManager.use({
      fulfilled: (_ctx, d) => d + _ctx.meta.get("test_key") || "b",
    });

    const d = await stringManager.run("input/");
    expect(d).toBe("input/a/meta-a/");
  });

  it("should save meta after restart interceptors", async ({ expect }) => {
    const stringManager = getStringManager();
    stringManager.use({
      fulfilled: (_ctx, d) => {
        if (_ctx.meta.get("test_key") === "retry") {
          return d + "b";
        }
        if (_ctx.loop === 1) {
          _ctx.reset();
          _ctx.meta.set("test_key", "retry");
        }
        return d + "a";
      },
    });
    stringManager.use({ fulfilled: (_ctx, d) => d + "c" });

    const d = await stringManager.run("input/");
    expect(d).toBe("input/abc");
  });

  it("should throw exception at max loop", async ({ expect }) => {
    const stringManager = getStringManager({ maxLoop: 3 });
    stringManager.use({
      fulfilled: (_ctx, d) => {
        if (_ctx.loop < 10) {
          _ctx.reset();
        }
        return d + "a";
      },
    });
    stringManager.use({ fulfilled: (_ctx, d) => d + "b" });

    await expect(async () => await stringManager.run("input/")).rejects.toThrow(
      Error,
    );
  });

  it("should eject interceptor", async ({ expect }) => {
    const stringManager = getStringManager();
    stringManager.use({ fulfilled: (_ctx, d) => d + "a" });
    const id = stringManager.use({ fulfilled: (_ctx, d) => d + "b" });
    stringManager.use({ fulfilled: (_ctx, d) => d + "c" });

    stringManager.eject(id);

    const d = await stringManager.run("input/");
    expect(d).toBe("input/ac");
  });

  it("should clear interceptors", async ({ expect }) => {
    const stringManager = getStringManager();
    stringManager.use({ fulfilled: (_ctx, d) => d + "a" });
    stringManager.use({ fulfilled: (_ctx, d) => d + "b" });
    stringManager.use({ fulfilled: (_ctx, d) => d + "c" });

    stringManager.clear();

    const d = await stringManager.run("input/");
    expect(d).toBe("input/");
  });
});
