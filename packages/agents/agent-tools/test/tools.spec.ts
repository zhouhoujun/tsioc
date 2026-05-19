import expect = require('expect');
import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';
import { Suite, Test } from '@tsdi/unit';
import { AgentScheduler, InMemoryMemoryStore, ScheduledAgentTask } from '@tsdi/agent';
import { CalculatorTool } from '../utility/calculator.tool';
import { ReadFileTool } from '../files/read-file.tool';
import { GlobSearchTool } from '../files/glob-search.tool';
import { ContentSearchTool } from '../files/content-search.tool';
import { WebSearchTool } from '../web/web-search.tool';
import { WebExtractTool } from '../web/web-extract.tool';
import { TodoStore } from '../planning/todo-store';
import { TodoTool } from '../planning/todo.tool';
import { ScheduleTool } from '../scheduling/schedule.tool';
import { TerminalTool } from '../terminal/terminal.tool';
import { MemoryDeleteTool } from '../memory/memory-delete.tool';
import { MemoryListTool } from '../memory/memory-list.tool';
import { HttpFetchTool } from '../http/http-fetch.tool';
import { HttpRequestTool } from '../http/http-request.tool';
import { ToolInspectTool } from '../registry/tool-inspect.tool';
import { ToolSearchTool } from '../registry/tool-search.tool';
import { provideTools, resolveAgentToolBundles, resolveAgentToolNames, AGENT_TOOL_GROUPS } from '../src/provider';
import { Application } from '@tsdi/core';
import { ToolRegistry, AgentRuntime, EchoModelAdapter, AGENT_MODEL_ADAPTER, AgentModule } from '@tsdi/agent';
import { TodoTool as ExportedTodoTool } from '../planning';
import { ScheduleTool as ExportedScheduleTool } from '../scheduling';
import { TerminalTool as ExportedTerminalTool } from '../terminal';
import { MemoryDeleteTool as ExportedMemoryDeleteTool, MemoryListTool as ExportedMemoryListTool } from '../memory';
import { HttpFetchTool as ExportedHttpFetchTool, HttpRequestTool as ExportedHttpRequestTool } from '../http';
import { ToolInspectTool as ExportedToolInspectTool, ToolSearchTool as ExportedToolSearchTool } from '../registry';
import { provideSkills, LocalSkillRegistry, loadAgentSkillsFromRoots } from '../skills';
import { LocalMcpClientRegistry } from '../mcp';

class FakeScheduler extends AgentScheduler {
    scheduled: ScheduledAgentTask[] = [];
    cancelled: string[] = [];

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

