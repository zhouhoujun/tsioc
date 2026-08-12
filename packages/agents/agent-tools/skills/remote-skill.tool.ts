import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { LocalSkillRegistry } from './LocalSkillRegistry';
import { RemoteSkillManager } from './remote-skill-manager';
import { RemoteSkillSource, RemoteSkillSourceType } from './types';

@Injectable()
export class RemoteSkillTool implements AgentTool {
    name = 'skills_remote';
    description = 'Install, update, list, or remove skills from remote git repositories or registry manifests, with version tracking and conflict detection against registered skills.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['install', 'update', 'list', 'remove', 'status'],
                description: 'Operation to perform.'
            },
            source: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Unique id for the remote skill source.' },
                    type: { type: 'string', enum: ['git', 'registry'], description: 'git clones a repository; registry fetches a JSON manifest of skills.' },
                    url: { type: 'string', description: 'Git URL or registry manifest URL.' },
                    ref: { type: 'string', description: 'Git branch/tag to pin (git sources).' },
                    version: { type: 'string', description: 'Expected registry manifest version.' }
                },
                required: ['id', 'type', 'url'],
                description: 'Remote source descriptor (required for install/update).'
            },
            id: { type: 'string', description: 'Installed source id (required for remove/update).' },
            force: { type: 'boolean', description: 'Override conflicting skill ids on install (default false).' },
            cacheDir: { type: 'string', description: 'Local cache directory (defaults to the configured or user-level skills cache).' }
        },
        required: ['action']
    };
    toolset = 'skills';
    source = 'local';
    execution = { readOnly: false, sideEffect: true };

    constructor(
        private manager: RemoteSkillManager,
        private skills: LocalSkillRegistry,
        @Optional() @Inject(AGENT_TOOLS_OPTIONS) private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const action = this.requireString(input?.action, 'skills_remote action');
        const cacheDir = this.resolveCacheDir(input?.cacheDir);
        switch (action) {
            case 'list':
                return { cacheDir, installed: this.manager.list(cacheDir) };
            case 'status':
                return { cacheDir, installed: this.manager.list(cacheDir), registered: this.skills.list().length };
            case 'install':
                return this.install(this.requireSource(input?.source), cacheDir, input?.force === true);
            case 'update':
                return this.update(this.requireSource(input?.source, input?.id), cacheDir);
            case 'remove':
                return this.remove(this.requireString(input?.id, 'skills_remote id'), cacheDir);
            default:
                throw new Error(`Invalid skills_remote action '${action}'. Use install, update, list, remove, or status.`);
        }
    }

    private async install(source: RemoteSkillSource, cacheDir: string, force: boolean): Promise<any> {
        const existing = this.skills.list();
        const installed = await this.manager.install(source, cacheDir, existing, force);
        return {
            installed,
            installedSkills: installed.skillIds,
            version: installed.version ?? null,
            message: `Installed remote skill '${source.id}' (${source.type}) with ${installed.skillIds.length} skill${installed.skillIds.length === 1 ? '' : 's'}.`
        };
    }

    private async update(source: RemoteSkillSource, cacheDir: string): Promise<any> {
        const updated = await this.manager.update(source, cacheDir);
        return {
            updated,
            version: updated.version ?? null,
            message: `Updated remote skill '${source.id}' to ${updated.version ?? 'latest'}.`
        };
    }

    private async remove(id: string, cacheDir: string): Promise<any> {
        const removed = this.manager.remove(id, cacheDir);
        return { id, removed, message: removed ? `Removed remote skill '${id}'.` : `Remote skill '${id}' is not installed.` };
    }

    private resolveCacheDir(value: unknown): string {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
        return this.options?.skillsRemoteCacheDir || this.manager.defaultCacheDir();
    }

    private requireSource(value: unknown, fallbackId?: string): RemoteSkillSource {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            if (fallbackId) {
                const installed = this.manager.list(this.options?.skillsRemoteCacheDir || this.manager.defaultCacheDir());
                const record = installed.find(item => item.id === fallbackId);
                if (record) {
                    return { id: record.id, type: record.type, url: record.url, ...(record.ref ? { ref: record.ref } : {}), ...(record.version ? { version: record.version } : {}) };
                }
            }
            throw new Error('Invalid skills_remote source: an object with id, type, and url is required.');
        }
        const id = this.requireString((value as any).id, 'source.id');
        const type = this.requireSourceType((value as any).type);
        const url = this.requireString((value as any).url, 'source.url');
        return {
            id,
            type,
            url,
            ...(typeof (value as any).ref === 'string' && (value as any).ref.trim() ? { ref: (value as any).ref.trim() } : {}),
            ...(typeof (value as any).version === 'string' && (value as any).version.trim() ? { version: (value as any).version.trim() } : {})
        };
    }

    private requireSourceType(value: unknown): RemoteSkillSourceType {
        if (value === 'git' || value === 'registry') {
            return value;
        }
        throw new Error("Invalid skills_remote source.type: must be 'git' or 'registry'.");
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
