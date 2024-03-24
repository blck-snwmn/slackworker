type QueueMessage = NopMessage | ChatMessage

type NopMessage = {
    type: '';
}

type ChatMessage = {
    type: "chat.postMessage";
    body: Record<string, string>;
}

interface Env {
    SLACK_TOKEN: string
    NOTIFY_CHANNEL: string

    SQUEUE: Queue;
}