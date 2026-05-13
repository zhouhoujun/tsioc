import { Injectable } from '@tsdi/ioc';
import { AgentRuntime } from '../runtime/AgentRuntime';
import { AgentRequest } from './AgentRequest';
import { AgentResponse } from './AgentResponse';

@Injectable()
export class AgentRequestHandler {
    constructor(private runtime: AgentRuntime) {
    }

    async handle(request: AgentRequest): Promise<AgentResponse> {
        const result = await this.runtime.runTurn(request.sessionId, request.input);
        return {
            sessionId: result.sessionId,
            output: result.message.content
        };
    }
}
