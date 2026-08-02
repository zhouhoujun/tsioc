import { Injectable } from '@tsdi/ioc';
import { statSync } from 'fs';
import { basename, dirname } from 'path';
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

    name(): string {
        return 'project-context';
    }

    /** Pin the search root. Defaults to process.cwd() when not set. */
    setProjectRoot(root: string): void {
        this.projectRoot = root;
        this.cache = null;
    }

    protected readCachedContent(file: string): string {
        let mtimeMs = 0;
        try {
            mtimeMs = statSync(file).mtimeMs;
        } catch {
            return '';
        }
        if (this.cache && this.cache.file === file && this.cache.mtimeMs === mtimeMs) {
            return this.cache.content;
        }
        const content = readAgentsDoc(file);
        this.cache = { file, mtimeMs, content };
        return content;
    }

    async render(context: PromptSectionContext): Promise<string> {
        const startDir = this.projectRoot ?? process.cwd();
        const file = findAgentsDoc(startDir, this.fileName);
        if (!file) {
            return '';
        }
        const content = this.readCachedContent(file);
        if (!content.trim()) {
            return '';
        }
        const label = basename(dirname(file)) || file;
        return `## Project Context (${label})\n\n${content.trim()}`;
    }
}
