import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as http from 'http';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { WebSearchTool } from '../web/web-search.tool';
import { WebExtractTool } from '../web/web-extract.tool';
import { ImageGenerateTool } from '../media/image-generate.tool';
import { VisionAnalyzeTool } from '../media/vision-analyze.tool';
import { AudioTranscribeTool } from '../audio/audio-transcribe.tool';
import { TextToSpeechTool } from '../audio/text-to-speech.tool';
import { SecurityScanTool } from '../security/security-scan.tool';

const CANCELLED_MESSAGE = 'Command cancelled by the user.';

interface RecordedSignal {
    signal?: AbortSignal;
}

/**
 * Adapter method that remembers the signal it received and only settles when
 * the turn is aborted, like a host adapter that can cancel its network call.
 */
function hangingOnAbort(recorded: RecordedSignal, pick: (args: any[]) => AbortSignal | undefined) {
    return (...args: any[]) => {
        const signal = pick(args);
        recorded.signal = signal;
        return new Promise<any>((_resolve, reject) => {
            if (!signal) {
                // The old tool sent no signal at all: stay pending so the
                // watchdog below fails the test instead of passing silently.
                return;
            }
            if (signal.aborted) {
                reject(new Error('aborted'));
                return;
            }
            signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        });
    };
}

/** Watch a promise for `ms`, so a missing cancellation fails instead of hanging. */
async function captureSettlement(promise: Promise<unknown>, ms: number): Promise<{ error?: Error; timedOut: boolean }> {
    let guard: NodeJS.Timeout | undefined;
    try {
        const outcome = await Promise.race([
            promise.then(() => 'resolved' as const).catch((error: unknown) => error),
            new Promise<'hung'>(resolve => {
                guard = setTimeout(() => resolve('hung'), ms);
            })
        ]);
        if (outcome === 'hung') {
            return { timedOut: true };
        }
        return outcome === 'resolved' ? { timedOut: false } : { error: outcome as Error, timedOut: false };
    } finally {
        if (guard) {
            clearTimeout(guard);
        }
    }
}

/** Start the tool call, interrupt it like Esc, and report how it settled. */
async function abortAfterStart(
    invoke: (context: any) => Promise<unknown>,
    controller: AbortController,
    waitMs = 70
): Promise<{ error?: Error; timedOut: boolean }> {
    const pending = invoke({ sessionId: 's1', signal: controller.signal });
    await new Promise(resolve => setTimeout(resolve, waitMs));
    controller.abort();
    return captureSettlement(pending, 1500);
}

@Suite('agent-tools: turn signal forwarding')
export class ToolTurnSignalTest {
    @Test('web_search forwards the turn signal to the search adapter')
    async webSearchForwardsSignal() {
        const recorded: RecordedSignal = {};
        const tool = new WebSearchTool({
            web: { search: { search: hangingOnAbort(recorded, args => args[2]) } }
        } as any);
        const controller = new AbortController();

        const settled = await abortAfterStart(context => tool.invoke({ query: 'tsdi' }, context), controller);

        expect(recorded.signal).toBe(controller.signal);
        expect(settled.timedOut).toEqual(false);
        expect(settled.error?.message).toEqual(CANCELLED_MESSAGE);
    }

    @Test('image_generate forwards the turn signal to the image adapter')
    async imageGenerateForwardsSignal() {
        const recorded: RecordedSignal = {};
        const tool = new ImageGenerateTool({
            generate: hangingOnAbort(recorded, args => args[1]?.signal)
        } as any);
        const controller = new AbortController();

        const settled = await abortAfterStart(context => tool.invoke({ prompt: 'a cat' }, context), controller);

        expect(recorded.signal).toBe(controller.signal);
        expect(settled.error?.message).toEqual(CANCELLED_MESSAGE);
    }

