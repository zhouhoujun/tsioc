import { Injectable } from '@tsdi/ioc';
import { spawn, spawnSync, ChildProcessByStdio } from 'child_process';
import { Readable } from 'stream';
import { AudioCaptureAdapter, AudioCaptureSessionEvents, AudioCaptureAdapterOptions } from '@tsdi/common';

type AudioCaptureProc = ChildProcessByStdio<null, Readable, Readable>;

/**
 * Options for {@link NodeAudioCaptureAdapter}.
 */
export interface NodeAudioCaptureAdapterOptions extends AudioCaptureAdapterOptions {
    /**
     * Capture command to run. When omitted, the adapter probes for
     * `arecord`, `sox` and `ffmpeg` (in that order) on the PATH.
     */
    command?: string;
    /**
     * Extra arguments appended before the generated format arguments.
     */
    args?: string[];
    /**
     * Capture device name (e.g. ALSA `default` or `plughw:0`). Passed to
     * commands that accept a device argument.
     */
    device?: string;
}

const DETECT_ORDER = ['arecord', 'sox', 'ffmpeg'];

/**
 * Node audio capture adapter — captures the microphone through an external
 * process (`arecord`, `sox` or `ffmpeg`) and streams raw PCM chunks through
 * {@link AudioCaptureSessionEvents.onChunk}.
 *
 * Availability is probed at construction time by looking the configured
 * command up on the PATH; when no supported command is present,
 * {@link isAvailable} is `false` and {@link missingComponents} names the
 * probed binaries.
 *
 * @example
 * const adapter = new NodeAudioCaptureAdapter({ sampleRate: 16000, channels: 1 });
 * await adapter.start({
 *     onChunk: chunk => console.log('captured', chunk.byteLength, 'bytes'),
 *     onEnd: () => console.log('capture ended'),
 *     onError: error => console.error(error)
 * });
 * await adapter.stop();
 */
@Injectable()
export class NodeAudioCaptureAdapter extends AudioCaptureAdapter {
    readonly format: 'pcm16k' | 'wav' | 'webm' = 'pcm16k';

    private readonly resolvedCommand: string | null;
    private proc: AudioCaptureProc | null = null;
    private session: AudioCaptureSessionEvents | null = null;
    private stopping = false;
    private cancelled = false;
    private ended = false;

    constructor(private readonly options: NodeAudioCaptureAdapterOptions = {}) {
        super();
        this.resolvedCommand = this.resolveCommand(options.command);
    }

    get isAvailable(): boolean {
        return this.resolvedCommand !== null;
    }

    get missingComponents(): string[] {
        if (this.resolvedCommand) {
            return [];
        }
        return [this.options.command
            ? `audio capture command '${this.options.command}' not found on PATH`
            : `no supported audio capture command found on PATH (probed ${DETECT_ORDER.join(', ')})`];
    }

    start(events: AudioCaptureSessionEvents, options?: AudioCaptureAdapterOptions): void {
        if (!this.resolvedCommand) {
            queueMicrotask(() => events.onError?.(new Error(this.missingComponents[0])));
            return;
        }
        if (this.proc) {
            throw new Error('audio capture session already active; call stop() or cancel() first');
        }
        this.session = events;
        this.stopping = false;
        this.cancelled = false;
        this.ended = false;

        const sampleRate = options?.sampleRate ?? this.options.sampleRate ?? 16000;
        const channels = options?.channels ?? this.options.channels ?? 1;
        const nodeOptions = options as NodeAudioCaptureAdapterOptions | undefined;
        const device = nodeOptions?.device ?? this.options.device ?? 'default';
        const extraArgs = nodeOptions?.args ?? this.options.args ?? [];

        const { cmd, args } = this.buildCommand(sampleRate, channels, device, extraArgs);
        const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        this.proc = proc;

        proc.stdout.on('data', (chunk: Buffer) => {
            if (this.proc !== proc || this.stopping || this.cancelled) {
                return;
            }
            events.onChunk?.(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
        });

        proc.stderr.on('data', (_chunk: Buffer) => {
            // Keep the process alive if it writes to stderr (e.g. sox progress);
            // errors surface through the close handler below.
        });

        proc.on('error', (error: Error) => {
            if (this.proc !== proc || this.ended) {
                return;
            }
            this.ended = true;
            this.proc = null;
            const session = this.session;
            this.session = null;
            session?.onError?.(error);
        });

        proc.on('close', (code: number | null) => {
            if (this.proc !== proc || this.ended) {
                return;
            }
            this.ended = true;
            this.proc = null;
            const session = this.session;
            this.session = null;
            if (this.cancelled) {
                // cancel(): discard buffered audio, no terminal callback.
                return;
            }
            if (this.stopping || code === 0 || code === null) {
                // stop() or natural end: flush then signal the owner.
                session?.onEnd?.();
                return;
            }
            session?.onError?.(new Error(`audio capture process exited with code ${code}`));
        });
    }

    async stop(): Promise<void> {
        const proc = this.proc;
        if (!proc) {
            return;
        }
        this.stopping = true;
        proc.kill('SIGTERM');
        await this.waitClose(proc, 2000);
    }

    async cancel(): Promise<void> {
        const proc = this.proc;
        if (!proc) {
            return;
        }
        this.cancelled = true;
        proc.kill('SIGKILL');
        await this.waitClose(proc, 1000);
    }

    private resolveCommand(preferred?: string): string | null {
        if (preferred) {
            return this.commandExists(preferred) ? preferred : null;
        }
        for (const candidate of DETECT_ORDER) {
            if (this.commandExists(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    private commandExists(command: string): boolean {
        try {
            const result = spawnSync(command, ['--version'], { stdio: 'ignore', timeout: 3000 });
            return result.status === 0;
        } catch {
            return false;
        }
    }

    private buildCommand(sampleRate: number, channels: number, device: string, extraArgs: string[]): { cmd: string; args: string[] } {
        const command = this.resolvedCommand!;
        if (command === 'arecord') {
            return {
                cmd: command,
                args: [...extraArgs, '-D', device, '-f', 'S16_LE', '-r', String(sampleRate), '-c', String(channels), '-t', 'raw']
            };
        }
        if (command === 'sox') {
            return {
                cmd: command,
                args: [...extraArgs, '-d', '-t', 'raw', '-r', String(sampleRate), '-c', String(channels), '-b', '16', '-e', 'signed-integer', '-']
            };
        }
        if (command === 'ffmpeg') {
            return {
                cmd: command,
                args: [...extraArgs, '-f', 'alsa', '-i', device, '-ar', String(sampleRate), '-ac', String(channels), '-f', 's16le', '-']
            };
        }
        // Custom command: rely on the caller-provided args entirely.
        return { cmd: command, args: extraArgs };
    }

    private waitClose(proc: AudioCaptureProc, timeoutMs: number): Promise<void> {
        return new Promise(resolve => {
            let settled = false;
            const done = () => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve();
                }
            };
            const timer = setTimeout(() => {
                if (!settled && proc.exitCode === null && proc.signalCode === null) {
                    proc.kill('SIGKILL');
                }
                done();
            }, timeoutMs);
            proc.once('close', done);
            proc.once('error', done);
        });
    }
}
