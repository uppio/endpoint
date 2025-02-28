import type { RequestType, ResponseType } from "./types";

export type NetworkErrorReason =
  | "ABORTED"
  | "TIME_OUT"
  | "ERR_NETWORK"
  | "BAD_STATUS"
  | "CANCELED";

type NetworkErrorInit = {
  request: RequestType;
  message?: string;
  response?: ResponseType;
  reason?: NetworkErrorReason;
};

export class NetworkError extends Error {
  public readonly reason?: NetworkErrorReason;
  public readonly request: RequestType;
  public readonly response?: ResponseType;
  constructor(init: NetworkErrorInit, options?: ErrorOptions) {
    super(init.message, options);
    this.reason = init.reason;
    this.request = init.request;
    this.response = init.response;
    this.name = "NetworkError";
  }
}

export const isNetworkError = (val: unknown): val is NetworkError => {
  return val instanceof NetworkError && val.name === "NetworkError";
};

export const createError = (
  init: Omit<NetworkErrorInit, "message">,
  parentError?: unknown,
) => {
  const errorMessage =
    (parentError instanceof Error && parentError.message) ||
    parentError?.toString() ||
    "";

  const requestStr = `[${init.request.method}] ${JSON.stringify(init.request.url)}`;

  const statusStr = init.response
    ? `${init.response.status} ${init.response.statusText}`
    : "<no response>";

  const message = `${requestStr}: ${statusStr}${
    errorMessage ? ` ${errorMessage}` : ""
  }`;

  return new NetworkError(
    { message, ...init },
    {
      cause: parentError,
    },
  );
};
