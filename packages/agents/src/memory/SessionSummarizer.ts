import { Abstract } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';

@Abstract()
export abstract class SessionSummarizer {
    abstract summarize(messages: AgentMessage[]): Promise<string>;
}
