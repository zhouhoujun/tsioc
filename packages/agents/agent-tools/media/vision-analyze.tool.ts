import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Inject, Injectable, Optional } from '@tsdi/ioc';

export interface VisionAnalysisResult {
    description: string;
    labels?: string[];
    objects?: Array<{ name: string; confidence: number }>;
    text?: string;
}

@Abstract()
export abstract class VisionAdapter {
    abstract analyze(imageUrl: string, question?: string): Promise<VisionAnalysisResult>;
}


@Injectable()
export class VisionAnalyzeTool implements AgentTool {
    name = 'vision_analyze';
    description = 'Analyze an image using a vision-capable AI model. Accepts a URL, local file path, or data URL to an image.';
    inputSchema = {
        type: 'object',
        properties: {
            image_url: {
                type: 'string',
                description: 'URL, local file path, or data URL of the image to analyze.'
            },
            question: {
                type: 'string',
                description: 'Optional question about the image content.'
            }
        },
        required: ['image_url']
    };
    toolset = 'media';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(VisionAdapter)
        private adapter?: VisionAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const imageUrl = this.requireString(input?.image_url, 'vision_analyze image_url');
        if (!this.adapter) {
            throw new Error('vision_analyze requires a configured VisionAdapter. Provide one via the AGENT_VISION_ADAPTER token.');
        }
        const result = await this.adapter.analyze(
            imageUrl,
            typeof input?.question === 'string' && input.question.trim() ? input.question.trim() : undefined
        );
        return {
            description: result.description,
            labels: result.labels,
            objects: result.objects,
            text: result.text
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
