import { ApplicationArguments } from '@tsdi/core';
import { FileAdapter } from '@tsdi/common';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { basenameAgentPath } from '../../AgentWorkspacePath';
import { PromptSection, PromptSectionContext } from '../PromptSection';
import { AgentOptions } from '../../options';
import { AGENT_OPTIONS } from '../../tokens';
import {
    DEFAULT_AGENTS_DOC_FALLBACK_FILENAMES,
    DEFAULT_AGENTS_DOC_MAX_BYTES,
    DEFAULT_AGENTS_DOC_NAME,
    findAgentsDoc,
    readAgentsDoc,
    truncateDocContent
} from '../../project/agents-doc';

interface AgentsDocCacheEntry {
    files: string;
    mtimes: number[];
    contents: string[];
}

function normalizeAgentPathForContainment(input: string): string {
    const value = String(input || '').trim().replace(/\\/g, '/').replace(/\/+$/, '');
    return value || '/';
}

/**
 * Injects project context from AGENTS.md files into the system prompt.
 *
 * The discovery walks upward from the current working directory (or the pinned
 * project root) and renders every doc on the path as an ordered instruction
 * chain: project root first, working directory last, so nearer instructions
 * take precedence. Within a directory `AGENTS.override.md` replaces
 * `AGENTS.md`. Each file is byte-capped (default 32KiB) and cached per-file
 * with mtime invalidation.
 */
@Injectable()
export class ProjectContextSection extends PromptSection {
    priority = 20;

    protected fileName: string = DEFAULT_AGENTS_DOC_NAME;
    protected projectRoot: string | undefined;
    protected cache: AgentsDocCacheEntry | null = null;

    constructor(
        @Optional() private fileAdapter?: FileAdapter | null,
        @Optional() @Inject(ApplicationArguments) private appArgs?: ApplicationArguments | null,
        @Optional() @Inject(AGENT_OPTIONS) private agentOptions?: AgentOptions | null
    ) {
        super();
    }

    name(): string {
        return 'project-context';
    }

    /** Pin the search root. Defaults to the injected application cwd when not set. */
    setProjectRoot(root: string): void {
        this.projectRoot = root;
        this.cache = null;
    }

    private resolveStartDir(): string {
        const cwd = this.appArgs?.cwd;
        const root = this.projectRoot;
        if (cwd && root) {
            const normalizedCwd = normalizeAgentPathForContainment(cwd);
            const normalizedRoot = normalizeAgentPathForContainment(root);
            if (normalizedCwd !== normalizedRoot && !normalizedCwd.startsWith(`${normalizedRoot}/`)) {
                return root;
            }
        }
        return cwd || root || '.';
    }

    async render(context: PromptSectionContext): Promise<string> {
        void context;
        const startDir = this.resolveStartDir();
        const options = this.agentOptions ?? {};
        const maxBytes = options.projectDocMaxBytes ?? DEFAULT_AGENTS_DOC_MAX_BYTES;
        const fallbackFilenames = options.projectDocFallbackFilenames ?? DEFAULT_AGENTS_DOC_FALLBACK_FILENAMES;
        const chain = findAgentsDoc(startDir, {
            fileName: this.fileName,
            fallbackFilenames,
            exists: this.fileAdapter ? target => this.fileAdapter!.existsSync(target) : undefined,
            stopAt: this.projectRoot
        });
        const pluginDocs = (options.pluginAgentsDocs ?? []).filter(item => item && item.path);
        if (!chain.entries.length && !pluginDocs.length) {
            return '';
        }
        const files = [...chain.entries.map(entry => entry.file), ...pluginDocs.map(item => item.path)];
        const filesKey = files.join('\u0000');
        const mtimes: number[] = [];
        for (const file of files) {
            const stat = this.fileAdapter?.stat ? await this.fileAdapter.stat(file) : null;
            mtimes.push(Number((stat as any)?.mtimeMs || 0));
        }
        let contents: string[] | null = null;
        if (this.cache && this.cache.files === filesKey && this.cache.mtimes.length === mtimes.length
            && this.cache.mtimes.every((mtime, index) => mtime === mtimes[index])) {
            contents = this.cache.contents;
        }
        if (!contents) {
            contents = [];
            for (const file of files) {
                const raw = this.fileAdapter
                    ? await this.fileAdapter.readText(file).catch(() => '')
                    : readAgentsDoc(file);
                contents.push(truncateDocContent(raw, maxBytes).content);
            }
            this.cache = { files: filesKey, mtimes, contents };
        }
        const parts: string[] = [];
        chain.entries.forEach((entry, index) => {
            const content = contents![index].trim();
            if (!content) {
                return;
            }
            const label = basenameAgentPath(entry.dir) || entry.file;
            parts.push(`## Project Context (${label}${entry.override ? ' · override' : ''})\n\n${content}`);
        });
        pluginDocs.forEach((doc, index) => {
            const content = contents![chain.entries.length + index].trim();
            if (!content) {
                return;
            }
            const label = doc.label || basenameAgentPath(doc.path) || doc.path;
            parts.push(`## Project Context (plugin: ${label})\n\n${content}`);
        });
        return parts.join('\n\n');
    }
}
