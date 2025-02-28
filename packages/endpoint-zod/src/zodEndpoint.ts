import type {
  EndpointDefinition,
  EndpointParse,
  Parser,
  ReqParseMap,
  ResParseMap,
} from "@uppio/endpoint/src";
import type { input, ZodType, ZodTypeDef } from "zod";
import type { Entry, Merge } from "type-fest";
import { makeEndpoint } from "@uppio/endpoint";

type ConvertParserPartMap<T extends ResParseMap | ReqParseMap> = {
  [K in keyof T]?: NonNullable<T[K]> extends Parser<infer In, infer Out>
    ? ZodType<Out, ZodTypeDef, In>
    : never;
};

type ConvertParserParts<T extends EndpointParse[keyof EndpointParse]> = {
  [K in keyof T]?: ConvertParserPartMap<NonNullable<T[K]>>;
};

type ZodEndpoint = Omit<EndpointDefinition, "parse"> & {
  schema?: {
    [K in keyof EndpointParse]?: ConvertParserParts<EndpointParse[K]>;
  };
};

function makeParser(schema: ZodType, path: string) {
  return (val: input<ZodType>) => {
    const result = schema.safeParse(val);
    if (result.success) {
      return result.data;
    }
    throw Error("Zod parse error " + path);
  };
}

type ConvertSchemaToParse<T> = {
  [K in keyof T]: T[K] extends never
    ? never
    : NonNullable<T[K]> extends ZodType<infer Out, any, infer In>
      ? Parser<In, Out>
      : ConvertSchemaToParse<T[K]>;
};

export const makeZodEndpoint = <const T extends ZodEndpoint>(
  endpoint: T,
): Merge<
  Omit<T, "schema">,
  {
    parse: ConvertSchemaToParse<T["schema"]>;
  }
> => {
  const { schema, ...primary } = endpoint;
  if (!schema) {
    return makeEndpoint(endpoint) as any;
  }

  const parse = Object.entries(schema).reduce<EndpointParse>((acc, entry) => {
    const [target, parts] = entry as Entry<typeof schema>;
    if (!parts) {
      return acc;
    }

    type Acc = typeof acc;

    acc[target] = Object.entries(parts).reduce<Acc[keyof Acc]>(
      (targetAcc, partEntry) => {
        const [part, sideMap] = partEntry as Entry<typeof parts>;
        if (!sideMap) {
          return targetAcc;
        }

        type TargetAcc = NonNullable<typeof targetAcc>;

        targetAcc![part as keyof TargetAcc] = Object.entries(sideMap).reduce<
          TargetAcc[keyof TargetAcc]
        >((partAcc, sideEntry) => {
          const [side, schema] = sideEntry as Entry<typeof sideMap>;
          if (!schema) {
            return partAcc;
          }

          partAcc![side] = makeParser(
            schema,
            `${primary.name || `[${primary.method}] ${primary.path}`}:${target}.${part}.${side}`,
          );

          return partAcc;
        }, {});
        return targetAcc;
      },
      {},
    );
    return acc;
  }, {});

  return { ...primary, parse } as any;
};
