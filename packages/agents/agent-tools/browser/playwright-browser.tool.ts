import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions, defaultAgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';

export type PlaywrightBrowserAction = 'navigate' | 'click' | 'type' | 'screenshot' | 'extract';
export type PlaywrightBrowserWaitUntil = 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
export type PlaywrightBrowserExtractMode = 'text' | 'html' | 'attribute';

export interface PlaywrightBrowserRequest {
    action: PlaywrightBrowserAction;
    url?: string;
    selector?: string;
    text?: string;
    button?: 'left' | 'middle' | 'right';
    waitUntil?: PlaywrightBrowserWaitUntil;
    timeoutMs?: number;
    fullPage?: boolean;
    format?: 'png' | 'jpeg';
    quality?: number;
    extract?: PlaywrightBrowserExtractMode;
    attribute?: string;
}

export interface PlaywrightBrowserResult {
    action: PlaywrightBrowserAction;
    ok?: boolean;
    url?: string;
    title?: string;
    selector?: string;
    content?: string;
    extract?: PlaywrightBrowserExtractMode;
    attribute?: string;
    truncated?: boolean;
    imageBase64?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    bytes?: number;
    details?: Record<string, any>;
}

@Abstract()
export abstract class PlaywrightBrowserAdapter {
    abstract execute(request: PlaywrightBrowserRequest, context: AgentToolContext): Promise<PlaywrightBrowserResult>;
}

