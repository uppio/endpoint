import type { ClientConfig, RequestBody } from "./types";
import { isJSONSerializable } from "./utils";

export const defaultConfig = {
  serializer: (query) => {
    if (typeof query === "undefined") {
      return "";
    }
    return new URLSearchParams(query).toString();
  },
  transformRequestBody: (body) => {
    if (isJSONSerializable(body)) {
      return typeof body === "string" ? body : JSON.stringify(body);
    }

    return body as RequestBody;
  },
} satisfies Partial<ClientConfig>;
