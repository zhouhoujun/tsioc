import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ConsoleTerminalSurfaceLifecycle, ConsoleTerminalSurfaceLifecycleService, resolveConsoleTranscriptLayoutFlags } from '../src/terminal';

function lifecycle(overrides: Record<string, unknown> = {}) {
    return {
        getTerminalRoot: () => undefined,
        ...overrides
    } as any;
}

@Suite('console transcript layout')
export class ConsoleTranscriptLayoutTest {
    @Test('maps viewport to alternate screen and surface row scroll')
    viewport() {
        expect(resolveConsoleTranscriptLayoutFlags('viewport', lifecycle())).toEqual({
            nativeScrollback: false,
            scrollViewport: true,
            alternateScreen: true
        });
    }

    @Test('maps scrollback to native scrollback')
    scrollback() {
        expect(resolveConsoleTranscriptLayoutFlags('scrollback', lifecycle())).toEqual({
            nativeScrollback: true,
            scrollViewport: false,
            alternateScreen: false
        });
    }

    @Test('keeps the legacy stream mode as a scrollback alias')
    legacyStream() {
        expect(resolveConsoleTranscriptLayoutFlags('stream' as any, lifecycle())).toEqual({
            nativeScrollback: true,
            scrollViewport: false,
            alternateScreen: false
        });
    }

    @Test('restartRendering re-evaluates the alternate screen after a runtime mode switch')
    restartRenderingSwitchesBuffers() {
        const writes: string[] = [];
        let mode: 'scrollback' | 'viewport' = 'viewport';
        const lifecycle = {
            getTerminalRoot: () => ({} as any),
            resolveConsoleLayout: () => mode,
            shouldEnableTerminalMouseTracking: () => false
        };
        const injector = { get: (token: any) => token === ConsoleTerminalSurfaceLifecycle ? lifecycle : null };
        const service = new ConsoleTerminalSurfaceLifecycleService(injector as any);
        Object.defineProperty(service, 'output', {
            value: {
                isTTY: true,
                write(value: string) {
                    writes.push(value);
                }
            },
            configurable: true
        });

        service.startRendering();
        expect(writes.join('')).toContain('\x1b[?1049h');

        mode = 'scrollback';
        service.restartRendering();
        const afterSwitch = writes.join('');
        expect(afterSwitch).toContain('\x1b[?1049l');
        expect(afterSwitch.slice(afterSwitch.lastIndexOf('\x1b[?1049l'))).not.toContain('\x1b[?1049h');

        mode = 'viewport';
        service.restartRendering();
        expect(writes.join('').slice(writes.join('').lastIndexOf('\x1b[?1049l'))).toContain('\x1b[?1049h');
    }

    @Test('restartRendering keeps surface resize listeners across the restart')
    restartRenderingKeepsResizeListeners() {
        const calls: string[] = [];
        class Probe extends ConsoleTerminalSurfaceLifecycleService {
            startRendering(): void {
                calls.push('start');
            }
            stopRendering(): void {
                calls.push('stop');
                (this as any).surfaceResizeListeners.clear();
            }
        }
        const service = new Probe({} as any);
        (service as any).rendering = true;
        const listener = () => undefined;
        (service as any).surfaceResizeListeners.add(listener);

        service.restartRendering();

        expect(calls).toEqual(['stop', 'start']);
        expect((service as any).surfaceResizeListeners.has(listener)).toEqual(true);
    }

    @Test('restartRendering before start is a no-op so startup keeps the persisted layout')
    restartBeforeStartIsNoop() {
        const writes: string[] = [];
        const service = new ConsoleTerminalSurfaceLifecycleService({ get: () => null } as any);
        Object.defineProperty(service, 'output', {
            value: {
                isTTY: true,
                write(value: string) {
                    writes.push(value);
                }
            },
            configurable: true
        });

        service.restartRendering();

        expect(writes).toEqual([]);
    }

    @Test('falls back to the lifecycle booleans when no layout mode is set')
    fallback() {
        expect(resolveConsoleTranscriptLayoutFlags(undefined, lifecycle({
            shouldUseNativeScrollback: () => true,
            shouldScrollViewport: () => false,
            shouldUseAlternateScreen: () => false
        }))).toEqual({
            nativeScrollback: true,
            scrollViewport: false,
            alternateScreen: false
        });
    }
}
