import { RandomUuidGenerator } from '@tsdi/core';
import { IMPORTED_MESSAGE_METADATA_KEY } from '@tsdi/agent';
import expect = require('expect');
import { Buffer } from 'buffer';
import { Suite, Test } from '@tsdi/unit';
import { LightweightAgentRunner, parseDelegatedAgentReport, runWithConcurrency } from '../src';
import { createDelegationCipher, resolveDelegationCipherKey } from '../src/delegation/crypto';

interface MockAgentRuntime {
    start(): Promise<void>;
    runTurn(sessionId: string, input: string, principalId?: string, message?: any, profile?: string, agent?: any): Promise<any>;
    getMessages(sessionId: string): Promise<any[]>;
    setSessionToolFilter?(sessionId: string, toolsets: string[]): void;
    clearSessionToolFilter?(sessionId: string): void;
    setSessionModelProfile?(sessionId: string, profile: string): void;
    clearSessionModelProfile?(sessionId: string): void;
    registerChildSession?(parent: string, child: string, metadata?: Record<string, any>): void;
    unregisterChildSession?(parent: string, child: string, status?: string): void;
}

function createMockRuntime(overrides: Partial<MockAgentRuntime> = {}): MockAgentRuntime {
    return {
        start: async () => { },
        runTurn: async (_sessionId: string, input: string) => ({
            message: { content: input, metadata: {} }
        }),
        getMessages: async () => [],
        unregisterChildSession: () => { },
        ...overrides
    };
}

@Suite('delegation v2')
export class DelegationV2Suite {
    @Test('delegation cipher roundtrips AES-256-GCM payloads')
    cryptoRoundtrip() {
        const cipher = createDelegationCipher('test-key');
        const plaintext = 'sensitive goal with context';
        const sealed = cipher.encrypt(plaintext);
        expect(sealed).not.toContain(plaintext);
        expect(cipher.decrypt(sealed)).toEqual(plaintext);
    }

    @Test('delegation cipher produces distinct ciphertext per call')
    cryptoRandomIv() {
        const cipher = createDelegationCipher('test-key');
        const first = cipher.encrypt('same value');
        const second = cipher.encrypt('same value');
        expect(first).not.toEqual(second);
        expect(cipher.decrypt(first)).toEqual(cipher.decrypt(second));
    }

    @Test('delegation cipher rejects tampered payloads')
    cryptoTamper() {
        const cipher = createDelegationCipher('test-key');
        const sealed = cipher.encrypt('payload');
        const [iv, tag, data] = sealed.split('.');
        const tampered = [iv, tag, Buffer.from(String(data)).toString('base64')].join('.');
        let error: Error | undefined;
        try {
            cipher.decrypt(tampered);
        } catch (err) {
            error = err as Error;
        }
        expect(error).toBeDefined();
    }

    @Test('delegation cipher rejects payloads sealed with a different key')
    cryptoWrongKey() {
        const sealed = createDelegationCipher('key-a').encrypt('value');
        let error: Error | undefined;
        try {
            createDelegationCipher('key-b').decrypt(sealed);
        } catch (err) {
            error = err as Error;
        }
        expect(error).toBeDefined();
    }

    @Test('delegation key resolution prefers inline key over env')
    keyResolution() {
        expect(resolveDelegationCipherKey(undefined)).toBeUndefined();
        expect(resolveDelegationCipherKey({})).toBeUndefined();
        expect(resolveDelegationCipherKey({ keyEnv: 'AGENT_TEST_MISSING_ENV_VAR' })).toBeUndefined();
        expect(resolveDelegationCipherKey({ key: 'inline' })).toEqual('inline');
        process.env.AGENT_TEST_DELEGATION_KEY = 'from-env';
        expect(resolveDelegationCipherKey({ keyEnv: 'AGENT_TEST_DELEGATION_KEY' })).toEqual('from-env');
        expect(resolveDelegationCipherKey({ key: 'inline', keyEnv: 'AGENT_TEST_DELEGATION_KEY' })).toEqual('inline');
        delete process.env.AGENT_TEST_DELEGATION_KEY;
    }

