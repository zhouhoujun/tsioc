import { Injectable } from '@tsdi/ioc';
import { SessionSummarizer } from './SessionSummarizer';
import { AgentMessage } from '../runtime/AgentMessage';

@Injectable()
export class SimpleSessionSummarizer extends SessionSummarizer {
    async summarize(messages: AgentMessage[]): Promise<string> {
        return messages.map(msg => `${msg.role}: ${msg.content}`).join(' | ');
    }
}
