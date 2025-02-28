import type {
  EndpointDefinition,
  EndpointPrimary,
  Method,
} from "@uppio/endpoint";
import type { IfNever, JsonValue, Promisable } from "type-fest";
import type {
  ExtractParseType,
  PathParamKeys,
  ReqParseMap,
  RequestParseKeys,
} from "@uppio/endpoint/src";
import type {
  DefinedKeys,
  IsUndefinedOnly,
  NeverIfEmpty,
  NotDefinedKeys,
  ObjectWithKeys,
  PickDefined,
} from "./utils.types";

export type PathParams<Path extends string> = NeverIfEmpty<
  Record<PathParamKeys<Path>, string | number>
>;

export type RequestBody =
  | Blob
  | BufferSource
  | FormData
  | URLSearchParams
  | string;

export type JsonSerializable = JsonValue | { toJSON: () => JsonValue };
export type InitRequestBody = RequestBody | JsonSerializable;

export type RawConfig = {
  method: Method;
  path: string;
  headers?: HeadersInit;
  params?: Record<string, string | number>;
  query?: unknown;
  body?: InitRequestBody;
};

export type RequestConfig = {
  method: Method;
  path: string;
  headers: Headers;
  params?: Record<string, string | number>;
  query?: unknown;
  body?: InitRequestBody;
};

export type RequestType = {
  url: string;
  method: Method;
  headers: Headers;
  body?: RequestBody;
};

export type ResponseType<T = unknown> = {
  status: number;
  statusText: string;
  headers: Headers;
  data: T;
};

export type ResponseContentType = "blob" | "text" | "arrayBuffer" | "json";

/**
 * TODO WIP
 */
export type ProgressEvent = {};

export type RequestContext = {
  signal?: AbortSignal;
  // onUploadProgress?: (event: ProgressEvent) => void;
  // onDownloadProgress?: (event: ProgressEvent) => void;
};

export type Adapter = (
  config: RequestType,
  context?: RequestContext,
) => Promise<ResponseType>;

export type ClientConfig = {
  serializer: (query: any) => string;
  transformRequestBody: (
    body: InitRequestBody,
    headers: Headers,
  ) => RequestBody;
};

export type InterceptCtx = {
  reset: () => void;
  meta: Map<any, any>;
  loop: number;
};

export type Intercept<T, M = never> = IfNever<
  M,
  {
    fulfilled?: (ctx: InterceptCtx, data: Promisable<T>) => Promisable<T>;
    rejected?: (ctx: InterceptCtx, reason: unknown) => Promisable<T>;
  },
  {
    fulfilled?: (
      ctx: InterceptCtx,
      data: Promisable<T>,
      meta: M,
    ) => Promisable<T>;
    rejected?: (ctx: InterceptCtx, reason: unknown, meta: M) => Promisable<T>;
  }
>;

export type InterceptRequest = Intercept<
  RequestConfig,
  {
    original: RequestConfig;
  }
>;

export type InterceptResponse = Intercept<
  ResponseType,
  {
    endpoint: EndpointPrimary;
    request: RequestType;
    refetch: (
      transformConfig?: (config: RequestConfig) => RequestConfig,
    ) => Promise<ResponseType>;
  }
>;

//

type DefaultRequestTypes = ObjectWithKeys<
  RequestParseKeys,
  {
    body: InitRequestBody;
    header: HeadersInit;
    query: any;
  }
>;

export type AvailableRequestParsers = {
  [K in RequestParseKeys]?: ReqParseMap<
    any,
    DefaultRequestTypes[K] | undefined,
    any
  >;
};

type RequestParseExtract<E extends EndpointDefinition> = {
  [K in RequestParseKeys]: ExtractParseType<E, `request.${K}.client:in`>;
};

// export type RequestVars<E extends EndpointDefinition> =
//   HasParseSection<E, "request"> extends true
//     ? PickDefined<RequestParseExtract<E>>
//     : Partial<DefaultRequestTypes>;

export type RequestVars<
  E extends EndpointDefinition,
  Extracted = RequestParseExtract<E>,
> = PickDefined<{
  [K in DefinedKeys<Extracted>]: IsUndefinedOnly<Extracted[K]> extends true
    ? never
    : Extracted[K];
}> & {
  [K in NotDefinedKeys<Extracted>]?: K extends RequestParseKeys
    ? DefaultRequestTypes[K]
    : never;
};

export type TypedResponse<
  E extends EndpointDefinition,
  T = ExtractParseType<E, `response.body.client:out`>,
> = ResponseType<[T] extends [never] ? unknown : T>;
