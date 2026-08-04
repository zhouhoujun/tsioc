import { execFile } from 'child_process';
import * as path from 'path';
import { AgentFormatterOptions } from '@tsdi/agent';

export interface FormatRunResult {
    attempted: boolean;
    formatted?: string;
    failure?: string;
}

function matchesExtension(filePath: string, extensions: string[]): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return extensions.some(item => item.toLowerCase() === ext);
}

export async function runFormatter(
    filePath: string,
    options: AgentFormatterOptions | undefined
): Promise<FormatRunResult> {
    if (!options || !options.command || !options.extensions || !options.extensions.length) {
        return { attempted: false };
    }
    if (!matchesExtension(filePath, options.extensions)) {
        return { attempted: false };
    }
    try {
        await new Promise<void>((resolve, reject) => {
            execFile(
                options.command,
                [filePath],
                { env: { ...process.env, ...(options.env ?? {}) }, timeout: 15000 },
                error => (error ? reject(error) : resolve())
            );
        });
        return { attempted: true, formatted: filePath };
    } catch (error: any) {
        return { attempted: true, failure: error?.message ?? String(error) };
    }
}
