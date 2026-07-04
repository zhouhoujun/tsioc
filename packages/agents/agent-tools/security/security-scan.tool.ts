import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Inject, Injectable, Optional } from '@tsdi/ioc';
import { promises as fs } from 'fs';
import { resolveFilePolicy, resolveWorkspacePath } from '../files/path-policy';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';

@Abstract()
export abstract class SecurityScannerAdapter {
    abstract scan(path: string, options?: ScanOptions): Promise<ScanResult>;
}

export interface ScanOptions {
    severityThreshold?: 'low' | 'medium' | 'high' | 'critical';
    scanSecrets?: boolean;
    scanDeps?: boolean;
    scanCode?: boolean;
}

export interface ScanResult {
    vulnerabilities: Array<{
        severity: string;
        type: string;
        description: string;
        location?: string;
        recommendation?: string;
    }>;
    summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        total: number;
    };
}

@Injectable()
export class SecurityScanTool implements AgentTool {
    name = 'security_scan';
    description = 'Scan files or dependencies for security vulnerabilities, secrets, and code issues. Uses a configured security scanner adapter.';

    inputSchema = {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'File or directory path to scan.'
            },
            severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Minimum severity to report (default: medium).'
            },
            scan_secrets: {
                type: 'boolean',
                description: 'Scan for hardcoded secrets (default: true).'
            },
            scan_deps: {
                type: 'boolean',
                description: 'Scan dependencies for known vulnerabilities (default: true).'
            },
            scan_code: {
                type: 'boolean',
                description: 'Scan source code for security issues (default: true).'
            }
        },
        required: ['path']
    };
    toolset = 'security';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions,
        @Optional() @Inject(SecurityScannerAdapter)
        private adapter?: SecurityScannerAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const path = this.requireString(input?.path, 'security_scan path');
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(path, policy.rootDir);

        try {
            await fs.stat(absolutePath);
        } catch {
            throw new Error(`Security scan path '${path}' does not exist.`);
        }

        if (this.adapter) {
            const result = await this.adapter.scan(absolutePath, {
                severityThreshold: typeof input?.severity === 'string' ? input.severity as any : 'medium',
                scanSecrets: input?.scan_secrets !== false,
                scanDeps: input?.scan_deps !== false,
                scanCode: input?.scan_code !== false
            });
            return {
                path,
                vulnerabilities: result.vulnerabilities,
                summary: result.summary
            };
        }

        return {
            path,
            vulnerabilities: [],
            summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
            note: 'No security scanner adapter configured.'
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
