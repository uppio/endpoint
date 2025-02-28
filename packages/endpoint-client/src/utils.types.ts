import type { IfEmptyObject, IsAny, Simplify } from "type-fest";

export type Merge<T, U> = Simplify<T & U>;
export type NeverIfEmpty<T> = IfEmptyObject<T, never, T>;

export type DefinedKeys<T> = {
  [K in keyof T]: T[K] extends never ? never : K;
}[keyof T];
export type NotDefinedKeys<T> = {
  [K in keyof T]: T[K] extends never ? K : never;
}[keyof T];

export type PickDefined<T> = Pick<T, DefinedKeys<T>>;

export type ObjectWithKeys<K extends string, T extends Record<K, any>> = T;

export type IsUndefinedOnly<T> =
  IsAny<T> extends true ? false : [T] extends [undefined] ? true : false;