    private async createSkillRoot(): Promise<string> {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-skills-'));
        await fs.mkdir(path.join(root, 'software-development', 'writing-plans'), { recursive: true });
        await fs.mkdir(path.join(root, 'creative', 'sketch'), { recursive: true });
        await fs.writeFile(path.join(root, 'software-development', 'writing-plans', 'SKILL.md'), `---\nname: writing-plans\ndescription: "Write implementation plans."\n---\n\n# Writing Plans\n\nWrite plans before implementation.\n`, 'utf8');
        await fs.writeFile(path.join(root, 'creative', 'sketch', 'SKILL.md'), `---\nname: sketch\ndescription: |\n  Create quick visual sketches.\n---\n\n# Sketch\n\nMake fast mockups.\n`, 'utf8');
        await fs.writeFile(path.join(root, 'README.md'), '# ignored\n', 'utf8');
        return root;
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

    @Test('glob search returns relative workspace matches')
    async globSearchFindsFiles() {
        const workspace = await this.createWorkspace();
        const tool = new GlobSearchTool({ file: { rootDir: workspace } });

        const result = await tool.invoke({ pattern: 'src/**/*.txt' }, createSessionContext());
        expect(result.matches).toEqual(['src/alpha.txt']);
    }

    @Test('content search returns line matches')
    async contentSearchFindsMatches() {
        const workspace = await this.createWorkspace();
        const tool = new ContentSearchTool({ file: { rootDir: workspace, maxSearchResults: 5 } });

        const result = await tool.invoke({ query: 'beta', glob: 'src/**/*' }, createSessionContext());
        expect(result.matches.length).toEqual(2);
        expect(result.matches[0].path).toContain('src/');
        expect(result.matches[0].line).toBeGreaterThan(0);
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

    @Test('grouped tool entrypoints export tool classes')
    groupedToolEntrypointsExportToolClasses() {
        expect(ExportedTodoTool).toEqual(TodoTool);
        expect(ExportedScheduleTool).toEqual(ScheduleTool);
        expect(ExportedTerminalTool).toEqual(TerminalTool);
        expect(ExportedMemoryListTool).toEqual(MemoryListTool);
        expect(ExportedMemoryDeleteTool).toEqual(MemoryDeleteTool);
        expect(ExportedHttpFetchTool).toEqual(HttpFetchTool);
        expect(ExportedHttpRequestTool).toEqual(HttpRequestTool);
        expect(ExportedToolSearchTool).toEqual(ToolSearchTool);
        expect(ExportedToolInspectTool).toEqual(ToolInspectTool);
    }

    @Test('provider tools expose grouped registrations and defaults')
    provideToolsExposeGroupedRegistrationsAndDefaults() {
        expect(AGENT_TOOL_GROUPS.filesystem).toEqual(['read_file', 'glob_search', 'content_search']);
        expect(resolveAgentToolNames()).toContain('read_file');
        expect(resolveAgentToolNames()).not.toContain('http_fetch');
        expect(resolveAgentToolNames({ registration: { preset: 'all' } })).toContain('terminal');
        expect(resolveAgentToolNames({ registration: { preset: 'none' } })).toEqual([]);
        expect(resolveAgentToolNames({ registration: { groups: { http: true } } })).toContain('http_fetch');
        expect(resolveAgentToolNames({ registration: { groups: { web: false } } })).not.toContain('web_search');
        expect(resolveAgentToolNames({ registration: { items: { terminal: true, web_extract: false } } })).toContain('terminal');
        expect(resolveAgentToolNames({ registration: { items: { terminal: true, web_extract: false } } })).not.toContain('web_extract');
    }

    @Test('provider tools resolve capability bundle metadata')
    provideToolsResolveCapabilityBundleMetadata() {
        const bundles = resolveAgentToolBundles();
        const filesystem = bundles.find(bundle => bundle.name === 'filesystem');
        const terminal = bundles.find(bundle => bundle.name === 'terminal');
        expect(filesystem?.tools).toEqual(['read_file', 'glob_search', 'content_search']);
        expect(filesystem?.defaultEnabled).toEqual(true);
        expect(filesystem?.deferredActivation).toEqual(true);
        expect(filesystem?.enabled).toEqual(true);
        expect(filesystem?.source).toEqual('builtin');
        expect(filesystem?.providerId).toEqual('@tsdi/agent-tools');
        expect(filesystem?.activation).toEqual({ kind: 'deferred', scope: 'session' });
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

    @Test('memory list returns session and global records')
    async memoryListReturnsSessionAndGlobalRecords() {
        const store = new InMemoryMemoryStore();
        await store.put({ id: 's1-note', sessionId: 's1', key: 'topic', value: 'router', scope: 'session', createdAt: 1 });
        await store.put({ id: 's2-note', sessionId: 's2', key: 'topic', value: 'switch', scope: 'session', createdAt: 2 });
        await store.put({ id: 'global-note', key: 'shared', value: 'policy', scope: 'global', createdAt: 3 });
        const tool = new MemoryListTool();

        const result = await tool.invoke(undefined, createSessionContext({ sessionId: 's1', memory: store }));
        expect(result.records.map((record: any) => record.id)).toEqual(['s1-note', 'global-note']);
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
            expect(skillRegistry.list().map(skill => skill.id)).toEqual(['router']);

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