    @Test('vision_analyze forwards the turn signal to the vision adapter')
    async visionAnalyzeForwardsSignal() {
        const recorded: RecordedSignal = {};
        const tool = new VisionAnalyzeTool({
            analyze: hangingOnAbort(recorded, args => args[2])
        } as any);
        const controller = new AbortController();

        const settled = await abortAfterStart(context => tool.invoke({ image_url: 'https://example.com/a.png' }, context), controller);

        expect(recorded.signal).toBe(controller.signal);
        expect(settled.error?.message).toEqual(CANCELLED_MESSAGE);
    }

    @Test('audio_transcribe forwards the turn signal to the transcription adapter')
    async audioTranscribeForwardsSignal() {
        const recorded: RecordedSignal = {};
        const tool = new AudioTranscribeTool({
            transcribe: hangingOnAbort(recorded, args => args[1]?.signal)
        } as any);
        const controller = new AbortController();

        const settled = await abortAfterStart(context => tool.invoke({ audio_url: 'https://example.com/a.mp3' }, context), controller);

        expect(recorded.signal).toBe(controller.signal);
        expect(settled.error?.message).toEqual(CANCELLED_MESSAGE);
    }

    @Test('text_to_speech forwards the turn signal to the TTS adapter')
    async textToSpeechForwardsSignal() {
        const recorded: RecordedSignal = {};
        const tool = new TextToSpeechTool({
            synthesize: hangingOnAbort(recorded, args => args[1]?.signal)
        } as any);
        const controller = new AbortController();

        const settled = await abortAfterStart(context => tool.invoke({ text: 'hello' }, context), controller);

        expect(recorded.signal).toBe(controller.signal);
        expect(settled.error?.message).toEqual(CANCELLED_MESSAGE);
    }

    @Test('security_scan forwards the turn signal to the scanner adapter')
    async securityScanForwardsSignal() {
        const workspace = mkdtempSync(join(tmpdir(), 'scan-signal-'));
        writeFileSync(join(workspace, 'probe.ts'), 'export const a = 1;\n');
        const recorded: RecordedSignal = {};
        const tool = new SecurityScanTool(
            { file: { rootDir: workspace } } as any,
            { scan: hangingOnAbort(recorded, args => args[1]?.signal) } as any
        );
        const controller = new AbortController();
        try {
            const settled = await abortAfterStart(context => tool.invoke({ path: 'probe.ts' }, context), controller);

            expect(recorded.signal).toBe(controller.signal);
            expect(settled.error?.message).toEqual(CANCELLED_MESSAGE);
        } finally {
            rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('web_extract stops on the turn signal instead of waiting for the response')
    async webExtractHonoursTurnSignal() {
        const server = http.createServer((_req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write('<html><head><title>t</title></head><body>partial');
            // never call res.end(): the body stalls
        });
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
        const port = (server.address() as any).port as number;
        try {
            const tool = new WebExtractTool();
            const controller = new AbortController();
            const startedAt = Date.now();
            const pending = tool.invoke(
                { url: `http://127.0.0.1:${port}/` },
                { sessionId: 's1', signal: controller.signal } as any
            );
            await new Promise(resolve => setTimeout(resolve, 150));
            controller.abort();

            const settled = await captureSettlement(pending, 2000);
            expect(settled.timedOut).toEqual(false);
            expect(settled.error?.message).toEqual(CANCELLED_MESSAGE);
            expect(Date.now() - startedAt).toBeLessThan(1500);
        } finally {
            const closable = server as http.Server & { closeAllConnections?: () => void };
            closable.closeAllConnections?.();
            server.close();
        }
    }

    @Test('a search adapter that finishes normally still returns its results')
    async webSearchReturnsResults() {
        const tool = new WebSearchTool({
            web: {
                search: {
                    async search(query: string) {
                        return [{ title: query, url: 'https://example.com', snippet: 'snippet' }];
                    }
                }
            }
        } as any);

        const result = await tool.invoke({ query: 'tsdi' }, { sessionId: 's1' } as any);

        expect(result.results.length).toEqual(1);
        expect(result.results[0].url).toEqual('https://example.com');
    }
}
