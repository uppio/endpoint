import type { InterceptResponse, ResponseType } from "../types";

type ErrorCreateParams = {
  message: string;
};

type ValidateResponseParams = {
  validate?: (response: ResponseType) => ErrorCreateParams | void;
};
const defaultParams = {
  validate: (response) => {
    if (response.status < 200 || response.status >= 300) {
      return { message: `Request failed with status code ${response.status}` };
    }
    return;
  },
} satisfies Partial<ValidateResponseParams>;

/**
 * TODO WIP
 */
export const validateResponseInterceptor = (
  params: ValidateResponseParams,
): InterceptResponse => {
  const { validate } = { ...defaultParams, ...params };
  return {
    fulfilled: async (_ctx, data) => {
      const response = await data;

      const result = validate(response);
      if (typeof result === "object") {
        throw new Error(result.message);
      }

      return response;
    },
  };
};
