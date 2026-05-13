import { Injectable } from '@tsdi/ioc';
import { ModelAdapter } from './ModelAdapter';
import { ModelRequest } from './ModelRequest';
import { ModelResponse } from './ModelResponse';

@Injectable()
export class EchoModelAdapter extends ModelAdapter {
    async complete(request: ModelRequest): Promise<ModelResponse> {
        const lastUser = [...request.messages].reverse().find(msg => msg.role === 'user');
        return {
            message: `Echo: ${lastUser?.content ?? ''}`,
            stopReason: 'end'
        };
    }
}
