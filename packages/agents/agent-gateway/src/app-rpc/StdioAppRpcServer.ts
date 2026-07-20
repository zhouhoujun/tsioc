import { Writable, Readable } from 'stream';
import { Injectable } from '@tsdi/ioc';
import { AppRpcServer } from './AppRpcServer';
import { AppRpcError, AppRpcRequestContext } from '../contracts/AppRpc';

export interface StdioAppRpcServerOptions {
    input?: Readable;
    output?: Writable;
    context?: AppRpcRequestContext;
    contextResolver?: (payload: any) => AppRpcRequestContext | Promise<AppRpcRequestContext>;
}

@Injectable()
export class StdioAppRpcServer {
    private buffer = '';
    private started = false;
    private onDataBound?: (chunk: Buffer | string) => void;

    constructor(
        private rpc: AppRpcServer
    ) {
    }

    start(options: StdioAppRpcServerOptions = {}): void {
        if (this.started) {
            return;
        }
        const input = options.input ?? process.stdin;
        const output = options.output ?? process.stdout;
        this.onDataBound = (chunk: Buffer | string) => {
            void this.onData(chunk, output, options).catch(error => {
                void this.writeResponse(output, {
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: error instanceof AppRpcError ? error.code : -32700,
                        message: error instanceof Error ? error.message : 'Parse error',
                        data: error instanceof AppRpcError ? error.data : undefined
                    }
                });
            });
        };
        input.on('data', this.onDataBound);
        this.started = true;
    }

    stop(options: Pick<StdioAppRpcServerOptions, 'input'> = {}): void {
        if (!this.started) {
            return;
        }
        const input = options.input ?? process.stdin;
        if (this.onDataBound) {
            input.off('data', this.onDataBound);
        }
        this.onDataBound = undefined;
        this.buffer = '';
        this.started = false;
    }

    private async onData(chunk: Buffer | string, output: Writable, options: StdioAppRpcServerOptions): Promise<void> {
        this.buffer += String(chunk);
        while (true) {
            const newlineIndex = this.buffer.indexOf('\n');
            if (newlineIndex < 0) {
                return;
            }
            const line = this.buffer.slice(0, newlineIndex).trim();
            this.buffer = this.buffer.slice(newlineIndex + 1);
            if (!line) {
                continue;
            }
            const payload = this.parseLine(line);
            const context = options.contextResolver
                ? await options.contextResolver(payload)
                : (options.context ?? {});
            if (Array.isArray(payload)) {
                const response = await this.rpc.handlePayload(payload, context);
                if (response) {
                    await this.writeResponse(output, response);
                }
                continue;
            }
            for await (const message of this.rpc.streamPayload(payload, context)) {
                await this.writeResponse(output, message);
            }
        }
    }

    private parseLine(line: string): any {
        try {
            return JSON.parse(line);
        } catch (error: any) {
            throw new AppRpcError(-32700, error?.message ?? 'Parse error');
        }
    }

    private async writeResponse(output: Writable, response: any): Promise<void> {
        const body = `${JSON.stringify(response)}\n`;
        await new Promise<void>((resolve, reject) => {
            output.write(body, err => err ? reject(err) : resolve());
        });
    }
}
