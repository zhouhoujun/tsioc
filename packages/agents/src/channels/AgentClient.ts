import { Abstract } from '@tsdi/ioc';
import { AgentRequest } from './AgentRequest';
import { AgentResponse } from './AgentResponse';

@Abstract()
export abstract class AgentClient {
    abstract send(request: AgentRequest): Promise<AgentResponse>;
}
