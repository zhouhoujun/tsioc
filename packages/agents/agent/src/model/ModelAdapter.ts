import { Abstract } from '@tsdi/ioc';
import { ModelRequest } from './ModelRequest';
import { ModelResponse } from './ModelResponse';
import { StreamChunk } from './StreamChunk';

@Abstract()
export abstract class ModelAdapter {
    /**
     * Normalized provider name reported by this adapter (for example
     * `deepseek`, `openai-compatible`, `anthropic`, or `echo`). Used to tag
     * provider-specific diagnostics such as summary quality scores.
     */
    readonly provider?: string;

    /**
     * Whether the adapter sends tool definitions through the provider's native
     * tool-calling channel. When true the system prompt can skip the redundant
     * text listing of every tool (native schemas already carry name/description).
     */
    readonly supportsNativeToolSchemas: boolean = true;

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
