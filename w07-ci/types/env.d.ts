interface Env {
  DB: D1Database;
  META: KVNamespace;
}

declare module "cloudflare:workers" {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: Parameters<
      typeof import("cloudflare:test").applyD1Migrations
    >[1];
  }
}