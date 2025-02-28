export type MutationMethod = "post" | "put" | "patch" | "delete";
export type SafeMethod = "get" | "head" | "options";

export type Method = SafeMethod | MutationMethod;

export type EndpointPrimary = {
  name?: string;
  path: string;
  method: Method;
};

export interface EndpointMeta extends Record<string | number | symbol, any> {}

export type Parser<In = unknown, Out = In> = (val: In) => Out;

export type ResParseMap<S = unknown, DTO = S, C = DTO> = {
  client?: Parser<unknown, C>;
  service?: Parser<S, DTO>;
};

export type ReqParseMap<C = unknown, DTO = C, S = DTO> = {
  client?: Parser<C, DTO>;
  service?: Parser<unknown, S>;
};

export type EndpointParse = {
  request?: {
    body?: ReqParseMap<any>;
    header?: ReqParseMap<any>;
    query?: ReqParseMap<any>;
  };
  response?: {
    body?: ResParseMap<any>;
    header?: ResParseMap<any>;
  };
};

export type EndpointDefinition<P extends EndpointParse = EndpointParse> =
  EndpointPrimary & {
    parse?: P;
    meta?: EndpointMeta;
  };

type Get<T, K> = K extends `${infer A}.${infer B}`
  ? A extends keyof T
    ? Get<T[A], B>
    : never
  : K extends keyof T
    ? T[K]
    : never;

export type ResponseParseKeys = "body" | "header";
export type RequestParseKeys = "query" | "body" | "header";

export type ParsePath =
  | `response.${ResponseParseKeys}`
  | `request.${RequestParseKeys}`;

export type FullParsePath = `${ParsePath}.${"client" | "service"}`;

export type ExtractTarget = `${FullParsePath}:${"in" | "out"}`;

export type ExtractParseType<
  E extends EndpointDefinition,
  Target extends ExtractTarget,
> = Target extends `${infer Path}:${infer Mode}`
  ? Get<E, `parse.${Path}`> extends never
    ? never
    : Get<E, `parse.${Path}`> extends Parser<infer In, infer Out>
      ? Mode extends "in"
        ? In
        : Out
      : never
  : never;

type Split<Str, Sep extends string, Acc extends string[] = []> = Str extends ""
  ? Acc
  : Str extends `${infer T}${Sep}${infer U}`
    ? Split<U, Sep, [...Acc, T]>
    : [...Acc, Str];

type ConcatSplits<
  Parts extends string[],
  Seps extends string[],
  Acc extends string[] = [],
> = Parts extends [infer First extends string, ...infer Rest extends string[]]
  ? ConcatSplits<Rest, Seps, [...Acc, ...SplitMany<First, Seps>]>
  : Acc;

type SplitMany<
  Str extends string,
  Sep extends string[],
  Acc extends string[] = [],
> = Sep extends [
  infer FirstSep extends string,
  ...infer RestSep extends string[],
]
  ? ConcatSplits<Split<Str, FirstSep>, RestSep>
  : [Str, ...Acc];

type PathSeparator = ["/", "?", "&", "#", "=", "(", ")", "[", "]", "%"];

type FilterParams<Params, Acc extends string[] = []> = Params extends [
  infer First,
  ...infer Rest,
]
  ? First extends `${string}:${infer Param}`
    ? FilterParams<Rest, [...Acc, ...Split<Param, ":">]>
    : FilterParams<Rest, Acc>
  : Acc;

type PathToParams<Path extends string> = FilterParams<
  SplitMany<Path, PathSeparator>
>;

export type PathParamKeys<Path> = Path extends string
  ? PathToParams<Path>[number]
  : never;
