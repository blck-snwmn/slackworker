# slackworker

A worker that consume messages from the queue and notifies Slack. 

## Setting(for Local)
1. Create a file named .dev.vars in the project root directory.
2. Write the following key-value pairs in the .dev.vars file:
  ```
  SLACK_TOKEN=<Your_SLACK_TOKEN>
  ```

Replace 
- '<Your_Slack_Bearer_Token>' with the bearer token for the Slack file upload API

## Setting
Run the following commands to add your secrets to the Workers configuration:

secret
```bash
wrangler secret put SLACK_TOKEN
```

queues
```bash
wrangler queues create slackqueue
```

## Deploy
After you've added the secrets, deploy the Worker with the following command:
```bash
wrangler deploy
```

## Use
### Send to queue from cf worker(note: Queues is open beta)
Add the following to your wrangler.toml

```toml
[[queues.producers]]
queue = "slackqueue"
binding = "SLACK_NOTIFIER"
```

Add the following to your worker script

```js
export interface Env {
	SLACK_NOTIFIER: Queue;
}
...
await env.SLACK_NOTIFIER.send({
    type: "chat.postMessage",
    body: {
        channel: "your channel id"
        text: "Hello, world!", // or blocks
    },
});
```

### Tail worker(note: Tail Workers is open beta)
Add the following to your wrangler.toml

```toml
tail_consumers = [{service = "slackworker"}]
```
