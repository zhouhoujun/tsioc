import { Injectable } from '@tsdi/ioc';
import { AgentClient } from './AgentClient';
import { AgentRequest } from './AgentRequest';
import { AgentResponse } from './AgentResponse';
import { AgentServer } from './AgentServer';

@Injectable()
export class LocalAgentClient extends AgentClient {
    constructor(private server: AgentServer) {
        super();
    }

    async send(request: AgentRequest): Promise<AgentResponse> {
        return this.server.execute(request);
    }
}