    @Test('runWithConcurrency caps peak in-flight at the limit and preserves order')
    async concurrencyBounded() {
        let inFlight = 0;
        let peak = 0;
        const fn = async (value: number) => {
            inFlight++;
            peak = Math.max(peak, inFlight);
            await new Promise(resolve => setTimeout(resolve, 5));
            inFlight--;
            return value * 10;
        };
        const results = await runWithConcurrency([1, 2, 3, 4], 2, fn);
        expect(peak).toBeLessThanOrEqual(2);
        expect(results.map(r => r.status === 'fulfilled' ? (r as any).value : null)).toEqual([10, 20, 30, 40]);
    }

    @Test('runWithConcurrency with undefined or oversized limit runs unbounded')
    async concurrencyUnbounded() {
        let inFlight = 0;
        let peak = 0;
        const fn = async () => {
            inFlight++;
            peak = Math.max(peak, inFlight);
            await new Promise(resolve => setTimeout(resolve, 5));
            inFlight--;
            return 'ok';
        };
        await runWithConcurrency([1, 2, 3], undefined, fn);
        expect(peak).toBe(3);
        peak = 0;
        await runWithConcurrency([1, 2, 3], 10, fn);
        expect(peak).toBe(3);
    }

    @Test('lightweight runner passes explicit profile turn-level and skips session profile')
    async explicitProfileOverridesWorkerProfile() {
        const turns: Array<{ profile?: string; agent?: any }> = [];
        let sessionProfileSet = false;
        const mockRuntime = createMockRuntime({
            runTurn: async (_sessionId: string, _input: string, _principal?: string, _message?: any, profile?: string, agent?: any) => {
                turns.push({ profile, agent });
                return { message: { content: 'Summary: done', metadata: {} } };
            },
            setSessionModelProfile: () => { sessionProfileSet = true; },
            clearSessionModelProfile: () => { sessionProfileSet = true; }
        });
        const runner = new LightweightAgentRunner(new RandomUuidGenerator(),mockRuntime as any,undefined,{ delegation: { workerModelProfiles: { spawn_agent: 'strong' } } } as any);
        await runner.run({ prompt: 'test', workerClass: 'spawn_agent', profile: 'explicit' });
        expect(turns.length).toBe(1);
        expect(turns[0].profile).toEqual('explicit');
        expect(sessionProfileSet).toBe(false);
    }

    @Test('lightweight runner keeps worker-class profile when no explicit profile')
    async workerProfileStillApplies() {
        const setProfiles: string[] = [];
        const mockRuntime = createMockRuntime({
            runTurn: async () => ({ message: { content: 'Summary: done', metadata: {} } }),
            setSessionModelProfile: (sessionId: string, profile: string) => { setProfiles.push(`${sessionId}:${profile}`); },
            clearSessionModelProfile: () => { }
        });
        const runner = new LightweightAgentRunner(new RandomUuidGenerator(),mockRuntime as any,undefined,{ delegation: { workerModelProfiles: { spawn_agent: 'strong' } } } as any);
        await runner.run({ prompt: 'test', workerClass: 'spawn_agent' });
        expect(setProfiles.length).toBe(1);
        expect(setProfiles[0]).toContain(':strong');
    }

    @Test('lightweight runner forwards reasoning into the turn agent config')
    async reasoningForwarded() {
        const agents: any[] = [];
        const mockRuntime = createMockRuntime({
            runTurn: async (_sessionId: string, _input: string, _principal?: string, _message?: any, _profile?: string, agent?: any) => {
                agents.push(agent);
                return { message: { content: 'Summary: done', metadata: {} } };
            }
        });
        const runner = new LightweightAgentRunner(new RandomUuidGenerator(),mockRuntime as any);
        await runner.run({ prompt: 'test', reasoning: true });
        expect(agents.length).toBe(1);
        expect(agents[0]).toEqual({ reasoning: true });
    }

