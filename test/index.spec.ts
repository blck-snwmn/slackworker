import { randomBytes } from "node:crypto";
import {
	createExecutionContext,
	createMessageBatch,
	env,
	fetchMock,
	getQueueResult,
	waitOnExecutionContext,
} from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import worker from "../src/worker";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

beforeAll(() => {
	// Enable outbound request mocking...
	fetchMock.activate();
	// ...and throw errors if an outbound request isn't mocked
	fetchMock.disableNetConnect();
});

afterEach(() => {
	vi.restoreAllMocks();
	fetchMock.assertNoPendingInterceptors();
});

describe("test queue producer", () => {
	it("produces queue message with mocked send", async () => {
		// Intercept calls to `QUEUE_PRODUCER.send()`
		const sendSpy = vi
			.spyOn(env.SQUEUE, "send")
			.mockImplementation(async () => {});

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
			.mockImplementation(async () => {});

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

describe("test queue comsumer", () => {
	it("consumes queue messages", async () => {
		fetchMock
			.get("https://slack.com")
			.intercept({
				path: "/api/chat.postMessage",
				method: "POST",
				headers: {
					Authorization: "Bearer TEST_TOKEN",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					channel: "TEST_CHANNEL",
					body: "Test",
				}),
			})
			.reply(200);

		const messages: ServiceBindingQueueMessage<QueueMessage>[] = [
			{
				id: randomBytes(16).toString("hex"),
				timestamp: new Date(1000),
				attempts: 0,
				body: {
					type: "chat.postMessage",
					body: {
						channel: "TEST_CHANNEL",
						body: "Test",
					},
				},
			},
		];
		const batch = createMessageBatch("queue", messages);
		const ctx = createExecutionContext();
		await worker.queue(batch, env, ctx);

		const result = await getQueueResult(batch, ctx);
		expect(result.outcome).toBe("ok");
		expect(result.retryBatch.retry).toBe(false); // `true` if `batch.retryAll()` called
		expect(result.ackAll).toBe(false); // `true` if `batch.ackAll()` called
		expect(result.retryMessages).toStrictEqual([]);
		expect(result.explicitAcks).toStrictEqual([messages[0].id]);
	});
});
