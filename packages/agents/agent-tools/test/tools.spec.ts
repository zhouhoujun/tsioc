import expect = require('expect');
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { promises as fs } from 'fs';
import { symlinkSync } from 'fs';
import { Suite, Test } from '@tsdi/unit';
import { AgentScheduler, InMemoryMemoryStore, InMemorySessionStore, ScheduledAgentTask } from '@tsdi/agent';
import { SpawnAgentTool, ParallelSpawnTool, SpawnAgentAdapter } from '../agent';
import { OrchestrateTool } from '../agent/orchestrate.tool';
import { SpawnAgentInput, SpawnAgentResult } from '../agent/spawn-agent.tool';
import { NestedAgentRunRequest, NestedAgentRunResult } from '../src/nested-agent-runner';
import { VisionAdapter } from '../media/vision-analyze.tool';
import { ImageGenerationAdapter } from '../media/image-generate.tool';
import { LocationAdapter, LocationTool } from '../utility/location.tool';
import { WeatherAdapter } from '../utility/weather.tool';
import { LlmTaskAdapter } from '../llm/llm-task.tool';
import { PipelineAdapter } from '../pipeline/pipeline.tool';
import { ExecuteCodeTool } from '../code-execution/execute-code.tool';
import { KnowledgeSearchTool } from '../knowledge/knowledge-search.tool';
import { KnowledgeStoreTool } from '../knowledge/knowledge-store.tool';
import { GitOperationsTool } from '../git/git-operations.tool';
import { WeatherTool } from '../utility/weather.tool';
import { SessionSearchTool } from '../sessions/session-search.tool';
import { VisionAnalyzeTool } from '../media/vision-analyze.tool';
import { ImageGenerateTool } from '../media/image-generate.tool';
import { SendMessageTool } from '../communication/send-message.tool';
import { AudioTranscribeTool } from '../audio/audio-transcribe.tool';
import { TextToSpeechTool } from '../audio/text-to-speech.tool';
import { VerifiableIntentTool } from '../security/verifiable-intent.tool';
import { SecurityScanTool } from '../security/security-scan.tool';
import { CronManageTool } from '../cron/cron-manage.tool';
import { DataManageTool } from '../data/data-manage.tool';
import { LlmTaskTool } from '../llm/llm-task.tool';
import { ScreenshotTool } from '../capture/screenshot.tool';
import { GuiControlAdapter, GuiControlTool, ScreenshotAdapter } from '../capture';
import { LocalCodeExecutionAdapter } from '../code-execution';
import { CanvasTool } from '../canvas/canvas.tool';
import { ApprovalTool } from '../approval/approval.tool';
import { DefaultApprovalAdapter } from '../src/default-adapters';
import { CheckpointTool } from '../approval/checkpoint.tool';
import { PipelineTool } from '../pipeline/pipeline.tool';
import { KanbanTool } from '../kanban/kanban.tool';
import { BackupTool } from '../backup/backup.tool';
import { ModelRoutingTool } from '../model-routing/model-routing.tool';
import { PollTool } from '../poll/poll.tool';
import { AiCliTool } from '../ai-cli/ai-cli.tool';
import { CalculatorTool } from '../utility/calculator.tool';
import { ReadFileTool } from '../files/read-file.tool';
import { WriteFileTool } from '../files/write-file.tool';
import { EditFileTool } from '../files/edit-file.tool';
import { MkdirTool } from '../files/mkdir.tool';
import { CopyFileTool } from '../files/copy-file.tool';
import { MoveFileTool } from '../files/move-file.tool';
import { DeleteFileTool } from '../files/delete-file.tool';
import { ListDirTool } from '../files/list-dir.tool';
import { StatTool } from '../files/stat.tool';
import { GlobSearchTool } from '../files/glob-search.tool';
import { ContentSearchTool } from '../files/content-search.tool';
import { WatchFilesTool } from '../files/watch-files.tool';
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
import { CodingTaskStore, CodingTaskTool, WorkspaceActionRunner } from '../coding';
import { provideTools, resolveAgentToolBundles, resolveAgentToolNames, AGENT_TOOL_GROUPS, withProjectAgentTools, withProcessAgentTools } from '../src/provider';
import { AgentToolsModule } from '../src/agent-tools.module';
import { resolveAgentRootSettings } from '../src/settings';
import { buildSandboxEnv, extractCommandName, resolveSandboxPolicy } from '../src/sandbox-policy';
import { Application } from '@tsdi/core';
import { ToolRegistry, AgentRuntime, EchoModelAdapter, AgentModule, ModelAdapter, summarizeToolDisplayText } from '@tsdi/agent';
import { DelegatingLlmTaskAdapter, DelegatingSpawnAgentAdapter, IpWhoIsLocationAdapter, LightweightAgentRunner, NestedAgentRunner, OpenMeteoWeatherAdapter, UnavailableWeatherAdapter } from '../src';
import { TodoTool as ExportedTodoTool, AskUserTool as ExportedAskUserTool, EscalateTool as ExportedEscalateTool } from '../planning';
import { BrowserOpenTool as ExportedBrowserOpenTool, TextBrowserTool as ExportedTextBrowserTool } from '../browser';
import { SessionsCurrentTool as ExportedSessionsCurrentTool, SessionsListTool as ExportedSessionsListTool, SessionsHistoryTool as ExportedSessionsHistoryTool } from '../sessions';
import { ScheduleTool as ExportedScheduleTool } from '../scheduling';
import { TerminalTool as ExportedTerminalTool } from '../terminal';
import { ProcessStartTool as ExportedProcessStartTool, ProcessPollTool as ExportedProcessPollTool, ProcessKillTool as ExportedProcessKillTool } from '../process';
import { ImageInfoTool as ExportedImageInfoTool, PdfReadTool as ExportedPdfReadTool } from '../media';
import { WriteFileTool as ExportedWriteFileTool, EditFileTool as ExportedEditFileTool, MkdirTool as ExportedMkdirTool, CopyFileTool as ExportedCopyFileTool, MoveFileTool as ExportedMoveFileTool, DeleteFileTool as ExportedDeleteFileTool, ListDirTool as ExportedListDirTool, StatTool as ExportedStatTool, WatchFilesTool as ExportedWatchFilesTool } from '../files';
import * as ExportedMemoryModule from '../memory';
const ExportedMemory: any = ExportedMemoryModule;
import { HttpFetchTool as ExportedHttpFetchTool, HttpRequestTool as ExportedHttpRequestTool } from '../http';
import { ToolInspectTool as ExportedToolInspectTool, ToolSearchTool as ExportedToolSearchTool } from '../registry';
import { ProjectIntelTool as ExportedProjectIntelTool } from '../project';
import { CodingTaskTool as ExportedCodingTaskTool } from '../coding';
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

    @Test('mkdir creates nested directories and validates collisions')
    async mkdirCreatesNestedDirectoriesAndValidatesCollisions() {
        const workspace = await this.createWorkspace();
        const tool = new MkdirTool({ file: { rootDir: workspace } } as any);

        const created = await tool.invoke({ path: 'nested/deep' }, createSessionContext());
        expect(created.path).toEqual('nested/deep');
        expect(created.created).toEqual(true);
        expect(created.recursive).toEqual(true);
        expect(tool.execution?.readOnly).toEqual(false);
        const stat = await fs.lstat(path.join(workspace, 'nested', 'deep'));
        expect(stat.isDirectory()).toEqual(true);

        const repeated = await tool.invoke({ path: 'nested/deep' }, createSessionContext());
        expect(repeated.created).toEqual(false);

        let collisionError: Error | undefined;
        try {
            await tool.invoke({ path: 'src/alpha.txt' }, createSessionContext());
        } catch (err) {
            collisionError = err as Error;
        }
        expect(collisionError?.message).toContain('not a directory');
    }

    @Test('copy file copies regular files and protects destinations')
    async copyFileCopiesRegularFilesAndProtectsDestinations() {
        const workspace = await this.createWorkspace();
        const tool = new CopyFileTool({ file: { rootDir: workspace } } as any);

        const copied = await tool.invoke({ from: 'src/alpha.txt', to: 'copies/alpha.txt' }, createSessionContext());
        expect(copied.from).toEqual('src/alpha.txt');
        expect(copied.to).toEqual('copies/alpha.txt');
        expect(copied.overwritten).toEqual(false);
        expect(await fs.readFile(path.join(workspace, 'copies', 'alpha.txt'), 'utf8')).toEqual('alpha\nbeta\ngamma\n');

        let existsError: Error | undefined;
        try {
            await tool.invoke({ from: 'src/alpha.txt', to: 'copies/alpha.txt' }, createSessionContext());
        } catch (err) {
            existsError = err as Error;
        }
        expect(existsError?.message).toContain('already exists');

        const overwritten = await tool.invoke({ from: 'src/alpha.txt', to: 'copies/alpha.txt', overwrite: true }, createSessionContext());
        expect(overwritten.overwritten).toEqual(true);

        let samePathError: Error | undefined;
        try {
            await tool.invoke({ from: 'src/alpha.txt', to: 'src/alpha.txt' }, createSessionContext());
        } catch (err) {
            samePathError = err as Error;
        }
        expect(samePathError?.message).toContain('different paths');

        let sourceError: Error | undefined;
        try {
            await tool.invoke({ from: 'src', to: 'copies/src' }, createSessionContext());
        } catch (err) {
            sourceError = err as Error;
        }
        expect(sourceError?.message).toContain('regular file');
    }

    @Test('move file renames regular files and protects destinations')
    async moveFileRenamesRegularFilesAndProtectsDestinations() {
        const workspace = await this.createWorkspace();
        const tool = new MoveFileTool({ file: { rootDir: workspace } } as any);

        const moved = await tool.invoke({ from: 'src/alpha.txt', to: 'moved/alpha.txt' }, createSessionContext());
        expect(moved.from).toEqual('src/alpha.txt');
        expect(moved.to).toEqual('moved/alpha.txt');
        expect(moved.overwritten).toEqual(false);
        expect(await fs.readFile(path.join(workspace, 'moved', 'alpha.txt'), 'utf8')).toEqual('alpha\nbeta\ngamma\n');

        let missingSource: Error | undefined;
        try {
            await tool.invoke({ from: 'src/alpha.txt', to: 'moved/again.txt' }, createSessionContext());
        } catch (err) {
            missingSource = err as Error;
        }
        expect(!!missingSource).toEqual(true);

        await fs.writeFile(path.join(workspace, 'src', 'gamma.txt'), 'gamma', 'utf8');
        await fs.writeFile(path.join(workspace, 'moved', 'existing.txt'), 'existing', 'utf8');
        let existsError: Error | undefined;
        try {
            await tool.invoke({ from: 'src/gamma.txt', to: 'moved/existing.txt' }, createSessionContext());
        } catch (err) {
            existsError = err as Error;
        }
        expect(existsError?.message).toContain('already exists');

        const overwritten = await tool.invoke({ from: 'src/gamma.txt', to: 'moved/existing.txt', overwrite: true }, createSessionContext());
        expect(overwritten.overwritten).toEqual(true);
        expect(await fs.readFile(path.join(workspace, 'moved', 'existing.txt'), 'utf8')).toEqual('gamma');
    }

    @Test('delete file removes regular files and requires confirmation')
    async deleteFileRemovesRegularFilesAndRequiresConfirmation() {
        const workspace = await this.createWorkspace();
        const tool = new DeleteFileTool({ file: { rootDir: workspace } } as any);

        let confirmError: Error | undefined;
        try {
            await tool.invoke({ path: 'src/alpha.txt' }, createSessionContext());
        } catch (err) {
            confirmError = err as Error;
        }
        expect(confirmError?.message).toContain('confirm');

        const deleted = await tool.invoke({ path: 'src/alpha.txt', confirm: true }, createSessionContext());
        expect(deleted.path).toEqual('src/alpha.txt');
        expect(deleted.deleted).toEqual(true);

        let missingError: Error | undefined;
        try {
            await fs.lstat(path.join(workspace, 'src', 'alpha.txt'));
        } catch (err) {
            missingError = err as Error;
        }
        expect((missingError as any)?.code).toEqual('ENOENT');

        let typeError: Error | undefined;
        try {
            await tool.invoke({ path: 'src', confirm: true }, createSessionContext());
        } catch (err) {
            typeError = err as Error;
        }
        expect(typeError?.message).toContain('regular file');
    }

    @Test('sensitive built-in tools expose authorization policy for principal-aware runtimes')
    sensitiveBuiltInToolsExposeAuthorizationPolicy() {
        expect(new DeleteFileTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new WriteFileTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new EditFileTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new MoveFileTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new CopyFileTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new MkdirTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new TerminalTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new ProcessStartTool(new ProcessRegistry()).execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new HttpRequestTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new BackupTool(null!).execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new PipelineTool(null!).execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new ApprovalTool(null!).execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new AiCliTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new SendMessageTool(null!).execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new KnowledgeStoreTool(null!).execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new MemoryPutTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new MemoryForgetTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new MemoryPurgeTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new MemoryDeleteTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new CronManageTool().execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new DataManageTool(null!).execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new CheckpointTool(null!, null!).execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new KanbanTool(null!).execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new PollTool(null!).execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
        expect(new CanvasTool(null!).execution?.authorization).toEqual({ requiredPrincipals: ['local-system'], allowLocalAnonymous: true });
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

        await fs.writeFile(path.join(workspace, 'src', 'special.txt'), 'a.$ a.$', 'utf8');
        const special = await tool.invoke({ path: 'src/special.txt', oldString: 'a.$', newString: '$1?', replaceAll: true }, createSessionContext());
        expect(special.replacements).toEqual(2);
        expect(await fs.readFile(path.join(workspace, 'src', 'special.txt'), 'utf8')).toEqual('$1? $1?');
    }

    @Test('list dir returns visible entries honors limits and validates paths')
    async listDirReturnsVisibleEntriesHonorsLimitsAndValidatesPaths() {
        const workspace = await this.createWorkspace();
        await fs.mkdir(path.join(workspace, 'src', 'nested'), { recursive: true });
        await fs.writeFile(path.join(workspace, 'src', '.hidden.txt'), 'hidden', 'utf8');
        const tool = new ListDirTool({ file: { rootDir: workspace, maxSearchResults: 10 } } as any);

        const result = await tool.invoke({ path: 'src', limit: 2 }, createSessionContext());
        expect(result.path).toEqual('src');
        expect(result.entries.map((entry: any) => entry.name)).toEqual(['alpha.txt', 'beta.ts']);
        expect(result.entries[0].path).toEqual('src/alpha.txt');
        expect(result.entries[0].kind).toEqual('file');
        expect(typeof result.entries[0].size).toEqual('number');
        expect(typeof result.entries[0].mtime).toEqual('number');
        expect(result.truncated).toEqual(true);
        expect(tool.execution?.readOnly).toEqual(true);

        const withHidden = await tool.invoke({ path: 'src', includeHidden: true, limit: 10 }, createSessionContext());
        expect(withHidden.entries.map((entry: any) => entry.name)).toEqual(['.hidden.txt', 'alpha.txt', 'beta.ts', 'nested']);
        expect(withHidden.entries[3].kind).toEqual('directory');
        expect(withHidden.truncated).toEqual(false);

        const capped = new ListDirTool({ file: { rootDir: workspace, maxSearchResults: 2 } } as any);
        const cappedResult = await capped.invoke({ path: 'src', includeHidden: true, limit: 99 }, createSessionContext());
        expect(cappedResult.entries.map((entry: any) => entry.name)).toEqual(['.hidden.txt', 'alpha.txt']);
        expect(cappedResult.truncated).toEqual(true);

        let pathError: Error | undefined;
        try {
            await tool.invoke({ path: '' }, createSessionContext());
        } catch (err) {
            pathError = err as Error;
        }
        expect(pathError?.message).toContain('path');

        let limitError: Error | undefined;
        try {
            await tool.invoke({ path: 'src', limit: 0 }, createSessionContext());
        } catch (err) {
            limitError = err as Error;
        }
        expect(limitError?.message).toContain('limit');

        let fileError: Error | undefined;
        try {
            await tool.invoke({ path: 'src/alpha.txt' }, createSessionContext());
        } catch (err) {
            fileError = err as Error;
        }
        expect(fileError?.message).toContain('directory');

        let outsideError: Error | undefined;
        try {
            await tool.invoke({ path: '../outside' }, createSessionContext());
        } catch (err) {
            outsideError = err as Error;
        }
        expect(outsideError?.message).toContain('outside');
    }

    @Test('stat returns file and directory metadata and rejects unsafe paths')
    async statReturnsFileAndDirectoryMetadataAndRejectsUnsafePaths() {
        const workspace = await this.createWorkspace();
        const tool = new StatTool({ file: { rootDir: workspace } } as any);

        const fileResult = await tool.invoke({ path: 'src/alpha.txt' }, createSessionContext());
        expect(fileResult.path).toEqual('src/alpha.txt');
        expect(fileResult.type).toEqual('file');
        expect(typeof fileResult.size).toEqual('number');
        expect(typeof fileResult.ctime).toEqual('number');
        expect(typeof fileResult.mtime).toEqual('number');
        expect(typeof fileResult.atime).toEqual('number');
        expect(tool.execution?.readOnly).toEqual(true);

        const dirResult = await tool.invoke({ path: 'src' }, createSessionContext());
        expect(dirResult.path).toEqual('src');
        expect(dirResult.type).toEqual('directory');

        let pathError: Error | undefined;
        try {
            await tool.invoke({ path: '' }, createSessionContext());
        } catch (err) {
            pathError = err as Error;
        }
        expect(pathError?.message).toContain('path');

        let outsideError: Error | undefined;
        try {
            await tool.invoke({ path: '../outside.txt' }, createSessionContext());
        } catch (err) {
            outsideError = err as Error;
        }
        expect(outsideError?.message).toContain('outside');
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

    @Test('watch files records changes for workspace paths')
    async watchFilesRecordsChangesForWorkspacePaths() {
        const workspace = await this.createWorkspace();
        const tool = new WatchFilesTool({ file: { rootDir: workspace } } as any);

        const started = await tool.invoke({ action: 'start', path: 'src/alpha.txt' }, createSessionContext());
        expect(started.active).toEqual(true);

        try {
            await fs.writeFile(path.join(workspace, 'src', 'alpha.txt'), 'alpha updated', 'utf8');
            await new Promise(resolve => setTimeout(resolve, 150));
            const polled = await tool.invoke({ action: 'poll', watch_id: started.watchId }, createSessionContext());
            expect(polled.events.length).toBeGreaterThan(0);
        } finally {
            await tool.invoke({ action: 'stop', watch_id: started.watchId }, createSessionContext()).catch(() => void 0);
        }

        let outsideError: Error | undefined;
        try {
            await tool.invoke({ action: 'start', path: '../outside.txt' }, createSessionContext());
        } catch (err) {
            outsideError = err as Error;
        }
        expect(outsideError?.message).toContain('outside');
    }

    @Test('filesystem tools reject symlink paths in workspace')
    async filesystemToolsRejectSymlinkPathsInWorkspace() {
        const workspace = await this.createWorkspace();
        const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-tools-outside-'));
        const outsideFile = path.join(outside, 'outside.txt');
        await fs.writeFile(outsideFile, 'outside', 'utf8');
        symlinkSync(outsideFile, path.join(workspace, 'src', 'linked.txt'));

        const reader = new ReadFileTool({ file: { rootDir: workspace } });
        const lister = new ListDirTool({ file: { rootDir: workspace } } as any);
        const stater = new StatTool({ file: { rootDir: workspace } } as any);
        const globber = new GlobSearchTool({ file: { rootDir: workspace } });
        const searcher = new ContentSearchTool({ file: { rootDir: workspace } });

        let readError: Error | undefined;
        try {
            await reader.invoke({ path: 'src/linked.txt' }, createSessionContext());
        } catch (err) {
            readError = err as Error;
        }
        expect(readError?.message).toContain('symbolic link');

        let listError: Error | undefined;
        try {
            await lister.invoke({ path: 'src' }, createSessionContext());
        } catch (err) {
            listError = err as Error;
        }
        expect(listError?.message).toContain('symbolic link');

        let statError: Error | undefined;
        try {
            await stater.invoke({ path: 'src/linked.txt' }, createSessionContext());
        } catch (err) {
            statError = err as Error;
        }
        expect(statError?.message).toContain('symbolic link');

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
        expect(ExportedMkdirTool).toEqual(MkdirTool);
        expect(ExportedCopyFileTool).toEqual(CopyFileTool);
        expect(ExportedMoveFileTool).toEqual(MoveFileTool);
        expect(ExportedDeleteFileTool).toEqual(DeleteFileTool);
        expect(ExportedListDirTool).toEqual(ListDirTool);
        expect(ExportedStatTool).toEqual(StatTool);
        expect(ExportedWatchFilesTool).toEqual(WatchFilesTool);
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
        expect(ExportedCodingTaskTool).toEqual(CodingTaskTool);
        expect(ListSkillTool).toBeTruthy();
    }

    @Test('provider tools expose grouped registrations and defaults')
    provideToolsExposeGroupedRegistrationsAndDefaults() {
        expect(AGENT_TOOL_GROUPS.filesystem).toEqual(['read_file', 'list_dir', 'stat', 'glob_search', 'content_search', 'watch_files']);
        expect(AGENT_TOOL_GROUPS.filesystem_write).toEqual(['write_file', 'edit_file', 'mkdir', 'copy_file', 'move_file', 'delete_file']);
        expect(AGENT_TOOL_GROUPS.utility).toEqual(['calculator', 'location', 'weather']);
        expect(AGENT_TOOL_GROUPS.browser).toEqual(['browser_open', 'text_browser']);
        expect(AGENT_TOOL_GROUPS.media).toEqual(['image_info', 'pdf_read', 'vision_analyze', 'image_generate']);
        expect(AGENT_TOOL_GROUPS.sessions).toEqual(['sessions_current', 'sessions_list', 'sessions_history', 'session_search']);
        expect(AGENT_TOOL_GROUPS.memory).toEqual(['memory.list', 'memory.put', 'memory.search', 'memory.recall', 'memory.export', 'memory.forget', 'memory.purge', 'memory.delete']);
        expect(AGENT_TOOL_GROUPS.planning).toEqual(['todo', 'ask_user', 'escalate']);
        expect(AGENT_TOOL_GROUPS.process).toEqual(['process.start', 'process.poll', 'process.kill']);
        expect(AGENT_TOOL_GROUPS.project).toEqual(['project_intel', 'coding_task']);
        expect(resolveAgentToolNames()).toContain('read_file');
        expect(resolveAgentToolNames()).toContain('list_dir');
        expect(resolveAgentToolNames()).toContain('stat');
        expect(resolveAgentToolNames()).toContain('ask_user');
        expect(resolveAgentToolNames()).toContain('project_intel');
        expect(resolveAgentToolNames()).toContain('coding_task');
        expect(resolveAgentToolNames()).toContain('location');
        expect(resolveAgentToolNames()).not.toContain('browser_open');
        expect(resolveAgentToolNames()).not.toContain('text_browser');
        expect(resolveAgentToolNames()).not.toContain('sessions_current');
        expect(resolveAgentToolNames()).not.toContain('sessions_list');
        expect(resolveAgentToolNames()).not.toContain('sessions_history');
        expect(resolveAgentToolNames()).not.toContain('memory.purge');
        expect(resolveAgentToolNames()).toContain('write_file');
        expect(resolveAgentToolNames()).toContain('mkdir');
        expect(resolveAgentToolNames()).toContain('copy_file');
        expect(resolveAgentToolNames()).toContain('move_file');
        expect(resolveAgentToolNames()).toContain('delete_file');
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
        expect(resolveAgentToolNames({ registration: { groups: { filesystem_write: true } } })).toContain('mkdir');
        expect(resolveAgentToolNames({ registration: { groups: { filesystem_write: true } } })).toContain('copy_file');
        expect(resolveAgentToolNames({ registration: { groups: { filesystem_write: true } } })).toContain('move_file');
        expect(resolveAgentToolNames({ registration: { groups: { filesystem_write: true } } })).toContain('delete_file');
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
        expect(filesystem?.tools).toEqual(['read_file', 'list_dir', 'stat', 'glob_search', 'content_search', 'watch_files']);
        expect(filesystem?.defaultEnabled).toEqual(true);
        expect(filesystem?.deferredActivation).toEqual(true);
        expect(filesystem?.enabled).toEqual(true);
        expect(filesystem?.source).toEqual('builtin');
        expect(filesystem?.providerId).toEqual('@tsdi/agent-tools');
        expect(filesystem?.activation).toEqual({ kind: 'deferred', scope: 'session' });
        expect(filesystemWrite?.tools).toEqual(['write_file', 'edit_file', 'mkdir', 'copy_file', 'move_file', 'delete_file']);
        expect(filesystemWrite?.defaultEnabled).toEqual(true);
        expect(filesystemWrite?.enabled).toEqual(true);
        expect(filesystemWrite?.activation).toEqual({ kind: 'deferred', scope: 'session' });
        expect(browser?.tools).toEqual(['browser_open', 'text_browser']);
        expect(browser?.defaultEnabled).toEqual(false);
        expect(browser?.enabled).toEqual(false);
        expect(browser?.activation).toEqual({ kind: 'deferred', scope: 'session' });
        expect(sessions?.tools).toEqual(['sessions_current', 'sessions_list', 'sessions_history', 'session_search']);
        expect(sessions?.defaultEnabled).toEqual(false);
        expect(sessions?.enabled).toEqual(false);
        expect(sessions?.activation).toEqual({ kind: 'deferred', scope: 'session' });
        expect(planning?.tools).toEqual(['todo', 'ask_user', 'escalate']);
        expect(planning?.defaultEnabled).toEqual(true);
        expect(planning?.enabled).toEqual(true);
        expect(project?.tools).toEqual(['project_intel', 'coding_task']);
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
            }), ...withToolTestAdapters()]
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

    @Test('provideTools applies per-tool activation policy to registry definitions')
    async provideToolsAppliesPerToolActivationPolicyToRegistryDefinitions() {
        const workspace = await this.createWorkspace();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideTools({
                file: { rootDir: workspace }
            }), ...withToolTestAdapters()]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const toolSearch = registry.getToolDefinition('tool_search', 's1');
            expect(toolSearch?.inputSchema).toBeTruthy();
            expect(toolSearch?.activation).toEqual({ kind: 'always', scope: 'global', activated: true });

            const calculator = registry.getToolDefinition('calculator', 's1');
            expect(calculator?.inputSchema).toBeTruthy();
            expect(calculator?.activation).toEqual({ kind: 'always', scope: 'global', activated: true });
            expect(await registry.isToolActive?.('s1', 'calculator')).toEqual(true);
            const calculatorResult = await registry.invoke('calculator', { expression: '1 + 2' }, 's1');
            expect(calculatorResult.value).toEqual(3);

            const readFile = registry.getToolDefinition('read_file', 's1');
            expect(readFile?.inputSchema).toEqual(undefined);
            expect(readFile?.activation).toEqual({ kind: 'deferred', scope: 'session', activated: false });
            expect(await registry.isToolActive?.('s1', 'read_file')).toEqual(false);

            let error: Error | undefined;
            try {
                await registry.invoke('read_file', { path: 'src/alpha.txt' }, 's1');
            } catch (err) {
                error = err as Error;
            }
            expect(error?.message).toContain('not activated');

            await registry.activateTool?.('s1', 'read_file');
            const activatedReadFile = registry.getToolDefinition('read_file', 's1');
            expect(activatedReadFile?.inputSchema).toBeTruthy();
            expect(activatedReadFile?.activation).toEqual({ kind: 'deferred', scope: 'session', activated: true });
        } finally {
            await ctx.close();
        }
    }

    @Test('provideTools wires coding task workspace runner through lazy resolution')
    async provideToolsWiresCodingTaskWorkspaceRunnerThroughLazyResolution() {
        const workspace = await this.createWorkspace();
        await fs.writeFile(path.join(workspace, 'README.md'), 'hello', 'utf8');
        const ctx = await Application.run(AgentModule, {
            providers: [...provideTools({
                file: { rootDir: workspace }
            }), ...withToolTestAdapters()]
        });
        try {
            const tool = ctx.get(CodingTaskTool);
            const result = await tool.invoke({
                action: 'run',
                goal: 'Inspect workspace contents',
                actions: [
                    {
                        id: 'list-root',
                        title: 'List root directory',
                        tool: 'list_dir',
                        input: { path: '.' }
                    }
                ]
            }, createSessionContext({ sessionId: 's1' }));

            expect(result.ran).toEqual(true);
            expect(result.task?.actions?.[0]?.status).toEqual('completed');
            expect(result.task?.actions?.[0]?.result?.output?.entries?.some((entry: any) => entry?.name === 'README.md')).toEqual(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('provideTools expose filesystem metadata tools through defaults and module options')
    async provideToolsExposeFilesystemMetadataToolsThroughDefaultsAndModuleOptions() {
        const workspace = await this.createWorkspace();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideTools({
                file: { rootDir: workspace }
            }), ...withToolTestAdapters()]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const names = registry.getToolDefinitions().map(tool => tool.name);
            expect(names).toContain('list_dir');
            expect(names).toContain('stat');
        } finally {
            await ctx.close();
        }

        const moduleCtx = await Application.run(AgentToolsModule, {
            providers: [
                ...AgentToolsModule.withOptions({
                    file: { rootDir: workspace }
                }).providers!,
                ...withToolTestAdapters()
            ]
        });
        try {
            const registry = moduleCtx.get(ToolRegistry);
            const names = registry.getToolDefinitions().map(tool => tool.name);
            expect(names).toContain('list_dir');
            expect(names).toContain('stat');
        } finally {
            await moduleCtx.close();
        }
    }

    @Test('provideTools enable filesystem write tools through module options')
    async provideToolsEnableFilesystemWriteToolsThroughModuleOptions() {
        const workspace = await this.createWorkspace();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideTools({
                file: { rootDir: workspace },
                registration: {
                    groups: { filesystem_write: true }
                }
            }), ...withToolTestAdapters()]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const names = registry.getToolDefinitions().map(tool => tool.name);
            expect(names).toContain('mkdir');
            expect(names).toContain('copy_file');
            expect(names).toContain('move_file');
            expect(names).toContain('delete_file');
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
            }), ...withToolTestAdapters()]
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
                }).providers!,
                ...withToolTestAdapters()
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
            providers: [...provideTools({ registration: { groups: { filesystem_write: true } } }), ...withToolTestAdapters()]
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
            }), ...withToolTestAdapters()]
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

        const defaultSummary = await tool.invoke({
            task: 'Document the architecture handoff'
        }, createSessionContext());
        expect(defaultSummary.action).toEqual('summary');
        expect(defaultSummary.highlights[0]).toContain('Task:');

        let actionError: Error | undefined;
        try {
            await tool.invoke({ action: 'unknown', task: 'x' }, createSessionContext());
        } catch (err) {
            actionError = err as Error;
        }
        expect(actionError?.message).toContain('action');
    }

    @Test('coding task plans with complexity-aware llm output and persists task state')
    async codingTaskPlansWithComplexityAwareLlmOutputAndPersistsTaskState() {
        const llm = new LlmTaskTool(new MockAdapter(async () => ({
            content: JSON.stringify({
                title: 'Fix weather auto-location',
                summary: 'Inspect fallback flow before editing.',
                steps: ['Inspect location lookup', 'Patch fallback flow'],
                successCriteria: ['Current city resolves automatically'],
                actions: [
                    { title: 'Search weather flow', tool: 'content_search', input: { query: 'weather' } }
                ]
            }),
            model: 'fast-model'
        })) as any);

        const runner = {
            getSupportedTools: () => ['content_search', 'edit_file'],
            run: async () => ({ tool: 'content_search', output: { matches: [] }, summary: 'returned matches' })
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(new CodingTaskStore(), runner, llm);
        const result = await tool.invoke({
            action: 'plan',
            goal: 'Fix current city weather auto detection'
        }, createSessionContext());

        expect(result.planned).toEqual(true);
        expect(result.modelSelection.strategy).toEqual('llm');
        expect(result.modelSelection.model).toEqual('fast-model');
        expect(result.task.planning.complexity).toEqual('simple');
        expect(result.task.actions[0].tool).toEqual('content_search');

        const listed = await tool.invoke({ action: 'list' }, createSessionContext());
        expect(listed.total).toEqual(1);
    }

    @Test('coding task runs sequential actions and records failures')
    async codingTaskRunsSequentialActionsAndRecordsFailures() {
        const calls: string[] = [];
        const runner = {
            getSupportedTools: () => ['content_search', 'edit_file'],
            run: async (action: any) => {
                calls.push(action.id);
                if (action.id === 'action-2') {
                    throw new Error('edit failed');
                }
                return { tool: action.tool, output: { ok: true }, summary: 'ok' };
            }
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(
            new CodingTaskStore(),
            runner,
            null as any,
            { codingTask: { parallelWorkerRetries: 0, parallelWorkerTimeoutMs: 1000 } } as any
        );
        const result = await tool.invoke({
            action: 'run',
            goal: 'Apply weather location fix',
            actions: [
                { id: 'action-1', title: 'Search current logic', tool: 'content_search', input: { query: 'location' } },
                { id: 'action-2', title: 'Patch fallback', tool: 'edit_file', input: { path: 'a.ts', oldString: 'a', newString: 'b' } }
            ]
        }, createSessionContext());

        expect(calls).toEqual(['action-1', 'action-2']);
        expect(result.completedActions).toEqual(1);
        expect(result.failedActionId).toEqual('action-2');
        expect(result.task.status).toEqual('failed');
        expect(result.task.actions[0].status).toEqual('completed');
        expect(result.task.actions[1].status).toEqual('failed');
        expect(result.task.result.error).toContain('edit failed');
    }

    @Test('coding task captures git diff summary after successful workspace edits')
    async codingTaskCapturesGitDiffAfterWorkspaceEdits() {
        const calls: string[] = [];
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => {
                calls.push(action.tool);
                if (action.tool === 'git_operations') {
                    return {
                        tool: 'git_operations',
                        output: { stdout: 'diff --git a/a.ts b/a.ts\n+patched' },
                        summary: 'diff available'
                    };
                }
                return { tool: action.tool, output: { ok: true }, summary: 'ok' };
            }
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(
            new CodingTaskStore(),
            runner,
            null as any,
            { codingTask: { parallelWorkerRetries: 0, parallelWorkerTimeoutMs: 1000 } } as any
        );
        const result = await tool.invoke({
            action: 'run',
            goal: 'Patch fallback flow and add tests',
            actions: [
                { id: 'action-1', title: 'Patch fallback', tool: 'edit_file', input: { path: 'a.ts', oldString: 'a', newString: 'b' } }
            ]
        }, createSessionContext());

        expect(calls).toEqual(['edit_file', 'git_operations']);
        expect(result.task.status).toEqual('completed');
        expect(result.task.result?.diff?.summary).toEqual('diff available');
        expect(result.task.result?.diff?.output).toEqual({ stdout: 'diff --git a/a.ts b/a.ts\n+patched' });
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

    @Test('tool_search returns inactive deferred tools as discovery results')
    async toolSearchReturnsInactiveDeferredToolsAsDiscoveryResults() {
        const workspace = await this.createWorkspace();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideTools({
                file: { rootDir: workspace }
            }), ...withToolTestAdapters()]
        });
        try {
            const app = { get(token: any) { return ctx.get(token); } } as any;
            const search = new ToolSearchTool(app);

            const before = await search.invoke({ query: 'read_file' }, createSessionContext());
            expect(before.tools.length).toBeGreaterThan(0);
            const deferred = before.tools.find((tool: any) => tool.name === 'read_file');
            expect(deferred).toBeTruthy();
            expect(deferred.active).toEqual(false);
            expect(deferred.inputSchema).toEqual(undefined);
            expect(deferred.activation).toEqual({ kind: 'deferred', scope: 'session', activated: false });

            const registry = ctx.get(ToolRegistry);
            await registry.activateTool?.('s1', 'read_file');

            const after = await search.invoke({ query: 'read_file' }, createSessionContext());
            const activated = after.tools.find((tool: any) => tool.name === 'read_file');
            expect(activated).toBeTruthy();
            expect(activated.active).toEqual(true);
            expect(activated.inputSchema).toBeTruthy();
            expect(activated.activation).toEqual({ kind: 'deferred', scope: 'session', activated: true });
        } finally {
            await ctx.close();
        }
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

        const started = await start.invoke({ command: 'printf ok' }, createSessionContext({ sessionId: 'proc-1' }));
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

        const started = await start.invoke({ command: 'sleep 1; printf later' }, createSessionContext({ sessionId: 'proc-kill' }));
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
        expect(AGENT_TOOL_GROUPS.media).toEqual(['image_info', 'pdf_read', 'vision_analyze', 'image_generate']);
        expect(resolveAgentToolBundles().find(bundle => bundle.name === 'media')?.activation).toEqual({ kind: 'deferred', scope: 'session' });

        const workspace = await this.createWorkspace();
        const ctx = await Application.run(AgentToolsModule, {
            providers: [
                ...AgentToolsModule.withOptions({
                    file: { rootDir: workspace },
                    registration: { groups: { media: true } }
                }).providers!,
                ...withToolTestAdapters()
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
            await tool.invoke({ command: 'printf ok', workdir: 'linked-workdir' }, createSessionContext({ sessionId: 'proc-symlink' }));
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

        const first = await tool.invoke({ command: 'sleep 1' }, createSessionContext({ sessionId: 'proc-limit' }));
        expect(first.process.running).toEqual(true);

        let error: Error | undefined;
        try {
            await tool.invoke({ command: 'sleep 1' }, createSessionContext({ sessionId: 'proc-limit' }));
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

        const result = await tool.invoke({ command: 'printf ok' }, createSessionContext());
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toEqual('ok');
    }

    @Test('sensitive built-in tools allow anonymous local invocation while declaring principal-aware authz metadata')
    async sensitiveBuiltInToolsAllowAnonymousLocalInvocation() {
        const workspace = await this.createWorkspace();
        const terminal = new TerminalTool({
            file: { rootDir: workspace },
            terminal: { defaultTimeoutMs: 2000, maxTimeoutMs: 5000 }
        } as any);
        const deleteTool = new DeleteFileTool({ file: { rootDir: workspace } } as any);

        const terminalResult = await terminal.invoke({ command: 'printf ok' }, createSessionContext({ principalId: undefined } as any));
        expect(terminalResult.stdout).toEqual('ok');

        const deleteResult = await deleteTool.invoke({ path: 'src/alpha.txt', confirm: true }, createSessionContext({ principalId: undefined } as any));
        expect(deleteResult.deleted).toEqual(true);
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
                { provide: ModelAdapter, useValue: model },
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

    @Test('shared sandbox policy resolves command rules and filters env')
    sharedSandboxPolicyResolvesCommandRulesAndFiltersEnv() {
        const policy = resolveSandboxPolicy({
            sandbox: {
                allowedCommands: ['node', 'npm'],
                blockedCommands: ['rm'],
                inheritEnv: true,
                allowedEnv: ['PATH', 'SAFE_TOKEN'],
                blockedEnv: ['SAFE_TOKEN']
            }
        } as any);
        expect(policy.allowedCommands).toEqual(['node', 'npm']);
        expect(policy.blockedCommands).toEqual(['rm']);
        expect(extractCommandName('SAFE=1 node -e "console.log(1)"')).toEqual('node');
        expect(buildSandboxEnv({ PATH: '/bin', SAFE_TOKEN: 'secret', HOME: '/tmp' }, policy)).toEqual({ PATH: '/bin' });
    }

    @Test('terminal tool applies shared sandbox command and env policy')
    async terminalToolAppliesSharedSandboxPolicy() {
        const workspace = await this.createWorkspace();
        const previous = process.env.AGENT_TOOLS_SECRET;
        process.env.AGENT_TOOLS_SECRET = 'hidden';
        try {
            const tool = new TerminalTool({
                file: { rootDir: workspace },
                terminal: { defaultTimeoutMs: 2000, maxTimeoutMs: 3000 },
                sandbox: { blockedEnv: ['AGENT_TOOLS_SECRET'] }
            } as any);
            const result = await tool.invoke({ command: 'printf %s "${AGENT_TOOLS_SECRET:-missing}"' }, createSessionContext());
            expect(result.stdout).toEqual('missing');
        } finally {
            if (previous == null) {
                delete process.env.AGENT_TOOLS_SECRET;
            } else {
                process.env.AGENT_TOOLS_SECRET = previous;
            }
        }

        let blocked: Error | undefined;
        try {
            await new TerminalTool({
                file: { rootDir: workspace },
                terminal: { defaultTimeoutMs: 2000, maxTimeoutMs: 3000 },
                sandbox: { blockedCommands: ['printf'] }
            } as any).invoke({ command: 'printf ok' }, createSessionContext());
        } catch (err) {
            blocked = err as Error;
        }
        expect(blocked?.message).toContain('blocked by sandbox policy');
    }

    @Test('process start applies shared sandbox command policy')
    async processStartAppliesSharedSandboxPolicy() {
        const workspace = await this.createWorkspace();
        const tool = new ProcessStartTool(new ProcessRegistry(), {
            file: { rootDir: workspace },
            sandbox: { allowedCommands: ['sleep'] }
        } as any);

        let error: Error | undefined;
        try {
            await tool.invoke({ command: 'printf ok' }, createSessionContext({ sessionId: 'proc-policy' }));
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('not allowed by sandbox policy');
    }

    @Test('spawn agent requires adapter and requests delegation')
    async spawnAgentRequiresAdapterAndRequestsDelegation() {
        let adapter: Error | undefined;
        try {
            await new SpawnAgentTool(null!).invoke({ goal: 'test' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        let seenMaxTurns: number | undefined;
        const tool = new SpawnAgentTool(new MockAdapter(async (request: SpawnAgentInput) => {
            seenMaxTurns = request.maxTurns;
            return {
                output: 'done',
                sessionId: 'spawn-1',
                turnCount: 2,
                toolCalls: 3,
                model: 'mock-model',
                finishReason: 'stop',
                usage: { promptTokens: 10 },
                report: {
                    summary: 'done',
                    diff: 'src/app.ts +1 -0',
                    completed: ['analyze'],
                    nextSteps: ['review'],
                    risks: ['none'],
                    artifacts: ['patch.diff']
                }
            };
        }));
        const result = await tool.invoke({ goal: 'test task', context: 'some context', toolsets: ['filesystem', 'web'], maxTurns: 5 }, createSessionContext());
        expect(result.goal).toEqual('test task');
        expect(result.output).toEqual('done');
        expect(result.sessionId).toEqual('spawn-1');
        expect(result.turnCount).toEqual(2);
        expect(result.toolCalls).toEqual(3);
        expect(result.model).toEqual('mock-model');
        expect(result.finishReason).toEqual('stop');
        expect(result.usage?.promptTokens).toEqual(10);
        expect(result.summary).toEqual('done');
        expect(result.diff).toEqual('src/app.ts +1 -0');
        expect(result.nextSteps).toEqual(['review']);
        expect(result.artifacts).toEqual(['patch.diff']);
        expect(result.report?.summary).toEqual('done');
        expect(result.report?.nextSteps).toEqual(['review']);
        expect(result.report?.artifacts).toEqual(['patch.diff']);
        expect(seenMaxTurns).toEqual(5);

        let goalError: Error | undefined;
        try {
            await tool.invoke({}, createSessionContext());
        } catch (err) {
            goalError = err as Error;
        }
        expect(goalError?.message).toContain('goal');
    }

    @Test('shared spawn adapter delegates through nested agent runner')
    async sharedSpawnAdapterDelegatesThroughNestedAgentRunner() {
        let seenSessionId = '';
        let seenMaxTurns: number | undefined;
        const adapter = new DelegatingSpawnAgentAdapter({
            run: async (request: NestedAgentRunRequest) => {
                seenSessionId = request.sessionId || '';
                seenMaxTurns = request.maxTurns;
                return {
                sessionId: request.sessionId,
                content: [
                    request.prompt,
                    '',
                    'Summary: analyzed the project structure',
                    'Diff: src/app.ts +12 -3',
                    'Completed: mapped files, identified risks',
                    'Next steps: update review summary, split workers',
                    'Risks: duplicate analysis, stale context',
                    'Artifacts: diff.patch, notes.md'
                ].join('\n'),
                model: 'mock',
                finishReason: 'end',
                usage: { promptTokens: 12 },
                turnCount: 1,
                toolCalls: 2
                };
            }
        } as unknown as NestedAgentRunner);

        const result = await adapter.spawn({
            goal: 'analyze project',
            context: 'focus on risks',
            toolsets: ['filesystem'],
            maxTurns: 4
        });

        expect(result.output).toContain('analyze project');
        expect(result.output).toContain('focus on risks');
        expect(result.output).toContain('Use at most 4 turns.');
        expect(result.sessionId).toContain('spawn-');
        expect(seenSessionId).toEqual(result.sessionId);
        expect(seenMaxTurns).toEqual(4);
        expect(result.turnCount).toBe(1);
        expect(result.toolCalls).toBe(2);
        expect(result.model).toEqual('mock');
        expect(result.finishReason).toEqual('end');
        expect(result.usage?.promptTokens).toEqual(12);
        expect(result.summary).toContain('analyzed the project structure');
        expect(result.diff).toEqual('src/app.ts +12 -3');
        expect(result.nextSteps).toEqual(['update review summary', 'split workers']);
        expect(result.artifacts).toEqual(['diff.patch', 'notes.md']);
        expect(result.report?.summary).toContain('analyzed the project structure');
        expect(result.report?.nextSteps).toEqual(['update review summary', 'split workers']);
        expect(result.report?.artifacts).toEqual(['diff.patch', 'notes.md']);
        expect(seenMaxTurns).toEqual(4);
    }

    @Test('orchestrate skips dependent tasks after failure and forwards maxTurns')
    async orchestrateSkipsDependentTasksAfterFailureAndForwardsMaxTurns() {
        const calls: SpawnAgentInput[][] = [];
        const adapter = new MockAdapter(async (inputs: SpawnAgentInput[]) => {
            calls.push(inputs.map(input => ({ ...input })));
            return inputs.map(() => ({
                output: 'done',
                error: 'boom'
            }));
        });
        const tool = new OrchestrateTool(adapter as any);

        const result = await tool.invoke({
            goal: 'top goal',
            tasks: [
                { id: 'a', goal: 'first task', maxTurns: 3 },
                { id: 'b', goal: 'second task', dependsOn: ['a'], maxTurns: 2 }
            ]
        }, createSessionContext());

        expect(calls.length).toEqual(1);
        expect(calls[0][0].maxTurns).toEqual(3);
        expect(result.phases[0].tasks[0].status).toEqual('failed');
        expect(result.phases[1].tasks[0].status).toEqual('skipped');
        expect(result.phases[1].tasks[0].error).toContain('Skipped because dependency "a" failed');
    }

    @Test('parallel spawn requires adapter')
    async parallelSpawnRequiresAdapter() {
        let adapter: Error | undefined;
        try {
            await new ParallelSpawnTool(null!).invoke({ tasks: [{ goal: 'test' }] }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();
    }

    @Test('parallel spawn validates tasks array')
    async parallelSpawnValidatesTasksArray() {
        const tool = new ParallelSpawnTool(new (class extends SpawnAgentAdapter {
            override async spawn(input: SpawnAgentInput): Promise<SpawnAgentResult> {
                return { output: 'ok', sessionId: 'mock', turnCount: 0, toolCalls: 0 };
            }
        })());
        const result = await tool.invoke({}, createSessionContext());
        expect(result.error).toContain('tasks array is required');
    }

    @Test('parallel spawn empty tasks returns error')
    async parallelSpawnEmptyTasksReturnsError() {
        const tool = new ParallelSpawnTool(new (class extends SpawnAgentAdapter {
            override async spawn(input: SpawnAgentInput): Promise<SpawnAgentResult> {
                return { output: 'ok', sessionId: 'mock', turnCount: 0, toolCalls: 0 };
            }
        })());
        const result = await tool.invoke({ tasks: [] }, createSessionContext());
        expect(result.error).toContain('tasks array is required');
    }

    @Test('parallel spawn validates goal per task')
    async parallelSpawnValidatesGoalPerTask() {
        const tool = new ParallelSpawnTool(new (class extends SpawnAgentAdapter {
            override async spawn(input: SpawnAgentInput): Promise<SpawnAgentResult> {
                return { output: 'ok', sessionId: 'mock', turnCount: 0, toolCalls: 0 };
            }
        })());
        let goalError: Error | undefined;
        try {
            await tool.invoke({ tasks: [{ goal: '' }] }, createSessionContext());
        } catch (err) {
            goalError = err as Error;
        }
        expect(goalError?.message).toContain('goal');
    }

    @Test('parallel spawn runs single task through adapter')
    async parallelSpawnRunsSingleTaskThroughAdapter() {
        let spawnCount = 0;
        const adapter = new (class extends SpawnAgentAdapter {
            override async spawn(input: SpawnAgentInput): Promise<SpawnAgentResult> {
                spawnCount++;
                return {
                    output: `result for: ${input.goal}`,
                    sessionId: 'spawn-1',
                    turnCount: 1,
                    toolCalls: 2,
                    model: 'mock',
                    finishReason: 'stop',
                    summary: 'done',
                    completed: ['task-1']
                };
            }
        })();
        const tool = new ParallelSpawnTool(adapter);
        const result = await tool.invoke({ tasks: [{ goal: 'analyze code' }] }, createSessionContext());
        expect(spawnCount).toBe(1);
        expect(result.taskCount).toBe(1);
        expect(result.succeededCount).toBe(1);
        expect(result.failedCount).toBe(0);
        expect(result.results[0].goal).toBe('analyze code');
        expect(result.results[0].output).toBe('result for: analyze code');
        expect(result.results[0].summary).toBe('done');
        expect(result.results[0].completed).toEqual(['task-1']);
    }

    @Test('parallel spawn runs multiple tasks concurrently')
    async parallelSpawnRunsMultipleTasksConcurrently() {
        let spawnCount = 0;
        const adapter = new (class extends SpawnAgentAdapter {
            override async spawn(input: SpawnAgentInput): Promise<SpawnAgentResult> {
                spawnCount++;
                return {
                    output: `output: ${input.goal}`,
                    sessionId: `spawn-${spawnCount}`,
                    turnCount: 1,
                    toolCalls: 1,
                    summary: `done: ${spawnCount}`
                };
            }
        })();
        const tool = new ParallelSpawnTool(adapter);
        const result = await tool.invoke({
            tasks: [
                { goal: 'task A' },
                { goal: 'task B' },
                { goal: 'task C' }
            ]
        }, createSessionContext());
        expect(spawnCount).toBe(3);
        expect(result.taskCount).toBe(3);
        expect(result.succeededCount).toBe(3);
        expect(result.results[0].goal).toBe('task A');
        expect(result.results[1].goal).toBe('task B');
        expect(result.results[2].goal).toBe('task C');
        expect(result.results[0].output).toBe('output: task A');
        expect(result.results[1].output).toBe('output: task B');
        expect(result.results[2].output).toBe('output: task C');
    }

    @Test('parallel spawn handles partial failure')
    async parallelSpawnHandlesPartialFailure() {
        const adapter = new (class extends SpawnAgentAdapter {
            private callOrder = 0;
            override async spawn(input: SpawnAgentInput): Promise<SpawnAgentResult> {
                this.callOrder++;
                if (this.callOrder === 2) {
                    throw new Error('worker B failed');
                }
                return {
                    output: `ok: ${input.goal}`,
                    sessionId: `spawn-${this.callOrder}`,
                    turnCount: 1,
                    toolCalls: 0,
                    summary: `success: ${this.callOrder}`
                };
            }
        })();
        const tool = new ParallelSpawnTool(adapter);
        const result = await tool.invoke({
            tasks: [
                { goal: 'task A' },
                { goal: 'task B' },
                { goal: 'task C' }
            ]
        }, createSessionContext());
        expect(result.taskCount).toBe(3);
        expect(result.succeededCount).toBe(2);
        expect(result.failedCount).toBe(1);
        expect(result.results[0].goal).toBe('task A');
        expect(result.results[1].goal).toBe('task B');
        expect(result.results[2].goal).toBe('task C');
        expect(result.results[0].error).toBeUndefined();
        expect(result.results[1].error).toBeDefined();
        expect(result.results[2].error).toBeUndefined();
    }

    @Test('parallel spawn delegates through spawn adapter parallel')
    async parallelSpawnDelegatesThroughSpawnAdapterParallel() {
        let parallelCalled = false;
        const adapter = new (class extends SpawnAgentAdapter {
            override async spawn(_input: SpawnAgentInput): Promise<SpawnAgentResult> {
                throw new Error('unexpected spawn call');
            }
            override async spawnParallel(inputs: SpawnAgentInput[]): Promise<SpawnAgentResult[]> {
                parallelCalled = true;
                return inputs.map((input, i) => ({
                    output: `parallel result: ${input.goal}`,
                    sessionId: `par-${i}`,
                    turnCount: 1,
                    toolCalls: i,
                    summary: `task ${i} done`
                }));
            }
        })();
        const tool = new ParallelSpawnTool(adapter);
        const result = await tool.invoke({
            tasks: [
                { goal: 'task 1' },
                { goal: 'task 2' }
            ]
        }, createSessionContext());
        expect(parallelCalled).toBe(true);
        expect(result.taskCount).toBe(2);
        expect(result.succeededCount).toBe(2);
        expect(result.results[0].output).toBe('parallel result: task 1');
        expect(result.results[1].output).toBe('parallel result: task 2');
    }

    @Test('parallel spawn passes toolsets and context per task')
    async parallelSpawnPassesToolsetsAndContextPerTask() {
        const captured: SpawnAgentInput[] = [];
        const adapter = new (class extends SpawnAgentAdapter {
            override async spawn(input: SpawnAgentInput): Promise<SpawnAgentResult> {
                captured.push(input);
                return {
                    output: 'ok',
                    sessionId: `spawn-${captured.length}`,
                    turnCount: 1,
                    toolCalls: 0
                };
            }
        })();
        const tool = new ParallelSpawnTool(adapter);
        await tool.invoke({
            tasks: [
                { goal: 'research', toolsets: ['web', 'filesystem'], maxTurns: 3 },
                { goal: 'write code', context: 'use TypeScript', maxTurns: 4 }
            ]
        }, createSessionContext());
        expect(captured.length).toBe(2);
        expect(captured[0].goal).toBe('research');
        expect(captured[0].toolsets).toEqual(['web', 'filesystem']);
        expect(captured[0].context).toBeUndefined();
        expect(captured[0].maxTurns).toBe(3);
        expect(captured[1].goal).toBe('write code');
        expect(captured[1].context).toBe('use TypeScript');
        expect(captured[1].toolsets).toBeUndefined();
        expect(captured[1].maxTurns).toBe(4);
    }

    @Test('parallel spawn adapter default runs spawn sequentially')
    async parallelSpawnAdapterDefaultRunsSpawnSequentially() {
        const order: number[] = [];
        const adapter = new (class extends SpawnAgentAdapter {
            override async spawn(input: SpawnAgentInput): Promise<SpawnAgentResult> {
                order.push(parseInt(input.goal.slice(-1), 10));
                return {
                    output: `result: ${input.goal}`,
                    sessionId: `spawn-${order.length}`,
                    turnCount: 1,
                    toolCalls: 0
                };
            }
        })();
        const inputs: SpawnAgentInput[] = [
            { goal: 'task 1' },
            { goal: 'task 2' },
            { goal: 'task 3' }
        ];
        const results = await adapter.spawnParallel(inputs);
        expect(results.length).toBe(3);
        expect(results[0].output).toBe('result: task 1');
        expect(results[1].output).toBe('result: task 2');
        expect(results[2].output).toBe('result: task 3');
        expect(order).toEqual([1, 2, 3]);
    }

    @Test('delegating spawn adapter parallel delegates through runner parallel')
    async delegatingSpawnAdapterParallelDelegatesThroughRunnerParallel() {
        let parallelRuns = 0;
        const adapter = new DelegatingSpawnAgentAdapter({
            runParallel: async (requests: NestedAgentRunRequest[]) => {
                parallelRuns++;
                return requests.map((req: NestedAgentRunRequest, i: number) => ({
                    content: `runner result: ${req.prompt}`,
                    sessionId: req.sessionId,
                    turnCount: i + 1,
                    toolCalls: i
                }));
            },
            run: async () => {
                throw new Error('should call runParallel not run');
            }
        } as unknown as NestedAgentRunner);
        const results = await adapter.spawnParallel([
            { goal: 'analyze' },
            { goal: 'build' }
        ]);
        expect(parallelRuns).toBe(1);
        expect(results.length).toBe(2);
        expect(results[0].output).toContain('runner result:');
        expect(results[0].output).toContain('analyze');
        expect(results[1].output).toContain('build');
    }

    @Test('parallel spawn tool aggregates task summaries and failures')
    async parallelSpawnToolAggregatesResults() {
        const tool = new ParallelSpawnTool({
            async spawnParallel(inputs: SpawnAgentInput[]): Promise<SpawnAgentResult[]> {
                return inputs.map((input, index) => index === 1
                    ? {
                        output: '',
                        error: 'worker failed',
                        sessionId: `spawn-${index + 1}`
                    }
                    : {
                        output: `result ${input.goal}`,
                        sessionId: `spawn-${index + 1}`,
                        summary: `summary ${index + 1}`,
                        completed: ['shared-step', `step-${index + 1}`],
                        nextSteps: ['review diff', `next-${index + 1}`],
                        risks: ['shared-risk', `risk-${index + 1}`],
                        artifacts: ['patch.diff', `artifact-${index + 1}`]
                    });
            }
        } as any);

        const result = await tool.invoke({
            tasks: [
                { goal: 'alpha' },
                { goal: 'beta' },
                { goal: 'gamma' }
            ]
        }, createSessionContext());

        expect(result.taskCount).toBe(3);
        expect(result.succeededCount).toBe(2);
        expect(result.failedCount).toBe(1);
        expect(result.summary).toContain('parallel 3 tasks');
        expect(result.summary).toContain('2 succeeded');
        expect(result.summary).toContain('1 failed');
        expect(result.completed).toEqual(['shared-step', 'step-1', 'step-3']);
        expect(result.nextSteps).toEqual(['review diff', 'next-1', 'next-3']);
        expect(result.risks).toContain('shared-risk');
        expect(result.risks).toContain('worker failed');
        expect(result.artifacts).toEqual(['patch.diff', 'artifact-1', 'artifact-3']);
        expect(result.failures.length).toBe(1);
        expect(result.failures[0].goal).toBe('beta');
    }

    @Test('spawn agent output summary prefers structured report fields')
    spawnAgentOutputSummaryPrefersStructuredReportFields() {
        const summary = summarizeToolDisplayText('spawn_agent', {
            goal: 'analyze project',
            sessionId: 'spawn-1',
            turnCount: 2,
            toolCalls: 3,
            diff: 'src/app.ts +12 -3',
            report: {
                summary: 'analyzed the project structure',
                diff: 'src/app.ts +12 -3',
                nextSteps: ['update review summary', 'split workers'],
                artifacts: ['diff.patch']
            }
        });

        expect(summary).toContain('analyze project');
        expect(summary).toContain('analyzed the project structure');
        expect(summary).toContain('diff=src/app.ts +12 -3');
        expect(summary).toContain('session=spawn-1');
        expect(summary).toContain('2 turns');
        expect(summary).toContain('3 tools');
        expect(summary).toContain('next=update review summary, split workers');
        expect(summary).toContain('artifacts=diff.patch');
    }

    @Test('parse delegated agent reports with diff and structured lists')
    async parseDelegatedAgentReportsWithDiffAndStructuredLists() {
        const adapter = new DelegatingSpawnAgentAdapter({
            run: async () => ({
                content: [
                    'Summary: finished the worker pass',
                    'Diff: src/a.ts +4 -1',
                    'Completed: wrote tests, updated docs',
                    'Next steps: review diff, merge branch',
                    'Risks: flaky test, stale lockfile',
                    'Artifacts: patch.diff, notes.md'
                ].join('\n'),
                turnCount: 1,
                toolCalls: 1
            })
        } as unknown as NestedAgentRunner);

        const result = await adapter.spawn({ goal: 'worker task' });

        expect(result.summary).toEqual('finished the worker pass');
        expect(result.diff).toEqual('src/a.ts +4 -1');
        expect(result.completed).toEqual(['wrote tests', 'updated docs']);
        expect(result.nextSteps).toEqual(['review diff', 'merge branch']);
        expect(result.risks).toEqual(['flaky test', 'stale lockfile']);
        expect(result.artifacts).toEqual(['patch.diff', 'notes.md']);
        expect(result.report?.diff).toEqual('src/a.ts +4 -1');
    }

    @Test('coding task output summary prefers aggregated report fields')
    codingTaskOutputSummaryPrefersAggregatedReportFields() {
        const summary = summarizeToolDisplayText('coding_task', {
            task: {
                id: 'task-1',
                title: 'Apply isolated edits',
                status: 'completed',
                actions: [{ id: 'edit-1' }, { id: 'edit-2' }],
                result: {
                    workers: [{ workerId: 'worker-1' }, { workerId: 'worker-2' }],
                    report: {
                        summary: '2 worker diff(s) captured',
                        nextSteps: ['review diff', 'verify changes'],
                        risks: ['1 worker failure'],
                        artifacts: ['diff', 'checkpoint:checkpoint-task-1']
                    }
                }
            }
        });

        expect(summary).toContain('completed');
        expect(summary).toContain('Apply isolated edits');
        expect(summary).toContain('2 actions');
        expect(summary).toContain('2 workers');
        expect(summary).toContain('2 worker diff(s) captured');
        expect(summary).toContain('next=review diff, verify changes');
        expect(summary).toContain('risks=1 worker failure');
        expect(summary).toContain('artifacts=diff, checkpoint:checkpoint-task-1');
    }

    @Test('execute code requires adapter and delegates execution')
    async executeCodeRequiresAdapterAndDelegatesExecution() {
        let adapter: Error | undefined;
        try {
            await new ExecuteCodeTool(null!).invoke({ language: 'python', code: 'print(1)' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const runtime = new LocalCodeExecutionAdapter({
            file: { rootDir: process.cwd() },
            sandbox: { blockedCommands: ['python3'] }
        });
        let blocked: Error | undefined;
        try {
            await runtime.execute({ language: 'python', code: 'print("hello")', timeoutMs: 5000 });
        } catch (err) {
            blocked = err as Error;
        }
        expect(blocked?.message).toContain('blocked by sandbox policy');

        const localRuntime = new LocalCodeExecutionAdapter({
            file: { rootDir: process.cwd() }
        });
        const tool = new ExecuteCodeTool(localRuntime);
        const result = await tool.invoke({ language: 'python', code: 'print("hello")', timeoutMs: 5000 }, createSessionContext());
        expect(result.language).toEqual('python');
        expect(result.stdout).toContain('hello');
        expect(result.exitCode).toEqual(0);

        const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'execute-code-'));
        try {
            await fs.mkdir(path.join(workspace, 'subdir'));
            const tsRuntime = new LocalCodeExecutionAdapter({
                file: { rootDir: workspace }
            });
            const tsResult = await tsRuntime.execute({
                language: 'typescript',
                code: 'const value: number = 2 + 3; console.log(value);',
                workdir: 'subdir',
                timeoutMs: 5000
            });
            expect(tsResult.stdout).toContain('5');
            expect(tsResult.exitCode).toEqual(0);
            expect(tsResult.cwd).toEqual(path.join(workspace, 'subdir'));
        } finally {
            await fs.rm(workspace, { recursive: true, force: true });
        }

        let langError: Error | undefined;
        try {
            await tool.invoke({ code: 'x' }, createSessionContext());
        } catch (err) {
            langError = err as Error;
        }
        expect(langError?.message).toContain('language');
    }

    @Test('knowledge search and store require adapter')
    async knowledgeSearchAndStoreRequireAdapter() {
        let searchError: Error | undefined;
        try {
            await new KnowledgeSearchTool(null!).invoke({ query: 'test' }, createSessionContext());
        } catch (err) {
            searchError = err as Error;
        }
        expect(searchError).toBeDefined();

        let storeError: Error | undefined;
        try {
            await new KnowledgeStoreTool(null!).invoke({ title: 't', content: 'c' }, createSessionContext());
        } catch (err) {
            storeError = err as Error;
        }
        expect(storeError).toBeDefined();

        const adapter = {
            async search(q: string, _opts?: any) {
                return { entries: [{ id: '1', title: q, content: 'result', tags: ['test'] }], total: 1 };
            },
            async store(entry: any) {
                return { ...entry, id: 'new-1', createdAt: 1000 };
            }
        };
        const searchTool = new KnowledgeSearchTool(adapter as any);
        const searchResult = await searchTool.invoke({ query: 'hello', tags: ['test'], limit: 5 }, createSessionContext());
        expect(searchResult.query).toEqual('hello');
        expect(searchResult.entries[0].title).toEqual('hello');
        expect(searchResult.total).toEqual(1);

        const storeTool = new KnowledgeStoreTool(adapter as any);
        const storeResult = await storeTool.invoke({ title: 'my title', content: 'my content', tags: ['docs'], source: 'test' }, createSessionContext());
        expect(storeResult.title).toEqual('my title');
        expect(storeResult.id).toEqual('new-1');
    }

    @Test('git operations validates repo and supports read-only actions')
    async gitOperationsValidatesRepoAndSupportsReadOnlyActions() {
        const workspace = process.cwd();
        const tool = new GitOperationsTool({ file: { rootDir: workspace } } as any);

        const status = await tool.invoke({ action: 'status' }, createSessionContext());
        expect(status.action).toEqual('status');
        expect(status.readOnly).toEqual(true);
        expect(typeof status.stdout).toEqual('string');

        const logResult = await tool.invoke({ action: 'log', maxCount: 5 }, createSessionContext());
        expect(logResult.action).toEqual('log');
        expect(typeof logResult.stdout).toEqual('string');

        let missingAction: Error | undefined;
        try {
            await tool.invoke({}, createSessionContext());
        } catch (err) {
            missingAction = err as Error;
        }
        expect(missingAction?.message).toContain('action');
    }

    @Test('git operations apply shared sandbox policy and workspace guard')
    async gitOperationsApplySharedSandboxPolicyAndWorkspaceGuard() {
        const workspace = process.cwd();
        let blocked: Error | undefined;
        try {
            await new GitOperationsTool({
                file: { rootDir: workspace },
                sandbox: { blockedCommands: ['git'] }
            } as any).invoke({ action: 'status' }, createSessionContext());
        } catch (err) {
            blocked = err as Error;
        }
        expect(blocked?.message).toContain('blocked by sandbox policy');

        let outside: Error | undefined;
        try {
            await new GitOperationsTool({
                file: { rootDir: workspace }
            } as any).invoke({ action: 'status', workdir: '../outside' }, createSessionContext());
        } catch (err) {
            outside = err as Error;
        }
        expect(outside?.message).toContain('outside');
    }

    @Test('weather tool requires adapter and returns structured data')
    async weatherToolRequiresAdapterAndReturnsStructuredData() {
        let adapter: Error | undefined;
        try {
            await new WeatherTool(null!).invoke({ location: 'Beijing' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const tool = new WeatherTool(new MockAdapter(async () => ({
            location: 'Beijing', temperature: 22, feelsLike: 20, humidity: 60,
            description: 'sunny', windSpeed: 5, units: 'metric'
        })));
        const result = await tool.invoke({ location: 'Beijing', units: 'metric' }, createSessionContext());
        expect(result.location).toEqual('Beijing');
        expect(result.temperature).toEqual(22);
        expect(result.description).toEqual('sunny');
    }

    @Test('location tool requires adapter and returns structured data')
    async locationToolRequiresAdapterAndReturnsStructuredData() {
        let adapter: Error | undefined;
        try {
            await new LocationTool(null!).invoke({}, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const tool = new LocationTool(new MockAdapter(async () => ({
            label: 'Chengdu, Sichuan, China',
            org: 'China Telecom',
            city: 'Chengdu',
            region: 'Sichuan',
            country: 'China',
            latitude: 30.67,
            longitude: 104.06
        })) as any);
        const result = await tool.invoke({}, createSessionContext());
        expect(result.label).toEqual('Chengdu, Sichuan, China');
        expect(result.city).toEqual('Chengdu');
        expect(result.country).toEqual('China');
        expect(result.org).toEqual('China Telecom');
    }

    @Test('default ip location adapter resolves current location')
    async defaultIpLocationAdapterResolvesCurrentLocation() {
        const calls: string[] = [];
        const adapter = new IpWhoIsLocationAdapter({
            fetch: async (input: any) => {
                const url = String(input);
                calls.push(url);
                return createJsonResponse({
                    ip: '1.1.1.1',
                    city: 'Chengdu',
                    region: 'Sichuan',
                    country: 'China',
                    loc: '30.67,104.06',
                    org: 'AS4134 Chinanet',
                    postal: '610000',
                    timezone: 'Asia/Shanghai'
                });
            }
        });

        const current = await adapter.getCurrentLocation();

        expect(calls).toEqual(['https://ipinfo.io/json']);
        expect(current.label).toEqual('Chengdu, Sichuan, China');
        expect(current.city).toEqual('Chengdu');
        expect(current.latitude).toEqual(30.67);
        expect(current.longitude).toEqual(104.06);
        expect(current.org).toEqual('AS4134 Chinanet');
        expect(current.timezone).toEqual('Asia/Shanghai');
    }

    @Test('default ip location adapter falls back to timezone when network lookups fail')
    async defaultIpLocationAdapterFallsBackToTimezoneWhenNetworkLookupsFail() {
        const adapter = new IpWhoIsLocationAdapter({
            fetch: async () => {
                throw new Error('network blocked');
            }
        }, {
            timezone: 'Asia/Shanghai',
            locale: 'zh-CN'
        } as any);

        const current = await adapter.getCurrentLocation();

        expect(current.label).toEqual('Shanghai, 中国');
        expect(current.city).toEqual('Shanghai');
        expect(current.countryCode).toEqual('CN');
        expect(current.timezone).toEqual('Asia/Shanghai');
    }

    @Test('weather tool falls back to current location when no location is provided')
    async weatherToolFallsBackToCurrentLocationWhenNoLocationIsProvided() {
        const weather = new MockAdapter(async (location: string) => ({
            location,
            temperature: 26,
            feelsLike: 28,
            humidity: 70,
            description: 'cloudy',
            windSpeed: 4,
            units: 'metric'
        }));
        const location = new MockAdapter(async () => ({
            label: 'Chengdu, Sichuan, China',
            city: 'Chengdu',
            region: 'Sichuan',
            country: 'China'
        }));
        const tool = new WeatherTool(weather as any, location as any);

        const result = await tool.invoke({ units: 'metric' }, createSessionContext());

        expect(result.location).toEqual('Chengdu, Sichuan, China');
        expect(result.locationSource).toEqual('current');
        expect(result.temperature).toEqual(26);
    }

    @Test('weather tool passes current coordinates directly to adapter when available')
    async weatherToolPassesCurrentCoordinatesDirectlyToAdapterWhenAvailable() {
        const calls: any[] = [];
        const weather = new MockAdapter(async (location: any) => {
            calls.push(location);
            return {
                location: location.label,
                temperature: 27,
                feelsLike: 29,
                humidity: 65,
                description: 'sunny',
                windSpeed: 3,
                units: 'metric'
            };
        });
        const location = new MockAdapter(async () => ({
            label: 'Chengdu, Sichuan, China',
            city: 'Chengdu',
            region: 'Sichuan',
            country: 'China',
            latitude: 30.67,
            longitude: 104.06
        }));
        const tool = new WeatherTool(weather as any, location as any);

        const result = await tool.invoke({ units: 'metric' }, createSessionContext());

        expect(calls).toHaveLength(1);
        expect(calls[0]).toMatchObject({
            label: 'Chengdu, Sichuan, China',
            latitude: 30.67,
            longitude: 104.06
        });
        expect(result.location).toEqual('Chengdu, Sichuan, China');
        expect(result.locationSource).toEqual('current');
        expect(result.temperature).toEqual(27);
    }

    @Test('weather tool reports resolved current location when weather lookup fails')
    async weatherToolReportsResolvedCurrentLocationWhenLookupFails() {
        const weather = new MockAdapter(async () => {
            throw new Error('fetch failed');
        });
        const location = new MockAdapter(async () => ({
            label: 'Chengdu, Sichuan, China',
            city: 'Chengdu',
            region: 'Sichuan',
            country: 'China',
            latitude: 30.67,
            longitude: 104.06
        }));
        const tool = new WeatherTool(weather as any, location as any);

        let error: Error | undefined;
        try {
            await tool.invoke({}, createSessionContext());
        } catch (err) {
            error = err as Error;
        }

        expect(error?.message).toContain(`Current location 'Chengdu, Sichuan, China' failed: fetch failed`);
    }

    @Test('shared weather adapter fails clearly without configured service')
    async sharedWeatherAdapterFailsClearlyWithoutConfiguredService() {
        const adapter = new UnavailableWeatherAdapter();
        let error: Error | undefined;
        try {
            await adapter.getCurrentWeather('Chengdu');
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('Weather service adapter is not configured');
    }

    @Test('default open-meteo weather adapter resolves current weather and forecast')
    async defaultOpenMeteoWeatherAdapterResolvesCurrentWeatherAndForecast() {
        const calls: string[] = [];
        const adapter = new OpenMeteoWeatherAdapter({
            fetch: async (input: any) => {
                const url = String(input);
                calls.push(url);
                if (url.includes('/search?')) {
                    return createJsonResponse({
                        results: [{ name: 'Chengdu', admin1: 'Sichuan', country: 'China', latitude: 30.67, longitude: 104.06 }]
                    });
                }
                if (url.includes('current=')) {
                    return createJsonResponse({
                        current: {
                            temperature_2m: 31,
                            apparent_temperature: 34,
                            relative_humidity_2m: 72,
                            pressure_msl: 1004,
                            wind_speed_10m: 8,
                            weather_code: 3
                        }
                    });
                }
                return createJsonResponse({
                    daily: {
                        time: ['2026-07-20', '2026-07-21'],
                        temperature_2m_max: [33, 32],
                        temperature_2m_min: [25, 24],
                        weather_code: [80, 61]
                    }
                });
            }
        });

        const current = await adapter.getCurrentWeather('Chengdu');
        const forecast = await adapter.getForecast('Chengdu', 2);

        expect(calls.some(url => url.includes('geocoding-api.open-meteo.com'))).toBe(true);
        expect(calls.some(url => url.includes('api.open-meteo.com'))).toBe(true);
        expect(current.location).toEqual('Chengdu, Sichuan, China');
        expect(current.description).toEqual('Overcast');
        expect(forecast.days).toHaveLength(2);
        expect(forecast.days[0].description).toEqual('Rain showers');
    }

    @Test('default open-meteo weather adapter retries geocoding with inferred language hints')
    async defaultOpenMeteoWeatherAdapterRetriesGeocodingWithLanguageHints() {
        const calls: string[] = [];
        const adapter = new OpenMeteoWeatherAdapter({
            fetch: async (input: any) => {
                const url = String(input);
                calls.push(url);
                const parsed = new URL(url);
                const pathname = parsed.pathname;
                const name = parsed.searchParams.get('name');
                const count = parsed.searchParams.get('count');
                const language = parsed.searchParams.get('language');
                if (pathname.endsWith('/search') && name === '成都' && count === '1') {
                    return createJsonResponse({ results: [] });
                }
                if (pathname.endsWith('/search') && name === '成都' && count === '10' && language === 'zh') {
                    return createJsonResponse({
                        results: [{ name: 'Chengdu', admin1: 'Sichuan', country: 'China', latitude: 30.67, longitude: 104.06 }]
                    });
                }
                if (pathname.endsWith('/search') && name === '成都' && count === '10') {
                    return createJsonResponse({ results: [] });
                }
                return createJsonResponse({
                    current: {
                        temperature_2m: 30,
                        apparent_temperature: 33,
                        relative_humidity_2m: 70,
                        pressure_msl: 1005,
                        wind_speed_10m: 7,
                        weather_code: 2
                    }
                });
            }
        });

        const current = await adapter.getCurrentWeather('成都');

        expect(calls.some(url => url.includes('language=zh'))).toBe(true);
        expect(current.location).toEqual('Chengdu, Sichuan, China');
        expect(current.temperature).toEqual(30);
    }

    @Test('default open-meteo weather adapter falls back from composite location labels to city queries')
    async defaultOpenMeteoWeatherAdapterFallsBackFromCompositeLocationLabels() {
        const calls: string[] = [];
        const adapter = new OpenMeteoWeatherAdapter({
            fetch: async (input: any) => {
                const url = String(input);
                calls.push(url);
                const parsed = new URL(url);
                const pathname = parsed.pathname;
                const name = parsed.searchParams.get('name');
                if (pathname.endsWith('/search') && name === 'Chengdu, Sichuan, China') {
                    return createJsonResponse({ results: [] });
                }
                if (pathname.endsWith('/search') && name === 'Chengdu, China') {
                    return createJsonResponse({ results: [] });
                }
                if (pathname.endsWith('/search') && name === 'Chengdu') {
                    return createJsonResponse({
                        results: [{ name: 'Chengdu', admin1: 'Sichuan', country: 'China', latitude: 30.67, longitude: 104.06 }]
                    });
                }
                return createJsonResponse({
                    current: {
                        temperature_2m: 29,
                        apparent_temperature: 31,
                        relative_humidity_2m: 68,
                        pressure_msl: 1006,
                        wind_speed_10m: 6,
                        weather_code: 1
                    }
                });
            }
        });

        const current = await adapter.getCurrentWeather('Chengdu, Sichuan, China');

        expect(calls.some(url => url.includes('name=Chengdu%2C+Sichuan%2C+China'))).toBe(true);
        expect(calls.some(url => url.includes('name=Chengdu'))).toBe(true);
        expect(current.location).toEqual('Chengdu, Sichuan, China');
        expect(current.temperature).toEqual(29);
    }

    @Test('default open-meteo weather adapter uses direct coordinates without geocoding')
    async defaultOpenMeteoWeatherAdapterUsesDirectCoordinatesWithoutGeocoding() {
        const calls: string[] = [];
        const adapter = new OpenMeteoWeatherAdapter({
            fetch: async (input: any) => {
                const url = String(input);
                calls.push(url);
                return createJsonResponse({
                    current: {
                        temperature_2m: 28,
                        apparent_temperature: 30,
                        relative_humidity_2m: 66,
                        pressure_msl: 1007,
                        wind_speed_10m: 5,
                        weather_code: 1
                    }
                });
            }
        });

        const current = await adapter.getCurrentWeather({
            label: 'Chengdu, Sichuan, China',
            city: 'Chengdu',
            region: 'Sichuan',
            country: 'China',
            latitude: 30.67,
            longitude: 104.06
        });

        expect(calls).toHaveLength(1);
        expect(calls[0]).toContain('latitude=30.67');
        expect(calls[0]).toContain('longitude=104.06');
        expect(calls[0].includes('/search?')).toEqual(false);
        expect(current.location).toEqual('Chengdu, Sichuan, China');
        expect(current.temperature).toEqual(28);
    }

    @Test('provideTools wires default weather adapter from shared options')
    async provideToolsWiresDefaultWeatherAdapterFromSharedOptions() {
        const fetch = async (input: any) => {
            const url = String(input);
            if (url.includes('/search?')) {
                return createJsonResponse({
                    results: [{ name: 'Chengdu', admin1: 'Sichuan', country: 'China', latitude: 30.67, longitude: 104.06 }]
                });
            }
            return createJsonResponse({
                current: {
                    temperature_2m: 30,
                    apparent_temperature: 33,
                    relative_humidity_2m: 70,
                    pressure_msl: 1005,
                    wind_speed_10m: 7,
                    weather_code: 2
                }
            });
        };
        const app = await Application.run(AgentModule, {
            deps: [AgentToolsModule],
            providers: [...provideTools({
                weather: {
                    fetch
                }
            }), ...withToolTestAdapters(), {
                provide: WeatherAdapter,
                useValue: new OpenMeteoWeatherAdapter({ fetch })
            }]
        });
        try {
            const tool = app.get(WeatherTool);
            const result = await tool.invoke({ location: 'Chengdu' }, createSessionContext());
            expect(result.location).toEqual('Chengdu, Sichuan, China');
            expect(result.description).toEqual('Partly cloudy');
            expect(result.temperature).toEqual(30);
        } finally {
            await app.close();
        }
    }

    @Test('provideTools wires default location adapter from shared options')
    async provideToolsWiresDefaultLocationAdapterFromSharedOptions() {
        const fetch = async () => createJsonResponse({
            ip: '1.1.1.1',
            city: 'Chengdu',
            region: 'Sichuan',
            country: 'China',
            loc: '30.67,104.06',
            org: 'AS4134 Chinanet',
            timezone: 'Asia/Shanghai'
        });
        const app = await Application.run(AgentModule, {
            deps: [AgentToolsModule],
            providers: [...provideTools({
                location: {
                    fetch
                }
            }), ...withToolTestAdapters(), {
                provide: LocationAdapter,
                useValue: new IpWhoIsLocationAdapter({ fetch })
            }]
        });
        try {
            const tool = app.get(LocationTool);
            const result = await tool.invoke({}, createSessionContext());
            expect(result.label).toEqual('Chengdu, Sichuan, China');
            expect(result.timezone).toEqual('Asia/Shanghai');
            expect(result.org).toEqual('AS4134 Chinanet');
        } finally {
            await app.close();
        }
    }

    @Test('session search searches session store messages')
    async sessionSearchSearchesSessionStoreMessages() {
        const store = new InMemorySessionStore();
        await store.append('s1', { id: 'm1', role: 'user', content: 'hello world', createdAt: 1 });
        await store.append('s1', { id: 'm2', role: 'assistant', content: 'router cache', createdAt: 2 });
        await store.append('s2', { id: 'm3', role: 'user', content: 'test router', createdAt: 3 });
        const tool = new SessionSearchTool(store);

        const result = await tool.invoke({ query: 'router' }, createSessionContext({ sessionId: 's1' }));
        expect(result.query).toEqual('router');
        expect(result.total).toBeGreaterThanOrEqual(1);
        expect(result.results.some((r: any) => r.role === 'assistant')).toEqual(true);

        const filtered = await tool.invoke({ query: 'router', sessionId: 's2' }, createSessionContext({ sessionId: 's1' }));
        expect(filtered.total).toEqual(1);
        expect(filtered.results[0].sessionId).toEqual('s2');
    }

    @Test('vision analyze and image generate require adapter')
    async visionAnalyzeAndImageGenerateRequireAdapter() {
        let visionError: Error | undefined;
        try {
            await new VisionAnalyzeTool(null!).invoke({ image_url: 'https://example.com/img.png' }, createSessionContext());
        } catch (err) {
            visionError = err as Error;
        }
        expect(visionError).toBeDefined();

        let genError: Error | undefined;
        try {
            await new ImageGenerateTool(null!).invoke({ prompt: 'cat' }, createSessionContext());
        } catch (err) {
            genError = err as Error;
        }
        expect(genError).toBeDefined();

        const visionTool = new VisionAnalyzeTool(new MockAdapter(async () => ({
            description: 'A cat sitting on a mat.', labels: ['cat', 'mat'], objects: [{ name: 'cat', confidence: 0.95 }]
        })));
        const visionResult = await visionTool.invoke({ image_url: 'https://example.com/cat.png', question: 'what is this?' }, createSessionContext());
        expect(visionResult.description).toContain('cat');
        expect(visionResult.labels).toContain('cat');
        expect(visionResult.objects[0].name).toEqual('cat');

        const genTool = new ImageGenerateTool(new MockAdapter(async () => ({
            url: 'https://example.com/gen.png', revisedPrompt: 'a cute cat'
        })));
        const genResult = await genTool.invoke({ prompt: 'cat', aspect_ratio: '16:9', style: 'anime' }, createSessionContext());
        expect(genResult.url).toContain('gen.png');
        expect(genResult.revisedPrompt).toEqual('a cute cat');
    }

    @Test('send message requires adapter and validates channel')
    async sendMessageRequiresAdapterAndValidatesChannel() {
        let adapter: Error | undefined;
        try {
            await new SendMessageTool(null!).invoke({ channel: { type: 'telegram', recipient: '123' }, content: 'hello' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const tool = new SendMessageTool(new MockAdapter(async () => ({ success: true, messageId: 'msg-1', channel: 'telegram' })));
        const result = await tool.invoke({ channel: { type: 'email', recipient: 'a@b.com' }, subject: 'hi', content: 'body', priority: 'high' }, createSessionContext());
        expect(result.success).toEqual(true);
        expect(result.messageId).toEqual('msg-1');

        let channelError: Error | undefined;
        try {
            await tool.invoke({ content: 'x' }, createSessionContext());
        } catch (err) {
            channelError = err as Error;
        }
        expect(channelError?.message).toContain('channel');
    }

    @Test('audio transcribe and TTS require adapter')
    async audioTranscribeAndTTSRequireAdapter() {
        let transcribeError: Error | undefined;
        try {
            await new AudioTranscribeTool(null!).invoke({ audio_url: 'https://example.com/a.mp3' }, createSessionContext());
        } catch (err) {
            transcribeError = err as Error;
        }
        expect(transcribeError).toBeDefined();

        let ttsError: Error | undefined;
        try {
            await new TextToSpeechTool(null!).invoke({ text: 'hello' }, createSessionContext());
        } catch (err) {
            ttsError = err as Error;
        }
        expect(ttsError).toBeDefined();

        const transcribe = new AudioTranscribeTool(new MockAdapter(async () => ({ text: 'hello world', language: 'en', duration: 3.2 })));
        const trResult = await transcribe.invoke({ audio_url: 'https://example.com/a.mp3', language: 'en', segments: true }, createSessionContext());
        expect(trResult.text).toEqual('hello world');
        expect(trResult.language).toEqual('en');
        expect(trResult.duration).toEqual(3.2);

        const tts = new TextToSpeechTool(new MockAdapter(async () => ({ audioUrl: 'https://example.com/out.mp3', format: 'mp3', duration: 2.5 })));
        const ttsResult = await tts.invoke({ text: 'hello', voice: 'alloy', speed: 1.2, format: 'mp3' }, createSessionContext());
        expect(ttsResult.audioUrl).toContain('out.mp3');
        expect(ttsResult.format).toEqual('mp3');
        expect(ttsResult.duration).toEqual(2.5);
    }

    @Test('verifiable intent and security scan provide fallback behavior')
    async verifiableIntentAndSecurityScanProvideFallbackBehavior() {
        const intent = new VerifiableIntentTool({
            async verify(action: string, _context: string) {
                return { approved: true, verifiedAction: action, reasoning: 'mock' };
            }
        } as any);
        const result = await intent.invoke({ action: 'delete file', target: '/tmp/x', reason: 'cleanup' }, createSessionContext());
        expect(result.approved).toEqual(true);
        expect(result.action).toEqual('delete file');
        expect(result.target).toEqual('/tmp/x');

        const workspace = await this.createWorkspace();
        const scan = new SecurityScanTool({ file: { rootDir: workspace } } as any);
        const scanResult = await scan.invoke({ path: 'src/alpha.txt' }, createSessionContext());
        expect(scanResult.path).toEqual('src/alpha.txt');
        expect(scanResult.summary.total).toEqual(0);

        const missing = await scan.invoke({ path: 'src/beta.ts' } as any, createSessionContext());
        expect(missing.vulnerabilities).toBeDefined();

        let actionError: Error | undefined;
        try {
            await intent.invoke({ target: '/tmp/x', reason: 'cleanup' } as any, createSessionContext());
        } catch (err) {
            actionError = err as Error;
        }
        expect(actionError?.message).toContain('action');
    }

    @Test('cron manage requires and uses agent scheduler')
    async cronManageRequiresAndUsesAgentScheduler() {
        const tool = new CronManageTool({ get: () => undefined } as any);
        let schedulerError: Error | undefined;
        try {
            await tool.invoke({ action: 'list' }, createSessionContext());
        } catch (err) {
            schedulerError = err as Error;
        }
        expect(schedulerError?.message).toContain('scheduler');

        const scheduler = new FakeScheduler();
        const cronTool = new CronManageTool({ get: () => scheduler } as any);

        const listed = await cronTool.invoke({ action: 'list' }, createSessionContext({ sessionId: 'cron-1' }));
        expect(listed.jobs).toEqual([]);
        expect(listed.total).toEqual(0);

        const created = await cronTool.invoke({
            action: 'create',
            prompt: 'daily job',
            cron_expr: '0 0 9 * * *'
        }, createSessionContext({ sessionId: 'cron-1' }));
        expect(created.created).toEqual(true);
        expect(created.job.cronExpr).toEqual('0 0 9 * * *');

        const listed2 = await cronTool.invoke({ action: 'list' }, createSessionContext({ sessionId: 'cron-1' }));
        expect(listed2.total).toEqual(1);
        expect(listed2.jobs[0].cronExpr).toEqual('0 0 9 * * *');

        const got = await cronTool.invoke({ action: 'get', id: created.job.id }, createSessionContext({ sessionId: 'cron-1' }));
        expect(got.job.id).toEqual(created.job.id);

        const paused = await cronTool.invoke({ action: 'pause', id: created.job.id }, createSessionContext({ sessionId: 'cron-1' }));
        expect(paused.pause).toEqual(true);

        const removed = await cronTool.invoke({ action: 'remove', id: created.job.id }, createSessionContext({ sessionId: 'cron-1' }));
        expect(removed.removed).toEqual(true);

        let actionError: Error | undefined;
        try {
            await cronTool.invoke({ action: 'invalid' }, createSessionContext());
        } catch (err) {
            actionError = err as Error;
        }
        expect(actionError?.message).toContain('Invalid action');
    }

    @Test('data manage exports and imports memory records')
    async dataManageExportsAndImportsMemoryRecords() {
        const store = new InMemoryMemoryStore();
        const tool = new DataManageTool({
            async exportData(request: any) {
                const records = await store.getAll(request.sessionId || 's1');
                return { data: JSON.stringify(records), format: request.format || 'json', entryCount: records.length };
            },
            async importData(request: any) {
                const records = JSON.parse(request.data);
                for (const r of records) {
                    await store.put({ ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, sessionId: request.sessionId || 's1', createdAt: Date.now() });
                }
                return { imported: records.length, errors: [] };
            }
        } as any, store);

        const exported = await tool.invoke({ action: 'export', scope: 'memory', format: 'json' }, createSessionContext({ sessionId: 's1' }));
        expect(exported.format).toEqual('json');
        expect(typeof exported.data).toEqual('string');

        await store.put({ id: 'rec-1', sessionId: 's1', key: 'mykey', value: 'myval', scope: 'session', createdAt: 1 });
        const exported2 = await tool.invoke({ action: 'export', scope: 'memory' }, createSessionContext({ sessionId: 's1' }));
        expect(exported2.entryCount).toEqual(1);
        expect(exported2.data).toContain('mykey');

        const imported = await tool.invoke({
            action: 'import',
            format: 'json',
            scope: 'memory',
            data: JSON.stringify([{ key: 'k1', value: 'v1' }])
        }, createSessionContext({ sessionId: 's1' }));
        expect(imported.imported).toEqual(1);
        expect(imported.errors).toBeUndefined();

        let actionError: Error | undefined;
        try {
            await tool.invoke({ action: 'bad' }, createSessionContext());
        } catch (err) {
            actionError = err as Error;
        }
        expect(actionError?.message).toContain('Invalid action');
    }

    @Test('group tool registration includes new groups')
    groupedToolRegistrationIncludesNewGroups() {
        expect(AGENT_TOOL_GROUPS.agent).toEqual(['spawn_agent', 'parallel_spawn', 'orchestrate']);
        expect(AGENT_TOOL_GROUPS.code_execution).toEqual(['execute_code']);
        expect(AGENT_TOOL_GROUPS.knowledge).toEqual(['knowledge_search', 'knowledge_store']);
        expect(AGENT_TOOL_GROUPS.git).toEqual(['git_operations']);
        expect(AGENT_TOOL_GROUPS.communication).toEqual(['send_message']);
        expect(AGENT_TOOL_GROUPS.audio).toEqual(['audio_transcribe', 'text_to_speech']);
        expect(AGENT_TOOL_GROUPS.security).toEqual(['verifiable_intent', 'security_scan']);
        expect(AGENT_TOOL_GROUPS.cron).toEqual(['cron_manage']);
        expect(AGENT_TOOL_GROUPS.data).toEqual(['data_manage']);
    }

    @Test('default tool registration includes new groups')
    defaultToolRegistrationIncludesNewGroups() {
        const names = resolveAgentToolNames();
        expect(names).toContain('spawn_agent');
        expect(names).toContain('parallel_spawn');
        expect(names).toContain('knowledge_search');
        expect(names).toContain('knowledge_store');
        expect(names).toContain('git_operations');
        expect(names).toContain('location');
        expect(names).toContain('weather');
        expect(names).not.toContain('session_search');
        expect(names).toContain('cron_manage');
        expect(names).not.toContain('execute_code');
        expect(names).not.toContain('send_message');
        expect(names).not.toContain('audio_transcribe');
        expect(names).not.toContain('text_to_speech');
        expect(names).not.toContain('verifiable_intent');
        expect(names).not.toContain('security_scan');
        expect(names).not.toContain('data_manage');
    }

    @Test('llm task requires adapter and returns inference result')
    async llmTaskRequiresAdapterAndReturnsInferenceResult() {
        let adapter: Error | undefined;
        try {
            await new LlmTaskTool(null!).invoke({ prompt: 'hello' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const tool = new LlmTaskTool(new MockAdapter(async () => ({ content: 'Hello world', model: 'gpt-4', usage: { totalTokens: 10 } })));
        const result = await tool.invoke({ prompt: 'hello', system: 'be concise', model: 'gpt-4', temperature: 0.5, maxTokens: 100 }, createSessionContext());
        expect(result.content).toEqual('Hello world');
        expect(result.model).toEqual('gpt-4');
        expect(result.usage.totalTokens).toEqual(10);
    }

    @Test('shared llm task adapter delegates through nested agent runner')
    async sharedLlmTaskAdapterDelegatesThroughNestedAgentRunner() {
        const adapter = new DelegatingLlmTaskAdapter({
            run: async (request: NestedAgentRunRequest) => ({
                content: request.prompt,
                turnCount: 1,
                toolCalls: 0,
                model: request.model || 'mock-model',
                finishReason: 'end',
                usage: { totalTokens: 12 }
            })
        } as unknown as NestedAgentRunner);

        const result = await adapter.execute({
            prompt: 'summarize findings',
            system: 'be direct',
            model: 'analysis-model',
            temperature: 0.1,
            maxTokens: 64
        });

        expect(result.content).toContain('summarize findings');
        expect(result.model).toEqual('analysis-model');
        expect(result.finishReason).toEqual('end');
        expect(result.usage?.totalTokens).toEqual(12);
    }

    @Test('screenshot requires adapter')
    async screenshotRequiresAdapter() {
        let adapter: Error | undefined;
        try {
            await new ScreenshotTool(null!).invoke({ url: 'https://example.com' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const tool = new ScreenshotTool(new MockAdapter(async () => ({ imageUrl: 'https://example.com/shot.png', format: 'png', width: 1920, height: 1080 })));
        const result = await tool.invoke({ url: 'https://example.com', fullPage: true, format: 'jpeg', quality: 80 }, createSessionContext());
        expect(result.imageUrl).toContain('shot.png');
        expect(result.format).toEqual('png');
        expect(result.width).toEqual(1920);
    }

    @Test('gui control requires adapter and validates actions')
    async guiControlRequiresAdapterAndValidatesActions() {
        let adapter: Error | undefined;
        try {
            await new GuiControlTool(null!).invoke({ action: 'click', x: 10, y: 20 }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const tool = new GuiControlTool(new MockAdapter(async (request: any) => ({
            ok: true,
            action: request.action,
            timestamp: 123,
            details: request
        })));
        const result = await tool.invoke({ action: 'keypress', keys: ['Meta', 'K'] }, createSessionContext());
        expect(result.ok).toEqual(true);
        expect(result.action).toEqual('keypress');
        expect(result.details.keys).toEqual(['Meta', 'K']);

        let validationError: Error | undefined;
        try {
            await tool.invoke({ action: 'scroll' }, createSessionContext());
        } catch (err) {
            validationError = err as Error;
        }
        expect(validationError?.message).toContain('scroll requires dx or dy');
    }

    @Test('canvas requires adapter and supports CRUD')
    async canvasRequiresAdapterAndSupportsCRUD() {
        let adapter: Error | undefined;
        try {
            await new CanvasTool(null!).invoke({ action: 'list' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const mockData = { id: 'c1', title: 'Design', entries: [], createdAt: 1, updatedAt: 1 };
        const tool = new CanvasTool({
            async create(c: any) { return { ...mockData, title: c.title }; },
            async get(id: string) { return id === 'c1' ? mockData : null; },
            async update(_id: string, u: any) { return { ...mockData, ...u }; },
            async delete(id: string) { return id === 'c1'; },
            async list() { return [{ id: 'c1', title: 'Design', entryCount: 0, updatedAt: 1 }]; }
        } as any);

        const listResult = await tool.invoke({ action: 'list' }, createSessionContext());
        expect(listResult.total).toEqual(1);

        const createResult = await tool.invoke({ action: 'create', title: 'New Canvas', entries: [{ type: 'text', title: 'Note', content: 'hello' }] }, createSessionContext());
        expect(createResult.created).toEqual(true);

        const getResult = await tool.invoke({ action: 'get', id: 'c1' }, createSessionContext());
        expect(getResult.canvas.id).toEqual('c1');

        const deleteResult = await tool.invoke({ action: 'delete', id: 'c1' }, createSessionContext());
        expect(deleteResult.deleted).toEqual(true);

        let actionError: Error | undefined;
        try {
            await tool.invoke({ action: 'bad' }, createSessionContext());
        } catch (err) {
            actionError = err as Error;
        }
        expect(actionError?.message).toContain('Invalid action');
    }

    @Test('approval requires adapter and manages request lifecycle')
    async approvalRequiresAdapterAndManagesRequestLifecycle() {
        let adapter: Error | undefined;
        try {
            await new ApprovalTool(null!).invoke({ action: 'pending' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const requests: any[] = [];
        const tool = new ApprovalTool({
            requestApproval(r: any) { requests.push(r); return { approved: true }; },
            pendingRequests() { return requests; },
            cancelRequest(t: string) { return requests.some((r: any) => r.toolName === t); }
        } as any);

        const reqResult = await tool.invoke({ action: 'request', tool: 'delete_file', input: { path: '/tmp/x' }, reason: 'cleanup' }, createSessionContext());
        expect(reqResult.approved).toEqual(true);

        const pending = await tool.invoke({ action: 'pending' }, createSessionContext());
        expect(pending.total).toEqual(1);

        const cancelResult = await tool.invoke({ action: 'cancel', tool: 'delete_file' }, createSessionContext());
        expect(cancelResult.cancelled).toEqual(true);
    }

    @Test('default approval adapter scopes requests by session')
    async defaultApprovalAdapterScopesRequestsBySession() {
        const adapter = new DefaultApprovalAdapter();
        await adapter.requestApproval({
            toolName: 'delete_file',
            input: { path: '/tmp/a' },
            reason: 'cleanup',
            requestedAt: 1,
            sessionId: 's1'
        });
        await adapter.requestApproval({
            toolName: 'delete_file',
            input: { path: '/tmp/b' },
            reason: 'cleanup',
            requestedAt: 2,
            sessionId: 's2'
        });

        expect(adapter.pendingRequests('s1').map(item => item.input.path)).toEqual(['/tmp/a']);
        expect(adapter.cancelRequest('delete_file', 's1')).toEqual(true);
        expect(adapter.pendingRequests('s1')).toEqual([]);
        expect(adapter.pendingRequests('s2').map(item => item.input.path)).toEqual(['/tmp/b']);
    }

    @Test('checkpoint saves and lists with memory store fallback')
    async checkpointSavesAndListsWithMemoryStoreFallback() {
        const store = new InMemoryMemoryStore();
        const sessions = new InMemorySessionStore();
        await sessions.append('s1', { id: 'm1', role: 'user', content: 'hello', createdAt: 1 });
        const tool = new CheckpointTool(sessions, store);

        const saved = await tool.invoke({ action: 'save', label: 'before-refactor' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(saved.saved).toEqual(true);
        expect(saved.checkpoint.label).toEqual('before-refactor');

        const listed = await tool.invoke({ action: 'list' }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(listed.total).toEqual(1);
        expect(listed.checkpoints[0].label).toEqual('before-refactor');

        const restored = await tool.invoke({ action: 'restore', id: saved.checkpoint.id }, createSessionContext({ sessionId: 's1', memory: store }));
        expect(restored.restored).toEqual(true);

        let actionError: Error | undefined;
        try {
            await tool.invoke({ action: 'bad' }, createSessionContext());
        } catch (err) {
            actionError = err as Error;
        }
        expect(actionError?.message).toContain('Invalid action');
    }

    @Test('pipeline requires adapter and validates step definitions')
    async pipelineRequiresAdapterAndValidatesStepDefinitions() {
        let adapter: Error | undefined;
        try {
            await new PipelineTool(null!).invoke({ action: 'list' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const tool = new PipelineTool({
            async list() { return [{ id: 'p1', name: 'Deploy', stepCount: 2 }]; },
            async define(p: any) { return { ...p, id: 'p1' }; },
            async execute(id: string) { return { pipelineId: id, status: 'completed', stepResults: [], startedAt: 1, completedAt: 2 }; },
            async get(id: string) { return id === 'p1' ? { id: 'p1', name: 'Deploy', steps: [] } : null; },
            async delete(id: string) { return id === 'p1'; }
        } as any);

        const listResult = await tool.invoke({ action: 'list' }, createSessionContext());
        expect(listResult.total).toEqual(1);

        const defined = await tool.invoke({
            action: 'define', name: 'Deploy',
            steps: [{ name: 'build', tool: 'shell', input: { command: 'make' } }]
        }, createSessionContext());
        expect(defined.defined).toEqual(true);
        expect(defined.pipeline.name).toEqual('Deploy');

        const execResult = await tool.invoke({ action: 'execute', pipeline_id: 'p1' }, createSessionContext());
        expect(execResult.status).toEqual('completed');

        let invalidActionError: Error | undefined;
        try {
            await tool.invoke({ action: 'bad' }, createSessionContext());
        } catch (err) {
            invalidActionError = err as Error;
        }
        expect(invalidActionError?.message).toContain('Invalid action');
    }

    @Test('group tool registration includes all new phase-3 groups')
    groupToolRegistrationIncludesAllNewPhase3Groups() {
        expect(AGENT_TOOL_GROUPS.llm).toEqual(['llm_task']);
        expect(AGENT_TOOL_GROUPS.capture).toEqual(['screenshot', 'gui_control']);
        expect(AGENT_TOOL_GROUPS.canvas).toEqual(['canvas']);
        expect(AGENT_TOOL_GROUPS.approval).toEqual(['approval', 'checkpoint']);
        expect(AGENT_TOOL_GROUPS.pipeline).toEqual(['pipeline']);
    }

    @Test('kanban requires adapter and operates board lifecycle')
    async kanbanRequiresAdapterAndOperatesBoardLifecycle() {
        let adapter: Error | undefined;
        try {
            await new KanbanTool(null!).invoke({ action: 'list' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const mockBoard = { id: 'b1', name: 'Sprint', columns: ['todo', 'done'], cards: [] };
        const mockCard = { id: 'c1', title: 'Task', status: 'todo', createdAt: 1, updatedAt: 1 };
        const tool = new KanbanTool({
            listBoards() { return [{ id: 'b1', name: 'Sprint', cardCount: 0 }]; },
            getBoard(id: string) { return id === 'b1' ? { ...mockBoard, cards: [mockCard] } : null; },
            createCard(_bid: string, c: any) { return { ...mockCard, ...c, id: 'c-new', createdAt: 1, updatedAt: 1 }; },
            updateCard(_bid: string, _cid: string, u: any) { return { ...mockCard, ...u, updatedAt: 2 }; },
            addComment(_bid: string, _cid: string, text: string) { return { ...mockCard, comments: [{ id: 'cm1', text, createdAt: 1 }] }; },
            linkCards() { return; }
        } as any);

        const listResult = await tool.invoke({ action: 'list' }, createSessionContext());
        expect(listResult.total).toEqual(1);

        const showResult = await tool.invoke({ action: 'show', board_id: 'b1' }, createSessionContext());
        expect(showResult.board.name).toEqual('Sprint');

        const createResult = await tool.invoke({ action: 'create', board_id: 'b1', title: 'New Task', status: 'in_progress', priority: 'high', tags: ['urgent'] }, createSessionContext());
        expect(createResult.created).toEqual(true);
        expect(createResult.card.priority).toEqual('high');

        const blockResult = await tool.invoke({ action: 'block', board_id: 'b1', card_id: 'c1', blocked_reason: 'waiting' }, createSessionContext());
        expect(blockResult.blocked).toEqual(true);
        expect(blockResult.card.status).toEqual('blocked');

        const unblockResult = await tool.invoke({ action: 'unblock', board_id: 'b1', card_id: 'c1' }, createSessionContext());
        expect(unblockResult.unblocked).toEqual(true);

        const commentResult = await tool.invoke({ action: 'comment', board_id: 'b1', card_id: 'c1', text: 'looks good' }, createSessionContext());
        expect(commentResult.commented).toEqual(true);

        const linkResult = await tool.invoke({ action: 'link', board_id: 'b1', card_id: 'c1', target_card_id: 'c2' }, createSessionContext());
        expect(linkResult.linked).toEqual(true);
    }

    @Test('backup requires adapter and manages backup lifecycle')
    async backupRequiresAdapterAndManagesBackupLifecycle() {
        let adapter: Error | undefined;
        try {
            await new BackupTool(null!).invoke({ action: 'list' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const tool = new BackupTool({
            listBackups() { return [{ id: 'b1', label: 'pre-refactor', createdAt: 1, size: 100, entryCount: 3 }]; },
            createBackup(label: string) { return { id: 'b-new', label, entries: [], createdAt: 1, size: 0 }; },
            getBackup(id: string) { return id === 'b1' ? { id: 'b1', label: 'pre-refactor', entries: [{ type: 'memory' }], createdAt: 1, size: 100 } : null; },
            deleteBackup(id: string) { return id === 'b1'; },
            restoreBackup(_id: string, _types?: string[]) { return { restored: 3, errors: [] }; }
        } as any);

        const listResult = await tool.invoke({ action: 'list' }, createSessionContext());
        expect(listResult.total).toEqual(1);

        const createResult = await tool.invoke({ action: 'create', label: 'pre-refactor' }, createSessionContext());
        expect(createResult.created).toEqual(true);

        const getResult = await tool.invoke({ action: 'get', id: 'b1' }, createSessionContext());
        expect(getResult.backup.label).toEqual('pre-refactor');

        const restoreResult = await tool.invoke({ action: 'restore', id: 'b1' }, createSessionContext());
        expect(restoreResult.restored).toEqual(3);

        const deleteResult = await tool.invoke({ action: 'delete', id: 'b1' }, createSessionContext());
        expect(deleteResult.deleted).toEqual(true);
    }

    @Test('model routing requires adapter and manages routes')
    async modelRoutingRequiresAdapterAndManagesRoutes() {
        let adapter: Error | undefined;
        try {
            await new ModelRoutingTool(null!).invoke({ action: 'list' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const tool = new ModelRoutingTool({
            listRoutes() { return [{ id: 'r1', name: 'code review', matcher: [{ field: 'type', pattern: 'review' }], model: 'gpt-4' }]; },
            getRoute(id: string) { return id === 'r1' ? { id: 'r1', name: 'code review', matcher: [{ field: 'type', pattern: 'review' }], model: 'gpt-4' } : null; },
            setRoute(r: any) { return { ...r, id: 'r-new' }; },
            deleteRoute(id: string) { return id === 'r1'; },
            resolve(_input: string) { return { model: 'gpt-4', route: { id: 'r1', name: 'default', matcher: [], model: 'gpt-4' } }; }
        } as any);

        const listResult = await tool.invoke({ action: 'list' }, createSessionContext());
        expect(listResult.total).toEqual(1);

        const setResult = await tool.invoke({ action: 'set', name: 'code', matchers: [{ field: 'type', pattern: 'code' }], model: 'claude-3', provider: 'anthropic' }, createSessionContext());
        expect(setResult.set).toEqual(true);

        const resolveResult = await tool.invoke({ action: 'resolve', input: 'review this code' }, createSessionContext());
        expect(resolveResult.model).toEqual('gpt-4');

        const deleteResult = await tool.invoke({ action: 'delete', id: 'r1' }, createSessionContext());
        expect(deleteResult.deleted).toEqual(true);
    }

    @Test('poll requires adapter and manages poll lifecycle')
    async pollRequiresAdapterAndManagesPollLifecycle() {
        let adapter: Error | undefined;
        try {
            await new PollTool(null!).invoke({ action: 'list' }, createSessionContext());
        } catch (err) {
            adapter = err as Error;
        }
        expect(adapter).toBeDefined();

        const mockPoll = { id: 'p1', question: 'Best framework?', options: [{ label: 'React', count: 5 }, { label: 'Vue', count: 3 }], totalVotes: 8, createdAt: 1 };
        const tool = new PollTool({
            listPolls() { return [{ id: 'p1', question: 'Best framework?', totalVotes: 8, closed: false }]; },
            createPoll(q: string, opts: string[]) { return { id: 'p-new', question: q, options: opts.map(o => ({ label: o, count: 0 })), totalVotes: 0, createdAt: 1 }; },
            vote(_pid: string, option: string) { return { ...mockPoll, options: mockPoll.options.map(o => o.label === option ? { ...o, count: o.count + 1 } : o), totalVotes: mockPoll.totalVotes + 1 }; },
            closePoll(_pid: string) { return { ...mockPoll, closedAt: Date.now() }; },
            getPoll(id: string) { return id === 'p1' ? mockPoll : null; }
        } as any);

        const listResult = await tool.invoke({ action: 'list' }, createSessionContext());
        expect(listResult.total).toEqual(1);

        const createResult = await tool.invoke({ action: 'create', question: 'Best framework?', options: ['React', 'Vue'] }, createSessionContext());
        expect(createResult.created).toEqual(true);

        const voteResult = await tool.invoke({ action: 'vote', poll_id: 'p1', option: 'React' }, createSessionContext());
        expect(voteResult.voted).toEqual(true);

        const closeResult = await tool.invoke({ action: 'close', poll_id: 'p1' }, createSessionContext());
        expect(closeResult.closed).toEqual(true);

        const getResult = await tool.invoke({ action: 'get', poll_id: 'p1' }, createSessionContext());
        expect(getResult.poll.question).toContain('framework');
    }

    @Test('group tool registration includes all new phase-4 groups')
    groupToolRegistrationIncludesAllNewPhase4Groups() {
        expect(AGENT_TOOL_GROUPS.kanban).toEqual(['kanban']);
        expect(AGENT_TOOL_GROUPS.backup).toEqual(['backup']);
        expect(AGENT_TOOL_GROUPS.model_routing).toEqual(['model_routing']);
        expect(AGENT_TOOL_GROUPS.poll).toEqual(['poll']);
    }

    @Test('ai cli validates cli name and delegates to adapter')
    async aiCliValidatesCliNameAndDelegatesToAdapter() {
        const workspace = await this.createWorkspace();
        let cliError: Error | undefined;
        try {
            await new AiCliTool().invoke({ prompt: 'hello', cli: 'invalid' }, createSessionContext());
        } catch (err) {
            cliError = err as Error;
        }
        expect(cliError?.message).toContain('claude_code, opencode, gemini_cli, codex_cli');

        const tool = new AiCliTool({
            async execute(_req: any) {
                return { stdout: 'refactored code', stderr: '', exitCode: 0, sessionId: 'sess-1' };
            }
        } as any, {
            file: { rootDir: workspace }
        } as any);
        const result = await tool.invoke({ prompt: 'refactor this', cli: 'claude_code', working_directory: 'src', timeout_ms: 60000, system_prompt: 'be concise', resume_session_id: 'sess-0' }, createSessionContext());
        expect(result.stdout).toEqual('refactored code');
        expect(result.exitCode).toEqual(0);
        expect(result.sessionId).toEqual('sess-1');
        expect(result.cli).toContain('sess-1');

        const failTool = new AiCliTool({
            async execute(_request: any) {
                return { stdout: '', stderr: 'CLI not found', exitCode: 1 };
            }
        } as any);
        const failResult = await failTool.invoke({ prompt: 'test', cli: 'opencode' }, createSessionContext());
        expect(failResult.exitCode).toEqual(1);
        expect(failResult.stderr).toContain('CLI not found');
    }

    @Test('ai cli resolves working directory through shared workspace policy and blocks forbidden commands')
    async aiCliResolvesWorkingDirectoryThroughSharedWorkspacePolicyAndBlocksForbiddenCommands() {
        const workspace = await this.createWorkspace();
        let receivedWorkingDirectory = '';
        const tool = new AiCliTool({
            async execute(request: any) {
                receivedWorkingDirectory = request.workingDirectory;
                return { stdout: 'ok', stderr: '', exitCode: 0 };
            }
        } as any, {
            file: { rootDir: workspace }
        } as any);

        await tool.invoke({ prompt: 'refactor', cli: 'claude_code', working_directory: 'src' }, createSessionContext());
        expect(receivedWorkingDirectory).toEqual(path.join(workspace, 'src'));

        let blocked: Error | undefined;
        try {
            await new AiCliTool(null as any, {
                file: { rootDir: workspace },
                sandbox: { blockedCommands: ['claude'] }
            } as any).invoke({ prompt: 'refactor', cli: 'claude_code' }, createSessionContext());
        } catch (err) {
            blocked = err as Error;
        }
        expect(blocked?.message).toContain('blocked by sandbox policy');
    }

    @Test('group tool registration includes ai_cli group')
    groupToolRegistrationIncludesAiCliGroup() {
        expect(AGENT_TOOL_GROUPS.ai_cli).toEqual(['ai_cli']);
    }

    @Test('git operations validates worktree action inputs')
    async gitOperationsValidatesWorktreeActionInputs() {
        const workspace = process.cwd();
        const tool = new GitOperationsTool({ file: { rootDir: workspace } } as any);

        let noPath: Error | undefined;
        try {
            await tool.invoke({ action: 'worktree_create' }, createSessionContext());
        } catch (err) {
            noPath = err as Error;
        }
        expect(noPath?.message).toContain('path');

        let noMergePath: Error | undefined;
        try {
            await tool.invoke({ action: 'worktree_merge' }, createSessionContext());
        } catch (err) {
            noMergePath = err as Error;
        }
        expect(noMergePath?.message).toContain('path');

        let noCleanupPath: Error | undefined;
        try {
            await tool.invoke({ action: 'worktree_cleanup' }, createSessionContext());
        } catch (err) {
            noCleanupPath = err as Error;
        }
        expect(noCleanupPath?.message).toContain('path');
    }

    @Test('coding task worktree mode sets up worktree and maps paths')
    async codingTaskWorktreeModeSetsUpWorktreeAndMapsPaths() {
        let callIndex = 0;
        const calls: Array<{ tool: string; input: any }> = [];
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => {
                calls.push({ tool: action.tool, input: action.input });
                callIndex++;
                if (action.tool === 'edit_file') {
                    return { tool: 'edit_file', output: { ok: true }, summary: 'ok' };
                }
                return { tool: 'git_operations', output: { stdout: 'ok' }, summary: 'ok' };
            }
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(
            new CodingTaskStore(),
            runner,
            null as any,
            { codingTask: { parallelWorkerRetries: 0, parallelWorkerTimeoutMs: 1000 } } as any
        );
        const result = await tool.invoke({
            action: 'run',
            goal: 'Patch error handling',
            useWorktree: true,
            actions: [
                { id: 'edit-1', title: 'Edit handler', tool: 'edit_file', input: { path: 'src/handler.ts', oldString: 'old', newString: 'new' } },
                { id: 'check-diff', title: 'Check diff', tool: 'git_operations', input: { action: 'diff' } }
            ]
        }, createSessionContext());

        expect(result.ran).toEqual(true);
        expect(calls.length).toBeGreaterThanOrEqual(5);

        const gitCalls = calls.filter(c => c.tool === 'git_operations');
        expect(gitCalls.some(c => c.input.action === 'branch_create')).toEqual(true);
        expect(gitCalls.some(c => c.input.action === 'worktree_create')).toEqual(true);
        expect(gitCalls.some(c => c.input.action === 'worktree_merge')).toEqual(true);
        expect(gitCalls.some(c => c.input.action === 'worktree_cleanup')).toEqual(true);

        const editCall = calls.find(c => c.tool === 'edit_file');
        expect(editCall?.input.path).toContain('.worktrees/');
        expect(editCall?.input.path).toContain('src/handler.ts');
    }

    @Test('coding task worktree mode captures rollback checkpoint and can roll back')
    async codingTaskWorktreeModeCapturesRollbackCheckpointAndCanRollback() {
        const calls: Array<{ tool: string; input: any }> = [];
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => {
                calls.push({ tool: action.tool, input: action.input });
                if (action.tool === 'git_operations' && action.input?.action === 'diff') {
                    return {
                        tool: 'git_operations',
                        output: { stdout: 'diff --git a/src/handler.ts b/src/handler.ts\n+patched' },
                        summary: 'diff available'
                    };
                }
                return { tool: action.tool, output: { ok: true }, summary: 'ok' };
            }
        } as WorkspaceActionRunner;

        const store = new CodingTaskStore();
        const tool = new CodingTaskTool(store, runner, null as any);
        const runResult = await tool.invoke({
            action: 'run',
            goal: 'Patch error handling',
            useWorktree: true,
            actions: [
                { id: 'edit-1', title: 'Edit handler', tool: 'edit_file', input: { path: 'src/handler.ts', oldString: 'old', newString: 'new' } }
            ]
        }, createSessionContext());

        expect(runResult.task.result?.rollback?.available).toEqual(true);
        expect(runResult.task.metadata?.checkpoints?.length).toEqual(1);
        expect(runResult.task.metadata?.checkpoints?.[0]?.patches?.[0]?.patch).toContain('diff --git a/src/handler.ts');

        const rollbackResult = await tool.invoke({
            action: 'rollback',
            task_id: runResult.task.id
        }, createSessionContext());

        expect(rollbackResult.rolledBack).toEqual(true);
        expect(rollbackResult.task.status).toEqual('rolled_back');
        const rollbackCall = calls.find(call => call.tool === 'git_operations' && call.input?.action === 'apply_patch');
        expect(rollbackCall?.input?.reverse).toEqual(true);
        expect(rollbackCall?.input?.patch).toContain('diff --git a/src/handler.ts');
    }

    @Test('coding task cancel rejects completed tasks')
    async codingTaskCancelRejectsCompletedTasks() {
        const store = new CodingTaskStore();
        const task = {
            id: 'task-1',
            title: 'Done',
            goal: 'Done',
            status: 'completed' as const,
            createdAt: 1,
            updatedAt: 1,
            planning: {
                strategy: 'heuristic' as const,
                complexity: 'simple' as const,
                steps: [],
                successCriteria: []
            },
            actions: [],
            result: {
                executionMode: 'sequential' as const,
                completedActions: 0
            }
        };
        store.save('s1', task as any);
        const tool = new CodingTaskTool(store, {
            getSupportedTools: () => ['git_operations'],
            run: async (action: any) => ({ tool: action.tool, output: { ok: true }, summary: 'ok' })
        } as WorkspaceActionRunner, null as any);

        let error: Error | undefined;
        try {
            await tool.invoke({
                action: 'cancel',
                task_id: 'task-1'
            }, createSessionContext({ sessionId: 's1' }));
        } catch (err) {
            error = err as Error;
        }

        expect(error?.message).toContain('cannot be cancelled');
        expect(store.get('s1', 'task-1')?.status).toEqual('completed');
    }

    @Test('coding task parallel worktree mode executes actions in isolated workers and records metadata')
    async codingTaskParallelWorktreeModeExecutesActionsInIsolatedWorkersAndRecordsMetadata() {
        const calls: Array<{ tool: string; input: any }> = [];
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => {
                calls.push({ tool: action.tool, input: action.input });
                if (action.tool === 'git_operations' && action.input?.action === 'diff') {
                    return {
                        tool: 'git_operations',
                        output: { stdout: `diff --git a/${action.input.workdir}/file.ts b/${action.input.workdir}/file.ts` },
                        summary: `diff:${action.input.workdir}`
                    };
                }
                return { tool: action.tool, output: { ok: true, path: action.input?.path }, summary: 'ok' };
            }
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(new CodingTaskStore(), runner, null as any);
        const result = await tool.invoke({
            action: 'run',
            goal: 'Apply two isolated edits',
            useWorktree: true,
            parallel: true,
            actions: [
                { id: 'edit-1', title: 'Edit alpha', tool: 'edit_file', input: { path: 'src/alpha.ts', oldString: 'a', newString: 'b' } },
                { id: 'edit-2', title: 'Edit beta', tool: 'edit_file', input: { path: 'src/beta.ts', oldString: 'x', newString: 'y' } }
            ]
        }, createSessionContext());

        expect(result.ran).toEqual(true);
        expect(result.completedActions).toEqual(2);
        expect(result.failedActionId).toEqual(undefined);
        expect(result.executionMode).toEqual('parallel');
        expect(result.aggregate?.status).toEqual('completed');
        expect(result.aggregate?.completedWorkers).toEqual(2);
        expect(result.report?.summary).toContain('2/2 workers completed');
        expect(result.summary).toContain('2/2 workers completed');
        expect(result.nextSteps).toEqual(['review diff', 'verify changes']);
        expect(result.task.result?.executionMode).toEqual('parallel');
        expect(result.task.result?.workers?.length).toEqual(2);
        expect(result.task.result?.aggregate?.status).toEqual('completed');
        expect(result.task.result?.diff?.summary).toContain('2 worker diff');
        expect(result.task.result?.report?.summary).toContain('2 worker diff');
        expect(result.task.result?.report?.completed).toEqual(['Edit alpha', 'Edit beta']);
        expect(result.task.result?.report?.nextSteps).toEqual(['review diff', 'verify changes']);
        expect(result.task.result?.report?.artifacts).toContain('diff');
        expect(result.task.result?.report?.artifacts).toContain(`checkpoint:${result.task.result?.rollback?.checkpointId}`);

        const workers = result.task.result?.workers || [];
        expect(workers.every((worker: any) => worker.workerId && worker.branch && worker.worktreePath)).toEqual(true);
        expect(workers.map((worker: any) => worker.actionIds[0]).sort()).toEqual(['edit-1', 'edit-2']);
        expect(workers.every((worker: any) => worker.report?.summary)).toEqual(true);

        const editCalls = calls.filter(call => call.tool === 'edit_file');
        expect(editCalls.length).toEqual(2);
        expect(editCalls[0].input.path).toContain('.worktrees/');
        expect(editCalls[1].input.path).toContain('.worktrees/');
        expect(editCalls[0].input.path).not.toEqual(editCalls[1].input.path);

        const gitCalls = calls.filter(call => call.tool === 'git_operations');
        expect(gitCalls.filter(call => call.input.action === 'branch_create').length).toEqual(2);
        expect(gitCalls.filter(call => call.input.action === 'worktree_create').length).toEqual(2);
        expect(gitCalls.filter(call => call.input.action === 'worktree_merge').length).toEqual(2);
        expect(gitCalls.filter(call => call.input.action === 'worktree_cleanup').length).toEqual(2);
    }

    @Test('coding task parallel worktree mode isolates failed workers while preserving completed diffs')
    async codingTaskParallelWorktreeModeIsolatesFailedWorkersWhilePreservingCompletedDiffs() {
        const calls: Array<{ tool: string; input: any }> = [];
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => {
                calls.push({ tool: action.tool, input: action.input });
                if (action.tool === 'edit_file' && String(action.input?.path || '').includes('beta.ts')) {
                    throw new Error('beta edit failed');
                }
                if (action.tool === 'git_operations' && action.input?.action === 'diff') {
                    return {
                        tool: 'git_operations',
                        output: { stdout: `diff --git a/${action.input.workdir}/file.ts b/${action.input.workdir}/file.ts` },
                        summary: `diff:${action.input.workdir}`
                    };
                }
                return { tool: action.tool, output: { ok: true, path: action.input?.path }, summary: 'ok' };
            }
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(
            new CodingTaskStore(),
            runner,
            null as any,
            { codingTask: { parallelWorkerRetries: 0, parallelWorkerTimeoutMs: 1000 } } as any
        );
        const result = await tool.invoke({
            action: 'run',
            goal: 'Apply isolated edits with one failure',
            useWorktree: true,
            parallel: true,
            actions: [
                { id: 'edit-1', title: 'Edit alpha', tool: 'edit_file', input: { path: 'src/alpha.ts', oldString: 'a', newString: 'b' } },
                { id: 'edit-2', title: 'Edit beta', tool: 'edit_file', input: { path: 'src/beta.ts', oldString: 'x', newString: 'y' } }
            ]
        }, createSessionContext());

        expect(result.ran).toEqual(true);
        expect(result.failedActionId).toEqual('edit-2');
        expect(result.task.status).toEqual('failed');
        expect(result.diff?.summary).toContain('1 worker diff');
        expect(result.aggregate?.status).toEqual('partial_failure');
        expect(result.aggregate?.completedWorkers).toEqual(1);
        expect(result.aggregate?.failedWorkers).toEqual(1);
        expect(result.aggregate?.successfulWorkerIds).toEqual(['worker-1']);
        expect(result.aggregate?.failedWorkerIds).toEqual(['worker-2']);
        expect(result.aggregate?.isolatedFailures?.[0]?.error).toEqual('beta edit failed');
        expect(result.report?.summary).toContain('1/2 workers completed; 1 failed');
        expect(result.report?.nextSteps).toEqual(expect.arrayContaining([
            'review completed worker diff',
            'fix Edit beta',
            'rerun failed workers',
            'review diff',
            'verify changes',
            'inspect Edit beta',
            'fix the failure and rerun'
        ]));
        expect(result.risks).toContain('1 worker failure');
        expect(result.risks).toContain('beta edit failed');
        expect(result.rollback?.available).toEqual(true);
        expect(result.task.result?.aggregate?.status).toEqual('partial_failure');
        expect(result.task.result?.workers?.length).toEqual(2);
        expect(result.task.result?.workers?.find((worker: any) => worker.workerId === 'worker-1')?.diff?.summary).toContain('diff:');
        expect(result.task.result?.workers?.find((worker: any) => worker.workerId === 'worker-2')?.error).toEqual('beta edit failed');

        const gitCalls = calls.filter(call => call.tool === 'git_operations');
        expect(gitCalls.filter(call => call.input.action === 'worktree_merge').length).toEqual(1);
        expect(gitCalls.filter(call => call.input.action === 'worktree_cleanup').length).toEqual(2);
    }

    @Test('coding task retry_failed reruns only failed workers and carries forward successful worker artifacts')
    async codingTaskRetryFailedRerunsOnlyFailedWorkersAndCarriesForwardSuccessfulWorkerArtifacts() {
        const calls: Array<{ tool: string; input: any }> = [];
        let betaAttempts = 0;
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => {
                calls.push({ tool: action.tool, input: action.input });
                if (action.tool === 'edit_file' && String(action.input?.path || '').includes('beta.ts')) {
                    betaAttempts++;
                    if (betaAttempts === 1) {
                        throw new Error('beta edit failed');
                    }
                }
                if (action.tool === 'git_operations' && action.input?.action === 'diff') {
                    const workdir = String(action.input.workdir || '');
                    return {
                        tool: 'git_operations',
                        output: { stdout: `diff --git a/${workdir}/file.ts b/${workdir}/file.ts\n+patched ${workdir}` },
                        summary: `diff:${workdir}`
                    };
                }
                return { tool: action.tool, output: { ok: true, path: action.input?.path }, summary: 'ok' };
            }
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(
            new CodingTaskStore(),
            runner,
            null as any,
            { codingTask: { parallelWorkerRetries: 0, parallelWorkerTimeoutMs: 1000 } } as any
        );
        const firstRun = await tool.invoke({
            action: 'run',
            goal: 'Apply isolated edits with one failure',
            useWorktree: true,
            parallel: true,
            actions: [
                { id: 'edit-1', title: 'Edit alpha', tool: 'edit_file', input: { path: 'src/alpha.ts', oldString: 'a', newString: 'b' } },
                { id: 'edit-2', title: 'Edit beta', tool: 'edit_file', input: { path: 'src/beta.ts', oldString: 'x', newString: 'y' } }
            ]
        }, createSessionContext());

        const retryResult = await tool.invoke({
            action: 'retry_failed',
            task_id: firstRun.task.id
        }, createSessionContext());

        expect(retryResult.ran).toEqual(true);
        expect(retryResult.task.status).toEqual('completed');
        expect(retryResult.task.actions.length).toEqual(1);
        expect(retryResult.task.actions[0].id).toEqual('edit-2');
        expect(retryResult.task.metadata?.retryOfTaskId).toEqual(firstRun.task.id);
        expect(retryResult.task.metadata?.retrySourceTaskId).toEqual(firstRun.task.id);
        expect(retryResult.task.metadata?.retryOfWorkerIds).toEqual(['worker-2']);
        expect(retryResult.task.metadata?.carryForwardWorkerIds).toEqual(['worker-1']);
        expect(retryResult.aggregate?.status).toEqual('completed');
        expect(retryResult.aggregate?.completedWorkers).toEqual(2);
        expect(retryResult.aggregate?.successfulWorkerIds).toEqual(['worker-1', 'worker-2']);
        expect(retryResult.summary).toContain('2/2 workers completed');
        expect(retryResult.task.result?.workers?.length).toEqual(2);
        expect(retryResult.task.result?.workers?.map((worker: any) => worker.workerId).sort()).toEqual(['worker-1', 'worker-2']);
        expect((retryResult.task.result?.report?.completed || []).slice().sort()).toEqual(['Edit alpha', 'Edit beta']);
        expect(retryResult.task.result?.diff?.summary).toContain('2 worker diff');
        expect(retryResult.task.result?.rollback?.available).toEqual(true);

        const latestCheckpoint = retryResult.task.metadata?.checkpoints?.slice(-1)[0];
        expect(latestCheckpoint?.mode).toEqual('parallel_worktree');
        expect(latestCheckpoint?.patches?.length).toEqual(2);
        expect(latestCheckpoint?.patches?.map((patch: any) => patch.workerId).sort()).toEqual(['worker-1', 'worker-2']);

        const editCalls = calls.filter(call => call.tool === 'edit_file');
        expect(editCalls.filter(call => String(call.input?.path || '').includes('alpha.ts')).length).toEqual(1);
        expect(editCalls.filter(call => String(call.input?.path || '').includes('beta.ts')).length).toEqual(2);
    }

    @Test('coding task retry_failed rejects tasks without failed workers')
    async codingTaskRetryFailedRejectsTasksWithoutFailedWorkers() {
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => {
                if (action.tool === 'git_operations' && action.input?.action === 'diff') {
                    return {
                        tool: 'git_operations',
                        output: { stdout: 'diff --git a/src/alpha.ts b/src/alpha.ts\n+patched' },
                        summary: 'diff:alpha'
                    };
                }
                return { tool: action.tool, output: { ok: true }, summary: 'ok' };
            }
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(new CodingTaskStore(), runner, null as any);
        const completedTask = await tool.invoke({
            action: 'run',
            goal: 'Apply isolated edits',
            useWorktree: true,
            parallel: true,
            actions: [
                { id: 'edit-1', title: 'Edit alpha', tool: 'edit_file', input: { path: 'src/alpha.ts', oldString: 'a', newString: 'b' } }
            ]
        }, createSessionContext());

        let error: Error | undefined;
        try {
            await tool.invoke({
                action: 'retry_failed',
                task_id: completedTask.task.id
            }, createSessionContext());
        } catch (err) {
            error = err as Error;
        }

        expect(error?.message).toContain('does not have failed workers to retry');
    }

    @Test('coding task parallel workers retry once after transient failure and preserve cleanup')
    async codingTaskParallelWorkersRetryOnceAfterTransientFailureAndPreserveCleanup() {
        const calls: Array<{ tool: string; input: any }> = [];
        let editAttempts = 0;
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => {
                calls.push({ tool: action.tool, input: action.input });
                if (action.tool === 'edit_file') {
                    editAttempts++;
                    if (editAttempts === 1) {
                        throw new Error('transient failure');
                    }
                    return { tool: 'edit_file', output: { ok: true }, summary: 'ok' };
                }
                if (action.tool === 'git_operations' && action.input?.action === 'diff') {
                    return {
                        tool: 'git_operations',
                        output: { stdout: `diff --git a/${action.input.workdir}/file.ts b/${action.input.workdir}/file.ts` },
                        summary: `diff:${action.input.workdir}`
                    };
                }
                return { tool: action.tool, output: { ok: true }, summary: 'ok' };
            }
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(
            new CodingTaskStore(),
            runner,
            null as any,
            { codingTask: { parallelWorkerRetries: 1, parallelWorkerTimeoutMs: 1000 } } as any
        );
        const result = await tool.invoke({
            action: 'run',
            goal: 'Retry transient failure',
            useWorktree: true,
            parallel: true,
            actions: [
                { id: 'edit-1', title: 'Edit alpha', tool: 'edit_file', input: { path: 'src/alpha.ts', oldString: 'a', newString: 'b' } }
            ]
        }, createSessionContext());

        expect(result.ran).toEqual(true);
        expect(result.failedActionId).toEqual(undefined);
        expect(result.task.status).toEqual('completed');
        expect(result.task.result?.workers?.[0]?.attemptCount).toEqual(2);
        expect(editAttempts).toEqual(2);

        const gitCalls = calls.filter(call => call.tool === 'git_operations');
        expect(gitCalls.filter(call => call.input.action === 'worktree_create').length).toEqual(2);
        expect(gitCalls.filter(call => call.input.action === 'worktree_cleanup').length).toEqual(2);
        expect(gitCalls.filter(call => call.input.action === 'worktree_merge').length).toEqual(1);
    }

    @Test('coding task parallel workers fail fast on timeout and expose attempt metadata')
    async codingTaskParallelWorkersFailFastOnTimeoutAndExposeAttemptMetadata() {
        const calls: Array<{ tool: string; input: any }> = [];
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => {
                calls.push({ tool: action.tool, input: action.input });
                if (action.tool === 'edit_file') {
                    return await new Promise<any>(() => {});
                }
                return { tool: action.tool, output: { ok: true }, summary: 'ok' };
            }
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(
            new CodingTaskStore(),
            runner,
            null as any,
            { codingTask: { parallelWorkerRetries: 0, parallelWorkerTimeoutMs: 20 } } as any
        );
        const result = await tool.invoke({
            action: 'run',
            goal: 'Timeout worker',
            useWorktree: true,
            parallel: true,
            actions: [
                { id: 'edit-1', title: 'Edit alpha', tool: 'edit_file', input: { path: 'src/alpha.ts', oldString: 'a', newString: 'b' } }
            ]
        }, createSessionContext());

        expect(result.ran).toEqual(true);
        expect(result.failedActionId).toEqual('edit-1');
        expect(result.task.status).toEqual('failed');
        expect(result.task.result?.workers?.[0]?.attemptCount).toEqual(1);
        expect(result.task.result?.workers?.[0]?.error).toContain('timed out after 20ms');
        expect(result.task.result?.error).toContain('timed out after 20ms');

        const gitCalls = calls.filter(call => call.tool === 'git_operations');
        expect(gitCalls.filter(call => call.input.action === 'worktree_create').length).toEqual(1);
        expect(gitCalls.filter(call => call.input.action === 'worktree_cleanup').length).toEqual(1);
        expect(gitCalls.filter(call => call.input.action === 'worktree_merge').length).toEqual(0);
    }

    @Test('coding task parallel worktree mode captures rollback patches in reverse order')
    async codingTaskParallelWorktreeModeCapturesRollbackPatchesInReverseOrder() {
        const calls: Array<{ tool: string; input: any }> = [];
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => {
                calls.push({ tool: action.tool, input: action.input });
                if (action.tool === 'git_operations' && action.input?.action === 'diff') {
                    const workdir = String(action.input.workdir || '');
                    return {
                        tool: 'git_operations',
                        output: { stdout: `diff --git a/${workdir}/file.ts b/${workdir}/file.ts\n+patched ${workdir}` },
                        summary: `diff:${workdir}`
                    };
                }
                return { tool: action.tool, output: { ok: true }, summary: 'ok' };
            }
        } as WorkspaceActionRunner;

        const store = new CodingTaskStore();
        const tool = new CodingTaskTool(store, runner, null as any);
        const runResult = await tool.invoke({
            action: 'run',
            goal: 'Apply two isolated edits',
            useWorktree: true,
            parallel: true,
            actions: [
                { id: 'edit-1', title: 'Edit alpha', tool: 'edit_file', input: { path: 'src/alpha.ts', oldString: 'a', newString: 'b' } },
                { id: 'edit-2', title: 'Edit beta', tool: 'edit_file', input: { path: 'src/beta.ts', oldString: 'x', newString: 'y' } }
            ]
        }, createSessionContext());

        expect(runResult.task.result?.rollback?.available).toEqual(true);
        expect(runResult.task.metadata?.checkpoints?.[0]?.mode).toEqual('parallel_worktree');
        expect(runResult.task.metadata?.checkpoints?.[0]?.patches?.length).toEqual(2);

        await tool.invoke({
            action: 'rollback',
            task_id: runResult.task.id
        }, createSessionContext());

        const rollbackCalls = calls.filter(call => call.tool === 'git_operations' && call.input?.action === 'apply_patch');
        expect(rollbackCalls.length).toEqual(2);
        expect(rollbackCalls[0].input.patch).toEqual(runResult.task.metadata?.checkpoints?.[0]?.patches?.[1]?.patch);
        expect(rollbackCalls[1].input.patch).toEqual(runResult.task.metadata?.checkpoints?.[0]?.patches?.[0]?.patch);
    }

    @Test('coding task parallel mode requires worktree isolation')
    async codingTaskParallelModeRequiresWorktreeIsolation() {
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => ({ tool: action.tool, output: { ok: true }, summary: 'ok' })
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(new CodingTaskStore(), runner, null as any);
        let error: Error | undefined;
        try {
            await tool.invoke({
                action: 'run',
                goal: 'Unsafe parallel edit',
                parallel: true,
                actions: [
                    { id: 'edit-1', title: 'Edit alpha', tool: 'edit_file', input: { path: 'src/alpha.ts', oldString: 'a', newString: 'b' } }
                ]
            }, createSessionContext());
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('requires useWorktree');
    }

    @Test('coding task without worktree mode does not create worktree')
    async codingTaskWithoutWorktreeModeDoesNotCreateWorktree() {
        const calls: Array<{ tool: string; input: any }> = [];
        const runner = {
            getSupportedTools: () => ['edit_file', 'git_operations'],
            run: async (action: any) => {
                calls.push({ tool: action.tool, input: action.input });
                if (action.tool === 'edit_file') {
                    return { tool: 'edit_file', output: { ok: true }, summary: 'ok' };
                }
                return { tool: 'git_operations', output: { stdout: 'diff --git a/a.ts b/a.ts' }, summary: 'diff' };
            }
        } as WorkspaceActionRunner;

        const tool = new CodingTaskTool(new CodingTaskStore(), runner, null as any);
        const result = await tool.invoke({
            action: 'run',
            goal: 'Simple edit',
            actions: [
                { id: 'edit-1', title: 'Edit', tool: 'edit_file', input: { path: 'a.ts', oldString: 'x', newString: 'y' } }
            ]
        }, createSessionContext());

        expect(result.ran).toEqual(true);
        const worktreeCalls = calls.filter(c =>
            c.tool === 'git_operations' &&
            ['worktree_create', 'worktree_merge', 'worktree_cleanup'].includes(c.input.action)
        );
        expect(worktreeCalls.length).toEqual(0);
    }

    @Test('lightweight agent runner requires runtime')
    async lightweightAgentRunnerRequiresRuntime() {
        const runner = new LightweightAgentRunner();
        let error: Error | undefined;
        try {
            await runner.run({ prompt: 'test' });
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('requires AgentRuntime');
    }

    @Test('lightweight agent runner runs with mock runtime')
    async lightweightAgentRunnerRunsWithMockRuntime() {
        let seenSessionId = '';
        const mockRuntime = {
            start: async () => { },
            runTurn: async (sessionId: string, prompt: string) => {
                seenSessionId = sessionId;
                return {
                    message: {
                        content: [
                            prompt,
                            '',
                            'Summary: completed analysis',
                            'Diff: src/test.ts +5 -2',
                            'Completed: task-1, task-2',
                            'Next steps: verify',
                            'Risks: none',
                            'Artifacts: patch.diff'
                        ].join('\n'),
                        metadata: {
                            model: 'mock-model',
                            finishReason: 'stop',
                            usage: { promptTokens: 50, completionTokens: 100 }
                        }
                    }
                };
            },
            getMessages: async (sessionId: string) => [
                { role: 'user', content: 'test', id: '1', ts: Date.now() },
                { role: 'assistant', content: 'result', id: '2', ts: Date.now() },
                { role: 'tool', content: 'tool result', id: '3', ts: Date.now() }
            ]
        };

        const runner = new LightweightAgentRunner(mockRuntime as any);
        const result = await runner.run({ prompt: 'analyze project' });

        expect(result.content).toContain('analyze project');
        expect(result.content).toContain('completed analysis');
        expect(result.sessionId).toContain('sub-');
        expect(seenSessionId).toEqual(result.sessionId);
        expect(result.turnCount).toBe(1);
        expect(result.toolCalls).toBe(1);
        expect(result.model).toEqual('mock-model');
        expect(result.finishReason).toEqual('stop');
        expect(result.usage?.promptTokens).toEqual(50);
        expect(result.report?.summary).toContain('completed analysis');
        expect(result.report?.diff).toEqual('src/test.ts +5 -2');
        expect(result.report?.nextSteps).toEqual(['verify']);
        expect(result.report?.artifacts).toEqual(['patch.diff']);
    }

    @Test('lightweight agent runner embeds system prompt')
    async lightweightAgentRunnerEmbedsSystemPrompt() {
        let seenPrompt = '';
        const mockRuntime = {
            start: async () => { },
            runTurn: async (_sessionId: string, prompt: string) => {
                seenPrompt = prompt;
                return {
                    message: {
                        content: 'done',
                        metadata: {}
                    }
                };
            },
            getMessages: async () => []
        };

        const runner = new LightweightAgentRunner(mockRuntime as any);
        await runner.run({ prompt: 'do the thing', systemPrompt: 'You are a helpful assistant' });

        expect(seenPrompt).toContain('You are a helpful assistant');
        expect(seenPrompt).toContain('do the thing');
    }

    @Test('lightweight agent runner uses custom session id')
    async lightweightAgentRunnerUsesCustomSessionId() {
        let seenSessionId = '';
        const mockRuntime = {
            start: async () => { },
            runTurn: async (sessionId: string) => {
                seenSessionId = sessionId;
                return { message: { content: 'done', metadata: {} } };
            },
            getMessages: async () => []
        };

        const runner = new LightweightAgentRunner(mockRuntime as any);
        await runner.run({ prompt: 'test', sessionId: 'custom-42' });

        expect(seenSessionId).toEqual('custom-42');
    }

    @Test('lightweight agent runner applies and clears toolset filter')
    async lightweightAgentRunnerAppliesToolsetFilter() {
        const filterSessions: string[] = [];
        const clearSessions: string[] = [];
        const mockRuntime = {
            start: async () => {},
            runTurn: async (_sessionId: string, _prompt: string) => {
                return { message: { content: 'done', metadata: {} } };
            },
            getMessages: async () => [],
            setSessionToolFilter: (sessionId: string, toolsets: string[]) => {
                filterSessions.push(`${sessionId}:${toolsets.join(',')}`);
            },
            clearSessionToolFilter: (sessionId: string) => {
                clearSessions.push(sessionId);
            }
        };

        const runner = new LightweightAgentRunner(mockRuntime as any);
        await runner.run({ prompt: 'test', toolsets: ['filesystem', 'web'] });

        expect(filterSessions.length).toBe(1);
        expect(filterSessions[0]).toContain('filesystem,web');
        expect(clearSessions.length).toBe(1);
        expect(clearSessions[0]).toEqual(filterSessions[0].split(':')[0]);
    }

    @Test('lightweight agent runner does not call filter when no toolsets')
    async lightweightAgentRunnerSkipsFilterWhenNoToolsets() {
        let filterCalled = false;
        const mockRuntime = {
            start: async () => {},
            runTurn: async (_sessionId: string, _prompt: string) => {
                return { message: { content: 'done', metadata: {} } };
            },
            getMessages: async () => [],
            setSessionToolFilter: (_sessionId: string, _toolsets: string[]) => {
                filterCalled = true;
            },
            clearSessionToolFilter: (_sessionId: string) => {
                filterCalled = true;
            }
        };

        const runner = new LightweightAgentRunner(mockRuntime as any);
        await runner.run({ prompt: 'test' });

        expect(filterCalled).toBe(false);
    }

    @Test('lightweight agent runner imports messages to parent session')
    async lightweightAgentRunnerImportsMessagesToParent() {
        const parentMessages: any[] = [];
        const subMessages = [
            { role: 'user', content: 'sub task', id: 's1', ts: 100 },
            { role: 'assistant', content: 'sub result', id: 's2', ts: 101 },
            { role: 'tool', content: 'tool result', id: 's3', ts: 102 }
        ];
        const mockRuntime = {
            start: async () => {},
            runTurn: async (_sessionId: string, _prompt: string) => {
                return { message: { content: 'done', metadata: {} } };
            },
            getMessages: async () => subMessages
        };
        const mockSessions = {
            append: async (_sessionId: string, msg: any) => {
                parentMessages.push(msg);
            }
        };

        const runner = new LightweightAgentRunner(mockRuntime as any, mockSessions as any);
        await runner.run({ prompt: 'test', parentSessionId: 'parent-42' });

        expect(parentMessages.length).toBe(3);
        expect(parentMessages[0].role).toBe('user');
        expect(parentMessages[1].role).toBe('assistant');
        expect(parentMessages[2].role).toBe('tool');
    }

    @Test('lightweight agent runner skips parent import when no parentSessionId')
    async lightweightAgentRunnerSkipsParentImportWithoutParentId() {
        let appendCalled = false;
        const mockRuntime = {
            start: async () => {},
            runTurn: async (_sessionId: string, _prompt: string) => {
                return { message: { content: 'done', metadata: {} } };
            },
            getMessages: async () => [{ role: 'user', content: 'x', id: '1', ts: 1 }]
        };
        const mockSessions = {
            append: async (_sessionId: string, _msg: any) => {
                appendCalled = true;
            }
        };

        const runner = new LightweightAgentRunner(mockRuntime as any, mockSessions as any);
        await runner.run({ prompt: 'test' });

        expect(appendCalled).toBe(false);
    }

    @Test('lightweight agent runner clears filter on error')
    async lightweightAgentRunnerClearsFilterOnError() {
        const clearSessions: string[] = [];
        const mockRuntime = {
            start: async () => {},
            runTurn: async (_sessionId: string, _prompt: string) => {
                throw new Error('turn failed');
            },
            getMessages: async () => [],
            setSessionToolFilter: (_sessionId: string, _toolsets: string[]) => {},
            clearSessionToolFilter: (sessionId: string) => {
                clearSessions.push(sessionId);
            }
        };

        const runner = new LightweightAgentRunner(mockRuntime as any);
        let error: Error | undefined;
        try {
            await runner.run({ prompt: 'test', toolsets: ['filesystem'] });
        } catch (err) {
            error = err as Error;
        }

        expect(error?.message).toContain('turn failed');
        expect(clearSessions.length).toBe(1);
    }
}

/** Helper to register mock adapters for tools that require them in DI tests. */
function withToolTestAdapters(): any[] {
    const mockSpawn = { spawn: async () => ({ output: '', turnCount: 0, toolCalls: 0 }) };
    const mockLocation = { getCurrentLocation: async () => ({ label: 'Current location' }) };
    const mockWeather = { getCurrentWeather: async () => ({}), getForecast: async () => ({}) };
    const mockLlm = { execute: async () => ({ content: '' }) };
    const mockPipeline = { list: async () => [], define: async () => ({}), execute: async () => ({}), get: async () => null, delete: async () => true };
    const mockVision = { analyze: async () => ({ description: '' }) };
    const mockImageGen = { generate: async () => ({ url: '' }) };
    const mockScreenshot = { capture: async () => ({ imageUrl: '', format: 'png', width: 1, height: 1 }) };
    const mockGui = { execute: async (request: any) => ({ ok: true, action: request.action }) };
    return [
        { provide: SpawnAgentAdapter, useValue: mockSpawn },
        { provide: LocationAdapter, useValue: mockLocation },
        { provide: WeatherAdapter, useValue: mockWeather },
        { provide: LlmTaskAdapter, useValue: mockLlm },
        { provide: PipelineAdapter, useValue: mockPipeline },
        { provide: VisionAdapter, useValue: mockVision },
        { provide: ImageGenerationAdapter, useValue: mockImageGen },
        { provide: ScreenshotAdapter, useValue: mockScreenshot },
        { provide: GuiControlAdapter, useValue: mockGui },
    ];
}

function createJsonResponse(body: any, status = 200): any {
    return {
        ok: status >= 200 && status < 300,
        status,
        async json() {
            return body;
        }
    };
}

class MockAdapter {
    constructor(private fn: (...args: any[]) => any) {}
    async execute(...args: any[]): Promise<any> { return this.fn(...args); }
    async search(...args: any[]): Promise<any> { return this.fn(...args); }
    async store(...args: any[]): Promise<any> { return this.fn(...args); }
    async spawn(...args: any[]): Promise<any> { return this.fn(...args); }
    async spawnParallel(...args: any[]): Promise<any> { return this.fn(...args); }
    async getCurrentLocation(...args: any[]): Promise<any> { return this.fn(...args); }
    async getCurrentWeather(...args: any[]): Promise<any> { return this.fn(...args); }
    async getForecast(...args: any[]): Promise<any> { return this.fn(...args); }
    async analyze(...args: any[]): Promise<any> { return this.fn(...args); }
    async generate(...args: any[]): Promise<any> { return this.fn(...args); }
    async send(...args: any[]): Promise<any> { return this.fn(...args); }
    async transcribe(...args: any[]): Promise<any> { return this.fn(...args); }
    async synthesize(...args: any[]): Promise<any> { return this.fn(...args); }
    async verify(...args: any[]): Promise<any> { return this.fn(...args); }
    async scan(...args: any[]): Promise<any> { return this.fn(...args); }
    async capture(...args: any[]): Promise<any> { return this.fn(...args); }
    async create(...args: any[]): Promise<any> { return this.fn(...args); }
    async get(...args: any[]): Promise<any> { return this.fn(...args); }
    async update(...args: any[]): Promise<any> { return this.fn(...args); }
    async delete(...args: any[]): Promise<any> { return this.fn(...args); }
    async list(...args: any[]): Promise<any> { return this.fn(...args); }
    async requestApproval(...args: any[]): Promise<any> { return this.fn(...args); }
    async pendingRequests(...args: any[]): Promise<any> { return this.fn(...args); }
    async cancelRequest(...args: any[]): Promise<any> { return this.fn(...args); }
    async define(...args: any[]): Promise<any> { return this.fn(...args); }
}
