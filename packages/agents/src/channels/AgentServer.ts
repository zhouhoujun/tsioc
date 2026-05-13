import { Injectable } from '@tsdi/ioc';
import { AgentRequestHandler } from './AgentRequestHandler';
import { AgentRequest } from './AgentRequest';
import { AgentResponse } from './AgentResponse';

@Injectable()
export class AgentServer {
    constructor(private handler: AgentRequestHandler) {
    }

    async execute(request: AgentRequest): Promise<AgentResponse> {
        return this.handler.handle(request);
    }
}
