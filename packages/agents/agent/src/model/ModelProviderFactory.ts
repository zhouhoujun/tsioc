import { ModelAdapter } from './ModelAdapter';
import { AgentModelOptions } from './ModelProviderOptions';
import { DeepSeekModelAdapter } from './DeepSeekModelAdapter';
import { OpenAICompatibleModelAdapter } from './OpenAICompatibleModelAdapter';

export function createModelAdapter(options: AgentModelOptions = {}): ModelAdapter {
    const provider = (options.provider ?? 'deepseek').toLowerCase();
    if (provider === 'deepseek') {
        return new DeepSeekModelAdapter(options);
    }
    return new OpenAICompatibleModelAdapter(options);
}
