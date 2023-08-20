export interface Env {
	SLACK_TOKEN: string
	CHANNEL: string

	SQUEUE: Queue;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		await env.SQUEUE.send({});

		return new Response('ok');
	},

	async queue(
		batch: MessageBatch,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		console.log(batch.queue)
		for (const message of batch.messages) {
			const resp = await fetch('https://slack.com/api/chat.postMessage', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${env.SLACK_TOKEN}`,
				},
				body: JSON.stringify({
					channel: env.CHANNEL,
					text: 'Hello world!',
				})
			})
			console.log(resp.status)
			if (!resp.ok) {
				console.log(await resp.text())
			}
			message.ack();
		}
	},
};
