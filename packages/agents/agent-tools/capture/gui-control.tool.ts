import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Injectable } from '@tsdi/ioc';

export interface GuiControlRequest {
    action: 'move' | 'click' | 'double_click' | 'right_click' | 'scroll' | 'type' | 'keypress' | 'wait';
    x?: number;
    y?: number;
    dx?: number;
    dy?: number;
    text?: string;
    keys?: string[];
    durationMs?: number;
    button?: 'left' | 'middle' | 'right';
}

export interface GuiControlResult {
    ok: boolean;
    action: GuiControlRequest['action'];
    timestamp?: number;
    details?: Record<string, any>;
}

@Abstract()
export abstract class GuiControlAdapter {
    abstract execute(request: GuiControlRequest): Promise<GuiControlResult>;
}

@Injectable()
export class GuiControlTool implements AgentTool {
    name = 'gui_control';
    description = 'Perform GUI automation actions such as moving the pointer, clicking, typing, pressing keys, scrolling, or waiting. Requires a configured GUI control adapter.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['move', 'click', 'double_click', 'right_click', 'scroll', 'type', 'keypress', 'wait'],
                description: 'GUI action to perform.'
            },
            x: {
                type: 'number',
                description: 'Absolute screen X coordinate for pointer actions.'
            },
            y: {
                type: 'number',
                description: 'Absolute screen Y coordinate for pointer actions.'
            },
            dx: {
                type: 'number',
                description: 'Horizontal scroll delta.'
            },
            dy: {
                type: 'number',
                description: 'Vertical scroll delta.'
            },
            text: {
                type: 'string',
                description: 'Text to type for the type action.'
            },
            keys: {
                type: 'array',
                items: { type: 'string' },
                description: 'Keys to press for the keypress action.'
            },
            duration_ms: {
                type: 'number',
                description: 'Wait duration for the wait action, or optional motion duration when supported by the adapter.'
            },
            button: {
                type: 'string',
                enum: ['left', 'middle', 'right'],
                description: 'Mouse button override for pointer actions.'
            }
        },
        required: ['action']
    };
    toolset = 'capture';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(
        private adapter: GuiControlAdapter
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const request = this.resolveRequest(input);
        const result = await this.adapter.execute(request);
        return {
            ok: result.ok,
            action: result.action,
            timestamp: result.timestamp,
            details: result.details
        };
    }

    private resolveRequest(input: any): GuiControlRequest {
        const action = this.requireAction(input?.action);
        const request: GuiControlRequest = { action };

        if (input?.x !== undefined) {
            request.x = this.requireNumber(input.x, 'gui_control x');
        }
        if (input?.y !== undefined) {
            request.y = this.requireNumber(input.y, 'gui_control y');
        }
        if (input?.dx !== undefined) {
            request.dx = this.requireNumber(input.dx, 'gui_control dx');
        }
        if (input?.dy !== undefined) {
            request.dy = this.requireNumber(input.dy, 'gui_control dy');
        }
        if (input?.duration_ms !== undefined) {
            request.durationMs = this.requireNumber(input.duration_ms, 'gui_control duration_ms');
        }
        if (input?.button !== undefined) {
            request.button = this.requireButton(input.button);
        }
        if (input?.text !== undefined) {
            request.text = this.requireString(input.text, 'gui_control text');
        }
        if (input?.keys !== undefined) {
            if (!Array.isArray(input.keys) || !input.keys.length) {
                throw new Error('Invalid gui_control keys: must be a non-empty string array.');
            }
            request.keys = input.keys.map((key: unknown) => this.requireString(key, 'gui_control keys item'));
        }

        switch (action) {
            case 'move':
            case 'click':
            case 'double_click':
            case 'right_click':
                if (request.x === undefined || request.y === undefined) {
                    throw new Error(`Invalid gui_control input: ${action} requires x and y coordinates.`);
                }
                break;
            case 'scroll':
                if (request.dx === undefined && request.dy === undefined) {
                    throw new Error('Invalid gui_control input: scroll requires dx or dy.');
                }
                break;
            case 'type':
                if (!request.text) {
                    throw new Error('Invalid gui_control input: type requires text.');
                }
                break;
            case 'keypress':
                if (!request.keys?.length) {
                    throw new Error('Invalid gui_control input: keypress requires keys.');
                }
                break;
            case 'wait':
                if (request.durationMs === undefined) {
                    throw new Error('Invalid gui_control input: wait requires duration_ms.');
                }
                break;
        }

        return request;
    }

    private requireAction(value: unknown): GuiControlRequest['action'] {
        const normalized = this.requireString(value, 'gui_control action');
        const valid: GuiControlRequest['action'][] = ['move', 'click', 'double_click', 'right_click', 'scroll', 'type', 'keypress', 'wait'];
        if (!valid.includes(normalized as GuiControlRequest['action'])) {
            throw new Error(`Invalid gui_control action: must be one of ${valid.join(', ')}.`);
        }
        return normalized as GuiControlRequest['action'];
    }

    private requireButton(value: unknown): 'left' | 'middle' | 'right' {
        const normalized = this.requireString(value, 'gui_control button');
        if (!['left', 'middle', 'right'].includes(normalized)) {
            throw new Error('Invalid gui_control button: must be left, middle, or right.');
        }
        return normalized as 'left' | 'middle' | 'right';
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }

    private requireNumber(value: unknown, field: string): number {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new Error(`Invalid ${field}: must be a finite number.`);
        }
        return value;
    }
}
