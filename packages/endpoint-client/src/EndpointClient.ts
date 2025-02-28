import type {
  Adapter,
  AvailableRequestParsers,
  ClientConfig,
  InterceptRequest,
  InterceptResponse,
  PathParams,
  RawConfig,
  RequestConfig,
  RequestContext,
  RequestType,
  RequestVars,
  ResponseType,
  TypedResponse,
} from "./types";
import { omit } from "./utils";
import InterceptorManager from "./interceptor-manager/InterceptorManager";
import type { Merge, PickDefined } from "./utils.types";
import type {
  Parser,
  RequestParseKeys,
  ResParseMap,
  ResponseParseKeys,
  EndpointDefinition,
} from "@uppio/endpoint";
import { replacePathParams } from "@uppio/endpoint";
import { defaultConfig } from "./defaults";
import type { Simplify } from "type-fest";

const parsersKeyMap: {
  request: Record<RequestParseKeys, keyof RawConfig>;
  response: Record<ResponseParseKeys, keyof ResponseType>;
} = {
  request: {
    body: "body",
    query: "query",
    header: "headers",
  },
  response: {
    body: "data",
    header: "headers",
  },
};

type AvailableEndpoint = EndpointDefinition<{
  request?: AvailableRequestParsers;
  response?: {
    body?: ResParseMap<any>;
    header?: ResParseMap<any>;
  };
}>;

export default class EndpointClient {
  public interceptors: {
    request: InterceptorManager<InterceptRequest>;
    response: InterceptorManager<InterceptResponse>;
  };
  private config: ClientConfig;

  constructor(
    private adapter: Adapter,
    config?: Partial<ClientConfig>,
  ) {
    this.config = { ...defaultConfig, ...config };
    this.interceptors = {
      request: new InterceptorManager<InterceptRequest>(),
      response: new InterceptorManager<InterceptResponse>(),
    };
  }

  async send<E extends AvailableEndpoint>(
    requestInit: { endpoint: E } & Merge<
      PickDefined<{
        params: PathParams<E["path"]>;
      }>,
      RequestVars<E>
    >,
    context?: RequestContext,
  ) {
    const { endpoint, ...configVars } = requestInit;
    const rawConfig: RawConfig = {
      ...configVars,
      ...omit(endpoint, ["name", "parse"]),
    };

    const parsedConfig = this.parseRequest(endpoint, rawConfig);

    const requestConfig: RequestConfig = {
      ...parsedConfig,
      headers: new Headers(parsedConfig.headers),
    };
    const configCopy = Object.freeze({
      ...requestConfig,
      headers: Object.freeze(new Headers(requestConfig.headers)),
    });

    const resultConfig = await this.interceptors.request.run(requestConfig, {
      original: configCopy,
    });

    const request = this.buildRequest(resultConfig);

    const responsePromise = this.adapter(request, context);

    const endpointPrimary = omit(endpoint, ["parse"]);
    const response = await this.interceptors.response.run(
      responsePromise,
      Object.freeze({
        endpoint: endpointPrimary,
        request,
        refetch: (build) => {
          let r = request;
          if (build) {
            r = this.buildRequest(
              build({
                ...resultConfig,
                headers: new Headers(requestConfig.headers),
              }),
            );
          }
          return this.adapter(r, context);
        },
      }),
    );

    return this.parseResponse(endpoint, response) as Simplify<TypedResponse<E>>;
  }

  private parseRecord<T, P extends Record<string, keyof T>>(
    data: T,
    parserMap: P,
    getParser: (key: keyof P) => Parser<any> | undefined,
  ) {
    return Object.entries(parserMap).reduce<T>(
      (acc, [parserKey, valueKey]) => {
        const parser = getParser(parserKey);
        const value = acc[valueKey];
        if (!parser) {
          return acc;
        }
        acc[valueKey] = parser(value);
        return acc;
      },
      { ...data },
    );
  }

  private parseRequest(endpoint: EndpointDefinition, request: RawConfig) {
    const parsers = endpoint.parse?.request;
    if (!parsers) {
      return request;
    }

    return this.parseRecord(
      request,
      parsersKeyMap.request,
      (key) => parsers[key]?.client,
    );
  }

  private parseResponse(endpoint: EndpointDefinition, response: ResponseType) {
    const parsers = endpoint.parse?.response;
    if (!parsers) {
      return response;
    }

    return this.parseRecord(
      response,
      parsersKeyMap.response,
      (key) => parsers[key]?.client,
    );
  }

  private buildRequest(config: RequestConfig) {
    const { path, params, query, method, body, headers } = config;
    const request: RequestType = {
      url: this.buildUrl(path, { params, query }),
      method,
      headers,
      body:
        typeof body === "undefined"
          ? undefined
          : this.config.transformRequestBody(body, headers),
    };
    return request;
  }

  private buildUrl(
    path: string,
    vars: { params?: Record<string, string | number>; query?: unknown },
  ) {
    let url = replacePathParams(path, vars.params);
    const serializedQuery =
      typeof vars.query === "undefined"
        ? ""
        : this.config.serializer(vars.query);
    if (serializedQuery) {
      const hashMarkIndex = url.indexOf("#");
      if (hashMarkIndex !== -1) {
        url = url.slice(0, hashMarkIndex);
      }
      url += (url.indexOf("?") === -1 ? "?" : "&") + serializedQuery;
    }
    return url;
  }
}
