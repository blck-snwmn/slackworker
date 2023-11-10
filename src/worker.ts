type QueueMessage = NopMessage | ChatMessage

type NopMessage = {
	type: '';
}

type ChatMessage = {
	type: "chat.postMessage";
	body: Record<string, string>;
}


export interface Env {
	SLACK_TOKEN: string
	CHANNEL: string

	SQUEUE: Queue;
}

export default {
	async tail(events: TraceItem[], env: Env, ctx: ExecutionContext) {
		await env.SQUEUE.send({
			type: "chat.postMessage",
			body: {
				channel: "channel_id",
				text: "hello",
			},
		});
		// for (const event of events) {
		// 	await env.SQUEUE.send({
		// 		type: "chat.postMessage",
		// 		body: {
		// 			channel: env.CHANNEL,
		// 			blocks: [
		// 				{
		// 					type: "header",
		// 					text: {
		// 						type: "plain_text",
		// 						text: "Worker execution",
		// 					}
		// 				},
		// 				{
		// 					type: "section",
		// 					text: {
		// 						type: "mrkdwn",
		// 						fields: [
		// 							{
		// 								type: "mrkdwn",
		// 								text: `*ScriptName:*\n${event.scriptName}`
		// 							},
		// 							{
		// 								type: "mrkdwn",
		// 								text: `*EventAt:*\n${event.eventTimestamp ? (new Date(event.eventTimestamp)).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "n/a"}`
		// 							},
		// 						]
		// 					}
		// 				},
		// 				{
		// 					type: "section",
		// 					text: {
		// 						type: "mrkdwn",
		// 						fields: [
		// 							{
		// 								type: "mrkdwn",
		// 								text: `*Outcome:*\n${event.outcome}`
		// 							},
		// 							{
		// 								type: "mrkdwn",
		// 								text: `*Exceptions:*\n${event.exceptions?.map(e => e.message).join("\n") ?? "n/a"}`
		// 							},
		// 						]
		// 					}
		// 				},
		// 				{
		// 					type: "section",
		// 					text: {
		// 						type: "mrkdwn",
		// 						fields: [
		// 							{
		// 								type: "mrkdwn",
		// 								text: `*HTTP Status:*\n${event.event && "response" in event.event && event.event.response ? event.event.response.status : "n/a"}`
		// 							},
		// 						]
		// 					}
		// 				},
		// 			]
		// 		},
		// });
		// }
	},

	async queue(
		batch: MessageBatch<QueueMessage>,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		console.log(batch.queue)
		for (const message of batch.messages) {
			console.log(message.body)

			switch (message.body.type) {
				case 'chat.postMessage':
					console.log(JSON.stringify(message.body.body))
					const resp = await fetch('https://slack.com/api/chat.postMessage', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${env.SLACK_TOKEN}`,
						},
						body: JSON.stringify(message.body.body)
					})
					console.log(resp.status)
					if (!resp.ok) {
						// print log only. 
						console.log(await resp.text())
					}
					break;
			}
			// always ack the message
			message.ack();
		}
	},
};
