import expect = require('expect');
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { promises as fs } from 'fs';
import { symlinkSync } from 'fs';
import { Suite, Test } from '@tsdi/unit';
import { AgentScheduler, InMemoryMemoryStore, InMemorySessionStore, ScheduledAgentTask } from '@tsdi/agent';
import { CalculatorTool } from '../utility/calculator.tool';
import { ReadFileTool } from '../files/read-file.tool';
import { WriteFileTool } from '../files/write-file.tool';
import { EditFileTool } from '../files/edit-file.tool';
import { GlobSearchTool } from '../files/glob-search.tool';
import { ContentSearchTool } from '../files/content-search.tool';
import { WebSearchTool } from '../web/web-search.tool';
import { WebExtractTool } from '../web/web-extract.tool';
import { BrowserOpenTool } from '../browser/browser-open.tool';
import { TextBrowserTool } from '../browser/text-browser.tool';
import { SessionsCurrentTool } from '../sessions/sessions-current.tool';
import { SessionsListTool } from '../sessions/sessions-list.tool';
import { SessionsHistoryTool } from '../sessions/sessions-history.tool';
import { TodoStore } from '../planning/todo-store';
import { TodoTool } from '../planning/todo.tool';
import { AskUserTool } from '../planning/ask-user.tool';
import { EscalateTool } from '../planning/escalate.tool';
import { ScheduleTool } from '../scheduling/schedule.tool';
import { TerminalTool } from '../terminal/terminal.tool';
import { ProcessRegistry } from '../process/ProcessRegistry';
import { ProcessStartTool } from '../process/process-start.tool';
import { ProcessPollTool } from '../process/process-poll.tool';
import { ProcessKillTool } from '../process/process-kill.tool';
import { MemoryDeleteTool } from '../memory/memory-delete.tool';
import { MemoryListTool } from '../memory/memory-list.tool';
import { MemoryPutTool } from '../memory/memory-put.tool';
import { MemorySearchTool } from '../memory/memory-search.tool';
import { MemoryRecallTool } from '../memory/memory-recall.tool';
import { MemoryForgetTool } from '../memory/memory-forget.tool';
import { MemoryExportTool } from '../memory/memory-export.tool';
import { MemoryPurgeTool } from '../memory/memory-purge.tool';
import { HttpFetchTool } from '../http/http-fetch.tool';
import { HttpRequestTool } from '../http/http-request.tool';
import { ToolInspectTool } from '../registry/tool-inspect.tool';
import { ToolSearchTool } from '../registry/tool-search.tool';
import { ProjectIntelTool } from '../project/project-intel.tool';
import { provideTools, resolveAgentToolBundles, resolveAgentToolNames, AGENT_TOOL_GROUPS, withProjectAgentTools, withProcessAgentTools } from '../src/provider';
import { AgentToolsModule } from '../src/agent-tools.module';
import { resolveAgentRootSettings } from '../src/settings';
import { Application } from '@tsdi/core';
import { ToolRegistry, AgentRuntime, EchoModelAdapter, AGENT_MODEL_ADAPTER, AgentModule } from '@tsdi/agent';
import { TodoTool as ExportedTodoTool, AskUserTool as ExportedAskUserTool, EscalateTool as ExportedEscalateTool } from '../planning';
import { BrowserOpenTool as ExportedBrowserOpenTool, TextBrowserTool as ExportedTextBrowserTool } from '../browser';
import { SessionsCurrentTool as ExportedSessionsCurrentTool, SessionsListTool as ExportedSessionsListTool, SessionsHistoryTool as ExportedSessionsHistoryTool } from '../sessions';
import { ScheduleTool as ExportedScheduleTool } from '../scheduling';
import { TerminalTool as ExportedTerminalTool } from '../terminal';
import { ProcessStartTool as ExportedProcessStartTool, ProcessPollTool as ExportedProcessPollTool, ProcessKillTool as ExportedProcessKillTool } from '../process';
import { ImageInfoTool as ExportedImageInfoTool, PdfReadTool as ExportedPdfReadTool } from '../media';
import { WriteFileTool as ExportedWriteFileTool, EditFileTool as ExportedEditFileTool } from '../files';
import * as ExportedMemoryModule from '../memory';
const ExportedMemory: any = ExportedMemoryModule;
import { HttpFetchTool as ExportedHttpFetchTool, HttpRequestTool as ExportedHttpRequestTool } from '../http';
import { ToolInspectTool as ExportedToolInspectTool, ToolSearchTool as ExportedToolSearchTool } from '../registry';
import { ProjectIntelTool as ExportedProjectIntelTool } from '../project';
import { ImageInfoTool, PdfReadTool } from '../media';
import { provideSkills, LocalSkillRegistry, ListSkillTool, loadAgentSkillsFromRoots, loadBuiltinSkills, getBuiltinSkills, resetBuiltinSkillsCache, copyBuiltinSkillAssets } from '../skills';
import { LocalMcpClientRegistry } from '../mcp';

class FakeScheduler extends AgentScheduler {
    scheduled: ScheduledAgentTask[] = [];
    cancelled: string[] = [];
    paused: string[] = [];
    resumed: string[] = [];
    updated: Array<{ id: string; patch: Partial<ScheduledAgentTask>; }> = [];

    async start(): Promise<void> {
        return;
    }

    async stop(): Promise<void> {
        return;
    }

    async schedule(task: ScheduledAgentTask): Promise<ScheduledAgentTask> {
        this.scheduled.push({ ...task });
        return task;
    }

    async cancel(taskId: string): Promise<void> {
        this.cancelled.push(taskId);
        this.scheduled = this.scheduled.map(task => task.id === taskId ? { ...task, cancelled: true } : task);
    }

    getTask(taskId: string): ScheduledAgentTask | undefined {
        const task = this.scheduled.find(item => item.id === taskId && !item.cancelled);
        return task ? { ...task } : undefined;
    }

    async pause(taskId: string): Promise<ScheduledAgentTask | undefined> {
        let next: ScheduledAgentTask | undefined;
        this.scheduled = this.scheduled.map(task => {
            if (task.id !== taskId || task.cancelled) {
                return task;
            }
            const updated = { ...task, paused: true as any, updatedAt: Date.now() } as ScheduledAgentTask;
            next = updated;
            return updated;
        });
        if (next) {
            this.paused.push(taskId);
        }
        return next ? { ...next } : undefined;
    }

    async resume(taskId: string): Promise<ScheduledAgentTask | undefined> {
        let next: ScheduledAgentTask | undefined;
        this.scheduled = this.scheduled.map(task => {
            if (task.id !== taskId || task.cancelled) {
                return task;
            }
            const updated = { ...(task as any), paused: false, updatedAt: Date.now() } as ScheduledAgentTask;
            next = updated;
            return updated;
        });
        if (next) {
            this.resumed.push(taskId);
        }
        return next ? { ...next } : undefined;
    }

    async update(taskId: string, patch: Partial<ScheduledAgentTask>): Promise<ScheduledAgentTask | undefined> {
        let next: ScheduledAgentTask | undefined;
        this.scheduled = this.scheduled.map(task => {
            if (task.id !== taskId || task.cancelled) {
                return task;
            }
            const updated = { ...task, ...patch, id: task.id, sessionId: task.sessionId, updatedAt: Date.now() };
            next = updated;
            return updated;
        });
        if (next) {
            this.updated.push({ id: taskId, patch: { ...patch } });
        }
        return next ? { ...next } : undefined;
    }

    getTasks(): ScheduledAgentTask[] {
        return this.scheduled.filter(task => !task.cancelled).map(task => ({ ...task }));
    }
}

function createSessionContext(overrides?: { sessionId?: string; memory?: InMemoryMemoryStore; scheduler?: AgentScheduler; }): any {
    return {
        sessionId: 's1',
        memory: new InMemoryMemoryStore(),
        ...overrides
    };
}

@Suite('Agent tools package')
export class AgentToolsPackageTest {
    private async createWorkspace(): Promise<string> {
        const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-tools-'));
        await fs.mkdir(path.join(workspace, 'src'), { recursive: true });
        await fs.writeFile(path.join(workspace, 'src', 'alpha.txt'), 'alpha\nbeta\ngamma\n', 'utf8');
        await fs.writeFile(path.join(workspace, 'src', 'beta.ts'), 'export const value = 1;\nconst beta = value + 1;\n', 'utf8');
        await fs.mkdir(path.join(workspace, 'node_modules', 'pkg'), { recursive: true });
        await fs.writeFile(path.join(workspace, 'node_modules', 'pkg', 'ignored.txt'), 'ignored', 'utf8');
        return workspace;
    }

    private async waitFor(predicate: () => Promise<boolean>, timeoutMs = 2000): Promise<void> {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            if (await predicate()) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        throw new Error(`Timed out after ${timeoutMs}ms waiting for condition.`);
    }

    private pngFixture(width: number, height: number): Buffer {
        const buffer = Buffer.alloc(33);
        Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
        buffer.writeUInt32BE(13, 8);
        buffer.write('IHDR', 12, 'ascii');
        buffer.writeUInt32BE(width, 16);
        buffer.writeUInt32BE(height, 20);
        buffer[24] = 8;
        buffer[25] = 2;
        buffer[26] = 0;
        buffer[27] = 0;
        buffer[28] = 0;
        return buffer;
    }

    private jpegFixture(width: number, height: number): Buffer {
        return Buffer.from([
            0xff, 0xd8,
            0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
            0xff, 0xc0, 0x00, 0x11, 0x08,
            (height >> 8) & 0xff, height & 0xff,
            (width >> 8) & 0xff, width & 0xff,
            0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
            0xff, 0xd9
        ]);
    }

    private async createSkillRoot(): Promise<string> {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-skills-'));
        await fs.mkdir(path.join(root, 'software-development', 'writing-plans'), { recursive: true });
        await fs.mkdir(path.join(root, 'creative', 'sketch'), { recursive: true });
        await fs.writeFile(path.join(root, 'software-development', 'writing-plans', 'SKILL.md'), `---\nname: writing-plans\ndescription: "Write implementation plans."\n---\n\n# Writing Plans\n\nWrite plans before implementation.\n`, 'utf8');
        await fs.writeFile(path.join(root, 'creative', 'sketch', 'SKILL.md'), `---\nname: sketch\ndescription: |\n  Create quick visual sketches.\n---\n\n# Sketch\n\nMake fast mockups.\n`, 'utf8');
        await fs.writeFile(path.join(root, 'README.md'), '# ignored\n', 'utf8');
        return root;
    }

    private async createAgentRootWithWorkspaceSkills(settings?: { workspace?: string; skillRoots?: string[]; }): Promise<string> {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-root-'));
        const workspaceName = settings?.workspace ?? 'workspace';
        const workspace = path.join(root, workspaceName);
        const skillRoots = settings?.skillRoots ?? ['skills'];
        await fs.mkdir(workspace, { recursive: true });
        await fs.writeFile(path.join(root, 'settings.json'), JSON.stringify({
            workspace: workspaceName,
            skills: {
                roots: skillRoots
            }
        }), 'utf8');
        return root;
    }

    @Test('agent root settings resolve workspace roots from settings file')
    async agentRootSettingsResolveWorkspaceRootsFromSettingsFile() {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-root-'));
        await fs.writeFile(path.join(root, 'settings.json'), JSON.stringify({
            workspace: 'custom-workspace',
            tools: {
                root: 'tools'
            },
            skills: {
                roots: ['skills', 'custom-skills']
            }
        }), 'utf8');
        const resolved = resolveAgentRootSettings(root);
        expect(resolved.root).toBe(path.resolve(root));
        expect(resolved.settingsPath).toBe(path.join(path.resolve(root), 'settings.json'));
        expect(resolved.workspace).toBe(path.join(path.resolve(root), 'custom-workspace'));
        expect(resolved.toolsRoot).toBe(path.join(path.resolve(root), 'custom-workspace', 'tools'));
        expect(resolved.skillRoots).toEqual([
            path.join(path.resolve(root), 'custom-workspace', 'skills'),
            path.join(path.resolve(root), 'custom-workspace', 'custom-skills')
        ]);
    }

