import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

export interface ScreenshotResult {
    imageUrl: string;
    format: string;
    width: number;
    height: number;
}

export interface ScreenshotAdapter {
    capture(target?: ScreenshotTarget): Promise<ScreenshotResult>;
}

export interface ScreenshotTarget {
    url?: string;
    selector?: string;
    fullPage?: boolean;
    format?: 'png' | 'jpeg';
    quality?: number;
}

export const AGENT_SCREENSHOT_ADAPTER = 'AGENT_SCREENSHOT_ADAPTER';

@Injectable()
export class ScreenshotTool implements AgentTool {
    name = 'screenshot';
    description = 'Capture a screenshot of a webpage, application window, or the full screen. Requires a configured screenshot adapter (Playwright, Puppeteer, or native OS capture).';
    inputSchema = {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: 'URL to navigate to before capturing (omit for screen/window capture).'
            },
            selector: {
                type: 'string',
                description: 'CSS selector to capture a specific element instead of the full page.'
            },
            fullPage: {
                type: 'boolean',
                description: 'Capture full-page screenshot (default: false, viewport only).'
            },
            format: {
                type: 'string',
                enum: ['png', 'jpeg'],
                description: 'Image format (default: png).'
            },
            quality: {
                type: 'number',
                description: 'JPEG quality 1-100 (only applies to jpeg format).'
            }
        }
    };
    toolset = 'capture';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_SCREENSHOT_ADAPTER, { defaultValue: null })
        private adapter?: ScreenshotAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        if (!this.adapter) {
            throw new Error('screenshot requires a configured ScreenshotAdapter. Provide one via the AGENT_SCREENSHOT_ADAPTER token.');
        }
        const target: ScreenshotTarget = {};
        if (typeof input?.url === 'string') { target.url = input.url; }
        if (typeof input?.selector === 'string') { target.selector = input.selector; }
        if (input?.fullPage === true) { target.fullPage = true; }
        if (input?.format === 'jpeg') { target.format = 'jpeg'; }
        if (typeof input?.quality === 'number') { target.quality = input.quality; }
        const result = await this.adapter.capture(Object.keys(target).length ? target : undefined);
        return {
            imageUrl: result.imageUrl,
            format: result.format,
            width: result.width,
            height: result.height
        };
    }
}
