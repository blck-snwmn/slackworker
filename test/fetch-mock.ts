type InterceptOptions = {
  path: string | RegExp | ((path: string) => boolean);
  method?: string | RegExp | ((method: string) => boolean);
  body?: string | RegExp | ((body: string) => boolean);
  headers?: Record<string, string | RegExp | ((value: string) => boolean)>;
};

type PendingMock = {
  origin: string;
  options: InterceptOptions;
  response?: {
    status: number;
    body?: BodyInit | null;
    headers?: HeadersInit;
  };
  error?: Error;
  consumed: boolean;
};

const originalFetch = globalThis.fetch;
const pendingMocks: PendingMock[] = [];
let netConnectDisabled = false;

function matches(value: string, matcher: InterceptOptions["path"]): boolean {
  if (typeof matcher === "string") return value === matcher;
  if (matcher instanceof RegExp) return matcher.test(value);
  return matcher(value);
}

function describePath(matcher: InterceptOptions["path"]): string {
  return typeof matcher === "function" ? "<function>" : String(matcher);
}

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init);
  const url = new URL(request.url);
  const body =
    request.method === "GET" || request.method === "HEAD" ? "" : await request.clone().text();

  const mock = pendingMocks.find(({ consumed, origin, options }) => {
    if (consumed || origin !== url.origin || !matches(url.pathname, options.path)) return false;
    if (options.method !== undefined && !matches(request.method, options.method)) return false;
    if (options.body !== undefined && !matches(body, options.body)) return false;
    if (options.headers === undefined) return true;
    return Object.entries(options.headers).every(([name, matcher]) =>
      matches(request.headers.get(name) ?? "", matcher),
    );
  });

  if (mock === undefined) {
    if (netConnectDisabled)
      throw new Error(`No fetch mock matched ${request.method} ${request.url}`);
    return originalFetch(input, init);
  }

  mock.consumed = true;
  if (mock.error !== undefined) throw mock.error;
  return new Response(mock.response?.body, {
    status: mock.response?.status,
    headers: mock.response?.headers,
  });
}

export const fetchMock = {
  activate() {
    globalThis.fetch = mockFetch;
  },
  disableNetConnect() {
    netConnectDisabled = true;
  },
  get(origin: string) {
    return {
      intercept(options: InterceptOptions) {
        const mock: PendingMock = { origin, options, consumed: false };
        pendingMocks.push(mock);
        return {
          reply(
            status: number,
            body?: BodyInit | null,
            responseOptions?: { headers?: HeadersInit },
          ) {
            mock.response = { status, body, headers: responseOptions?.headers };
          },
          replyWithError(error: Error) {
            mock.error = error;
          },
        };
      },
    };
  },
  assertNoPendingInterceptors() {
    const remaining = pendingMocks.filter(({ consumed }) => !consumed);
    pendingMocks.length = 0;
    if (remaining.length > 0) {
      throw new Error(
        `Pending fetch mocks: ${remaining.map(({ origin, options }) => `${origin}${describePath(options.path)}`).join(", ")}`,
      );
    }
  },
};