    @Test('calculator evaluates arithmetic expression')
    async calculatorEvaluatesExpression() {
        const tool = new CalculatorTool();
        const result = await tool.invoke({ expression: '2 * (3 + 4) - 5 / 5' }, createSessionContext());
        expect(result.value).toEqual(13);
        expect(tool.execution?.readOnly).toEqual(true);
    }

    @Test('calculator rejects invalid expression')
    async calculatorRejectsInvalidExpression() {
        const tool = new CalculatorTool();
        let error: Error | undefined;
        try {
            await tool.invoke({ expression: '2 + nope' }, createSessionContext());
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('Invalid');
    }

    @Test('read file truncates content and blocks traversal')
    async readFileHonorsLimitsAndRootPolicy() {
        const workspace = await this.createWorkspace();
        const tool = new ReadFileTool({ file: { rootDir: workspace, maxReadBytes: 8, maxReadLines: 1 } });

        const result = await tool.invoke({ path: 'src/alpha.txt' }, createSessionContext());
        expect(result.path).toEqual('src/alpha.txt');
        expect(result.truncated).toEqual(true);
        expect(result.content).toContain('alpha');

        let error: Error | undefined;
        try {
            await tool.invoke({ path: '../outside.txt' }, createSessionContext());
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('outside');
    }

    @Test('write file writes content within workspace and blocks traversal')
    async writeFileWritesContentWithinWorkspaceAndBlocksTraversal() {
        const workspace = await this.createWorkspace();
        const tool = new WriteFileTool({ file: { rootDir: workspace } });

        const created = await tool.invoke({ path: 'src/new.txt', content: 'hello world' }, createSessionContext());
        expect(created.path).toEqual('src/new.txt');
        expect(created.created).toEqual(true);
        expect(created.overwritten).toEqual(false);
        expect(await fs.readFile(path.join(workspace, 'src', 'new.txt'), 'utf8')).toEqual('hello world');

        const nested = await tool.invoke({ path: 'nested/deep/file.txt', content: 'nested value' }, createSessionContext());
        expect(nested.path).toEqual('nested/deep/file.txt');
        expect(await fs.readFile(path.join(workspace, 'nested', 'deep', 'file.txt'), 'utf8')).toEqual('nested value');

        const overwritten = await tool.invoke({ path: 'src/new.txt', content: 'updated' }, createSessionContext());
        expect(overwritten.created).toEqual(false);
        expect(overwritten.overwritten).toEqual(true);
        expect(await fs.readFile(path.join(workspace, 'src', 'new.txt'), 'utf8')).toEqual('updated');

        let error: Error | undefined;
        try {
            await tool.invoke({ path: '../outside.txt', content: 'nope' }, createSessionContext());
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('outside');
    }

    @Test('edit file replaces exact text and validates matches')
    async editFileReplacesExactTextAndValidatesMatches() {
        const workspace = await this.createWorkspace();
        const tool = new EditFileTool({ file: { rootDir: workspace } });

        const result = await tool.invoke({ path: 'src/beta.ts', oldString: 'value = 1', newString: 'value = 2' }, createSessionContext());
        expect(result.path).toEqual('src/beta.ts');
        expect(result.replacements).toEqual(1);
        expect(await fs.readFile(path.join(workspace, 'src', 'beta.ts'), 'utf8')).toContain('value = 2');

        let notFound: Error | undefined;
        try {
            await tool.invoke({ path: 'src/beta.ts', oldString: 'missing', newString: 'x' }, createSessionContext());
        } catch (err) {
            notFound = err as Error;
        }
        expect(notFound?.message).toContain('not found');

        await fs.writeFile(path.join(workspace, 'src', 'repeated.txt'), 'same same same', 'utf8');
        let ambiguous: Error | undefined;
        try {
            await tool.invoke({ path: 'src/repeated.txt', oldString: 'same', newString: 'done' }, createSessionContext());
        } catch (err) {
            ambiguous = err as Error;
        }
        expect(ambiguous?.message).toContain('replaceAll');

        const replacedAll = await tool.invoke({ path: 'src/repeated.txt', oldString: 'same', newString: 'done', replaceAll: true }, createSessionContext());
        expect(replacedAll.replacements).toEqual(3);
        expect(await fs.readFile(path.join(workspace, 'src', 'repeated.txt'), 'utf8')).toEqual('done done done');
    }

    @Test('glob search returns relative workspace matches')
    async globSearchFindsFiles() {
        const workspace = await this.createWorkspace();
        const tool = new GlobSearchTool({ file: { rootDir: workspace } });

        const result = await tool.invoke({ pattern: 'src/**/*.txt' }, createSessionContext());
        expect(result.matches).toEqual(['src/alpha.txt']);

        let outsideError: Error | undefined;
        try {
            await tool.invoke({ pattern: '../**/*.txt' }, createSessionContext());
        } catch (err) {
            outsideError = err as Error;
        }
        expect(outsideError?.message).toContain('workspace root');
    }

    @Test('filesystem tools reject symlink paths in workspace')
    async filesystemToolsRejectSymlinkPathsInWorkspace() {
        const workspace = await this.createWorkspace();
        const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-tools-outside-'));
        const outsideFile = path.join(outside, 'outside.txt');
        await fs.writeFile(outsideFile, 'outside', 'utf8');
        symlinkSync(outsideFile, path.join(workspace, 'src', 'linked.txt'));

        const reader = new ReadFileTool({ file: { rootDir: workspace } });
        const globber = new GlobSearchTool({ file: { rootDir: workspace } });
        const searcher = new ContentSearchTool({ file: { rootDir: workspace } });

        let readError: Error | undefined;
        try {
            await reader.invoke({ path: 'src/linked.txt' }, createSessionContext());
        } catch (err) {
            readError = err as Error;
        }
        expect(readError?.message).toContain('symbolic link');

        let globError: Error | undefined;
        try {
            await globber.invoke({ pattern: 'src/**/*.txt' }, createSessionContext());
        } catch (err) {
            globError = err as Error;
        }
        expect(globError?.message).toContain('symbolic link');

        let searchError: Error | undefined;
        try {
            await searcher.invoke({ query: 'outside', glob: 'src/**/*.txt' }, createSessionContext());
        } catch (err) {
            searchError = err as Error;
        }
        expect(searchError?.message).toContain('symbolic link');
    }

    @Test('content search returns line matches')
    async contentSearchFindsMatches() {
        const workspace = await this.createWorkspace();
        const tool = new ContentSearchTool({ file: { rootDir: workspace, maxSearchResults: 5 } });

        const result = await tool.invoke({ query: 'beta', glob: 'src/**/*' }, createSessionContext());
        expect(result.matches.length).toEqual(2);
        expect(result.matches[0].path).toContain('src/');
        expect(result.matches[0].line).toBeGreaterThan(0);

        let outsideError: Error | undefined;
        try {
            await tool.invoke({ query: 'beta', glob: '../**/*' }, createSessionContext());
        } catch (err) {
            outsideError = err as Error;
        }
        expect(outsideError?.message).toContain('workspace root');
    }

    @Test('web search delegates to configured adapter')
    async webSearchDelegatesToAdapter() {
        const tool = new WebSearchTool({
            web: {
                search: {
                    async search(query: string, limit?: number) {
                        return [{ title: `${query}:${limit}`, url: 'https://example.com', snippet: 'ok' }];
                    }
                }
            }
        });

        const result = await tool.invoke({ query: 'router', limit: 3 }, createSessionContext());
        expect(result.results.length).toEqual(1);
        expect(result.results[0].title).toEqual('router:3');
    }

    @Test('web extract fetches and strips html')
    async webExtractStripsHtml() {
        const tool = new WebExtractTool({
            web: {
                fetch: (async () => ({
                    ok: true,
                    status: 200,
                    text: async () => '<html><head><title>Demo</title></head><body><h1>Hello</h1><p>World</p></body></html>'
                })) as any
            }
        });

        const result = await tool.invoke({ url: 'https://example.com' }, createSessionContext());
        expect(result.title).toEqual('Demo');
        expect(result.content).toContain('Hello');
        expect(result.content).toContain('World');
    }

    @Test('browser open normalizes safe urls and rejects unsafe protocols')
    async browserOpenNormalizesSafeUrlsAndRejectsUnsafeProtocols() {
        const tool = new BrowserOpenTool();
        const result = await tool.invoke({ url: 'https://example.com/docs?q=1' }, createSessionContext());
        expect(result.requested).toEqual(true);
        expect(result.opened).toEqual(false);
        expect(result.url).toEqual('https://example.com/docs?q=1');
        expect(tool.execution?.readOnly).toEqual(true);

        let error: Error | undefined;
        try {
            await tool.invoke({ url: 'javascript:alert(1)' }, createSessionContext());
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('http or https');
    }

    @Test('text browser fetches readable text and truncates large content')
    async textBrowserFetchesReadableTextAndTruncatesLargeContent() {
        class TestTextBrowserTool extends TextBrowserTool {
            lastUrl?: string;
            lastLimit?: number;

            constructor() {
                super({ web: { maxContentChars: 10 } });
            }

            protected async fetchPage(url: URL, maxBytes: number): Promise<any> {
                this.lastUrl = url.toString();
                this.lastLimit = maxBytes;
                return {
                    ok: true,
                    status: 200,
                    headers: { 'content-type': 'text/html; charset=utf-8' },
                    body: '<html><head><title>Demo</title><style>.x{color:red}</style></head><body><script>bad()</script><h1>Hello</h1><p>World again</p></body></html>',
                    truncated: false
                };
            }
        }

        const tool = new TestTextBrowserTool();
        const result = await tool.invoke({ url: 'https://example.com/page' }, createSessionContext());
        expect(tool.lastUrl).toEqual('https://example.com/page');
        expect((tool.lastLimit ?? 0) >= 256 * 1024).toEqual(true);
        expect(result.title).toEqual('Demo');
        expect(result.ok).toEqual(true);
        expect(result.status).toEqual(200);
        expect(result.content).toEqual('Hello Worl');
        expect(result.truncated).toEqual(true);
    }

    @Test('text browser blocks internal network targets')
    async textBrowserBlocksInternalNetworkTargets() {
        const tool = new TextBrowserTool({
            web: {
                fetch: (async () => {
                    throw new Error('fetch should not run');
                }) as any
            }
        });

        let localhostError: Error | undefined;
        try {
            await tool.invoke({ url: 'http://localhost:8080/health' }, createSessionContext());
        } catch (err) {
            localhostError = err as Error;
        }
        expect(localhostError?.message).toContain('blocked internal host');

        let metadataError: Error | undefined;
        try {
            await tool.invoke({ url: 'http://169.254.169.254/latest/meta-data' }, createSessionContext());
        } catch (err) {
            metadataError = err as Error;
        }
        expect(metadataError?.message).toContain('blocked internal host');
    }

    @Test('image info reads png and jpeg headers and validates invalid inputs')
    async imageInfoReadsHeadersAndValidatesInvalidInputs() {
        const workspace = await this.createWorkspace();
        const pngPath = path.join(workspace, 'src', 'image.png');
        const jpegPath = path.join(workspace, 'src', 'photo.jpg');
        const invalidPath = path.join(workspace, 'src', 'not-image.bin');
        const truncatedPath = path.join(workspace, 'src', 'truncated.jpg');
        await fs.writeFile(pngPath, this.pngFixture(320, 240));
        await fs.writeFile(jpegPath, this.jpegFixture(640, 480));
        await fs.writeFile(invalidPath, Buffer.from('hello world', 'utf8'));
        await fs.writeFile(truncatedPath, Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00]));
        const tool = new ImageInfoTool({ file: { rootDir: workspace } } as any);

        const png = await tool.invoke({ path: 'src/image.png' }, createSessionContext());
        expect(png).toEqual({ path: 'src/image.png', format: 'png', width: 320, height: 240 });
        expect(tool.execution?.readOnly).toEqual(true);

        const jpeg = await tool.invoke({ path: 'src/photo.jpg' }, createSessionContext());
        expect(jpeg).toEqual({ path: 'src/photo.jpg', format: 'jpeg', width: 640, height: 480 });

        let invalidError: Error | undefined;
        try {
            await tool.invoke({ path: 'src/not-image.bin' }, createSessionContext());
        } catch (err) {
            invalidError = err as Error;
        }
        expect(invalidError?.message).toContain('Unsupported image format');

        let truncatedError: Error | undefined;
        try {
            await tool.invoke({ path: 'src/truncated.jpg' }, createSessionContext());
        } catch (err) {
            truncatedError = err as Error;
        }
        expect(truncatedError?.message).toContain('Invalid JPEG image');

        let outsideError: Error | undefined;
        try {
            await tool.invoke({ path: '../outside.png' }, createSessionContext());
        } catch (err) {
            outsideError = err as Error;
        }
        expect(outsideError?.message).toContain('outside');

        const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-tools-image-outside-'));
        const linked = path.join(workspace, 'src', 'linked.png');
        await fs.writeFile(path.join(outside, 'image.png'), this.pngFixture(1, 1));
        symlinkSync(path.join(outside, 'image.png'), linked);
        let symlinkError: Error | undefined;
        try {
            await tool.invoke({ path: 'src/linked.png' }, createSessionContext());
        } catch (err) {
            symlinkError = err as Error;
        }
        expect(symlinkError?.message).toContain('symbolic link');

        if (process.platform !== 'win32') {
            const fifoPath = path.join(workspace, 'src', 'image.pipe');
            let fifoCreated = false;
            try {
                execFileSync('mkfifo', [fifoPath]);
                fifoCreated = true;
            } catch {
                fifoCreated = false;
            }
            if (fifoCreated) {
                let fifoError: Error | undefined;
                try {
                    await tool.invoke({ path: 'src/image.pipe' }, createSessionContext());
                } catch (err) {
                    fifoError = err as Error;
                }
                expect(fifoError?.message).toContain('regular file');
            }
        }
    }

    @Test('pdf read validates adapter path pages and large-file guard')
    async pdfReadValidatesAdapterPathPagesAndLargeFileGuard() {
        const workspace = await this.createWorkspace();
        const pdfPath = path.join(workspace, 'src', 'sample.pdf');
        await fs.writeFile(pdfPath, Buffer.from('%PDF-1.7\nmock\n', 'utf8'));

        let countCalls = 0;
        const adapter = {
            async getPageCount(filePath: string) {
                expect(filePath).toEqual(pdfPath);
                countCalls++;
                return 2;
            },
            async read(filePath: string, options?: { pages?: number[]; }) {
                expect(filePath).toEqual(pdfPath);
                if (options?.pages?.length) {
                    return {
                        pageCount: 12,
                        pages: options.pages.map(pageNumber => ({ pageNumber, text: `page-${pageNumber}` }))
                    };
                }
                return {
                    pageCount: 2,
                    pages: [{ pageNumber: 1, text: 'page-1' }, { pageNumber: 2, text: 'page-2' }]
                };
            }
        };
        const tool = new PdfReadTool({ file: { rootDir: workspace }, pdf: { adapter } } as any, adapter as any);

        const allPages = await tool.invoke({ path: 'src/sample.pdf' }, createSessionContext());
        expect(allPages).toEqual({
            path: 'src/sample.pdf',
            pageCount: 2,
            pages: [{ pageNumber: 1, text: 'page-1' }, { pageNumber: 2, text: 'page-2' }]
        });
        expect(countCalls).toEqual(1);
        expect(tool.execution?.readOnly).toEqual(true);

        const ranged = await tool.invoke({ path: 'src/sample.pdf', pages: '2-3' }, createSessionContext());
        expect(ranged.pages).toEqual([{ pageNumber: 2, text: 'page-2' }, { pageNumber: 3, text: 'page-3' }]);

        let pageError: Error | undefined;
        try {
            await tool.invoke({ path: 'src/sample.pdf', pages: '3-1' }, createSessionContext());
        } catch (err) {
            pageError = err as Error;
        }
        expect(pageError?.message).toContain('ascending range');

        let shapeError: Error | undefined;
        try {
            await tool.invoke({ path: 'src/sample.pdf', pages: 'a-b' }, createSessionContext());
        } catch (err) {
            shapeError = err as Error;
        }
        expect(shapeError?.message).toContain('like');

        let spanError: Error | undefined;
        try {
            await tool.invoke({ path: 'src/sample.pdf', pages: '1-21' }, createSessionContext());
        } catch (err) {
            spanError = err as Error;
        }
        expect(spanError?.message).toContain('20 pages');

        let largeReadCalls = 0;
        let largeCountCalls = 0;
        const largeAdapter = {
            async getPageCount() {
                largeCountCalls++;
                return 11;
            },
            async read() {
                largeReadCalls++;
                return {
                    pageCount: 11,
                    pages: [{ pageNumber: 1, text: 'page-1' }]
                };
            }
        };
        const guardedTool = new PdfReadTool({ file: { rootDir: workspace }, pdf: { adapter: largeAdapter } } as any, largeAdapter as any);
        let guardError: Error | undefined;
        try {
            await guardedTool.invoke({ path: 'src/sample.pdf' }, createSessionContext());
        } catch (err) {
            guardError = err as Error;
        }
        expect(guardError?.message).toContain('requires pages');
        expect(largeCountCalls).toEqual(1);
        expect(largeReadCalls).toEqual(0);

        let headerError: Error | undefined;
        await fs.writeFile(path.join(workspace, 'src', 'bad.pdf'), Buffer.from('not-pdf', 'utf8'));
        try {
            await tool.invoke({ path: 'src/bad.pdf' }, createSessionContext());
        } catch (err) {
            headerError = err as Error;
        }
        expect(headerError?.message).toContain('%PDF');

        const optionsOnlyTool = new PdfReadTool({ file: { rootDir: workspace }, pdf: { adapter } } as any, null as any);
        const optionsOnlyPages = await optionsOnlyTool.invoke({ path: 'src/sample.pdf' }, createSessionContext());
        expect(optionsOnlyPages.pageCount).toEqual(2);

        let adapterError: Error | undefined;
        const noAdapterTool = new PdfReadTool({ file: { rootDir: workspace } } as any, null as any);
        try {
            await noAdapterTool.invoke({ path: 'src/sample.pdf' }, createSessionContext());
        } catch (err) {
            adapterError = err as Error;
        }
        expect(adapterError?.message).toContain('requires a configured PDF read adapter');
    }

    @Test('grouped tool entrypoints export tool classes')
    groupedToolEntrypointsExportToolClasses() {
        expect(ExportedTodoTool).toEqual(TodoTool);
        expect(ExportedBrowserOpenTool).toEqual(BrowserOpenTool);
        expect(ExportedTextBrowserTool).toEqual(TextBrowserTool);
        expect(ExportedSessionsCurrentTool).toEqual(SessionsCurrentTool);
        expect(ExportedSessionsListTool).toEqual(SessionsListTool);
        expect(ExportedSessionsHistoryTool).toEqual(SessionsHistoryTool);
        expect(ExportedAskUserTool).toEqual(AskUserTool);
        expect(ExportedEscalateTool).toEqual(EscalateTool);
        expect(ExportedScheduleTool).toEqual(ScheduleTool);
        expect(ExportedTerminalTool).toEqual(TerminalTool);
        expect(ExportedProcessStartTool).toEqual(ProcessStartTool);
        expect(ExportedProcessPollTool).toEqual(ProcessPollTool);
        expect(ExportedProcessKillTool).toEqual(ProcessKillTool);
        expect(ExportedImageInfoTool).toEqual(ImageInfoTool);
        expect(ExportedPdfReadTool).toEqual(PdfReadTool);
        expect(ExportedWriteFileTool).toEqual(WriteFileTool);
        expect(ExportedEditFileTool).toEqual(EditFileTool);
        expect(ExportedMemory.MemoryListTool).toEqual(MemoryListTool);
        expect(ExportedMemory.MemoryPutTool).toEqual(MemoryPutTool);
        expect(ExportedMemory.MemorySearchTool).toEqual(MemorySearchTool);
        expect(ExportedMemory.MemoryRecallTool).toEqual(MemoryRecallTool);
        expect(ExportedMemory.MemoryForgetTool).toEqual(MemoryForgetTool);
        expect(ExportedMemory.MemoryExportTool).toEqual(MemoryExportTool);
        expect(ExportedMemory.MemoryPurgeTool).toEqual(MemoryPurgeTool);
        expect(ExportedMemory.MemoryDeleteTool).toEqual(MemoryDeleteTool);
        expect(ExportedHttpFetchTool).toEqual(HttpFetchTool);
        expect(ExportedHttpRequestTool).toEqual(HttpRequestTool);
        expect(ExportedToolSearchTool).toEqual(ToolSearchTool);
        expect(ExportedToolInspectTool).toEqual(ToolInspectTool);
        expect(ExportedProjectIntelTool).toEqual(ProjectIntelTool);
        expect(ListSkillTool).toBeTruthy();
    }

    @Test('provider tools expose grouped registrations and defaults')
    provideToolsExposeGroupedRegistrationsAndDefaults() {
        expect(AGENT_TOOL_GROUPS.filesystem).toEqual(['read_file', 'glob_search', 'content_search']);
        expect(AGENT_TOOL_GROUPS.filesystem_write).toEqual(['write_file', 'edit_file']);
        expect(AGENT_TOOL_GROUPS.browser).toEqual(['browser_open', 'text_browser']);
        expect(AGENT_TOOL_GROUPS.media).toEqual(['image_info', 'pdf_read']);
        expect(AGENT_TOOL_GROUPS.sessions).toEqual(['sessions_current', 'sessions_list', 'sessions_history']);
        expect(AGENT_TOOL_GROUPS.memory).toEqual(['memory.list', 'memory.put', 'memory.search', 'memory.recall', 'memory.export', 'memory.forget', 'memory.purge', 'memory.delete']);
        expect(AGENT_TOOL_GROUPS.planning).toEqual(['todo', 'ask_user', 'escalate']);
        expect(AGENT_TOOL_GROUPS.process).toEqual(['process.start', 'process.poll', 'process.kill']);
        expect(AGENT_TOOL_GROUPS.project).toEqual(['project_intel']);
        expect(resolveAgentToolNames()).toContain('read_file');
        expect(resolveAgentToolNames()).toContain('ask_user');
        expect(resolveAgentToolNames()).toContain('project_intel');
        expect(resolveAgentToolNames()).not.toContain('browser_open');
        expect(resolveAgentToolNames()).not.toContain('text_browser');
        expect(resolveAgentToolNames()).not.toContain('sessions_current');
        expect(resolveAgentToolNames()).not.toContain('sessions_list');
        expect(resolveAgentToolNames()).not.toContain('sessions_history');
        expect(resolveAgentToolNames()).not.toContain('memory.purge');
        expect(resolveAgentToolNames()).not.toContain('write_file');
        expect(resolveAgentToolNames()).not.toContain('process.start');
        expect(resolveAgentToolNames()).not.toContain('http_fetch');
        expect(resolveAgentToolNames({ registration: { preset: 'all' } })).toContain('terminal');
        expect(resolveAgentToolNames({ registration: { groups: { browser: true } } })).toContain('browser_open');
        expect(resolveAgentToolNames({ registration: { groups: { browser: true } } })).toContain('text_browser');
        expect(resolveAgentToolNames({ registration: { groups: { sessions: true } } })).toContain('sessions_current');
        expect(resolveAgentToolNames({ registration: { groups: { sessions: true } } })).toContain('sessions_list');
        expect(resolveAgentToolNames({ registration: { groups: { sessions: true } } })).toContain('sessions_history');
        expect(resolveAgentToolNames({ registration: { groups: { process: true } } })).toContain('process.start');
        expect(resolveAgentToolNames({ registration: { groups: { process: true } } })).toContain('process.poll');
        expect(resolveAgentToolNames({ registration: { groups: { process: true } } })).toContain('process.kill');
        expect(resolveAgentToolNames({ registration: { items: { 'memory.purge': true } } })).toContain('memory.purge');
        expect(resolveAgentToolNames({ registration: { preset: 'none' } })).toEqual([]);
        expect(resolveAgentToolNames({ registration: { groups: { http: true } } })).toContain('http_fetch');
        expect(resolveAgentToolNames({ registration: { groups: { web: false } } })).not.toContain('web_search');
        expect(resolveAgentToolNames({ registration: { items: { terminal: true, web_extract: false } } })).toContain('terminal');
        expect(resolveAgentToolNames({ registration: { items: { terminal: true, web_extract: false } } })).not.toContain('web_extract');
        expect(typeof withProjectAgentTools).toEqual('function');
        expect(typeof withProcessAgentTools).toEqual('function');
    }

    @Test('provider tools resolve capability bundle metadata')
    provideToolsResolveCapabilityBundleMetadata() {
        const bundles = resolveAgentToolBundles();
        const filesystem = bundles.find(bundle => bundle.name === 'filesystem');
        const filesystemWrite = bundles.find(bundle => bundle.name === 'filesystem_write');
        const browser = bundles.find(bundle => bundle.name === 'browser');
        const sessions = bundles.find(bundle => bundle.name === 'sessions');
        const planning = bundles.find(bundle => bundle.name === 'planning');
        const project = bundles.find(bundle => bundle.name === 'project');
        const terminal = bundles.find(bundle => bundle.name === 'terminal');
        expect(filesystem?.tools).toEqual(['read_file', 'glob_search', 'content_search']);
        expect(filesystem?.defaultEnabled).toEqual(true);
        expect(filesystem?.deferredActivation).toEqual(true);
        expect(filesystem?.enabled).toEqual(true);
        expect(filesystem?.source).toEqual('builtin');
        expect(filesystem?.providerId).toEqual('@tsdi/agent-tools');
        expect(filesystem?.activation).toEqual({ kind: 'deferred', scope: 'session' });
        expect(filesystemWrite?.tools).toEqual(['write_file', 'edit_file']);
        expect(filesystemWrite?.defaultEnabled).toEqual(false);
        expect(filesystemWrite?.enabled).toEqual(false);
        expect(filesystemWrite?.activation).toEqual({ kind: 'deferred', scope: 'session' });
        expect(browser?.tools).toEqual(['browser_open', 'text_browser']);
        expect(browser?.defaultEnabled).toEqual(false);
        expect(browser?.enabled).toEqual(false);
        expect(browser?.activation).toEqual({ kind: 'deferred', scope: 'session' });
        expect(sessions?.tools).toEqual(['sessions_current', 'sessions_list', 'sessions_history']);
        expect(sessions?.defaultEnabled).toEqual(false);
        expect(sessions?.enabled).toEqual(false);
        expect(sessions?.activation).toEqual({ kind: 'deferred', scope: 'session' });
        expect(planning?.tools).toEqual(['todo', 'ask_user', 'escalate']);
        expect(planning?.defaultEnabled).toEqual(true);
        expect(planning?.enabled).toEqual(true);
        expect(project?.tools).toEqual(['project_intel']);
        expect(project?.defaultEnabled).toEqual(true);
        expect(project?.enabled).toEqual(true);
        expect(terminal?.defaultEnabled).toEqual(false);
        expect(terminal?.enabled).toEqual(false);
        expect(terminal?.source).toEqual('builtin');
        expect(terminal?.providerId).toEqual('@tsdi/agent-tools');
        expect(terminal?.activation).toEqual({ kind: 'deferred', scope: 'session' });

        const allBundles = resolveAgentToolBundles({ registration: { preset: 'all' } });
        expect(allBundles.find(bundle => bundle.name === 'terminal')?.enabled).toEqual(true);

        const httpBundles = resolveAgentToolBundles({ registration: { groups: { http: true } } });
        expect(httpBundles.find(bundle => bundle.name === 'http')?.enabled).toEqual(true);
    }

    @Test('provideTools applies registry selection through module options')
    async provideToolsAppliesRegistrySelectionThroughModuleOptions() {
        const ctx = await Application.run(AgentModule, {
            providers: [...provideTools({
                registration: {
                    groups: { http: true },
                    items: { web_extract: false, terminal: true }
                }
            })]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const names = registry.getToolDefinitions().map(tool => tool.name);
            expect(names).toContain('read_file');
            expect(names).toContain('http_fetch');
            expect(names).toContain('http_request');
            expect(names).toContain('terminal');
            expect(names).not.toContain('web_extract');
        } finally {
            await ctx.close();
        }
    }

    @Test('provideTools enables process tools through module options')
    async provideToolsEnablesProcessToolsThroughModuleOptions() {
        const workspace = await this.createWorkspace();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideTools({
                file: { rootDir: workspace },
                registration: {
                    groups: { process: true }
                }
            })]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const names = registry.getToolDefinitions().map(tool => tool.name);
            expect(names).toContain('process.start');
            expect(names).toContain('process.poll');
            expect(names).toContain('process.kill');
        } finally {
            await ctx.close();
        }
    }

    @Test('agent tools module registers process tools through withOptions')
    async agentToolsModuleRegistersProcessToolsThroughWithOptions() {
        const workspace = await this.createWorkspace();
        const ctx = await Application.run(AgentToolsModule, {
            providers: [
                ...AgentToolsModule.withOptions({
                    file: { rootDir: workspace },
                    registration: { groups: { process: true } }
                }).providers!
            ]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const names = registry.getToolDefinitions().map(tool => tool.name);
            expect(names).toContain('process.start');
            expect(names).toContain('process.poll');
            expect(names).toContain('process.kill');
        } finally {
            await ctx.close();
        }
    }

    @Test('provideTools deduplicates tool names already registered by AgentModule')
    async provideToolsDeduplicatesToolNamesAlreadyRegisteredByAgentModule() {
        const ctx = await Application.run(AgentModule, {
            providers: [...provideTools({ registration: { groups: { filesystem_write: true } } })]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const names = registry.getToolDefinitions().map(tool => tool.name);
            expect(names.filter(name => name === 'memory.put').length).toEqual(1);
            expect(names.filter(name => name === 'memory.search').length).toEqual(1);

            const putDefinition = registry.getToolDefinition('memory.put');
            expect(putDefinition?.description).toContain('visible to the current or global scope');

            await registry.activateTool('s1', 'memory.put');
            const putResult = await registry.invoke('memory.put', { key: 'topic', value: 'router' }, 's1');
            expect(putResult.stored).toEqual(true);
            expect(putResult.record.key).toEqual('topic');
        } finally {
            await ctx.close();
        }
    }

    @Test('provideTools includes MCP management tools for dynamic servers')
    async provideToolsIncludesMcpManagementToolsForDynamicServers() {
        const client = {
            async listTools() {
                return [{
                    name: 'echo',
                    description: 'Echo from MCP.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            value: { type: 'string' }
                        }
                    }
                }];
            },
            async callTool(name: string, args?: Record<string, any>) {
                return {
                    content: [{ type: 'text', text: `${name}:${args?.value ?? ''}` }]
                };
            }
        };
        const ctx = await Application.run(AgentModule, {
            providers: [...provideTools({
                mcp: {
                    servers: [{ id: 'demo', client }]
                }
            })]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const names = registry.getToolDefinitions().map(item => item.name);
            expect(names).toContain('mcp.list_tools');
            expect(names).toContain('mcp.call_tool');
            expect(names).not.toContain('mcp.demo.echo');
        } finally {
            await ctx.close();
        }
    }

    @Test('sessions tools return current session metadata list sessions and history')
    async sessionsToolsReturnCurrentSessionMetadataListSessionsAndHistory() {
        const store = new InMemorySessionStore();
        await store.append('s1', { id: 'm1', role: 'user', content: 'hello', createdAt: 1 });
        await store.append('s1', { id: 'm2', role: 'assistant', content: 'world', createdAt: 2, metadata: { source: 'model' } });
        await store.setSummary('s1', 'summary one');
        await store.setOwner('s1', 'owner-1');
        await store.append('s2', { id: 'm3', role: 'tool', content: 'tool output', name: 'read_file', createdAt: 3 });

        const current = new SessionsCurrentTool(store);
        const list = new SessionsListTool(store);
        const history = new SessionsHistoryTool(store);

        const currentResult = await current.invoke({ limit: 1 }, createSessionContext({ sessionId: 's1' }));
        expect(currentResult.exists).toEqual(true);
        expect(currentResult.session.sessionId).toEqual('s1');
        expect(currentResult.session.summary).toEqual('summary one');
        expect(currentResult.session.ownerPrincipalId).toEqual('owner-1');
        expect(currentResult.session.messageCount).toEqual(2);
        expect(currentResult.session.messages.map((message: any) => message.id)).toEqual(['m2']);

        const listResult = await list.invoke({ limit: 5 }, createSessionContext({ sessionId: 's1' }));
        expect(listResult.sessions.map((session: any) => session.sessionId)).toEqual(['s1', 's2']);
        expect(listResult.sessions[0].messageCount).toEqual(2);
        expect(listResult.sessions[1].lastMessage?.id).toEqual('m3');

        const historyResult = await history.invoke({ sessionId: 's1', limit: 1, offset: 1 }, createSessionContext({ sessionId: 's2' }));
        expect(historyResult.exists).toEqual(true);
        expect(historyResult.total).toEqual(2);
        expect(historyResult.messages.map((message: any) => message.id)).toEqual(['m2']);
    }

    @Test('sessions history does not create missing sessions when explicitly requested')
    async sessionsHistoryDoesNotCreateMissingSessionsWhenExplicitlyRequested() {
        const store = new InMemorySessionStore();
        const history = new SessionsHistoryTool(store);

        const result = await history.invoke({ sessionId: 'missing' }, createSessionContext({ sessionId: 's1' }));
        expect(result.exists).toEqual(false);
        expect(result.total).toEqual(0);
        expect(result.messages).toEqual([]);
        expect(await store.has('missing')).toEqual(false);
    }

    @Test('memory list returns session and global records')
    async memoryListReturnsSessionAndGlobalRecords() {
        const store = new InMemoryMemoryStore();
        await store.put({ id: 's1-note', sessionId: 's1', key: 'topic', value: 'router', scope: 'session', createdAt: 1 });
        await store.put({ id: 's2-note', sessionId: 's2', key: 'topic', value: 'switch', scope: 'session', createdAt: 2 });
        await store.put({ id: 'global-note', key: 'shared', value: 'policy', scope: 'global', createdAt: 3 });
        const tool = new MemoryListTool();

        const result = await tool.invoke({ limit: 1 }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(result.records.map((record: any) => record.id)).toEqual(['s1-note']);

        const all = await tool.invoke(undefined, createSessionContext({ sessionId: 's1', memory: store }));
        expect(all.records.map((record: any) => record.id)).toEqual(['s1-note', 'global-note']);
    }

    @Test('memory put and search respect visibility and filters')
    async memoryPutAndSearchRespectVisibilityAndFilters() {
        const store = new InMemoryMemoryStore();
        const put = new MemoryPutTool();
        const search = new MemorySearchTool();

        const sessionRecord = await put.invoke({ key: 'topic', value: 'router cache', namespace: 'agent', category: 'conversation' }, createSessionContext({ sessionId: 's1', memory: store }));
        const globalRecord = await put.invoke({ key: 'policy', value: 'shared cache', scope: 'global', namespace: 'shared', category: 'core' }, createSessionContext({ sessionId: 's1', memory: store }));
        await store.put({ id: 's2-note', sessionId: 's2', key: 'topic', value: 'other cache', scope: 'session', createdAt: 3 });

        expect(sessionRecord.stored).toEqual(true);
        expect(sessionRecord.record.sessionId).toEqual('s1');
        expect(globalRecord.record.scope).toEqual('global');
        expect(globalRecord.record.sessionId).toEqual(undefined);

        const visible = await search.invoke({ query: 'cache' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(visible.records.map((record: any) => record.key)).toEqual(['topic', 'policy']);

        const filtered = await search.invoke({ query: 'cache', namespace: 'shared', scope: 'global', limit: 1 }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(filtered.records.length).toEqual(1);
        expect(filtered.records[0].key).toEqual('policy');

        const otherSession = await search.invoke({ query: 'cache' }, createSessionContext({ sessionId: 's2', memory: store }));
        expect(otherSession.records.map((record: any) => record.key)).toEqual(['policy', 'topic']);

        let scopeError: Error | undefined;
        try {
            await put.invoke({ key: 'bad', value: 'bad', scope: 'team' }, createSessionContext({ sessionId: 's1', memory: store }));
        } catch (err) {
            scopeError = err as Error;
        }
        expect(scopeError?.message).toContain('scope');
    }

    @Test('memory delete removes only visible records')
    async memoryDeleteRemovesOnlyVisibleRecords() {
        const store = new InMemoryMemoryStore();
        await store.put({ id: 's1-note', sessionId: 's1', key: 'topic', value: 'router', scope: 'session', createdAt: 1 });
        await store.put({ id: 's2-note', sessionId: 's2', key: 'topic', value: 'switch', scope: 'session', createdAt: 2 });
        await store.put({ id: 'global-note', key: 'shared', value: 'policy', scope: 'global', createdAt: 3 });
        const tool = new MemoryDeleteTool();

        const removed = await tool.invoke({ id: 's1-note' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(removed.deleted).toEqual(true);
        expect(removed.count).toEqual(1);
        expect((await store.getAll('s1')).map(record => record.id)).toEqual(['global-note']);

        const otherSession = await tool.invoke({ id: 's2-note' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(otherSession.deleted).toEqual(false);
        expect(otherSession.count).toEqual(0);

        const globalWithoutFlag = await tool.invoke({ id: 'global-note' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(globalWithoutFlag.deleted).toEqual(false);
        expect(globalWithoutFlag.count).toEqual(0);

        const globalWithFlag = await tool.invoke({ id: 'global-note', scope: 'global' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(globalWithFlag.deleted).toEqual(true);
        expect(globalWithFlag.count).toEqual(1);
    }

    @Test('memory recall returns visible records with filters')
    async memoryRecallReturnsVisibleRecordsWithFilters() {
        const store = new InMemoryMemoryStore();
        await store.put({ id: 's1-topic', sessionId: 's1', key: 'topic', value: 'router cache', scope: 'session', namespace: 'agent', category: 'conversation', createdAt: 1 });
        await store.put({ id: 's1-policy', key: 'policy', value: 'shared cache', scope: 'global', namespace: 'shared', category: 'core', createdAt: 2 });
        await store.put({ id: 's2-topic', sessionId: 's2', key: 'topic', value: 'other cache', scope: 'session', namespace: 'agent', category: 'conversation', createdAt: 3 });
        const tool = new MemoryRecallTool();

        const visible = await tool.invoke({ query: 'cache' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(visible.records.map((record: any) => record.id)).toEqual(['s1-topic', 's1-policy']);

        const filtered = await tool.invoke({ key: 'policy', scope: 'global', namespace: 'shared' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(filtered.records.map((record: any) => record.id)).toEqual(['s1-policy']);

        let scopeError: Error | undefined;
        try {
            await tool.invoke({ scope: 'team' }, createSessionContext({ sessionId: 's1', memory: store }));
        } catch (err) {
            scopeError = err as Error;
        }
        expect(scopeError?.message).toContain('scope');
    }

    @Test('memory forget deletes visible records by id or key filters')
    async memoryForgetDeletesVisibleRecordsByIdOrKeyFilters() {
        const store = new InMemoryMemoryStore();
        await store.put({ id: 's1-topic', sessionId: 's1', key: 'topic', value: 'router', scope: 'session', namespace: 'agent', createdAt: 1 });
        await store.put({ id: 's1-note', sessionId: 's1', key: 'note', value: 'draft', scope: 'session', namespace: 'agent', createdAt: 2 });
        await store.put({ id: 'global-policy', key: 'policy', value: 'shared', scope: 'global', namespace: 'shared', createdAt: 3 });
        await store.put({ id: 's2-topic', sessionId: 's2', key: 'topic', value: 'other', scope: 'session', namespace: 'agent', createdAt: 4 });
        const tool = new MemoryForgetTool();

        const byKey = await tool.invoke({ key: 'topic', namespace: 'agent' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(byKey.deleted).toEqual(true);
        expect(byKey.count).toEqual(1);
        expect(byKey.ids).toEqual(['s1-topic']);

        const globalWithoutScope = await tool.invoke({ key: 'policy' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(globalWithoutScope.deleted).toEqual(false);
        expect(globalWithoutScope.count).toEqual(0);

        const globalWithScope = await tool.invoke({ key: 'policy', scope: 'global' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(globalWithScope.deleted).toEqual(true);
        expect(globalWithScope.ids).toEqual(['global-policy']);
    }

    @Test('memory export returns deterministic records in json and text formats')
    async memoryExportReturnsDeterministicRecordsInJsonAndTextFormats() {
        const store = new InMemoryMemoryStore();
        await store.put({ id: 's1-topic', sessionId: 's1', key: 'topic', value: 'router', scope: 'session', namespace: 'agent', category: 'conversation', createdAt: 1 });
        await store.put({ id: 'global-policy', key: 'policy', value: 'shared', scope: 'global', namespace: 'shared', category: 'core', createdAt: 2 });
        const tool = new MemoryExportTool();

        const jsonResult = await tool.invoke({ format: 'json' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(jsonResult.format).toEqual('json');
        expect(jsonResult.count).toEqual(2);
        expect(jsonResult.records.map((record: any) => record.id)).toEqual(['s1-topic', 'global-policy']);
        expect(jsonResult.content).toContain('"id": "s1-topic"');

        const textResult = await tool.invoke({ format: 'text', scope: 'global' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(textResult.format).toEqual('text');
        expect(textResult.count).toEqual(1);
        expect(textResult.content).toContain('global-policy');
        expect(textResult.content).toContain('shared');
    }

    @Test('memory purge deletes only explicitly scoped records')
    async memoryPurgeDeletesOnlyExplicitlyScopedRecords() {
        const store = new InMemoryMemoryStore();
        await store.put({ id: 's1-agent', sessionId: 's1', key: 'topic', value: 'router', scope: 'session', namespace: 'agent', category: 'conversation', createdAt: 1 });
        await store.put({ id: 's1-shared', sessionId: 's1', key: 'note', value: 'draft', scope: 'session', namespace: 'shared', category: 'conversation', createdAt: 2 });
        await store.put({ id: 'global-agent', key: 'policy', value: 'shared', scope: 'global', namespace: 'agent', category: 'core', createdAt: 3 });
        await store.put({ id: 's2-agent', sessionId: 's2', key: 'topic', value: 'other', scope: 'session', namespace: 'agent', category: 'conversation', createdAt: 4 });
        const tool = new MemoryPurgeTool();

        let confirmError: Error | undefined;
        try {
            await tool.invoke({ namespace: 'agent' }, createSessionContext({ sessionId: 's1', memory: store }));
        } catch (err) {
            confirmError = err as Error;
        }
        expect(confirmError?.message).toContain('confirm');

        const sessionPurge = await tool.invoke({ confirm: true, namespace: 'agent' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(sessionPurge.deleted).toEqual(true);
        expect(sessionPurge.count).toEqual(1);
        expect(sessionPurge.ids).toEqual(['s1-agent']);
        expect((await store.getAll('s1')).map(record => record.id)).toEqual(['s1-shared', 'global-agent']);

        const globalWithoutScope = await tool.invoke({ confirm: true, key: 'policy' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(globalWithoutScope.deleted).toEqual(false);
        expect(globalWithoutScope.count).toEqual(0);

        const globalPurge = await tool.invoke({ confirm: true, scope: 'global', namespace: 'agent' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(globalPurge.deleted).toEqual(true);
        expect(globalPurge.count).toEqual(1);
        expect(globalPurge.ids).toEqual(['global-agent']);

        let selectorError: Error | undefined;
        try {
            await tool.invoke({ confirm: true }, createSessionContext({ sessionId: 's1', memory: store }));
        } catch (err) {
            selectorError = err as Error;
        }
        expect(selectorError?.message).toContain('selector');
    }

    @Test('ask user and escalate return structured collaboration payloads')
    async askUserAndEscalateReturnStructuredPayloads() {
        const askUser = new AskUserTool();
        const escalate = new EscalateTool();

        const question = await askUser.invoke({
            question: 'Which rollout mode should we use?',
            options: ['safe', 'fast'],
            context: 'deploy',
            severity: 'medium'
        }, createSessionContext());
        expect(question.requested).toEqual(true);
        expect(question.kind).toEqual('ask_user');
        expect(question.question).toEqual('Which rollout mode should we use?');
        expect(question.options).toEqual(['safe', 'fast']);
        expect(question.context).toEqual('deploy');
        expect(question.severity).toEqual('medium');

        const escalation = await escalate.invoke({
            reason: 'Need approval for production migration',
            summary: 'The migration changes shared state.',
            requestedAction: 'Approve or reject migration window',
            severity: 'high',
            context: 'release'
        }, createSessionContext());
        expect(escalation.requested).toEqual(true);
        expect(escalation.kind).toEqual('escalate');
        expect(escalation.reason).toContain('approval');
        expect(escalation.requestedAction).toContain('Approve');
        expect(escalation.severity).toEqual('high');

        let questionError: Error | undefined;
        try {
            await askUser.invoke({ options: [] }, createSessionContext());
        } catch (err) {
            questionError = err as Error;
        }
        expect(questionError?.message).toContain('question');
    }

    @Test('project intel summarizes task context deterministically')
    async projectIntelSummarizesTaskContextDeterministically() {
        const tool = new ProjectIntelTool();

        const summary = await tool.invoke({
            action: 'summary',
            task: 'Add memory recall and collaboration tools',
            todos: [
                { id: '1', content: 'add tests', status: 'completed' },
                { id: '2', content: 'implement tools', status: 'in_progress' },
                { id: '3', content: 'update readme', status: 'pending' }
            ],
            notes: ['Reuse existing provider groups', 'Avoid plugin architecture']
        }, createSessionContext());
        expect(summary.action).toEqual('summary');
        expect(summary.task).toContain('memory recall');
        expect(summary.todoSummary.total).toEqual(3);
        expect(summary.todoSummary.in_progress).toEqual(1);
        expect(summary.highlights.length).toBeGreaterThan(0);

        const risks = await tool.invoke({
            action: 'risks',
            task: 'Expand built-in tools',
            notes: ['New tool registration required', 'README must stay in sync']
        }, createSessionContext());
        expect(risks.action).toEqual('risks');
        expect(risks.highlights.length).toBeGreaterThan(0);

        let actionError: Error | undefined;
        try {
            await tool.invoke({ action: 'unknown', task: 'x' }, createSessionContext());
        } catch (err) {
            actionError = err as Error;
        }
        expect(actionError?.message).toContain('action');
    }

    @Test('http fetch performs get requests applies timeout signal and truncates large responses')
    async httpFetchPerformsGetRequestsAppliesTimeoutSignalAndTruncatesLargeResponses() {
        let calledUrl = '';
        let calledMethod = '';
        let calledSignal: AbortSignal | undefined;
        const tool = new HttpFetchTool({
            http: {
                fetch: (async (url: string, init?: any) => {
                    calledUrl = url;
                    calledMethod = init?.method ?? 'GET';
                    calledSignal = init?.signal;
                    return {
                        ok: true,
                        status: 200,
                        headers: {
                            forEach(callback: (value: string, key: string) => void) {
                                callback('text/plain', 'content-type');
                            }
                        },
                        text: async () => 'hello world'
                    };
                }) as any,
                timeoutMs: 1000,
                maxResponseChars: 5
            }
        } as any);

        const result = await tool.invoke({ url: 'https://example.com/data' }, createSessionContext());
        expect(calledUrl).toEqual('https://example.com/data');
        expect(calledMethod).toEqual('GET');
        expect(!!calledSignal).toEqual(true);
        expect(result.status).toEqual(200);
        expect(result.ok).toEqual(true);
        expect(result.body).toEqual('hello');
        expect(result.truncated).toEqual(true);
    }

    @Test('http request supports method headers body validation and timeout signal')
    async httpRequestSupportsMethodHeadersBodyValidationAndTimeoutSignal() {
        let calledInit: any;
        const tool = new HttpRequestTool({
            http: {
                fetch: (async (_url: string, init?: any) => {
                    calledInit = init;
                    return {
                        ok: false,
                        status: 404,
                        headers: {
                            forEach(callback: (value: string, key: string) => void) {
                                callback('application/json', 'content-type');
                            }
                        },
                        text: async () => '{"error":true}'
                    };
                }) as any,
                timeoutMs: 1000
            }
        } as any);

        const result = await tool.invoke({
            url: 'https://example.com/api',
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: { ok: true }
        }, createSessionContext());
        expect(calledInit.method).toEqual('POST');
        expect(calledInit.headers['content-type']).toEqual('application/json');
        expect(calledInit.body).toEqual('{"ok":true}');
        expect(!!calledInit.signal).toEqual(true);
        expect(result.ok).toEqual(false);
        expect(result.status).toEqual(404);

        let protocolError: Error | undefined;
        try {
            await tool.invoke({ url: 'file:///tmp/nope' }, createSessionContext());
        } catch (err) {
            protocolError = err as Error;
        }
        expect(protocolError?.message).toContain('http');
    }

    @Test('tool search and inspect use registry definitions')
    async toolSearchAndInspectUseRegistryDefinitions() {
        const registry = {
            getToolDefinitions() {
                return [
                    { name: 'memory.list', description: 'List memories', toolset: 'memory', source: 'local', execution: { readOnly: true } },
                    { name: 'http_fetch', description: 'Fetch over HTTP', toolset: 'http', source: 'local', execution: { readOnly: true }, inputSchema: { type: 'object' } }
                ];
            },
            getToolDefinition(name: string, sessionId?: string) {
                if (name === 'memory.list' && sessionId === 's1') {
                    return { name: 'memory.list', description: 'List memories', toolset: 'memory', source: 'local', execution: { readOnly: true }, inputSchema: { type: 'object' } };
                }
                return this.getToolDefinitions().find((tool: any) => tool.name === name);
            },
            async activateTool() {
                return true;
            }
        } as any;
        const app = { get() { return registry; } } as any;
        const search = new ToolSearchTool(app);
        const inspect = new ToolInspectTool(app);

        const result = await search.invoke({ query: 'http' }, createSessionContext());
        expect(result.tools.length).toEqual(1);
        expect(result.tools[0].name).toEqual('http_fetch');
        expect(result.tools[0].active).toEqual(true);

        const inspected = await inspect.invoke({ name: 'memory.list' }, createSessionContext());
        expect(inspected.tool.name).toEqual('memory.list');
        expect(inspected.tool.toolset).toEqual('memory');
        expect(inspected.tool.source).toEqual('local');
        expect(inspected.tool.execution.readOnly).toEqual(true);
        expect(inspected.activated).toEqual(true);

        let missingError: Error | undefined;
        try {
            await inspect.invoke({ name: 'missing.tool' }, createSessionContext());
        } catch (err) {
            missingError = err as Error;
        }
        expect(missingError?.message).toContain('missing.tool');
    }

    @Test('tool search and inspect expose dynamic MCP discovery hints')
    async toolSearchAndInspectExposeDynamicMcpDiscoveryHints() {
        const mcpRegistry = {
            getServers() {
                return [{ id: 'demo' }];
            },
            async listServerTools(serverId: string) {
                expect(serverId).toEqual('demo');
                return [{
                    name: 'echo',
                    description: 'Echo from MCP.',
                    inputSchema: { type: 'object' }
                }, {
                    name: 'browser.click',
                    description: 'Click in browser MCP.',
                    inputSchema: { type: 'object' }
                }];
            }
        } as any;
        const registry = {
            getToolDefinitions() {
                return [
                    { name: 'mcp.list_tools', description: 'List tools exposed by a configured MCP server on demand.', toolset: 'mcp', source: 'mcp', execution: { readOnly: true } },
                    { name: 'mcp.call_tool', description: 'Call a tool from a configured MCP server by serverId and tool name.', toolset: 'mcp', source: 'mcp', execution: { readOnly: false, sideEffect: true, requiresSequential: true } }
                ];
            },
            getToolDefinition(name: string) {
                return this.getToolDefinitions().find((tool: any) => tool.name === name);
            },
            async activateTool(_sessionId: string, name: string) {
                return name === 'mcp.demo.echo' ? false : true;
            }
        } as any;
        const app = {
            get(token: any) {
                if (token === ToolRegistry) {
                    return registry;
                }
                if (token === LocalMcpClientRegistry) {
                    return mcpRegistry;
                }
                return null;
            }
        } as any;
        const search = new ToolSearchTool(app);
        const inspect = new ToolInspectTool(app);

        const result = await search.invoke({ query: 'echo', includeDynamicMcp: true }, createSessionContext());
        expect(result.tools.length).toEqual(1);
        expect(result.tools[0].name).toEqual('mcp.demo.echo');
        expect(result.tools[0].canonicalName).toEqual('echo');
        expect(result.tools[0].toolset).toEqual('mcp:demo');
        expect(result.tools[0].source).toEqual('mcp');
        expect(result.tools[0].provenance).toEqual({
            origin: 'mcp',
            providerId: '@tsdi/agent-tools/mcp',
            serverId: 'demo',
            sessionScoped: true
        });
        expect(result.tools[0].active).toEqual(false);
        expect(result.tools[0].discovery).toEqual({
            kind: 'mcp',
            serverId: 'demo',
            via: 'mcp.list_tools'
        });

        const inspected = await inspect.invoke({ name: 'mcp.demo.echo' }, createSessionContext());
        expect(inspected.tool.name).toEqual('mcp.demo.echo');
        expect(inspected.tool.description).toEqual('Echo from MCP.');
        expect(inspected.tool.inputSchema).toEqual({ type: 'object' });
        expect(inspected.tool.toolset).toEqual('mcp:demo');
        expect(inspected.tool.source).toEqual('mcp');
        expect(inspected.tool.execution).toEqual({ readOnly: false, sideEffect: true, requiresSequential: true });
        expect(inspected.tool.activation).toEqual({ kind: 'deferred', scope: 'session', activated: false });
        expect(inspected.activated).toEqual(false);
        expect(inspected.discovery).toEqual({
            kind: 'mcp',
            serverId: 'demo',
            via: 'mcp.call_tool'
        });

        const canonicalSearch = await search.invoke({ query: 'browser.click', includeDynamicMcp: true }, createSessionContext());
        expect(canonicalSearch.tools.length).toEqual(1);
        expect(canonicalSearch.tools[0].name).toEqual('mcp.demo.browser_click');
        expect(canonicalSearch.tools[0].canonicalName).toEqual('browser.click');

        let missingError: Error | undefined;
        try {
            await inspect.invoke({ name: 'mcp.demo.missing' }, createSessionContext());
        } catch (err) {
            missingError = err as Error;
        }
        expect(missingError?.message).toContain('mcp.demo.missing');
    }

    @Test('todo tool stores and merges per-session items')
    async todoToolStoresAndMergesItems() {
        const store = new TodoStore();
        const tool = new TodoTool(store);

        const initial = await tool.invoke({
            todos: [
                { id: '1', content: 'first', status: 'pending' },
                { id: '2', content: 'second', status: 'in_progress' }
            ]
        }, createSessionContext({ sessionId: 'todo-1' }));

        expect(initial.todos.length).toEqual(2);
        expect(initial.summary.in_progress).toEqual(1);

        const merged = await tool.invoke({
            merge: true,
            todos: [
                { id: '2', content: 'second+', status: 'completed' },
                { id: '3', content: 'third', status: 'pending' }
            ]
        }, createSessionContext({ sessionId: 'todo-1' }));

        expect(merged.todos.length).toEqual(3);
        expect(merged.todos[1].content).toEqual('second+');
        expect(merged.summary.completed).toEqual(1);

        const isolated = await tool.invoke(undefined, createSessionContext({ sessionId: 'todo-2' }));
        expect(isolated.todos).toEqual([]);
    }

    @Test('schedule tool creates lists and cancels session tasks')
    async scheduleToolManagesTasksBySession() {
        const scheduler = new FakeScheduler();
        const tool = new ScheduleTool({ get: () => scheduler } as any);

        const created = await tool.invoke({ action: 'create', prompt: 'ping', delayMs: 1000 }, createSessionContext({ sessionId: 'sched-1' }));
        expect(created.scheduled).toEqual(true);
        expect(scheduler.scheduled.length).toEqual(1);
        expect(scheduler.scheduled[0].sessionId).toEqual('sched-1');
        expect(scheduler.scheduled[0].prompt).toEqual('ping');

        await scheduler.schedule({ id: 'other', sessionId: 'sched-2', prompt: 'other' });
        const listed = await tool.invoke({ action: 'list' }, createSessionContext({ sessionId: 'sched-1' }));
        expect(listed.tasks.length).toEqual(1);
        expect(listed.tasks[0].sessionId).toEqual('sched-1');

        const cancelled = await tool.invoke({ action: 'cancel', id: scheduler.scheduled[0].id }, createSessionContext({ sessionId: 'sched-1' }));
        expect(cancelled.cancelled).toEqual(true);
        expect(scheduler.cancelled).toEqual([scheduler.scheduled[0].id]);
    }

    @Test('schedule tool enforces session and interval limits')
    async scheduleToolEnforcesLimits() {
        const scheduler = new FakeScheduler();
        const tool = new ScheduleTool({ get: () => scheduler } as any, {
            schedule: {
                maxTasksPerSession: 1,
                maxPromptLength: 4,
                minIntervalMs: 60000,
                maxIntervalMs: 120000,
                maxDelayMs: 1000
            }
        } as any);

        await tool.invoke({ action: 'create', prompt: 'ping', delayMs: 1000 }, createSessionContext({ sessionId: 'sched-limit' }));

        let capacityError: Error | undefined;
        try {
            await tool.invoke({ action: 'create', prompt: 'pong', delayMs: 1000 }, createSessionContext({ sessionId: 'sched-limit' }));
        } catch (err) {
            capacityError = err as Error;
        }
        expect(capacityError?.message).toContain('limit');

        let promptError: Error | undefined;
        try {
            await tool.invoke({ action: 'create', prompt: 'too-long', delayMs: 1000 }, createSessionContext({ sessionId: 'sched-prompt' }));
        } catch (err) {
            promptError = err as Error;
        }
        expect(promptError?.message).toContain('must not exceed');

        let intervalError: Error | undefined;
        try {
            await tool.invoke({ action: 'create', prompt: 'pong', intervalMs: 5000 }, createSessionContext({ sessionId: 'sched-interval' }));
        } catch (err) {
            intervalError = err as Error;
        }
        expect(intervalError?.message).toContain('between');

        let cronError: Error | undefined;
        try {
            await tool.invoke({ action: 'create', prompt: 'pong', cronExpr: '* *' }, createSessionContext({ sessionId: 'sched-cron' }));
        } catch (err) {
            cronError = err as Error;
        }
        expect(cronError?.message).toContain('cron');
    }

    @Test('schedule tool creates cron tasks')
    async scheduleToolCreatesCronTasks() {
        const scheduler = new FakeScheduler();
        const tool = new ScheduleTool({ get: () => scheduler } as any);

        const created = await tool.invoke({ action: 'create', prompt: 'ping', cronExpr: '0 */5 * * * *' }, createSessionContext({ sessionId: 'sched-cron-ok' }));
        expect(created.scheduled).toEqual(true);
        expect(created.task.cronExpr).toEqual('0 */5 * * * *');
        expect(created.task.scheduleType).toEqual('cron');
    }

    @Test('schedule tool gets pauses resumes and updates session tasks')
    async scheduleToolGetsPausesResumesAndUpdatesSessionTasks() {
        const scheduler = new FakeScheduler();
        const tool = new ScheduleTool({ get: () => scheduler } as any);

        const created = await tool.invoke({ action: 'create', prompt: 'ping', delayMs: 1000 }, createSessionContext({ sessionId: 'sched-life' }));
        const id = created.task.id;

        const fetched = await tool.invoke({ action: 'get', id }, createSessionContext({ sessionId: 'sched-life' }));
        expect(fetched.task.id).toEqual(id);

        const paused = await tool.invoke({ action: 'pause', id }, createSessionContext({ sessionId: 'sched-life' }));
        expect(paused.paused).toEqual(true);
        expect((paused.task as any).paused).toEqual(true);
        expect(scheduler.paused).toEqual([id]);

        const resumed = await tool.invoke({ action: 'resume', id }, createSessionContext({ sessionId: 'sched-life' }));
        expect(resumed.resumed).toEqual(true);
        expect((resumed.task as any).paused).toEqual(false);
        expect(scheduler.resumed).toEqual([id]);

        const updated = await tool.invoke({ action: 'update', id, prompt: 'pong', intervalMs: 60000 }, createSessionContext({ sessionId: 'sched-life' }));
        expect(updated.updated).toEqual(true);
        expect(updated.task.prompt).toEqual('pong');
        expect(updated.task.intervalMs).toEqual(60000);
        expect(updated.task.scheduleType).toEqual('interval');
        expect(scheduler.updated[0].id).toEqual(id);
    }

    @Test('schedule lifecycle actions enforce session ownership and mutable input')
    async scheduleLifecycleActionsEnforceSessionOwnershipAndMutableInput() {
        const scheduler = new FakeScheduler();
        const tool = new ScheduleTool({ get: () => scheduler } as any);
        const created = await tool.invoke({ action: 'create', prompt: 'ping', delayMs: 1000 }, createSessionContext({ sessionId: 'sched-owner' }));

        let notFoundError: Error | undefined;
        try {
            await tool.invoke({ action: 'get', id: created.task.id }, createSessionContext({ sessionId: 'sched-other' }));
        } catch (err) {
            notFoundError = err as Error;
        }
        expect(notFoundError?.message).toContain('not found');

        let updateError: Error | undefined;
        try {
            await tool.invoke({ action: 'update', id: created.task.id }, createSessionContext({ sessionId: 'sched-owner' }));
        } catch (err) {
            updateError = err as Error;
        }
        expect(updateError?.message).toContain('mutable field');
    }

    @Test('schedule tool rejects cron tasks below min interval and unschedulable cron')
    async scheduleToolRejectsInvalidCronCadence() {
        const scheduler = new FakeScheduler();
        const tool = new ScheduleTool({ get: () => scheduler } as any, {
            schedule: {
                minIntervalMs: 60000
            }
        } as any);

        let fastCronError: Error | undefined;
        try {
            await tool.invoke({ action: 'create', prompt: 'ping', cronExpr: '*/1 * * * * *' }, createSessionContext({ sessionId: 'sched-fast-cron' }));
        } catch (err) {
            fastCronError = err as Error;
        }
        expect(fastCronError?.message).toContain('cron');

        let impossibleCronError: Error | undefined;
        try {
            await tool.invoke({ action: 'create', prompt: 'ping', cronExpr: '0 0 0 31 2 *' }, createSessionContext({ sessionId: 'sched-bad-cron' }));
        } catch (err) {
            impossibleCronError = err as Error;
        }
        expect(impossibleCronError?.message).toContain('cron');
    }

    @Test('process tools start poll and isolate session access')
    async processToolsStartPollAndIsolateSessionAccess() {
        const workspace = await this.createWorkspace();
        const start = new ProcessStartTool(new ProcessRegistry(), { file: { rootDir: workspace } } as any);
        const processes = (start as any).processes;
        const poll = new ProcessPollTool(processes);

        const started = await start.invoke({ command: 'node -e "process.stdout.write(\'ok\')"' }, createSessionContext({ sessionId: 'proc-1' }));
        expect(started.process.id).toBeTruthy();
        expect(started.process.running).toEqual(true);

        await this.waitFor(async () => {
            const current = await poll.invoke({ id: started.process.id }, createSessionContext({ sessionId: 'proc-1' }));
            return current.process.running === false;
        });

        const finished = await poll.invoke({ id: started.process.id }, createSessionContext({ sessionId: 'proc-1' }));
        expect(finished.process.running).toEqual(false);
        expect(finished.process.stdout).toContain('ok');

        let sessionError: Error | undefined;
        try {
            await poll.invoke({ id: started.process.id }, createSessionContext({ sessionId: 'proc-2' }));
        } catch (err) {
            sessionError = err as Error;
        }
        expect(sessionError?.message).toContain('not found');
    }

    @Test('process tools kill running commands and provider exposes process group')
    async processToolsKillRunningCommandsAndProviderExposesProcessGroup() {
        const workspace = await this.createWorkspace();
        const registry = new ProcessRegistry();
        const start = new ProcessStartTool(registry, { file: { rootDir: workspace } } as any);
        const poll = new ProcessPollTool(registry);
        const kill = new ProcessKillTool(registry);

        const started = await start.invoke({ command: 'node -e "setTimeout(() => process.stdout.write(\'later\'), 400)"' }, createSessionContext({ sessionId: 'proc-kill' }));
        const killed = await kill.invoke({ id: started.process.id }, createSessionContext({ sessionId: 'proc-kill' }));
        expect(killed.signalled).toEqual(true);

        await this.waitFor(async () => {
            const current = await poll.invoke({ id: started.process.id }, createSessionContext({ sessionId: 'proc-kill' }));
            return current.process.running === false;
        });

        const finished = await poll.invoke({ id: started.process.id }, createSessionContext({ sessionId: 'proc-kill' }));
        expect(finished.process.running).toEqual(false);
        expect(AGENT_TOOL_GROUPS.process).toEqual(['process.start', 'process.poll', 'process.kill']);
        expect(resolveAgentToolBundles().find(bundle => bundle.name === 'process')?.activation).toEqual({ kind: 'deferred', scope: 'session' });
    }

    @Test('provider and module expose media tools')
    async providerAndModuleExposeMediaTools() {
        expect(AGENT_TOOL_GROUPS.media).toEqual(['image_info', 'pdf_read']);
        expect(resolveAgentToolBundles().find(bundle => bundle.name === 'media')?.activation).toEqual({ kind: 'always', scope: 'global' });

        const workspace = await this.createWorkspace();
        const ctx = await Application.run(AgentToolsModule, {
            providers: [
                ...AgentToolsModule.withOptions({
                    file: { rootDir: workspace },
                    registration: { groups: { media: true } }
                }).providers!
            ]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const names = registry.getToolDefinitions().map(tool => tool.name);
            expect(names).toContain('image_info');
            expect(names).toContain('pdf_read');
        } finally {
            await ctx.close();
        }
    }

    @Test('process start rejects symlink workdir inside workspace')
    async processStartRejectsSymlinkWorkdirInsideWorkspace() {
        const workspace = await this.createWorkspace();
        const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-tools-proc-outside-'));
        const linkedDir = path.join(workspace, 'linked-workdir');
        symlinkSync(outside, linkedDir);
        const tool = new ProcessStartTool(new (require('../process/ProcessRegistry').ProcessRegistry)(), { file: { rootDir: workspace } } as any);

        let error: Error | undefined;
        try {
            await tool.invoke({ command: 'node -e "process.stdout.write(\'ok\')"', workdir: 'linked-workdir' }, createSessionContext({ sessionId: 'proc-symlink' }));
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('symbolic link');
    }

    @Test('process start enforces per-session process limit')
    async processStartEnforcesPerSessionProcessLimit() {
        const workspace = await this.createWorkspace();
        const registry = new ProcessRegistry();
        const tool = new ProcessStartTool(registry, { file: { rootDir: workspace }, process: { maxProcessesPerSession: 1 } } as any);

        const first = await tool.invoke({ command: 'node -e "setTimeout(() => {}, 400)"' }, createSessionContext({ sessionId: 'proc-limit' }));
        expect(first.process.running).toEqual(true);

        let error: Error | undefined;
        try {
            await tool.invoke({ command: 'node -e "setTimeout(() => {}, 400)"' }, createSessionContext({ sessionId: 'proc-limit' }));
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('Process limit reached');

        await new ProcessKillTool(registry).invoke({ id: first.process.id }, createSessionContext({ sessionId: 'proc-limit' }));
    }

    @Test('terminal tool executes command within workspace')
    async terminalToolExecutesCommandWithinWorkspace() {
        const workspace = await this.createWorkspace();
        const tool = new TerminalTool({
            file: { rootDir: workspace },
            terminal: { defaultTimeoutMs: 2000, maxTimeoutMs: 5000 }
        } as any);

        const result = await tool.invoke({ command: 'node -e "process.stdout.write(\'ok\')"' }, createSessionContext());
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toEqual('ok');
    }

    @Test('filesystem loader imports nested SKILL files')
    async filesystemLoaderImportsNestedSkillFiles() {
        const root = await this.createSkillRoot();
        const skills = await loadAgentSkillsFromRoots([root]);
        expect(skills.map(skill => skill.id)).toEqual(['sketch', 'writing-plans']);
        expect(skills[0].title).toEqual('Sketch');
        expect(skills[0].summary).toEqual('Create quick visual sketches.');
        expect(skills[0].promptFull).toContain('Make fast mockups.');
        expect(skills[0].metadata).toEqual({ category: 'creative' });
        expect(skills[1].title).toEqual('Writing Plans');
        expect(skills[1].summary).toEqual('Write implementation plans.');
        expect(skills[1].metadata).toEqual({ category: 'software-development' });
    }

    @Test('filesystem loader rejects unsupported aliases shape')
    async filesystemLoaderRejectsUnsupportedAliasesShape() {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-skills-invalid-'));
        await fs.mkdir(path.join(root, 'invalid-skill'), { recursive: true });
        await fs.writeFile(path.join(root, 'invalid-skill', 'SKILL.md'), `---\nname: invalid-skill\naliases:\n  - one\n---\n\n# Invalid\n\nBody.\n`, 'utf8');
        let error: Error | undefined;
        try {
            await loadAgentSkillsFromRoots([root]);
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('Unsupported skill frontmatter');
    }

    @Test('builtin skill loader imports packaged SKILL files')
    async builtinSkillLoaderImportsPackagedSkillFiles() {
        resetBuiltinSkillsCache();
        const builtins = loadBuiltinSkills(path.resolve(__dirname, '../skills/builtin'));
        expect(builtins.map(skill => skill.id)).toEqual(['codebase', 'plan', 'web-research']);
        expect(builtins[0].title).toEqual('Codebase Exploration');
        expect(builtins[0].summary).toEqual('Explore the repository before making changes.');
        expect(builtins[0].tools?.map(tool => tool.name)).toEqual(['read_file', 'glob_search', 'content_search', 'todo']);
        expect(builtins[1].promptFull).toContain('Use this skill when the user wants an implementation plan');
        expect(getBuiltinSkills().map(skill => skill.id)).toEqual(['codebase', 'plan', 'web-research']);
    }

    @Test('skill list returns projected skills and filters by query')
    async skillListReturnsProjectedSkillsAndFiltersByQuery() {
        const tool = new ListSkillTool(new LocalSkillRegistry([
            {
                id: 'router',
                title: 'Router skill',
                summary: 'Use router diagnostics patterns.',
                promptFull: 'Prefer tool-assisted router diagnostics.',
                aliases: ['router-skill'],
                tools: [{ name: 'read_file' }, { name: 'content_search', activation: 'deferred' }],
                metadata: { source: 'test-suite', category: 'networking' }
            },
            {
                id: 'planner',
                title: 'Planner skill',
                summary: 'Write step-by-step plans.',
                promptFull: 'Plan carefully first.',
                metadata: { source: 'workspace', category: 'planning' }
            }
        ] as any));

        const listed = await tool.invoke({}, createSessionContext());
        expect(listed.skills.length).toEqual(2);
        expect(listed.skills[0]).toEqual({
            id: 'router',
            title: 'Router skill',
            summary: 'Use router diagnostics patterns.',
            aliases: ['router-skill'],
            tools: [{ name: 'read_file' }, { name: 'content_search', activation: 'deferred' }],
            category: 'networking',
            source: 'test-suite'
        });
        expect((listed.skills[0] as any).promptFull).toEqual(undefined);
        expect((listed.skills[0] as any).metadata).toEqual(undefined);
        expect(tool.execution?.readOnly).toEqual(true);

        const aliasMatch = await tool.invoke({ query: 'ROUTER-SKILL' }, createSessionContext());
        expect(aliasMatch.skills.map((skill: any) => skill.id)).toEqual(['router']);

        const toolMatch = await tool.invoke({ query: 'content_search' }, createSessionContext());
        expect(toolMatch.skills.map((skill: any) => skill.id)).toEqual(['router']);

        const metadataMatch = await tool.invoke({ query: 'planning' }, createSessionContext());
        expect(metadataMatch.skills.map((skill: any) => skill.id)).toEqual(['planner']);

        const none = await tool.invoke({ query: 'missing' }, createSessionContext());
        expect(none.skills).toEqual([]);

        let queryError: Error | undefined;
        try {
            await tool.invoke({ query: 1 as any }, createSessionContext());
        } catch (err) {
            queryError = err as Error;
        }
        expect(queryError?.message).toContain('query must be a string');
    }

    @Test('builtin skill assets copy to output tree')
    async builtinSkillAssetsCopyToOutputTree() {
        const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-tools-dist-'));
        await copyBuiltinSkillAssets(outputRoot, path.resolve(__dirname, '../skills/builtin'));
        const copied = await fs.readFile(path.join(outputRoot, 'skills', 'builtin', 'plan', 'SKILL.md'), 'utf8');
        expect(copied).toContain('Plan Mode');
    }

    @Test('provideSkills includes builtin skills by default and can opt out')
    async provideSkillsIncludesBuiltinSkillsByDefaultAndCanOptOut() {
        resetBuiltinSkillsCache();
        const builtinCtx = await Application.run(AgentModule, {
            providers: [...provideSkills()]
        });
        try {
            const builtinRegistry = builtinCtx.get(LocalSkillRegistry);
            expect(builtinRegistry.list().map(skill => skill.id)).toEqual(['codebase', 'plan', 'web-research']);
        } finally {
            await builtinCtx.close();
        }

        const customCtx = await Application.run(AgentModule, {
            providers: [...provideSkills({
                defaults: false,
                skills: [{
                    id: 'router',
                    title: 'Router skill',
                    summary: 'Use router diagnostics patterns.',
                    promptFull: 'Prefer tool-assisted router diagnostics.'
                }]
            })]
        });
        try {
            const customRegistry = customCtx.get(LocalSkillRegistry);
            expect(customRegistry.list().map(skill => skill.id)).toEqual(['router']);
        } finally {
            await customCtx.close();
        }
    }

    @Test('workspace skill roots load through provider')
    async workspaceSkillRootsLoadThroughProvider() {
        resetBuiltinSkillsCache();
        const root = await this.createSkillRoot();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideSkills({ roots: [root], defaults: false })]
        });
        try {
            const registry = ctx.get(LocalSkillRegistry);
            expect(registry.list().map(skill => skill.id)).toEqual(['sketch', 'writing-plans']);
        } finally {
            await ctx.close();
        }
    }

    @Test('provideSkills loads settings skill roots from agent root')
    async provideSkillsLoadsSettingsSkillRootsFromAgentRoot() {
        resetBuiltinSkillsCache();
        const agentRoot = await this.createAgentRootWithWorkspaceSkills();
        const workspaceSkills = path.join(agentRoot, 'workspace', 'skills');
        await fs.mkdir(path.join(workspaceSkills, 'delivery', 'release-check'), { recursive: true });
        await fs.writeFile(path.join(workspaceSkills, 'delivery', 'release-check', 'SKILL.md'), `---\nname: release-check\ndescription: "Check release readiness."\n---\n\n# Release Check\n\nVerify release readiness.\n`, 'utf8');
        const ctx = await Application.run(AgentModule, {
            providers: [...provideSkills({ root: agentRoot, defaults: false })]
        });
        try {
            const registry = ctx.get(LocalSkillRegistry);
            expect(registry.list().map(skill => skill.id)).toEqual(['release-check']);
        } finally {
            await ctx.close();
        }
    }

    @Test('provideSkills merges explicit roots with settings skill roots')
    async provideSkillsMergesExplicitRootsWithSettingsSkillRoots() {
        resetBuiltinSkillsCache();
        const agentRoot = await this.createAgentRootWithWorkspaceSkills();
        const workspaceSkills = path.join(agentRoot, 'workspace', 'skills');
        await fs.mkdir(path.join(workspaceSkills, 'delivery', 'release-check'), { recursive: true });
        await fs.writeFile(path.join(workspaceSkills, 'delivery', 'release-check', 'SKILL.md'), `---\nname: release-check\ndescription: "Check release readiness."\n---\n\n# Release Check\n\nVerify release readiness.\n`, 'utf8');
        const explicitRoot = await this.createSkillRoot();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideSkills({ root: agentRoot, roots: [explicitRoot], defaults: false })]
        });
        try {
            const registry = ctx.get(LocalSkillRegistry);
            expect(registry.list().map(skill => skill.id)).toEqual(['release-check', 'sketch', 'writing-plans']);
        } finally {
            await ctx.close();
        }
    }

    @Test('explicit skills override settings loaded skills with same id')
    async explicitSkillsOverrideSettingsLoadedSkillsWithSameId() {
        resetBuiltinSkillsCache();
        const agentRoot = await this.createAgentRootWithWorkspaceSkills();
        const workspaceSkills = path.join(agentRoot, 'workspace', 'skills');
        await fs.mkdir(path.join(workspaceSkills, 'planning', 'release-check'), { recursive: true });
        await fs.writeFile(path.join(workspaceSkills, 'planning', 'release-check', 'SKILL.md'), `---\nname: release-check\ndescription: "Workspace summary."\n---\n\n# Release Check\n\nWorkspace prompt.\n`, 'utf8');
        const ctx = await Application.run(AgentModule, {
            providers: [...provideSkills({
                root: agentRoot,
                defaults: false,
                skills: [{
                    id: 'release-check',
                    title: 'Explicit release check',
                    summary: 'Explicit summary.',
                    promptFull: 'Explicit prompt.'
                }]
            })]
        });
        try {
            const registry = ctx.get(LocalSkillRegistry);
            const skill = registry.get('release-check');
            expect(skill?.title).toEqual('Explicit release check');
            expect(skill?.summary).toEqual('Explicit summary.');
            expect(skill?.promptFull).toEqual('Explicit prompt.');
        } finally {
            await ctx.close();
        }
    }

    @Test('provideSkills ignores missing settings skill roots')
    async provideSkillsIgnoresMissingSettingsSkillRoots() {
        resetBuiltinSkillsCache();
        const agentRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-root-empty-'));
        const ctx = await Application.run(AgentModule, {
            providers: [...provideSkills({ root: agentRoot, defaults: false })]
        });
        try {
            const registry = ctx.get(LocalSkillRegistry);
            expect(registry.list().map(skill => skill.id)).toEqual([]);
        } finally {
            await ctx.close();
        }
    }

    @Test('explicit skills override builtin skills with same id')
    async explicitSkillsOverrideBuiltinSkillsWithSameId() {
        resetBuiltinSkillsCache();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideSkills({
                skills: [{
                    id: 'plan',
                    title: 'Custom plan',
                    summary: 'Custom plan summary.',
                    promptFull: 'Custom plan prompt.'
                }]
            })]
        });
        try {
            const registry = ctx.get(LocalSkillRegistry);
            const plan = registry.get('plan');
            expect(plan?.title).toEqual('Custom plan');
            expect(plan?.summary).toEqual('Custom plan summary.');
            expect(plan?.promptFull).toEqual('Custom plan prompt.');
        } finally {
            await ctx.close();
        }
    }

    @Test('skills integrate into agent runtime via IoC providers')
    async skillsIntegrateIntoAgentRuntimeViaIoCProviders() {
        class CapturingModelAdapter extends EchoModelAdapter {
            requests: any[] = [];
            calls = 0;
            async complete(request: any): Promise<any> {
                this.calls++;
                this.requests.push(request);
                return { message: 'ok', stopReason: 'end' };
            }
        }

        const model = new CapturingModelAdapter();
        const ctx = await Application.run(AgentModule, {
            providers: [
                { provide: AGENT_MODEL_ADAPTER, useValue: model },
                ...provideSkills({
                    skills: [{
                        id: 'router',
                        title: 'Router skill',
                        summary: 'Use router diagnostics patterns.',
                        promptFull: 'Prefer tool-assisted router diagnostics.',
                        aliases: ['router-skill'],
                        metadata: { source: 'test-suite', category: 'networking' }
                    }]
                })
            ]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const skillRegistry = ctx.get(LocalSkillRegistry);
            expect(registry.getToolDefinitions('s1').some(tool => tool.name === 'read_skill')).toEqual(true);
            expect(registry.getToolDefinitions('s1').some(tool => tool.name === 'skill_list')).toEqual(true);
            expect(skillRegistry.list().map(skill => skill.id).sort()).toEqual(['codebase', 'plan', 'router', 'web-research']);

            const runtime = ctx.get(AgentRuntime);
            await runtime.runTurn('s1', 'hello');
            const firstSystem = model.requests[0].messages[0].content;
            expect(firstSystem).toContain('## Available Skills');
            expect(firstSystem).toContain('router (/router-skill) [test-suite | networking]');
            expect(firstSystem).not.toContain('Prefer tool-assisted router diagnostics.');

            const activated = await runtime.runTurn('s1', '/router-skill');
            expect(activated.message.content).toContain('Activated skill');
            expect(activated.message.content).toContain('router');
            expect(model.calls).toEqual(1);

            const listed = await runtime.runTurn('s1', '/skills');
            expect(listed.message.content).toContain('router [test-suite | networking]: Use router diagnostics patterns.');
            const messages = await runtime.getMessages('s1');
            expect(messages[0].role).toEqual('user');
            expect(messages[0].content).toEqual('hello');
            expect(messages[2].role).toEqual('user');
            expect(messages[2].content).toEqual('/router-skill');
            expect(messages[3].role).toEqual('assistant');
            expect(messages[3].content).toContain('Activated skill');

            await runtime.runTurn('s1', 'use it');
            const finalSystem = model.requests[1].messages[0].content;
            expect(finalSystem).toContain('## Active Skills');
            expect(finalSystem).toContain('Prefer tool-assisted router diagnostics.');
        } finally {
            await ctx.close();
        }
    }

    @Test('terminal tool rejects unsafe workdir and excessive timeout')
    async terminalToolRejectsUnsafeWorkdirAndExcessiveTimeout() {
        const workspace = await this.createWorkspace();
        const tool = new TerminalTool({
            file: { rootDir: workspace },
            terminal: { defaultTimeoutMs: 2000, maxTimeoutMs: 3000 }
        } as any);

        let pathError: Error | undefined;
        try {
            await tool.invoke({ command: 'pwd', workdir: '../outside' }, createSessionContext());
        } catch (err) {
            pathError = err as Error;
        }
        expect(pathError?.message).toContain('outside');

        let timeoutError: Error | undefined;
        try {
            await tool.invoke({ command: 'pwd', timeoutMs: 5001 }, createSessionContext());
        } catch (err) {
            timeoutError = err as Error;
        }
        expect(timeoutError?.message).toContain('timeout');
    }
}
