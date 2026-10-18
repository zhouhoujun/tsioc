import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Injectable } from '@tsdi/ioc';
import { withTurnSignal } from '../src/turn-signal';

export interface TranscriptionResult {
    text: string;
    segments?: Array<{ start: number; end: number; text: string }>;
    language?: string;
    duration?: number;
}

@Abstract()
export abstract class TranscriptionAdapter {
    abstract transcribe(audioUrl: string, options?: TranscriptionOptions): Promise<TranscriptionResult>;
}

export interface TranscriptionOptions {
    language?: string;
    segments?: boolean;
    /** Aborted when the user interrupts the turn (Esc). */
    signal?: AbortSignal;
}



@Injectable()
export class AudioTranscribeTool implements AgentTool {
    name = 'audio_transcribe';
    description = 'Transcribe audio from a URL or file path to text using a configured speech-to-text service.';
    inputSchema = {
        type: 'object',
        properties: {
            audio_url: {
                type: 'string',
                description: 'URL or local file path to the audio file.'
            },
            language: {
                type: 'string',
                description: 'Optional language code hint (e.g., "en", "zh", "ja").'
            },
            segments: {
                type: 'boolean',
                description: 'Include timestamped segments (default: false).'
            }
        },
        required: ['audio_url']
    };
    toolset = 'audio';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        private adapter: TranscriptionAdapter
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const audioUrl = this.requireString(input?.audio_url, 'audio_transcribe audio_url');
        const result = await withTurnSignal(context, () => this.adapter.transcribe(audioUrl, {
            language: typeof input?.language === 'string' ? input.language : undefined,
            segments: input?.segments === true,
            signal: context?.signal
        }));
        return {
            text: result.text,
            segments: result.segments,
            language: result.language,
            duration: result.duration
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
