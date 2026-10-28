import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { applyWizardStepChoice, buildProviderWizardChoiceOptions, buildProviderWizardSteps } from '../src/AgentConsoleProviderWizard';
import { advanceProviderWizard, discoverProviderModels, handleProviderWizardChoice } from '../src/AgentConsoleProviderWizardFlow';

function wizardState(): any {
    const state: any = {
        inputSecret: false,
        inputPrompt: '',
        consoleOptions: { inputPlaceholder: '' },
        setProviderWizard() {},
        setInput() {},
        setInputPlaceholder() {},
        closeSelectMenu() {},
        openSelectMenu() {},
        closeProviderWizard() {},
        selectAsync: async () => undefined
    };
    return state;
}

@Suite('provider wizard live models')
export class ProviderWizardModelsTest {
    @Test('model steps become a choose menu populated from the live provider catalog')
    async liveChoices() {
        const values: any = { providerId: 'custom-openai', baseUrl: 'http://127.0.0.1:9', availableModels: ['model-a', 'model-b', 'model-c'], tiers: 'auto' };
        const steps = buildProviderWizardSteps(values);
        expect(steps.find(step => step.id === 'model-fast')?.kind).toEqual('choose');
        expect(steps.find(step => step.id === 'model-strong')?.kind).toEqual('choose');
        const fast = steps.find(step => step.id === 'model-fast')!;
        const built = buildProviderWizardChoiceOptions(fast, values)!;
        expect(built.options.map(option => option.value)).toEqual(['model-a', 'model-b', 'model-c', '__custom__']);
        applyWizardStepChoice(values, 'model-fast', 'model-b');
        expect(values.modelFast).toEqual('model-b');
    }

    @Test('discovers models over provider.test after the credential step')
    async discovers() {
        const calls: Array<{ method: string; params: any }> = [];
        const notices: string[] = [];
        const ctx: any = {
            translator: null,
            appRpc: {
                request: async (method: string, params: any) => {
                    calls.push({ method, params });
                    return { ok: true, models: ['live-a', 'live-b'] };
                }
            },
            notify: (message: string) => notices.push(message),
            rpcRequestContext: () => ({}),
            state: wizardState()
        };
        const holder: any = {
            wizard: {
                stepIndex: 0,
                values: { providerId: 'custom-openai', baseUrl: 'http://127.0.0.1:9', authMode: 'key', credential: 'secret', tiers: 'single' }
            }
        };
        await discoverProviderModels(ctx, holder);
        expect(holder.wizard.values.availableModels).toEqual(['live-a', 'live-b']);
        expect(calls[0].method).toEqual('provider.test');
        expect(calls[0].params.baseUrl).toEqual('http://127.0.0.1:9');
        expect(calls[0].params.apiKey).toEqual('secret');
        expect(notices.some(message => message.includes('Fetching models'))).toEqual(true);

        const steps = buildProviderWizardSteps(holder.wizard.values);
        const fastIndex = steps.findIndex(step => step.id === 'model-fast');
        holder.wizard.stepIndex = fastIndex;
        ctx.state.selectMenuAction = undefined;
        await handleProviderWizardChoice(ctx, holder, 'live-b');
        expect(holder.wizard.values.modelFast).toEqual('live-b');
        expect(holder.wizard.stepIndex).toEqual(fastIndex + 1);
    }

    @Test('the custom option switches the model steps back to manual entry')
    async customModel() {
        const ctx: any = {
            translator: null,
            state: wizardState(),
            notify() {},
            rpcRequestContext: () => ({}),
            appRpc: { request: async () => ({ ok: true, models: ['live-a'] }) }
        };
        const holder: any = {
            wizard: {
                stepIndex: 0,
                values: { providerId: 'custom-openai', baseUrl: 'http://127.0.0.1:9', availableModels: ['live-a'], tiers: 'single' }
            }
        };
        const steps = buildProviderWizardSteps(holder.wizard.values);
        const fastIndex = steps.findIndex(step => step.id === 'model-fast');
        holder.wizard.stepIndex = fastIndex;
        await handleProviderWizardChoice(ctx, holder, '__custom__');
        expect(holder.wizard.values.manualModels).toEqual(true);
        expect(buildProviderWizardSteps(holder.wizard.values).find(step => step.id === 'model-fast')?.kind).toEqual('enter');
    }
}
