import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Injectable } from '@tsdi/ioc';

export interface TtsResult {
    audioUrl: string;
    format: string;
    duration?: number;
}

@Abstract()
export abstract class TtsAdapter {
    abstract synthesize(text: string, options?: TtsOptions): Promise<TtsResult>;
}

export interface TtsOptions {
    voice?: string;
    speed?: number;
    format?: 'mp3' | 'wav' | 'ogg' | 'flac';
    language?: string;
}

@Injectable()
export class TextToSpeechTool implements AgentTool {
    name = 'text_to_speech';
    description = 'Convert text to spoken audio using a configured TTS service. Supports multiple voices and languages.';
    inputSchema = {
        type: 'object',
        properties: {
            text: {
                type: 'string',
                description: 'Text to convert to speech.'
            },
            voice: {
                type: 'string',
                description: 'Voice identifier (e.g., "alloy", "echo", "nova", or a specific voice name).'
            },
            speed: {
                type: 'number',
                description: 'Speaking speed multiplier (0.5 to 2.0, default: 1.0).'
            },
            format: {
                type: 'string',
                enum: ['mp3', 'wav', 'ogg', 'flac'],
                description: 'Audio format (default: mp3).'
            },
            language: {
                type: 'string',
                description: 'Language code (e.g., "en", "zh", "ja").'
            }
        },
        required: ['text']
    };
    toolset = 'audio';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        private adapter: TtsAdapter
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const text = this.requireString(input?.text, 'text_to_speech text');
        const options: TtsOptions = {};
        if (typeof input?.voice === 'string') { options.voice = input.voice; }
        if (typeof input?.speed === 'number' && input.speed >= 0.5 && input.speed <= 2) { options.speed = input.speed; }
        if (typeof input?.format === 'string' && ['mp3', 'wav', 'ogg', 'flac'].includes(input.format)) {
            options.format = input.format;
        }
        if (typeof input?.language === 'string') { options.language = input.language; }
        const result = await this.adapter.synthesize(text, options);
        return {
            audioUrl: result.audioUrl,
            format: result.format,
            duration: result.duration,
            textLength: text.length
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
