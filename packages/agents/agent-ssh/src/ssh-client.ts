import { Client, ClientChannel, ConnectConfig } from 'ssh2';
import { Buffer } from 'buffer';
import { SshHostConfig, defaultSshHostConfig, resolveSshAuth, resolveSshHostKey } from './ssh-config';

export interface SshExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
}

export interface SshShellSession {
    stream: ClientChannel;
    write(input: string): boolean;
    close(): Promise<void>;
}

export interface SshSftpResult {
    bytes: number;
    path: string;
}

export class SshClient {
    protected readonly client: Client;
    protected readonly config: SshHostConfig;
    protected ready = false;
    protected closed = false;

    constructor(config: SshHostConfig) {
        this.config = defaultSshHostConfig(config);
        this.client = new Client();
        this.client.on('error', () => {
            this.ready = false;
        });
        this.client.on('close', () => {
            this.ready = false;
            this.closed = true;
        });
    }

    get hostId(): string {
        return this.config.id ?? `${this.config.username}@${this.config.host}:${this.config.port}`;
    }

    get isConnected(): boolean {
        return this.ready && !this.closed;
    }

    connect(): Promise<void> {
        if (this.isConnected) {
            return Promise.resolve();
        }
        const connectConfig: ConnectConfig = {
            host: this.config.host,
            port: this.config.port,
            username: this.config.username,
            readyTimeout: this.config.readyTimeoutMs,
            keepaliveInterval: this.config.keepaliveIntervalMs,
            ...resolveSshAuth(this.config.auth)
        };
        if (this.config.knownHosts !== 'off') {
            connectConfig.hostHash = 'sha256';
            connectConfig.hostVerifier = this.createHostVerifier();
        }
        return new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`SSH connect to ${this.hostId} timed out after ${this.config.connectTimeoutMs} ms.`));
                this.safeEnd();
            }, this.config.connectTimeoutMs);
            this.client.once('ready', () => {
                clearTimeout(timer);
                this.ready = true;
                resolve();
            });
            this.client.once('error', error => {
                clearTimeout(timer);
                this.ready = false;
                reject(error);
            });
            this.client.connect(connectConfig);
        });
    }

    exec(command: string, timeoutMs = 60000, signal?: AbortSignal): Promise<SshExecResult> {
        return new Promise((resolve, reject) => {
            let settled = false;
            let timer: NodeJS.Timeout | undefined;
            let stream: ClientChannel | undefined;
            const finish = (settle: () => void) => {
                if (settled) {
                    return;
                }
                settled = true;
                if (timer) {
                    clearTimeout(timer);
                }
                signal?.removeEventListener('abort', onAbort);
                settle();
            };
            /** User interrupt (Esc): stop waiting and drop the channel. */
            const onAbort = () => {
                if (stream) {
                    this.safeEndStream(stream);
                }
                finish(() => reject(new Error('SSH command cancelled.')));
            };
            if (signal) {
                if (signal.aborted) {
                    onAbort();
                    return;
                }
                signal.addEventListener('abort', onAbort, { once: true });
            }
            this.client.exec(command, (error, channel) => {
                if (settled) {
                    // The turn was cancelled before the server answered.
                    this.safeEndStream(channel);
                    return;
                }
                if (error) {
                    finish(() => reject(error));
                    return;
                }
                stream = channel;
                let stdout = '';
                let stderr = '';
                let timedOut = false;
                timer = setTimeout(() => {
                    timedOut = true;
                    this.safeEndStream(channel);
                }, timeoutMs);
                channel.on('data', (chunk: Buffer) => {
                    stdout += String(chunk);
                });
                channel.stderr.on('data', (chunk: Buffer) => {
                    stderr += String(chunk);
                });
                channel.on('close', (code: number | null) => {
                    finish(() => resolve({
                        stdout: stdout.trim(),
                        stderr: stderr.trim(),
                        exitCode: timedOut ? 124 : (code ?? 0),
                        timedOut
                    }));
                });
                channel.on('error', (channelError: Error) => {
                    finish(() => reject(channelError));
                });
            });
        });
    }

    shell(options?: { term?: string; cols?: number; rows?: number }): Promise<SshShellSession> {
        return new Promise((resolve, reject) => {
            const shellOpts: any = {
                term: options?.term ?? 'xterm-256color',
                cols: options?.cols ?? 80,
                rows: options?.rows ?? 24
            };
            this.client.shell(shellOpts, (error, stream) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve({
                    stream,
                    write: (input: string) => stream.write(input),
                    close: () => new Promise<void>(closeResolve => {
                        stream.on('close', () => closeResolve());
                        try {
                            stream.end();
                        } catch {
                            closeResolve();
                        }
                    })
                });
            });
        });
    }

    sftpPut(localPath: string, remotePath: string): Promise<SshSftpResult> {
        return new Promise((resolve, reject) => {
            this.client.sftp((error, sftp) => {
                if (error) {
                    reject(error);
                    return;
                }
                const { promises: fs } = require('fs') as typeof import('fs');
                fs.readFile(localPath)
                    .then(data => {
                        sftp.writeFile(remotePath, data, writeError => {
                            if (writeError) {
                                reject(writeError);
                                return;
                            }
                            resolve({ bytes: data.length, path: remotePath });
                        });
                    })
                    .catch(reject);
            });
        });
    }

    sftpGet(remotePath: string, localPath: string): Promise<SshSftpResult> {
        return new Promise((resolve, reject) => {
            this.client.sftp((error, sftp) => {
                if (error) {
                    reject(error);
                    return;
                }
                sftp.readFile(remotePath, (readError, data) => {
                    if (readError) {
                        reject(readError);
                        return;
                    }
                    const { promises: fs } = require('fs') as typeof import('fs');
                    fs.writeFile(localPath, data)
                        .then(() => resolve({ bytes: data.length, path: localPath }))
                        .catch(reject);
                });
            });
        });
    }

    forwardOut(srcAddr: string, srcPort: number, destAddr: string, destPort: number): Promise<ClientChannel> {
        return new Promise((resolve, reject) => {
            this.client.forwardOut(srcAddr, srcPort, destAddr, destPort, (error, channel) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(channel);
            });
        });
    }

    async disconnect(): Promise<void> {
        if (!this.ready || this.closed) {
            return;
        }
        await new Promise<void>(resolve => {
            const onClose = () => {
                this.ready = false;
                resolve();
            };
            this.client.once('close', onClose);
            try {
                this.client.end();
            } catch {
                this.client.off('close', onClose);
                resolve();
            }
        });
    }

    protected createHostVerifier(): (key: Buffer, verify: (valid: boolean) => void) => void {
        const knownHosts = this.config.knownHosts;
        const hostKey = resolveSshHostKey(this.config.host, this.config.port ?? 22);
        if (knownHosts === 'strict') {
            const entries = loadKnownHosts();
        return (key, verify) => {
            // `known_hosts` stores the raw public key (base64), so compare the
            // presented key directly instead of a derived fingerprint.
            const presented = key.toString('base64');
            const entry = entries.get(hostKey);
            verify(!!entry && entry.some(expected => expected === presented));
        };
        }
        return (_key, verify) => {
            verify(true);
        };
    }

    protected safeEnd(): void {
        try {
            this.client.end();
        } catch (ignored) {
            void ignored;
        }
    }

    protected safeEndStream(stream: ClientChannel): void {
        try {
            stream.end();
        } catch (ignored) {
            void ignored;
        }
    }
}

function loadKnownHosts(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    let content: string;
    try {
        const knownHostsPath = require('path').join(require('os').homedir(), '.ssh', 'known_hosts');
        content = require('fs').readFileSync(knownHostsPath, 'utf-8');
    } catch (ignored) {
        void ignored;
        return result;
    }
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        // Skip comments, markers, and hashed host entries; hashed hosts cannot
        // be matched without the hash salt.
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('@') || trimmed.startsWith('|')) {
            continue;
        }
        const [hostField, , publicKey] = trimmed.split(/\s+/);
        if (!hostField || !publicKey) {
            continue;
        }
        for (const host of hostField.split(',')) {
            const list = result.get(host) ?? [];
            list.push(publicKey);
            result.set(host, list);
        }
    }
    return result;
}
