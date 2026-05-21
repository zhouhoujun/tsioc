import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

export interface TranscriptionResult {
    text: string;
    segments?: Array<{ start: number; end: number; text: string }>;
    language?: string;
    duration?: number;
}

export interface TranscriptionAdapter {
    transcribe(audioUrl: string, options?: TranscriptionOptions): Promise<TranscriptionResult>;
}

export interface TranscriptionOptions {
    language?: string;
    segments?: boolean;
}

export const AGENT_TRANSCRIPTION_ADAPTER = 'AGENT_TRANSCRIPTION_ADAPTER';

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
        @Optional() @Inject(AGENT_TRANSCRIPTION_ADAPTER, { defaultValue: null })
        private adapter?: TranscriptionAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const audioUrl = this.requireString(input?.audio_url, 'audio_transcribe audio_url');
        if (!this.adapter) {
            throw new Error('audio_transcribe requires a configured TranscriptionAdapter. Provide one via the AGENT_TRANSCRIPTION_ADAPTER token.');
        }
        const result = await this.adapter.transcribe(audioUrl, {
            language: typeof input?.language === 'string' ? input.language : undefined,
            segments: input?.segments === true
        });
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
