import { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { AgentUiResolvedModelProfile } from './AgentUiConfigReader';
import {
    AgentWizardStepDef,
    applyWizardStepChoice,
    applyWizardStepEnter,
    buildProviderWizardChoiceOptions,
    buildProviderWizardConfirmOptions,
    buildProviderWizardSteps,
    buildProviderWizardSummary,
    buildWizardStepHelp,
    resolveWizardPrefill,
    resolveWizardProviderDef,
    resolveWizardProviderName,
    resolveWizardTierLabel,
    WizardTranslate,
    defaultWizardTranslate
} from './AgentConsoleProviderWizard';
import { formatAgentUiLabel, formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';
import { advanceProviderWizard, commitProviderWizard, discoverProviderModels, openProviderWizardEditor, providerWizardConfirmOptions, providerWizardSteps, providerWizardSummary, testProviderConnection, wizardTranslate } from './AgentConsoleProviderWizardConnect';
export { advanceProviderWizard, commitProviderWizard, discoverProviderModels, openProviderWizardEditor, providerWizardConfirmOptions, providerWizardSteps, providerWizardSummary, testProviderConnection } from './AgentConsoleProviderWizardConnect';

export interface AgentWizardValues {
    providerId?: string;
    baseUrl?: string;
    authMode?: 'key' | 'env';
    credential?: string;
    tiers?: 'single' | 'pair' | 'auto';
    modelFast?: string;
    modelBalanced?: string;
    modelStrong?: string;
    availableModels?: string[];
    manualModels?: boolean;
    modelFetchError?: string;
}

export interface AgentWizardState {
    stepIndex: number;
    values: AgentWizardValues;
}

export interface AgentWizardHolder {
    wizard?: AgentWizardState;
}

export interface ProviderWizardContext {
    translator?: AgentUiTranslator | null;
    state: any;
    appRpc?: any;
    uiConfig?: any;
    options: any;
    notify(message: string): void;
    notifyBusyState(): void;
    isTurnInProgress(): boolean;
    rpcRequestContext(): any;
    activateModelProfile(profile: string): Promise<any>;
}

export function startProviderWizard(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): void {
        if (!ctx.appRpc && !ctx.uiConfig) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'modelConfigurationStorage'));
            return;
        }
        if (ctx.isTurnInProgress()) {
            ctx.notifyBusyState();
            return;
        }
        holder.wizard = { stepIndex: 0, values: {} };
        showProviderWizardStep(ctx, holder);
    }

export function handleWizardEscape(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): boolean {
        if (!holder.wizard) return false;
        if (holder.wizard.stepIndex === 0) {
            cancelProviderWizard(ctx, holder);
        } else {
            holder.wizard.stepIndex -= 1;
            showProviderWizardStep(ctx, holder);
        }
        return true;
    }

export function cancelProviderWizard(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): boolean {
        if (!holder.wizard) return false;
        holder.wizard = undefined;
        ctx.state.closeProviderWizard();
        ctx.state.setInputPlaceholder(ctx.state.consoleOptions.inputPlaceholder);
        ctx.state.setInput('', 0);
        ctx.notify(formatAgentUiNotice(ctx.translator, 'addProviderCancelled'));
        return true;
    }

export function resetProviderWizardComposer(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): void {
        ctx.state.closeProviderWizard();
        ctx.state.setInputPlaceholder(ctx.state.consoleOptions.inputPlaceholder);
        ctx.state.setInput('', 0);
    }

