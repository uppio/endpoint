import type { Intercept } from "../types";

type Tail<T extends any[]> = T extends [infer F, ...infer Tail] ? Tail : never;

type Config = {
  maxLoop: number;
};

export default class InterceptorManager<T extends Intercept<any, any>> {
  private items: Array<T | null> = [];
  private readonly config: Config = {
    maxLoop: 50,
  };

  constructor(config?: Partial<Config>) {
    this.config = { ...this.config, ...config };
  }

  use(config: T) {
    this.items.push(config);
    return this.items.length - 1;
  }

  eject(id: number) {
    if (this.items[id]) {
      this.items[id] = null;
    }
  }

  clear() {
    this.items = [];
  }

  run(...args: Tail<Parameters<NonNullable<T["fulfilled"]>>>) {
    const [data, meta] = args;

    let ctx_meta = new Map();
    let loop = 1;
    let i = 0;
    const reset = () => {
      loop++;
      i = 0;
    };

    const next = async (
      d: typeof data,
    ): Promise<ReturnType<NonNullable<T["fulfilled"]>>> => {
      if (loop > this.config.maxLoop) {
        throw new Error(
          `interceptor has reached the maximum number of cycles: {${this.config.maxLoop}}`,
        );
      }
      let promise = Promise.resolve(d);
      if (i > this.items.length) {
        return promise;
      }

      const item = this.items[i++];
      if (!item) {
        return promise.then(next);
      }
      const { fulfilled, rejected } = item;
      const ctx = {
        loop,
        reset,
        meta: ctx_meta,
      };

      if (rejected) {
        promise = promise.catch((reason) => rejected(ctx, reason, meta));
      } else {
        try {
          const r = await promise;
          promise = Promise.resolve(r);
        } catch (reason) {
          return next(Promise.reject(reason));
        }
      }

      if (fulfilled) {
        promise = promise.then((result) => fulfilled(ctx, result, meta));
      }

      return promise.catch((reason) => next(Promise.reject(reason))).then(next);
    };

    return next(data);
  }
}
