import type { InterceptResponse, ResponseType } from "../types";

type RepeatParams = {
  count: number;
  isNeed: (res: ResponseType) => boolean;
  delay: number;
};

const defaultParams = {
  delay: 0,
  isNeed: (response) => {
    return [
      408, // Request Timeout
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ].includes(response.status);
  },
} satisfies Partial<RepeatParams>;

const payloadMethods = new Set(["PATCH", "POST", "PUT", "DELETE"]);
const RepeatCountKey = Symbol();
export const retryInterceptor = (
  params: Partial<RepeatParams>,
): InterceptResponse => {
  const { count, isNeed, delay } = { ...defaultParams, ...params };
  return {
    fulfilled: async (ctx, data, meta) => {
      const retryLimit =
        count ??
        (payloadMethods.has(meta.request.method.toUpperCase()) ? 0 : 1);
      const response = await data;
      if (!isNeed(response)) {
        return response;
      }

      const currentRepeats = ctx.meta.get(RepeatCountKey) || 0;
      if (currentRepeats >= retryLimit) {
        return response;
      }
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      ctx.meta.set(RepeatCountKey, currentRepeats + 1);
      ctx.reset();
      return meta.refetch();
    },
  };
};
