import { EndpointDefinition, ReqParseMap, ResParseMap } from "./types";

const parseNothing = (v: any) => v;
export const saveRequestType = <T>(): Required<ReqParseMap<T>> => ({
  client: parseNothing,
  service: parseNothing,
});
export const saveResponseType = <T>(): Required<ResParseMap<T>> => ({
  client: parseNothing,
  service: parseNothing,
});

export function makeEndpoint<const T extends EndpointDefinition>(endpoint: T) {
  return endpoint;
}

const paramsRegExp = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

export function replacePathParams(
  path: string,
  params?: Record<string, string | number>,
) {
  let result: string = path;
  if (params) {
    result = result.replace(paramsRegExp, (match, key) =>
      key in params ? `${params[key]}` : match,
    );
  }
  return result;
}
