import "@cloudflare/vitest-pool-workers/types";

type TestEnv = Env;

declare global {
  namespace Cloudflare {
    interface Env extends TestEnv {}
  }
}
