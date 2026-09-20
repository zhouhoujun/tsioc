import { Inject, Injectable } from '@tsdi/ioc';
import {
    CONSOLE_UTILS,
    ConsoleUtils,
    ConsoleTextInputChunkOptions,
    ConsoleTextInputChunkResult
} from '@tsdi/agent-ui';
import { AgentConsoleSessionState } from '@tsdi/agent-ui';

@Injectable()
export class ConsoleAgentConsoleSessionState extends AgentConsoleSessionState {
    @Inject(CONSOLE_UTILS) private consoleUtils!: ConsoleUtils;

    override clampCursor(value: string, cursor: number): number {
        return this.consoleUtils.clampConsoleTextCursor(value, cursor);
    }

    override shouldSkipHistoryEntry(entry: string): boolean {
        return this.consoleUtils.shouldSkipConsoleHistoryEntry(entry);
    }

    override formatStatusFooter(model: string, profile: string, workspace: string): string {
        return this.consoleUtils.formatTerminalStatusFooter(model, profile, workspace);
    }

    override processInputChunk(
        value: string,
        cursor: number,
        chunk: Uint8Array | string,
        options?: ConsoleTextInputChunkOptions
    ): ConsoleTextInputChunkResult {
        return this.consoleUtils.processConsoleTextInputChunk(value, cursor, chunk, options);
    }
}