    @Test('lightweight runner injects secrets into the child prompt only')
    async secretsInjectedIntoPrompt() {
        const prompts: string[] = [];
        let capturedMetadata: Record<string, any> | undefined;
        const mockRuntime = createMockRuntime({
            runTurn: async (_sessionId: string, input: string) => {
                prompts.push(input);
                return { message: { content: 'Summary: done', metadata: {} } };
            },
            registerChildSession: (_parent: string, _child: string, metadata?: Record<string, any>) => { capturedMetadata = metadata; }
        });
        const runner = new LightweightAgentRunner(new RandomUuidGenerator(),mockRuntime as any);
        await runner.run({
            prompt: 'run the report',
            parentSessionId: 'parent-1',
            secrets: { API_KEY: 'sk-super-secret' }
        });
        expect(prompts[0]).toContain('API_KEY: sk-super-secret');
        expect(prompts[0]).toContain('## Secrets');
        expect(String(capturedMetadata?.goal)).not.toContain('sk-super-secret');
        expect(String(capturedMetadata?.goal)).toContain('run the report');
    }

    @Test('lightweight runner seals delegation metadata when encryption is configured')
    async metadataSealedWithCipher() {
        const prompts: string[] = [];
        let capturedMetadata: Record<string, any> | undefined;
        const mockRuntime = createMockRuntime({
            runTurn: async (_sessionId: string, input: string) => {
                prompts.push(input);
                return { message: { content: 'Summary: done', metadata: {} } };
            },
            registerChildSession: (_parent: string, _child: string, metadata?: Record<string, any>) => { capturedMetadata = metadata; }
        });
        const runner = new LightweightAgentRunner(new RandomUuidGenerator(),mockRuntime as any,undefined,{ delegation: { encryption: { key: 'delegation-key' } } } as any);
        await runner.run({
            prompt: 'run the report',
            parentSessionId: 'parent-1',
            secrets: { API_KEY: 'sk-super-secret' }
        });
        const cipher = createDelegationCipher('delegation-key');
        expect(capturedMetadata?.sealed).toBe(true);
        expect(String(capturedMetadata?.goal)).not.toContain('run the report');
        expect(cipher.decrypt(String(capturedMetadata?.goal))).toContain('run the report');
        expect(cipher.decrypt(String(capturedMetadata?.secrets?.API_KEY))).toEqual('sk-super-secret');
        expect(prompts[0]).toContain('API_KEY: sk-super-secret');
    }

    @Test('lightweight runner plaintext metadata is unchanged without secrets or cipher')
    async plaintextPassthrough() {
        let capturedMetadata: Record<string, any> | undefined;
        const mockRuntime = createMockRuntime({
            runTurn: async () => ({ message: { content: 'Summary: done', metadata: {} } }),
            registerChildSession: (_parent: string, _child: string, metadata?: Record<string, any>) => { capturedMetadata = metadata; }
        });
        const runner = new LightweightAgentRunner(new RandomUuidGenerator(),mockRuntime as any);
        await runner.run({ prompt: 'plain goal', parentSessionId: 'parent-1' });
        expect(capturedMetadata?.goal).toEqual('plain goal');
        expect(capturedMetadata?.sealed).toBeUndefined();
    }

    @Test('lightweight runner bounds parallel batch concurrency from the request')
    async parallelBatchConcurrency() {
        let inFlight = 0;
        let peak = 0;
        const mockRuntime = createMockRuntime({
            runTurn: async () => {
                inFlight++;
                peak = Math.max(peak, inFlight);
                await new Promise(resolve => setTimeout(resolve, 5));
                inFlight--;
                return { message: { content: 'Summary: done', metadata: {} } };
            }
        });
        const runner = new LightweightAgentRunner(new RandomUuidGenerator(),mockRuntime as any);
        const requests = Array.from({ length: 4 }, (_, index) => ({
            prompt: `task-${index}`,
            concurrency: 2
        }));
        const results = await runner.runParallel(requests as any);
        expect(peak).toBeLessThanOrEqual(2);
        expect(results.length).toBe(4);
        expect(results.every(r => r.content.includes('Summary: done'))).toBe(true);
    }

