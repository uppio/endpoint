import type { JsonSerializable, ResponseContentType } from "./types";

export function omit<T, K extends keyof T>(
  obj: T | undefined,
  keys: K[],
): Omit<T, K> {
  const ret = { ...obj } as T;
  for (const key of keys) {
    delete ret[key];
  }
  return ret;
}

const typeofPrimitives = new Set(["string", "number", "boolean"]);
export function isJSONSerializable(value: unknown): value is JsonSerializable {
  if (value === undefined) {
    return false;
  }
  if (typeofPrimitives.has(typeof value) || value === null) {
    return true;
  }
  if (typeof value !== "object") {
    return false; // bigint, function, symbol, undefined
  }
  if (Array.isArray(value)) {
    return true;
  }

  if ("buffer" in value) {
    return false;
  }
  return (
    (value.constructor && value.constructor.name === "Object") ||
    ("toJSON" in value && typeof value.toJSON === "function")
  );
}

const textTypes = new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html",
]);

const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
export function detectResponseType(_contentType = ""): ResponseContentType {
  if (!_contentType) {
    return "json";
  }

  const contentType = _contentType.split(";").shift() || "";

  if (JSON_RE.test(contentType)) {
    return "json";
  }

  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }

  return "blob";
}
