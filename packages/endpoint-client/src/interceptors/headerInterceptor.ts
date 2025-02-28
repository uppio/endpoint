import type { InterceptRequest } from "../types";

type ProvideType = "replace" | "append" | "default";

type HeaderValue =
  | {
      key: string;
      value: string;
    }
  | [string, string];

type HeaderConfig = {
  type: ProvideType;
  headers: Array<HeaderValue> | Record<string, string>;
};

const handleHeaders = (
  headers: Headers,
  type: ProvideType,
  config: HeaderValue,
) => {
  const [key, value] = Array.isArray(config)
    ? config
    : [config.key, config.value];

  switch (type) {
    case "append": {
      headers.append(key, value);
      break;
    }
    case "replace": {
      headers.set(key, value);
      break;
    }
    default: {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }
  }
};
export const headerInterceptor = (
  params: HeaderConfig | Array<HeaderConfig>,
): InterceptRequest => {
  const list = Array.isArray(params) ? params : [params];
  1;
  return {
    fulfilled: async (ctx, data) => {
      const config = await data;

      const newHeaders = new Headers(config.headers);

      list.forEach((item) => {
        const { type, headers } = item;
        const _headers = Array.isArray(headers)
          ? headers
          : Object.entries(headers);
        _headers.forEach((header) => handleHeaders(newHeaders, type, header));
      });
      return {
        ...config,
        headers: newHeaders,
      };
    },
  };
};

export const defaultHeaders = headerInterceptor({
  type: "default",
  headers: {
    "content-type": "application/json",
    accept: "application/json",
  },
});
