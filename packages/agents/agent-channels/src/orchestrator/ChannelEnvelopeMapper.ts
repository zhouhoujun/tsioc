import { Injectable } from '@tsdi/ioc';
import { AgentRequest, AgentResponse } from '@tsdi/agent';
import { ChannelMessage } from '../contracts/ChannelMessage';
import { SendMessage } from '../contracts/SendMessage';

@Injectable()
export class ChannelEnvelopeMapper {
    toAgentRequest(message: ChannelMessage): AgentRequest {
        return {
            sessionId: this.createSessionId(message),
            input: message.content
        };
    }

    toSendMessage(message: ChannelMessage, response: AgentResponse): SendMessage {
        return {
            channel: message.channel,
            recipient: message.sender,
            sessionId: response.sessionId,
            threadId: message.threadId,
            content: response.output,
            metadata: {
                ...message.metadata,
                replyTo: message.id
            }
        };
    }

    protected createSessionId(message: ChannelMessage): string {
        return [message.channel, message.sender, message.threadId ?? ''].map(part => encodeURIComponent(part)).join('|');
    }
}