    @Test('lightweight runner tags imported sub-agent messages so the model transcript can exclude them')
    async subAgentImportIsTaggedDisplayOnly() {
        // Regression (real DeepSeek run): the runner imported the sub-agent
        // transcript into the parent session verbatim, so the child's
        // user/assistant/tool turns landed between the parent's assistant
        // `tool_calls` and the spawn_agent tool result. The provider then rejected
        // the next request (400: "An assistant message with 'tool_calls' must be
        // followed by tool messages responding to each 'tool_call_id'"). The import
        // is kept for display, but every imported message is tagged and the runtime
        // drops tagged messages from the model request (buildModelRequest).
        const appends: Array<{ sessionId: string; role?: string; metadata?: Record<string, any> }> = [];
        const childMessages = [
            { role: 'user', content: 'Complete the delegated task independently…' },
            { role: 'assistant', content: 'working' },
            { role: 'tool', content: '{}' },
            { role: 'assistant', content: 'Summary: done' }
        ];
        const mockRuntime = createMockRuntime({
            runTurn: async () => ({ message: { content: 'Summary: done', metadata: {} } }),
            getMessages: async () => childMessages,
            registerChildSession: () => { }
        });
        const mockSessions: any = {
            append: async (sessionId: string, message: any) => {
                appends.push({ sessionId, role: message?.role, metadata: message?.metadata });
            }
        };
        const runner = new LightweightAgentRunner(new RandomUuidGenerator(), mockRuntime as any, mockSessions);
        await runner.run({ prompt: 'research secrets', parentSessionId: 'parent-1' });

        const imported = appends.filter(entry => entry.sessionId === 'parent-1');
        // The import feature is preserved (all child messages still land in the parent)…
        expect(imported.length).toEqual(childMessages.length);
        expect(imported.map(entry => entry.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
        // …but every one is tagged so it can be excluded from the model transcript.
        expect(imported.every(entry => typeof entry.metadata?.[IMPORTED_MESSAGE_METADATA_KEY] === 'string')).toBe(true);
        expect(new Set(imported.map(entry => entry.metadata?.[IMPORTED_MESSAGE_METADATA_KEY])).size).toEqual(1);
    }

    @Test('parseDelegatedAgentReport tolerates markdown-decorated labels')
    parsesMarkdownDecoratedReport() {
        // Regression (real DeepSeek run): the delegated sub-agent kept receiving
        // "Continue the delegated task…" because its report used markdown headings
        // and bold labels ("## Summary:", "**Next steps:**"), which the strict
        // `^\s*Summary:` parser never matched — so the runner looped the worker up
        // to maxTurns even after it had finished.
        const report = parseDelegatedAgentReport([
            '## Summary: finished the delegated pass',
            '- Completed: wrote tests, updated docs',
            '**Next steps:** review diff, merge branch'
        ].join('\n'));
        expect(report?.summary).toEqual('finished the delegated pass');
        expect(report?.completed).toEqual(['wrote tests', 'updated docs']);
        expect(report?.nextSteps).toEqual(['review diff', 'merge branch']);
    }

    @Test('lightweight runner forwards llm_task model overrides to the worker turn')
    async forwardsWorkerModelOverrides() {
        // Regression: NestedAgentRunRequest carries model/temperature/maxTokens
        // (llm_task documents and forwards all three), but runSingle only passed
        // `reasoning`, so the other three were silently dropped.
        let capturedAgent: any;
        const mockRuntime = createMockRuntime({
            runTurn: async (_sessionId: string, _input: string, _principalId?: string, _message?: any, _profile?: string, agent?: any) => {
                capturedAgent = agent;
                return { message: { content: 'Summary: ok', metadata: {} } };
            }
        });
        const runner = new LightweightAgentRunner(new RandomUuidGenerator(), mockRuntime as any);
        await runner.run({ prompt: 'x', temperature: 0, maxTokens: 123, model: 'gpt-x' } as any);
        expect(capturedAgent?.temperature).toEqual(0);
        expect(capturedAgent?.maxTokens).toEqual(123);
        expect(capturedAgent?.model).toEqual('gpt-x');
    }
}
