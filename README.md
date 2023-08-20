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
- '<Your_CHANNEL>' with the channel you want to notify.

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

