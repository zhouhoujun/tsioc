import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { promises as fs } from 'fs';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from '../files/path-policy';

const MAX_PNG_HEADER_BYTES = 64 * 1024;
const MAX_JPEG_SCAN_BYTES = 512 * 1024;

@Injectable()
export class ImageInfoTool implements AgentTool {
    name = 'image_info';
    description = 'Read image metadata such as format and dimensions from a workspace file.';
    inputSchema = {
        type: 'object',
        properties: {
            path: { type: 'string' }
        },
        required: ['path']
    };
    toolset = 'media';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const requestedPath = this.getRequestedPath(input);
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir);
        const metadata = await this.readMetadata(absolutePath);
        return {
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            ...metadata
        };
    }

    private getRequestedPath(input: any): string {
        if (!input || typeof input.path !== 'string') {
            throw new Error('Invalid image_info input: path must be a string.');
        }
        return input.path;
    }

    private async readMetadata(filePath: string): Promise<{ format: string; width: number; height: number; }> {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) {
            throw new Error('Invalid image file: path must reference a regular file.');
        }
        if (!stat.size) {
            throw new Error('Invalid image file: file is empty.');
        }
        const handle = await fs.open(filePath, 'r');
        try {
            const signature = Buffer.alloc(Math.min(stat.size, 8));
            const { bytesRead: signatureBytes } = await handle.read(signature, 0, signature.length, 0);
            const prefix = signature.subarray(0, signatureBytes);
            if (this.isPngSignature(prefix)) {
                const size = Math.min(stat.size, MAX_PNG_HEADER_BYTES);
                const buffer = Buffer.alloc(size);
                const { bytesRead } = await handle.read(buffer, 0, size, 0);
                return this.parsePng(buffer.subarray(0, bytesRead));
            }
            if (this.isJpegSignature(prefix)) {
                return await this.scanJpeg(handle, stat.size);
            }
            throw new Error('Unsupported image format: expected PNG or JPEG.');
        } finally {
            await handle.close();
        }
    }

    private isPngSignature(buffer: Buffer): boolean {
        return buffer.length >= 8 && buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    }

    private isJpegSignature(buffer: Buffer): boolean {
        return buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
    }

    private parsePng(buffer: Buffer): { format: string; width: number; height: number; } {
        if (buffer.length < 24) {
            throw new Error('Invalid PNG image: truncated IHDR header.');
        }
        if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
            throw new Error('Invalid PNG image: missing IHDR header.');
        }
        return {
            format: 'png',
            width: buffer.readUInt32BE(16),
            height: buffer.readUInt32BE(20)
        };
    }

    private async scanJpeg(handle: fs.FileHandle, fileSize: number): Promise<{ format: string; width: number; height: number; }> {
        let offset = 2;
        const limit = Math.min(fileSize, MAX_JPEG_SCAN_BYTES);
        while (offset + 3 < limit) {
            const markerBytes = await this.readChunk(handle, offset, 4);
            if (markerBytes.length < 4) {
                break;
            }
            if (markerBytes[0] !== 0xff) {
                throw new Error('Invalid JPEG image: malformed marker sequence.');
            }
            let markerOffset = 1;
            while (markerOffset < markerBytes.length && markerBytes[markerOffset] === 0xff) {
                markerOffset++;
            }
            if (markerOffset >= markerBytes.length) {
                offset += markerOffset;
                continue;
            }
            const marker = markerBytes[markerOffset];
            offset += markerOffset + 1;
            if (marker === 0xd9 || marker === 0xda) {
                break;
            }
            const lengthBytes = await this.readChunk(handle, offset, 2);
            if (lengthBytes.length < 2) {
                break;
            }
            const segmentLength = lengthBytes.readUInt16BE(0);
            if (segmentLength < 2) {
                throw new Error('Invalid JPEG image: malformed segment length.');
            }
            if (this.isSofMarker(marker)) {
                const segment = await this.readChunk(handle, offset, Math.min(segmentLength, 9));
                if (segment.length < 9) {
                    throw new Error('Invalid JPEG image: truncated SOF segment.');
                }
                return {
                    format: 'jpeg',
                    width: segment.readUInt16BE(5),
                    height: segment.readUInt16BE(3)
                };
            }
            offset += segmentLength;
        }
        throw new Error('Invalid JPEG image: missing SOF segment.');
    }

    private async readChunk(handle: fs.FileHandle, position: number, length: number): Promise<Buffer> {
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await handle.read(buffer, 0, length, position);
        return buffer.subarray(0, bytesRead);
    }

    private isSofMarker(marker: number): boolean {
        return (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    }
}