@Injectable()
export class PlaywrightBrowserTool implements AgentTool {
    name = 'playwright_browser';
    description = 'Automate a headless Chromium page for navigation, clicking, typing, screenshots, and structured extraction. Requires a configured Playwright browser adapter and explicit approval before execution.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['navigate', 'click', 'type', 'screenshot', 'extract'],
                description: 'Browser automation action to perform.'
            },
            url: {
                type: 'string',
                description: 'Optional http(s) URL to navigate to before the action. Required for navigate.'
            },
            selector: {
                type: 'string',
                description: 'CSS selector for click, type, screenshot, or extract.'
            },
            text: {
                type: 'string',
                description: 'Text to type for the type action.'
            },
            button: {
                type: 'string',
                enum: ['left', 'middle', 'right'],
                description: 'Mouse button for click actions (default: left).'
            },
            wait_until: {
                type: 'string',
                enum: ['load', 'domcontentloaded', 'networkidle', 'commit'],
                description: 'Navigation readiness target for url-based actions.'
            },
            timeout_ms: {
                type: 'number',
                description: 'Per-action timeout in milliseconds.'
            },
            full_page: {
                type: 'boolean',
                description: 'Capture the full page for screenshot.'
            },
            format: {
                type: 'string',
                enum: ['png', 'jpeg'],
                description: 'Screenshot format (default: png).'
            },
            quality: {
                type: 'number',
                description: 'JPEG quality 1-100. Only applies to jpeg screenshots.'
            },
            extract: {
                type: 'string',
                enum: ['text', 'html', 'attribute'],
                description: 'Extraction mode for the extract action (default: text).'
            },
            attribute: {
                type: 'string',
                description: 'Attribute name when extract=attribute.'
            }
        },
        required: ['action']
    };
    toolset = 'browser';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        auditEnabled: true,
        sandboxCapability: 'network_fetch' as const
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions | null,
        @Optional() @Inject(PlaywrightBrowserAdapter)
        private adapter?: PlaywrightBrowserAdapter | null
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const adapter = this.adapter ?? this.options?.browser?.adapter;
        if (!adapter) {
            throw new Error('playwright_browser requires a configured Playwright browser adapter.');
        }
        const request = this.resolveRequest(input);
        const result = await adapter.execute(request, context);
        return this.normalizeResult(result);
    }

    private resolveRequest(input: any): PlaywrightBrowserRequest {
        const action = this.requireAction(input?.action);
        const request: PlaywrightBrowserRequest = { action };

        if (input?.url !== undefined) {
            request.url = this.requireUrl(input.url);
        }
        if (input?.selector !== undefined) {
            request.selector = this.requireString(input.selector, 'playwright_browser selector');
        }
        if (input?.text !== undefined) {
            request.text = this.requireString(input.text, 'playwright_browser text');
        }
        if (input?.button !== undefined) {
            request.button = this.requireButton(input.button);
        }
        if (input?.wait_until !== undefined) {
            request.waitUntil = this.requireWaitUntil(input.wait_until);
        }
        if (input?.timeout_ms !== undefined) {
            request.timeoutMs = this.requirePositiveNumber(input.timeout_ms, 'playwright_browser timeout_ms');
        } else {
            request.timeoutMs = this.resolveDefaultTimeoutMs();
        }
        if (input?.full_page === true) {
            request.fullPage = true;
        }
        if (input?.format !== undefined) {
            request.format = this.requireFormat(input.format);
        }
        if (input?.quality !== undefined) {
            request.quality = this.requireQuality(input.quality);
        }
        if (input?.extract !== undefined) {
            request.extract = this.requireExtractMode(input.extract);
        }
        if (input?.attribute !== undefined) {
            request.attribute = this.requireString(input.attribute, 'playwright_browser attribute');
        }

        switch (action) {
            case 'navigate':
                if (!request.url) {
                    throw new Error('Invalid playwright_browser input: navigate requires url.');
                }
                break;
            case 'click':
                if (!request.selector) {
                    throw new Error('Invalid playwright_browser input: click requires selector.');
                }
                break;
            case 'type':
                if (!request.selector) {
                    throw new Error('Invalid playwright_browser input: type requires selector.');
                }
                if (!request.text) {
                    throw new Error('Invalid playwright_browser input: type requires text.');
                }
                break;
            case 'screenshot':
                if (request.quality !== undefined && request.format !== 'jpeg') {
                    throw new Error('Invalid playwright_browser input: quality requires format "jpeg".');
                }
                break;
            case 'extract':
                request.extract = request.extract ?? 'text';
                if (request.extract === 'attribute' && !request.attribute) {
                    throw new Error('Invalid playwright_browser input: extract=attribute requires attribute.');
                }
                break;
        }

        return request;
    }

    private normalizeResult(result: PlaywrightBrowserResult): PlaywrightBrowserResult {
        if (typeof result?.content !== 'string' || !result.content.length) {
            return result;
        }
        const maxChars = this.resolveMaxExtractChars();
        if (result.content.length <= maxChars) {
            return result;
        }
        return {
            ...result,
            content: result.content.slice(0, maxChars),
            truncated: true
        };
    }

    private resolveDefaultTimeoutMs(): number {
        return this.options?.browser?.defaultTimeoutMs
            ?? defaultAgentToolsOptions.browser?.defaultTimeoutMs
            ?? 15000;
    }

    private resolveMaxExtractChars(): number {
        return this.options?.browser?.maxExtractChars
            ?? defaultAgentToolsOptions.browser?.maxExtractChars
            ?? 12000;
    }

    private requireAction(value: unknown): PlaywrightBrowserAction {
        const normalized = this.requireString(value, 'playwright_browser action');
        const valid: PlaywrightBrowserAction[] = ['navigate', 'click', 'type', 'screenshot', 'extract'];
        if (!valid.includes(normalized as PlaywrightBrowserAction)) {
            throw new Error(`Invalid playwright_browser action: must be one of ${valid.join(', ')}.`);
        }
        return normalized as PlaywrightBrowserAction;
    }

    private requireUrl(value: unknown): string {
        const text = this.requireString(value, 'playwright_browser url');
        const url = new URL(text);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('Invalid playwright_browser input: url must use http or https.');
        }
        return url.toString();
    }

    private requireButton(value: unknown): 'left' | 'middle' | 'right' {
        const text = this.requireString(value, 'playwright_browser button');
        if (!['left', 'middle', 'right'].includes(text)) {
            throw new Error('Invalid playwright_browser button: must be left, middle, or right.');
        }
        return text as 'left' | 'middle' | 'right';
    }

    private requireWaitUntil(value: unknown): PlaywrightBrowserWaitUntil {
        const text = this.requireString(value, 'playwright_browser wait_until');
        const valid: PlaywrightBrowserWaitUntil[] = ['load', 'domcontentloaded', 'networkidle', 'commit'];
        if (!valid.includes(text as PlaywrightBrowserWaitUntil)) {
            throw new Error(`Invalid playwright_browser wait_until: must be one of ${valid.join(', ')}.`);
        }
        return text as PlaywrightBrowserWaitUntil;
    }

    private requireFormat(value: unknown): 'png' | 'jpeg' {
        const text = this.requireString(value, 'playwright_browser format');
        if (text !== 'png' && text !== 'jpeg') {
            throw new Error('Invalid playwright_browser format: must be png or jpeg.');
        }
        return text as 'png' | 'jpeg';
    }

    private requireExtractMode(value: unknown): PlaywrightBrowserExtractMode {
        const text = this.requireString(value, 'playwright_browser extract');
        const valid: PlaywrightBrowserExtractMode[] = ['text', 'html', 'attribute'];
        if (!valid.includes(text as PlaywrightBrowserExtractMode)) {
            throw new Error(`Invalid playwright_browser extract: must be one of ${valid.join(', ')}.`);
        }
        return text as PlaywrightBrowserExtractMode;
    }

    private requireQuality(value: unknown): number {
        const quality = this.requirePositiveNumber(value, 'playwright_browser quality');
        if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
            throw new Error('Invalid playwright_browser quality: must be an integer between 1 and 100.');
        }
        return quality;
    }

    private requirePositiveNumber(value: unknown, field: string): number {
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
            throw new Error(`Invalid ${field}: must be a positive finite number.`);
        }
        return value;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
