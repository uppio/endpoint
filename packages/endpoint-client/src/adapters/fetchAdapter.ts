import type { Adapter } from "../types";
import { detectResponseType } from "../utils";

export const createFetchAdapter = (): Adapter => async (config, context) => {
  const response = await fetch(config.url, {
    method: config.method,
    headers: config.headers,
    signal: context?.signal,
  });

  const contentType = detectResponseType(
    response.headers.get("content-type") || "",
  );

  const data = await response[contentType]();

  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data,
  };
};
