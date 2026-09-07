import { FileAdapter } from '@tsdi/common';
import { Injectable } from '@tsdi/ioc';

/** Resolves shared agent-console storage paths without coupling stores to a host. */
@Injectable()
export class AgentConsolePathProvider {
    constructor(private readonly fileAdapter: FileAdapter) {}

    dotDirectory(workspace: string): string {
        return resolveAgentConsoleDirectory(this.fileAdapter, workspace);
    }

    storeFile(workspace: string, name: string): string {
        return this.fileAdapter.join(this.dotDirectory(workspace), name);
    }
}

export function resolveAgentConsoleDirectory(fileAdapter: FileAdapter, workspace: string): string {
    return fileAdapter.join(workspace, '.tsdi-agent');
}

export function resolveAgentConsoleStoreFile(fileAdapter: FileAdapter, workspace: string, name: string): string {
    return fileAdapter.join(resolveAgentConsoleDirectory(fileAdapter, workspace), name);
}