export function showProviderWizardStep(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): void {
        const wizard = holder.wizard;
        if (!wizard) return;
        const t = wizardTranslate(ctx);
        const steps = providerWizardSteps(holder, t);
        wizard.stepIndex = Math.min(wizard.stepIndex, steps.length - 1);
        const step = steps[wizard.stepIndex];
        const count = steps.length;
        const progress = t('agent.menu.provider.steps.progress', 'Step {index}/{count}', { index: wizard.stepIndex + 1, count });
        const summary = providerWizardSummary(holder, t);
        if (step.kind === 'choose') {
            ctx.state.setProviderWizard({
                phase: 'choose', stepIndex: wizard.stepIndex, stepCount: count,
                stepLabel: step.label, progress, prompt: '',
                help: buildWizardStepHelp(step, wizard.values, t),
                hint: formatAgentUiLabel(ctx.translator, 'agent.hint.enterConfirmBack', 'enter confirm   esc back'), secret: false, summary
            });
            openProviderWizardChoice(ctx, holder, step);
            return;
        }
        if (step.kind === 'confirm') {
            ctx.state.setProviderWizard({
                phase: 'confirm', stepIndex: wizard.stepIndex, stepCount: count,
                stepLabel: step.label, progress, prompt: '',
                help: buildWizardStepHelp(step, wizard.values, t),
                hint: formatAgentUiLabel(ctx.translator, 'agent.hint.enterConfirmBack', 'enter confirm   esc back'), secret: false, summary
            });
            openProviderWizardConfirm(ctx, holder);
            return;
        }
        const secret = step.id === 'credential' && wizard.values.authMode === 'key';
        const prefill = resolveWizardPrefill(step, wizard.values);
        ctx.state.inputSecret = secret;
        ctx.state.inputPrompt = `${wizard.stepIndex + 1}/${count} › `;
        ctx.state.setInputPlaceholder(step.label);
        ctx.state.setInput(prefill, prefill.length);
        ctx.state.setProviderWizard({
            phase: 'enter', stepIndex: wizard.stepIndex, stepCount: count,
            stepLabel: step.label, progress, prompt: `${wizard.stepIndex + 1}/${count} › `,
            help: buildWizardStepHelp(step, wizard.values, t),
            hint: formatAgentUiLabel(ctx.translator, 'agent.hint.enterConfirmBack', 'enter confirm   esc back'), secret, summary
        });
        ctx.notify(formatAgentUiNotice(ctx.translator, 'wizardProgressStep', { progress: progress, help: buildWizardStepHelp(step, wizard.values, t) }));
    }

export function openProviderWizardChoice(ctx: ProviderWizardContext, holder: AgentWizardHolder, step: AgentWizardStepDef): void {
        const built = buildProviderWizardChoiceOptions(step, holder.wizard?.values || {}, wizardTranslate(ctx));
        if (!built) return;
        ctx.state.selectMenuAction = (value: string | undefined) => handleProviderWizardChoice(ctx, holder, value);
        ctx.state.closeSelectMenu();
        ctx.state.openSelectMenu(built.title, built.options, built.selected, formatAgentUiLabel(ctx.translator, 'agent.hint.enterConfirmBack', 'enter confirm   esc back'));
    }

export async function handleProviderWizardChoice(ctx: ProviderWizardContext, holder: AgentWizardHolder, value?: string): Promise<void> {
        const wizard = holder.wizard;
        if (!wizard) return;
        if (value === undefined || value === '__cancel__') {
            handleWizardEscape(ctx, holder);
            return;
        }
        const step = providerWizardSteps(holder, wizardTranslate(ctx))[wizard.stepIndex];
        const values = wizard.values;
        if (value === '__custom__' && step.id.startsWith('model-')) {
            values.manualModels = true;
            showProviderWizardStep(ctx, holder);
            return;
        }
        applyWizardStepChoice(values, step.id, value);
        wizard.stepIndex += 1;
        showProviderWizardStep(ctx, holder);
    }

export function openProviderWizardConfirm(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): void {
        ctx.state.selectMenuAction = (value: string | undefined) => handleProviderWizardConfirm(ctx, holder, value);
        ctx.state.closeSelectMenu();
        ctx.state.openSelectMenu(formatAgentUiLabel(ctx.translator, 'agent.menu.provider.confirmTitle', 'Confirm provider'), providerWizardConfirmOptions(holder, ctx), 0, formatAgentUiLabel(ctx.translator, 'agent.hint.enterConfirmBack', 'enter confirm   esc back'));
    }

export async function handleProviderWizardConfirm(ctx: ProviderWizardContext, holder: AgentWizardHolder, action?: string): Promise<void> {
        if (!action) {
            handleWizardEscape(ctx, holder);
            return;
        }
        switch (action) {
            case 'save-active':
                await commitProviderWizard(ctx, holder);
                await ctx.activateModelProfile(`${resolveWizardProviderName(holder.wizard?.values || {})}-fast`).catch(() => undefined);
                return;
            case 'save':
                await commitProviderWizard(ctx, holder);
                return;
            case 'test':
                await testProviderConnection(ctx, holder);
                return;
            case 'edit':
                await openProviderWizardEditor(ctx, holder);
                return;
            case 'cancel':
                cancelProviderWizard(ctx, holder);
                return;
            default:
                return;
        }
    }

