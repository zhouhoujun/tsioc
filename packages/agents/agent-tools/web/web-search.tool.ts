import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { withTurnSignal } from '../src/turn-signal';
import { domainAllowed, resolveIndexedEnabled } from './domain-policy';

@Injectable()
export class WebSearchTool implements AgentTool {
    name = 'web_search';
    description = 'Search the web via a configured adapter.';
    inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string' },
            limit: { type: 'number' }
        },
        required: ['query']
    };
    toolset = 'web';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        if (!input || typeof input.query !== 'string' || !input.query.trim()) {
            throw new Error('Invalid web_search input: query must be a non-empty string.');
        }
        const search = this.options?.web?.search;
        if (!search) {
            throw new Error('web_search requires a configured search adapter.');
        }
        const limit = typeof input.limit === 'number' ? input.limit : undefined;
        const results = await withTurnSignal(context, () => search.search(input.query, limit, context?.signal));
        const allowedDomains = this.options?.web?.allowedDomains;
        if (resolveIndexedEnabled(this.options?.web?.indexed, allowedDomains)) {
            return {
                query: input.query,
                indexed: true,
                results: results.filter(result => domainAllowed(result?.url, allowedDomains))
            };
        }
        return {
            query: input.query,
            results
        };
    }
}
