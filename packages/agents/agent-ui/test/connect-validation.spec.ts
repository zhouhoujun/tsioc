import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { commitProviderWizard } from '../src/AgentConsoleProviderWizardFlow';
import { getAgentConsoleCommandDefinition } from '../src/AgentConsoleCommandRegistry';

function makeState(): any {
    const base: any = { consoleOptions: { inputPlaceholder: '' }, input: '', inputSecret: false };
    return new Proxy(base, {
        get(target, key) {
            if (key in target) return (target as any)[key];
            return () => undefined;
        },
        set(target, key, value) {
            (target as any)[key] = value;
            return true;
        }
    });
}

function makeContext(methods: string[], testResult: any): any {
    return {
        state: makeState(),
        appRpc: {
            request: async (method: string) => {
                methods.push(method);
                if (method === 'provider.test') return testResult;
                return {};
            }
        },
        options: {},
        notify: (message: string) => { methods.push(`notify:${message}`); },
        notifyBusyState: () => {},
        isTurnInProgress: () => false,
        rpcRequestContext: () => ({}),
        activateModelProfile: async () => undefined
    };
}

function makeHolder(): any {
    return {
        wizard: {
            stepIndex: 99,
            values: {
                providerId: 'deepseek',
                baseUrl: 'https://api.deepseek.com',
                authMode: 'key',
                credential: 'test-key',
                tiers: 'single',
                modelFast: 'deepseek-v4-flash'
            }
        }
    };
}

@Suite('provider wizard validation')
export class ProviderWizardValidationTest {
    @Test('aborts without writing when the connection test fails')
    async rejectsInvalidCredential() {
        const methods: string[] = [];
        const ctx = makeContext(methods, { ok: false, status: 401, models: [], error: 'HTTP 401 Unauthorized' });
        await commitProviderWizard(ctx, makeHolder());

        expect(methods).toContain('provider.test');
        expect(methods.some(method => method === 'model.add')).toBe(false);
        expect(methods.some(method => method.startsWith('notify:Provider was not saved'))).toBe(true);
    }

    @Test('writes the provider only after a passing connection test')
    async writesAfterValidation() {
        const methods: string[] = [];
        const ctx = makeContext(methods, { ok: true, status: 200, models: ['deepseek-v4-flash'] });
        await commitProviderWizard(ctx, makeHolder());

        const testIndex = methods.indexOf('provider.test');
        const addIndex = methods.indexOf('model.add');
        expect(testIndex).toBeGreaterThanOrEqual(0);
        expect(addIndex).toBeGreaterThan(testIndex);
    }

    @Test('/connect is an alias of the provider connection command')
    connectAlias() {
        expect(getAgentConsoleCommandDefinition('/connect')?.name).toBe('/provider');
    }
}
