import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { PromptSection, PromptSectionContext } from '../PromptSection';
import { MCP_SERVER_INSTRUCTIONS } from '../../tokens';

const MAX_INSTRUCTIONS_BYTES = 1024;

@Injectable()
export class McpServerInstructionsSection extends PromptSection {
    name(): string { return 'mcp-server-instructions'; }
    priority = 55;
    cacheable = false;

    constructor(
        @Optional() @Inject(MCP_SERVER_INSTRUCTIONS)
        private entries?: Array<{ serverId: string; instructions: string }>
    ) {
        super();
    }

    render(context: PromptSectionContext): string {
        const items = this.entries ?? (context.extra?.mcpServerInstructions as Array<{ serverId: string; instructions: string }> | undefined);
        if (!items?.length) return '';

        const lines: string[] = ['## MCP Server Instructions'];
        let totalBytes = lines[0].length;

        for (const entry of items) {
            const header = `### ${entry.serverId}`;
            const content = entry.instructions.trim();
            if (!content) continue;

            const block = `${header}\n${content}`;
            const blockBytes = block.length + 2;

            if (totalBytes + blockBytes > MAX_INSTRUCTIONS_BYTES) {
                const remaining = MAX_INSTRUCTIONS_BYTES - totalBytes - header.length - 1;
                if (remaining > 20) {
                    lines.push(header);
                    lines.push(content.slice(0, remaining - 3) + '...');
                    totalBytes += header.length + 1 + remaining;
                }
                break;
            }

            lines.push(block);
            totalBytes += blockBytes;
        }

        return lines.join('\n\n');
    }
}
