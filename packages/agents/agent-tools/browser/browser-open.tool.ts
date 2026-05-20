import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class BrowserOpenTool implements AgentTool {
    name = 'browser_open';
    description = 'Request that the host open a validated web URL in a browser.';
    inputSchema = {
        type: 'object',
        properties: {
            url: { type: 'string' }
        },
        required: ['url']
    };
    toolset = 'browser';
    source = 'local';
    execution = { readOnly: true };

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const url = this.requireUrl(input?.url);
        return {
            requested: true,
            opened: false,
            url,
            mode: 'external_browser'
        };
    }

    private requireUrl(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid browser_open input: url must be a non-empty string.');
        }
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('Invalid browser_open input: url must use http or https.');
        }
        return url.toString();
    }
}
