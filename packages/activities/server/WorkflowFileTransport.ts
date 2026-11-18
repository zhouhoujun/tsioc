import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Injectable } from '@tsdi/ioc';
import {
    WorkflowFileReadRequest,
    WorkflowFileReadResult,
    WorkflowFileWriteRequest,
    WorkflowFileWriteResult
} from '../src/visual/VisualWorkflowService';

function outsideRoot(target: string, root?: string): boolean {
    if (!root) {
        return false;
    }
    const resolvedRoot = path.resolve(root);
    const relative = path.relative(resolvedRoot, path.resolve(target));
    return relative.startsWith('..') || path.isAbsolute(relative);
}

/**
 * Host file access for `file-in` / `file-out`.
 *
 * Every path is resolved against the configured workspace root; escaping it
 * fails with an actionable message instead of writing anywhere on the host.
 */
@Injectable()
export class WorkflowFileTransport {
    constructor(private readonly workspaceRoot?: string) { }

    async read(request: WorkflowFileReadRequest): Promise<WorkflowFileReadResult> {
        const target = this.resolve(request.path);
        const encoding = request.encoding === 'base64' ? 'base64' : 'utf8';
        try {
            const buffer = await fs.readFile(target);
            const data = encoding === 'base64' ? buffer.toString('base64') : buffer.toString('utf8');
            return { data, path: target, size: buffer.byteLength };
        } catch (error) {
            throw this.describe(error, target, 'read');
        }
    }

    async write(request: WorkflowFileWriteRequest): Promise<WorkflowFileWriteResult> {
        const target = this.resolve(request.path);
        const encoding = request.encoding === 'base64' ? 'base64' : 'utf8';
        const data = encoding === 'base64'
            ? Buffer.from(String(request.data ?? ''), 'base64')
            : String(request.data ?? '');
        try {
            if (request.mkdir !== false) {
                await fs.mkdir(path.dirname(target), { recursive: true });
            }
            if (request.append) {
                await fs.appendFile(target, data);
            } else {
                await fs.writeFile(target, data);
            }
            const bytes = typeof data === 'string' ? Buffer.byteLength(data) : data.byteLength;
            return { path: target, bytes };
        } catch (error) {
            throw this.describe(error, target, 'write');
        }
    }

    private resolve(filePath: string): string {
        const requested = String(filePath || '').trim();
        if (!requested) {
            throw new Error('A file path is required.');
        }
        const target = path.isAbsolute(requested)
            ? path.resolve(requested)
            : path.resolve(this.workspaceRoot || process.cwd(), requested);
        if (outsideRoot(target, this.workspaceRoot)) {
            throw new Error(
                `Path "${requested}" is outside the allowed workspace root (${this.workspaceRoot}). `
                + 'Use a workspace-relative path such as "data/out.json".'
            );
        }
        return target;
    }

    private describe(error: unknown, target: string, action: 'read' | 'write'): Error {
        const code = (error as { code?: string })?.code;
        const hint = code === 'ENOENT'
            ? `File not found: ${target}.`
            : code === 'EACCES' || code === 'EPERM'
                ? `Permission denied: ${target}.`
                : code === 'EISDIR'
                    ? `Path is a directory: ${target}.`
                    : `Could not ${action} ${target}: ${(error as Error)?.message || String(error)}`;
        const error_ = new Error(hint);
        (error_ as any).cause = error;
        return error_;
    }
}
