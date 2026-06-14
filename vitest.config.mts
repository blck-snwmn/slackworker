import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest({
			remoteBindings: false,
			miniflare: {
				// Required to use `SELF.queue()`. This is an experimental
				// compatibility flag, and cannot be enabled in production.
				compatibilityFlags: ["service_binding_extra_handlers"],
				queueConsumers: {
					// queue name
					slackqueue: { maxBatchTimeout: 0.05 /* 50ms */ },
				},
				bindings: {
					SLACK_TOKEN: "TEST_TOKEN",
					NOTIFY_CHANNEL: "TEST_CHANNEL",
				},
			},
			wrangler: {
				configPath: "./wrangler.toml",
			},
		}),
	],
	test: {
		restoreMocks: true,
	},
});
