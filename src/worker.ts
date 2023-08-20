type QueueMessage = NopMessage | ChatMessage

type NopMessage = {
	type: '';
}

type ChatMessage = {
	type: 'chat';
	body: Record<string, string>;
}


export interface Env {
	SLACK_TOKEN: string
	// CHANNEL: string

	SQUEUE: Queue<QueueMessage>;
}

export default {
	// async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	// 	await env.SQUEUE.send({
	// 		type: 'chat',
	// 		body: {
	// 			channel: env.CHANNEL,
	// 			text: 'Hello world!2',
	// 		}
	// 	});

	// 	return new Response('ok');
	// },

	async queue(
		batch: MessageBatch<QueueMessage>,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		console.log(batch.queue)
		for (const message of batch.messages) {
			console.log(message.body)
			switch (message.body.type) {
				case 'chat':
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
