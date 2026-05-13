import { Injectable } from '@tsdi/ioc';
import { BaseAgentChannel } from '../contracts/BaseAgentChannel';
import { ChannelCapability } from '../contracts/ChannelCapability';
import { ChannelMessage } from '../contracts/ChannelMessage';
import { SendMessage } from '../contracts/SendMessage';
import { HealthStatus } from '../contracts/HealthStatus';
import * as readline from 'readline';

/**
 * Console I/O channel — reads from stdin, writes to stdout.
 * Mirrors zeroclaw-channels CLI behaviour for local interaction.
 */
@Injectable()
export class ConsoleAgentChannel extends BaseAgentChannel {
    private handler?: (message: ChannelMessage) => Promise<void> | void;
    private messageCounter = 0;
    private rl?: readline.Interface;
    private listening = false;

    name(): string {
        return 'console';
    }

    capabilities(): ChannelCapability[] {
        return ['freeform', 'streaming', 'typing'];
    }

    supportsFreeFormAsk(): boolean {
        return true;
    }

    supportsMultiMessageStreaming(): boolean {
        return true;
    }

    multiMessageDelayMs(): number {
        return 100;
    }

    healthCheck(): Promise<HealthStatus> | HealthStatus {
        return {
            healthy: true,
            message: `listening: ${this.listening}`
        };
    }

    async send(message: SendMessage): Promise<string> {
        const id = `console-${++this.messageCounter}`;
        const prefix = message.threadId ? `[${message.threadId}] ` : '';
        process.stdout.write(`${prefix}${message.content}\n`);
        return id;
    }

    async listen(handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> {
        this.handler = handler;
        this.startReadline();
    }

    private startReadline(): void {
        if (this.listening) return;
        this.listening = true;

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: ''
        });

        this.rl.on('line', async (line: string) => {
            const trimmed = line.trim();
            if (!trimmed || !this.handler) return;

            const message: ChannelMessage = {
                id: `console-in-${++this.messageCounter}`,
                channel: 'console',
                sender: 'user',
                content: trimmed,
                timestamp: Date.now()
            };

            try {
                await this.handler(message);
            } catch (err) {
                process.stderr.write(`Error: ${err}\n`);
            }
        });

        this.rl.on('close', () => {
            this.listening = false;
        });
    }

    /** Inject an external message (e.g. from a test or programmatic trigger) */
    async inject(message: Omit<ChannelMessage, 'channel'>): Promise<void> {
        const msg: ChannelMessage = {
            ...message,
            channel: 'console'
        };
        await this.handler?.(msg);
    }

    /** Close the readline interface */
    close(): void {
        this.rl?.close();
        this.listening = false;
    }
}
