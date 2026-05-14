import { AgentModelOptions } from './ModelProviderOptions';
import { OpenAICompatibleModelAdapter } from './OpenAICompatibleModelAdapter';

export class DeepSeekModelAdapter extends OpenAICompatibleModelAdapter {
    constructor(options: AgentModelOptions = {}) {
        super({
            provider: 'deepseek',
            model: 'deepseek-chat',
            baseUrl: 'https://api.deepseek.com',
            apiKeyEnv: 'DEEPSEEK_API_KEY',
            ...options
        });
    }
}
