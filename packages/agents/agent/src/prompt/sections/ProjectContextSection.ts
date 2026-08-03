import { ApplicationArguments } from '@tsdi/core';
import { FileAdapter } from '@tsdi/common';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { basenameAgentPath, dirnameAgentPath } from '../../AgentWorkspacePath';
import { PromptSection, PromptSectionContext } from '../PromptSection';
import { DEFAULT_AGENTS_DOC_NAME, findAgentsDoc, readAgentsDoc } from '../../project/agents-doc';

interface AgentsDocCacheEntry {
    file: string;
    mtimeMs: number;
    content: string;
}

/**
 * Injects project context from an AGENTS.md file into the system prompt.
 *
 * The file is located by walking upward from the current working directory
 * (or the pinned project root), mirroring the opencode AGENTS.md convention.
 * When no file exists the section renders empty and is skipped. Content is
 * cached per-file and invalidated on mtime change.
 */
@Injectable()
export class ProjectContextSection extends PromptSection {
    priority = 20;

    protected fileName: string = DEFAULT_AGENTS_DOC_NAME;
    protected projectRoot: string | undefined;
    protected cache: AgentsDocCacheEntry | null = null;

    constructor(
        @Optional() private fileAdapter?: FileAdapter | null,
        @Optional() @Inject(ApplicationArguments) private appArgs?: ApplicationArguments | null
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

    protected readCachedContent(file: string): string {
        return this.cache?.file === file ? this.cache.content : '';
    }

    async render(context: PromptSectionContext): Promise<string> {
        void context;
        const startDir = this.projectRoot ?? this.appArgs?.cwd ?? '.';
        const file = findAgentsDoc(startDir, this.fileName, {
            exists: this.fileAdapter ? target => this.fileAdapter!.existsSync(target) : undefined,
            stopAt: this.projectRoot
        });
        if (!file) {
            return '';
        }
        const stat = this.fileAdapter?.stat ? await this.fileAdapter.stat(file) : null;
        const mtimeMs = Number((stat as any)?.mtimeMs || 0);
        if (this.cache && this.cache.file === file && this.cache.mtimeMs === mtimeMs) {
            return this.cache.content.trim()
                ? `## Project Context (${basenameAgentPath(dirnameAgentPath(file)) || file})\n\n${this.cache.content.trim()}`
                : '';
        }
        const content = this.fileAdapter
            ? await this.fileAdapter.readText(file).catch(() => '')
            : readAgentsDoc(file);
        this.cache = { file, mtimeMs, content };
        if (!content.trim()) {
            return '';
        }
        const label = basenameAgentPath(dirnameAgentPath(file)) || file;
        return `## Project Context (${label})\n\n${content.trim()}`;
    }
}
