import { Injectable } from '@tsdi/ioc';
import { spawn, spawnSync, ChildProcessByStdio } from 'child_process';
import { Readable } from 'stream';
import { promises as fs, closeSync, mkdtempSync, openSync, readSync, rmSync, statSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AudioCaptureAdapter, AudioCaptureSessionEvents, AudioCaptureAdapterOptions, AudioPlaybackAdapter, AudioPlaybackOptions } from '@tsdi/common';

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
     * Custom commands can write capture bytes to `TSDI_AUDIO_OUTPUT`; stdout
     * remains supported for backwards compatibility.
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
    private captureTempDir = '';
    private capturePath = '';
    private captureOffset = 0;
    private capturePoll?: ReturnType<typeof setInterval>;

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

        this.prepareCaptureFile();
        const { cmd, args } = this.buildCommand(sampleRate, channels, device, extraArgs, this.capturePath);
        const proc = spawn(cmd, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env, TSDI_AUDIO_OUTPUT: this.capturePath }
        });
        this.proc = proc;
        this.capturePoll = setInterval(() => this.drainCaptureFile(events), 20);

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
            this.cleanupCaptureFile();
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
            this.drainCaptureFile(events);
            this.cleanupCaptureFile();
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

    private buildCommand(sampleRate: number, channels: number, device: string, extraArgs: string[], outputPath: string): { cmd: string; args: string[] } {
        const command = this.resolvedCommand!;
        if (command === 'arecord') {
            return {
                cmd: command,
                args: [...extraArgs, '-D', device, '-f', 'S16_LE', '-r', String(sampleRate), '-c', String(channels), '-t', 'raw', outputPath]
            };
        }
        if (command === 'sox') {
            return {
                cmd: command,
                args: [...extraArgs, '-d', '-t', 'raw', '-r', String(sampleRate), '-c', String(channels), '-b', '16', '-e', 'signed-integer', outputPath]
            };
        }
        if (command === 'ffmpeg') {
            return {
                cmd: command,
                args: [...extraArgs, '-f', 'alsa', '-i', device, '-ar', String(sampleRate), '-ac', String(channels), '-f', 's16le', '-y', outputPath]
            };
        }
        // Custom command: rely on the caller-provided args entirely.
        return { cmd: command, args: extraArgs };
    }

    private prepareCaptureFile(): void {
        this.cleanupCaptureFile();
        this.captureTempDir = mkdtempSync(path.join(os.tmpdir(), 'tsdi-capture-'));
        this.capturePath = path.join(this.captureTempDir, 'capture.pcm');
        writeFileSync(this.capturePath, Buffer.alloc(0), { mode: 0o600 });
        this.captureOffset = 0;
    }

    private drainCaptureFile(events: AudioCaptureSessionEvents): void {
        if (!this.capturePath || this.cancelled) return;
        try {
            const size = statSync(this.capturePath).size;
            if (size <= this.captureOffset) return;
            const chunk = Buffer.alloc(size - this.captureOffset);
            const fd = openSync(this.capturePath, 'r');
            try {
                const bytesRead = readSync(fd, chunk, 0, chunk.length, this.captureOffset);
                this.captureOffset += bytesRead;
                if (bytesRead > 0) events.onChunk?.(new Uint8Array(chunk.buffer, chunk.byteOffset, bytesRead));
            } finally {
                closeSync(fd);
            }
        } catch {
            // The process may rotate/remove the file while it is closing.
        }
    }

    private cleanupCaptureFile(): void {
        if (this.capturePoll) clearInterval(this.capturePoll);
        this.capturePoll = undefined;
        if (this.captureTempDir) rmSync(this.captureTempDir, { recursive: true, force: true });
        this.captureTempDir = '';
        this.capturePath = '';
        this.captureOffset = 0;
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

export interface NodeAudioPlaybackAdapterOptions {
    command?: string;
    args?: string[];
}

const PLAYBACK_DETECT_ORDER = ['aplay', 'ffplay', 'play'];

/** Plays synthesized audio by piping it to an installed command-line player. */
@Injectable()
export class NodeAudioPlaybackAdapter extends AudioPlaybackAdapter {
    private readonly resolvedCommand: string | null;
    private proc: ReturnType<typeof spawn> | null = null;

    constructor(private readonly options: NodeAudioPlaybackAdapterOptions = {}) {
        super();
        this.resolvedCommand = this.resolveCommand(options.command);
    }

    get isAvailable(): boolean {
        return this.resolvedCommand !== null;
    }

    get missingComponents(): string[] {
        return this.resolvedCommand ? [] : [this.options.command
            ? `audio playback command '${this.options.command}' not found on PATH`
            : `no supported audio playback command found on PATH (probed ${PLAYBACK_DETECT_ORDER.join(', ')})`];
    }

    async play(chunks: Uint8Array[], options: AudioPlaybackOptions): Promise<void> {
        if (!this.resolvedCommand) {
            throw new Error(this.missingComponents[0]);
        }
        await this.stop();
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tsdi-audio-'));
        const audioPath = path.join(tempDir, `reply.${options.format === 'pcm16k' ? 'pcm' : options.format}`);
        try {
            await fs.writeFile(audioPath, Buffer.concat(chunks.map(chunk => Buffer.from(chunk))), { mode: 0o600 });
            const proc = spawn(this.resolvedCommand, this.buildArgs(options, audioPath), { stdio: ['ignore', 'ignore', 'pipe'] });
            this.proc = proc;
            let stderr = '';
            proc.stderr?.on('data', chunk => { stderr += String(chunk); });
            await new Promise<void>((resolve, reject) => {
                proc.once('error', reject);
                proc.once('close', code => code === 0 || code === null
                    ? resolve()
                    : reject(new Error(`audio playback process exited with code ${code}${stderr.trim() ? `: ${stderr.trim()}` : ''}`)));
            });
        } finally {
            this.proc = null;
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }

    async stop(): Promise<void> {
        const proc = this.proc;
        if (!proc) return;
        this.proc = null;
        proc.kill('SIGTERM');
    }

    private resolveCommand(preferred?: string): string | null {
        const candidates = preferred ? [preferred] : PLAYBACK_DETECT_ORDER;
        return candidates.find(command => {
            try {
                return spawnSync(command, ['--version'], { stdio: 'ignore', timeout: 3000 }).status === 0;
            } catch {
                return false;
            }
        }) ?? null;
    }

    private buildArgs(options: AudioPlaybackOptions, audioPath: string): string[] {
        if (this.options.args) return [...this.options.args, audioPath];
        if (this.resolvedCommand === 'aplay') {
            return options.format === 'pcm16k'
                ? ['-q', '-t', 'raw', '-f', 'S16_LE', '-r', String(options.sampleRate ?? 16000), '-c', String(options.channels ?? 1), audioPath]
                : ['-q', audioPath];
        }
        if (this.resolvedCommand === 'ffplay') {
            const input = options.format === 'pcm16k'
                ? ['-f', 's16le', '-ar', String(options.sampleRate ?? 16000), '-ac', String(options.channels ?? 1)]
                : [];
            return ['-nodisp', '-autoexit', '-loglevel', 'quiet', ...input, '-i', audioPath];
        }
        return ['-q', audioPath];
    }
}
