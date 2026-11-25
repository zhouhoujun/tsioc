import type { AgentEnvironment } from '@tsdi/agent';
import { createIoPortEnvironment } from './io-environment';
import type { AgentIoPort } from './io-port';

/** P3.3: hosts with a remote IO port get a matching environment automatically. */
export function environmentFromIoPort(io: AgentIoPort | null | undefined): AgentEnvironment | undefined {
    return io?.remote ? createIoPortEnvironment(io) : undefined;
}
