import { Abstract } from '@tsdi/ioc';
import { ModelRequest } from './ModelRequest';
import { ModelResponse } from './ModelResponse';
import { StreamChunk } from './StreamChunk';

@Abstract()
export abstract class ModelAdapter {
    abstract complete(request: ModelRequest): Promise<ModelResponse>;

    /**
     * Optional streaming interface. Returns an async generator of chunks.
     * Default implementation yields a single 'done' chunk.
     * Override in provider adapters that support streaming (SSE, etc.).
     */
    async *stream(request: ModelRequest): AsyncGenerator<StreamChunk> {
        const response = await this.complete(request);
        if (response.message) {
            yield { type: 'text', content: response.message };
        }
        if (response.toolCalls?.length) {
            yield { type: 'tool_call', toolCalls: response.toolCalls };
        }
        if (response.metadata?.usage) {
            yield { type: 'done', usage: response.metadata.usage as any };
        } else {
            yield { type: 'done' };
        }
    }
}
