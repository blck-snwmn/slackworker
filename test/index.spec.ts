import {
	createExecutionContext,
	env,
	waitOnExecutionContext,
} from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/worker";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

afterEach(() => {
	vi.restoreAllMocks();
});

describe("test queue producer", () => {
	it("produces queue message with mocked send", async () => {
		// Intercept calls to `QUEUE_PRODUCER.send()`
		const sendSpy = vi
			.spyOn(env.SQUEUE, "send")
			.mockImplementation(async () => { });

		const now = new Date();

		// Enqueue job on queue
		const ctx = createExecutionContext();
		await worker.tail(
			[
				{
					// TraceItemFetchEventInfo
					event: {
						request: new IncomingRequest("https://example.com", {}),
						response: new Response("ok"),
					},
					scriptName: "scriptName_test",
					outcome: "ok",
					exceptions: [],
					eventTimestamp: now.getTime(),
					logs: [],
					diagnosticsChannelEvents: [],
				},
			],
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);

		// Check `QUEUE_PRODUCER.send()` was called
		expect(sendSpy).toBeCalledTimes(1);
		expect(sendSpy).toBeCalledWith({
			type: "chat.postMessage",
			body: {
				channel: "TEST_CHANNEL",
				attachments: [
					{
						color: "#28a745",
						blocks: [
							{
								type: "header",
								text: {
									type: "plain_text",
									text: "Worker execution",
								},
							},
							{
								type: "section",
								fields: [
									{
										type: "mrkdwn",
										text: "*ScriptName:*\nscriptName_test",
									},
									{
										type: "mrkdwn",
										text: `*EventAt:*\n${now.toLocaleString("ja-JP", {
											timeZone: "Asia/Tokyo",
										})}`,
									},
								],
							},
							{
								type: "section",
								fields: [
									{
										type: "mrkdwn",
										text: "*Event:*\nFetch",
									},
									{
										type: "mrkdwn",
										text: "*Outcome:*\nok",
									},
								],
							},
							{
								type: "section",
								fields: [
									{
										type: "mrkdwn",
										text: "*HTTP Status:*\n200",
									},
									{
										type: "mrkdwn",
										text: "*Exceptions:*\nn/a",
									},
								],
							},
						],
					},
				],
			},
		});
	});

	it("produces queue message with mocked consumer", async () => {
		const consumerSpy = vi
			.spyOn(worker, "queue")
			.mockImplementation(async () => { });

		const now = new Date();

		const ctx = createExecutionContext();
		await worker.tail(
			[
				{
					// TraceItemFetchEventInfo
					event: {
						request: new IncomingRequest("https://example.com", {}),
						response: new Response("ok"),
					},
					scriptName: "scriptName_test",
					outcome: "ok",
					exceptions: [],
					eventTimestamp: now.getTime(),
					logs: [],
					diagnosticsChannelEvents: [],
				},
			],
			env,
			ctx,
		);
		await waitOnExecutionContext(ctx);

		// Wait for consumer to be called
		await vi.waitUntil(() => consumerSpy.mock.calls.length > 0);
		expect(consumerSpy).toBeCalledTimes(1);
		const batch = consumerSpy.mock.lastCall?.[0];
		expect(batch).toBeDefined();
		expect(batch?.messages[0].body).toStrictEqual({
			type: "chat.postMessage",
			body: {
				channel: "TEST_CHANNEL",
				attachments: [
					{
						color: "#28a745",
						blocks: [
							{
								type: "header",
								text: {
									type: "plain_text",
									text: "Worker execution",
								},
							},
							{
								type: "section",
								fields: [
									{
										type: "mrkdwn",
										text: "*ScriptName:*\nscriptName_test",
									},
									{
										type: "mrkdwn",
										text: `*EventAt:*\n${now.toLocaleString("ja-JP", {
											timeZone: "Asia/Tokyo",
										})}`,
									},
								],
							},
							{
								type: "section",
								fields: [
									{
										type: "mrkdwn",
										text: "*Event:*\nFetch",
									},
									{
										type: "mrkdwn",
										text: "*Outcome:*\nok",
									},
								],
							},
							{
								type: "section",
								fields: [
									{
										type: "mrkdwn",
										text: "*HTTP Status:*\n200",
									},
									{
										type: "mrkdwn",
										text: "*Exceptions:*\nn/a",
									},
								],
							},
						],
					},
				],
			},
		});
	});
});
