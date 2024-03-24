function eventName(
	event:
		| (
				| TraceItemFetchEventInfo
				| TraceItemScheduledEventInfo
				| TraceItemAlarmEventInfo
				| TraceItemQueueEventInfo
				| TraceItemEmailEventInfo
				| TraceItemCustomEventInfo
		  )
		| null,
) {
	if (!event) {
		return "n/a";
	}
	if ("response" in event) {
		// TraceItemFetchEventInfo
		return "Fetch";
	}
	if ("cron" in event) {
		// TraceItemScheduledEventInfo
		return "Scheduled";
	}
	if ("scheduledTime" in event) {
		// TraceItemAlarmEventInfo
		return "Alarm";
	}
	if ("queue" in event) {
		// TraceItemQueueEventInfo
		return "Queue";
	}
	if ("mailFrom" in event) {
		// TraceItemEmailEventInfo
		return "Email";
	}
	return "Custom";
}

export default {
	async tail(events: TraceItem[], env: Env, ctx: ExecutionContext) {
		if (events.length === 0) {
			return;
		}
		// for (const event of events) {
		const event = events[0];
		let exceptions = "n/a";
		if (event.exceptions && event.exceptions.length > 0) {
			exceptions = event.exceptions.map((e) => e.message).join("\n");
		}
		const colorSuccess = "#28a745";
		const colorError = "#dc3545";

		const color = event.outcome === "ok" ? colorSuccess : colorError;

		await env.SQUEUE.send({
			type: "chat.postMessage",
			body: {
				channel: env.NOTIFY_CHANNEL,
				attachments: [
					{
						color: color,
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
										text: `*ScriptName:*\n${event.scriptName}`,
									},
									{
										type: "mrkdwn",
										text: `*EventAt:*\n${
											event.eventTimestamp
												? new Date(event.eventTimestamp).toLocaleString(
														"ja-JP",
														{ timeZone: "Asia/Tokyo" },
													)
												: "n/a"
										}`,
									},
								],
							},
							{
								type: "section",
								fields: [
									{
										type: "mrkdwn",
										text: `*Event:*\n${eventName(event.event)}`,
									},
									{
										type: "mrkdwn",
										text: `*Outcome:*\n${event.outcome}`,
									},
								],
							},
							{
								type: "section",
								fields: [
									{
										type: "mrkdwn",
										text: `*HTTP Status:*\n${
											event.event &&
											"response" in event.event &&
											event.event.response
												? event.event.response.status
												: "n/a"
										}`,
									},
									{
										type: "mrkdwn",
										text: `*Exceptions:*\n${exceptions}`,
									},
								],
							},
						],
					},
				],
			},
		});
		// }
	},

	async queue(
		batch: MessageBatch<QueueMessage>,
		env: Env,
		ctx: ExecutionContext,
	): Promise<void> {
		console.log(batch.queue);
		for (const message of batch.messages) {
			console.log(message.body);

			switch (message.body.type) {
				case "chat.postMessage": {
					console.log(JSON.stringify(message.body.body));
					const resp = await fetch("https://slack.com/api/chat.postMessage", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${env.SLACK_TOKEN}`,
						},
						body: JSON.stringify(message.body.body),
					});
					console.log(resp.status);
					if (!resp.ok) {
						// print log only.
						console.log(await resp.text());
					}
					break;
				}
			}
			// always ack the message
			message.ack();
		}
	},
} satisfies ExportedHandler<Env, QueueMessage>;
