import { AgentDelegationMode, normalizeDelegationMode, SandboxMode } from '@tsdi/agent';
import { AppRpcError } from '../contracts/AppRpc';

export function normalizeSandboxMode(value: unknown): SandboxMode | undefined {
    if (value == null || value === '' || value === 'default') {
        return undefined;
    }
    if (value === 'off' || value === 'workspace' || value === 'network-block') {
        return value;
    }
    throw new AppRpcError(-32602, 'Invalid session.sandbox_mode mode');
}

export function normalizeDelegationModeValue(value: unknown): AgentDelegationMode | undefined {
    if (value == null || value === '' || value === 'default' || value === 'explicit') {
        return undefined;
    }
    const mode = normalizeDelegationMode(value);
    if (mode) {
        return mode;
    }
    throw new AppRpcError(-32602, 'Invalid session.delegation_mode mode');
}
