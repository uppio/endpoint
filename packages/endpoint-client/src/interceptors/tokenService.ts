import type {
  InterceptRequest,
  InterceptResponse,
  RequestConfig,
  ResponseType,
} from "../types";

type TokenParams = {
  getToken: () => string;
  setToken?: (token: string) => void;
  getNewToken?: () => Promise<string>;
  provideToken?: (config: RequestConfig, token: string) => RequestConfig;
  isExpired?: (token: string) => boolean;
  isForbiddenResponse?: (response: ResponseType) => boolean;
};

const defaultParams = {
  provideToken: (config: RequestConfig, token: string) => {
    const headers = new Headers(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return {
      ...config,
      headers,
    };
  },
  isExpired: () => false,
  isForbiddenResponse: (response: ResponseType) => {
    return response.status === 401;
  },
} satisfies Partial<TokenParams>;

const RetryKey = Symbol("RetryKey");
export const tokenService = (params: TokenParams) => {
  const {
    getToken,
    getNewToken,
    setToken,
    provideToken,
    isExpired,
    isForbiddenResponse,
  } = {
    ...defaultParams,
    ...params,
  };
  let refreshRequest: null | Promise<void> = null;

  const refreshAvailable = !!getNewToken;
  const refreshToken = async () => {
    if (refreshRequest) {
      return refreshRequest;
    }
    if (!getNewToken) {
      throw new Error("Token refresh not implemented");
    }

    refreshRequest = getNewToken()
      .then((newToken) => {
        if (setToken) {
          setToken(newToken);
        }
      })
      .finally(() => {
        refreshRequest = null;
      });

    return refreshRequest;
  };

  const requestIntercept: InterceptRequest = {
    fulfilled: async (_ctx, data) => {
      const config = await data;
      if (refreshAvailable && isExpired(getToken())) {
        await refreshToken();
      }

      return provideToken(config, getToken());
    },
  };
  const responseIntercept: InterceptResponse = {
    fulfilled: async (_ctx, data, meta) => {
      if (!refreshAvailable) {
        return data;
      }
      const response = await data;
      if (!isForbiddenResponse(response)) {
        return response;
      }
      if (_ctx.meta.get(RetryKey)) {
        return response;
      }
      await refreshToken();
      _ctx.reset();
      _ctx.meta.set(RetryKey, true);
      return meta.refetch((config) => provideToken(config, getToken()));
    },
  };

  return {
    refreshToken,
    requestIntercept,
    responseIntercept,
  };
};
