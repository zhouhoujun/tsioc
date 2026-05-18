import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import * as parse5 from 'parse5';
import { AgentToolsOptions, defaultAgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';

@Injectable()
export class WebExtractTool implements AgentTool {
    name = 'web_extract';
    description = 'Fetch a web page and extract readable text content.';
    inputSchema = {
        type: 'object',
        properties: {
            url: { type: 'string' }
        },
        required: ['url']
    };
    toolset = 'web';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        if (!input || typeof input.url !== 'string' || !input.url.trim()) {
            throw new Error('Invalid web_extract input: url must be a non-empty string.');
        }
        const fetcher = this.options?.web?.fetch ?? globalThis.fetch;
        if (!fetcher) {
            throw new Error('web_extract requires a fetch implementation.');
        }
        const response = await fetcher(input.url);
        if (!response.ok) {
            throw new Error(`web_extract failed with status ${response.status}.`);
        }
        const html = await response.text();
        const title = extractTitle(html);
        const maxChars = this.options?.web?.maxContentChars ?? defaultAgentToolsOptions.web?.maxContentChars ?? 12000;
        const content = extractText(html).slice(0, maxChars);
        return {
            url: input.url,
            title,
            content
        };
    }
}

function extractTitle(html: string): string | undefined {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? match[1].trim() : undefined;
}

function extractText(html: string): string {
    const document = parse5.parse(html) as any;
    const chunks: string[] = [];
    collectText(document, chunks);
    return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

function collectText(node: any, chunks: string[]): void {
    if (!node) {
        return;
    }
    if (node.nodeName === '#text' && typeof node.value === 'string') {
        const value = node.value.trim();
        if (value) {
            chunks.push(value);
        }
    }
    if (Array.isArray(node.childNodes)) {
        node.childNodes.forEach((child: any) => collectText(child, chunks));
    }
}
