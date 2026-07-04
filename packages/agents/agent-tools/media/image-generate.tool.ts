import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Inject, Injectable, Optional } from '@tsdi/ioc';

export interface ImageGenerationResult {
    url: string;
    revisedPrompt?: string;
    seed?: number;
}

@Abstract()
export abstract class ImageGenerationAdapter {
    abstract generate(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>;
}

export interface ImageGenerationOptions {
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    style?: string;
    negativePrompt?: string;
    seed?: number;
}


@Injectable()
export class ImageGenerateTool implements AgentTool {
    name = 'image_generate';
    description = 'Generate an image from a text description using a configured AI image generation service.';
    inputSchema = {
        type: 'object',
        properties: {
            prompt: {
                type: 'string',
                description: 'Text description of the image to generate.'
            },
            aspect_ratio: {
                type: 'string',
                enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
                description: 'Aspect ratio of the generated image (default: 1:1).'
            },
            style: {
                type: 'string',
                description: 'Optional style hint (e.g., "photorealistic", "anime", "oil painting").'
            },
            negative_prompt: {
                type: 'string',
                description: 'Things to avoid in the generated image.'
            }
        },
        required: ['prompt']
    };
    toolset = 'media';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(ImageGenerationAdapter)
        private adapter?: ImageGenerationAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const prompt = this.requireString(input?.prompt, 'image_generate prompt');
        if (!this.adapter) {
            throw new Error('image_generate requires a configured ImageGenerationAdapter. Provide one via the AGENT_IMAGE_GENERATION_ADAPTER token.');
        }
        const options: ImageGenerationOptions = {};
        if (typeof input?.aspect_ratio === 'string' && ['1:1', '16:9', '9:16', '4:3', '3:4'].includes(input.aspect_ratio)) {
            options.aspectRatio = input.aspect_ratio;
        }
        if (typeof input?.style === 'string' && input.style.trim()) {
            options.style = input.style.trim();
        }
        if (typeof input?.negative_prompt === 'string' && input.negative_prompt.trim()) {
            options.negativePrompt = input.negative_prompt.trim();
        }
        const result = await this.adapter.generate(prompt, options);
        return {
            url: result.url,
            revisedPrompt: result.revisedPrompt,
            seed: result.seed
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
