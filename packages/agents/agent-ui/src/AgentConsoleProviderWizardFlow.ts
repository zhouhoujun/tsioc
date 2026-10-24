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

export interface AgentWizardValues {
    providerId?: string;
    baseUrl?: string;
    authMode?: 'key' | 'env';
    credential?: string;
    tiers?: 'single' | 'pair' | 'auto';
    modelFast?: string;
    modelBalanced?: string;
    modelStrong?: string;
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

function wizardTranslate(ctx: ProviderWizardContext): WizardTranslate {
    return (key, fallback, params) => formatAgentUiLabel(ctx.translator, key, fallback, params);
}

export function providerWizardSteps(holder: AgentWizardHolder, t: WizardTranslate = defaultWizardTranslate): AgentWizardStepDef[] {
    return buildProviderWizardSteps(holder.wizard?.values || {}, t);
}

export function providerWizardSummary(holder: AgentWizardHolder, t: WizardTranslate = defaultWizardTranslate): string[] {
    return buildProviderWizardSummary(holder.wizard?.values || {}, t);
}

export function providerWizardConfirmOptions(holder: AgentWizardHolder, ctx: ProviderWizardContext): AgentConsoleSelectOption[] {
    return buildProviderWizardConfirmOptions(holder.wizard?.values || {}, !!ctx.appRpc, wizardTranslate(ctx));
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

export async function openProviderWizardEditor(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): Promise<void> {
        const wizard = holder.wizard;
        if (!wizard) return;
        const t = wizardTranslate(ctx);
        const steps = providerWizardSteps(holder, t);
        const entries = steps
            .map((step, index) => ({ step, index }))
            .filter(item => !['provider', 'confirm'].includes(item.step.id))
            .map(item => ({
                label: item.step.label,
                value: String(item.index),
                description: t('agent.menu.provider.steps.backTo', 'Back to {step}', { step: item.step.label.toLowerCase() })
            }));
        const choice = await ctx.state.selectAsync(formatAgentUiLabel(ctx.translator, 'agent.menu.provider.editTitle', 'Edit provider'), entries, 0, formatAgentUiLabel(ctx.translator, 'agent.hint.enterConfirmBack', 'enter confirm   esc back'));
        if (choice === undefined) {
            showProviderWizardStep(ctx, holder);
            return;
        }
        const index = Number(choice);
        const target = steps[index];
        if (!target) return;
        wizard.stepIndex = index;
        showProviderWizardStep(ctx, holder);
    }

export async function testProviderConnection(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): Promise<void> {
        const wizard = holder.wizard;
        if (!wizard || !ctx.appRpc) return;
        const values = wizard.values;
        const def = resolveWizardProviderDef(values.providerId);
        const baseUrl = values.baseUrl || def?.baseUrl || '';
        if (!/^https?:\/\//i.test(baseUrl)) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'enterValidBase'));
            return;
        }
        ctx.notify(formatAgentUiNotice(ctx.translator, 'testingConnection'));
        let result: { ok: boolean; models?: string[]; error?: string };
        try {
            result = await ctx.appRpc.request('provider.test', {
                provider: def?.adapter || 'openai-compatible',
                baseUrl,
                ...(values.authMode === 'key' ? { apiKey: values.credential } : { apiKeyEnv: values.credential || def?.apiKeyEnv })
            }, ctx.rpcRequestContext());
        } catch (error) {
            result = { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
        const summaryLines = providerWizardSummary(holder, wizardTranslate(ctx));
        const summary = summaryLines.join('\n');
        if (!holder.wizard) return;
        const count = result.models?.length || 0;
        const t = wizardTranslate(ctx);
        const options: AgentConsoleSelectOption[] = result.ok
            ? [
                { label: t('agent.menu.provider.steps.saveActive', 'Save & activate'), value: 'save-active', description: t('agent.menu.provider.steps.connectionModels', 'Connection OK · {count} model(s) found', { count }), detail: summary },
                { label: t('agent.menu.provider.steps.save', 'Save only'), value: 'save', description: t('agent.menu.provider.steps.connectionSaveLater', 'Connection OK · save for later'), detail: summary },
                { label: t('agent.menu.provider.steps.edit', 'Edit…'), value: 'edit', description: t('agent.menu.provider.steps.editDescription', 'Change a field before saving') },
                { label: t('agent.menu.provider.steps.cancel', 'Cancel'), value: 'cancel', description: t('agent.menu.provider.steps.cancelOptionDescription', 'Discard this provider') }
            ]
            : [
                { label: t('agent.menu.provider.steps.retryTest', 'Retry test'), value: 'test', description: t('agent.menu.provider.steps.lastAttemptFailed', 'Last attempt failed: {error}', { error: result.error || 'unknown error' }), detail: summary },
                { label: t('agent.menu.provider.steps.saveActive', 'Save & activate'), value: 'save-active', description: t('agent.menu.provider.steps.saveAnywayActive', 'Save anyway and continue'), detail: summary },
                { label: t('agent.menu.provider.steps.save', 'Save only'), value: 'save', description: t('agent.menu.provider.steps.saveAnyway', 'Save anyway for later'), detail: summary },
                { label: t('agent.menu.provider.steps.edit', 'Edit…'), value: 'edit', description: t('agent.menu.provider.steps.editFixConnection', 'Fix the connection before saving') },
                { label: t('agent.menu.provider.steps.cancel', 'Cancel'), value: 'cancel', description: t('agent.menu.provider.steps.cancelOptionDescription', 'Discard this provider') }
            ];
        const details = result.ok
            ? t('agent.menu.provider.steps.connectionAvailable', '{count} model(s) available', { count })
            : t('agent.menu.provider.steps.connectionFailedDetail', 'Connection failed: {error}', { error: result.error || 'unknown error' });
        ctx.state.setProviderWizard({
            phase: 'confirm', summary: summaryLines, help: details, hint: formatAgentUiLabel(ctx.translator, 'agent.hint.enterConfirmBack', 'enter confirm   esc back'),
            secret: false
        });
        ctx.state.selectMenuAction = (value: string | undefined) => handleProviderWizardConfirm(ctx, holder, value);
        ctx.state.closeSelectMenu();
        ctx.state.openSelectMenu(result.ok
            ? formatAgentUiLabel(ctx.translator, 'agent.menu.provider.connectionOk', 'Connection OK')
            : formatAgentUiLabel(ctx.translator, 'agent.menu.provider.connectionFailed', 'Connection failed'), options, 0, formatAgentUiLabel(ctx.translator, 'agent.hint.enterConfirmBack', 'enter confirm   esc back'));
    }

export async function commitProviderWizard(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): Promise<void> {
        const wizard = holder.wizard;
        if (!wizard) return;
        const values = wizard.values;
        const def = resolveWizardProviderDef(values.providerId);
        if (!def || !values.providerId || !values.modelFast) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'providerWasNot'));
            showProviderWizardStep(ctx, holder);
            return;
        }
        const name = resolveWizardProviderName(values);
        const baseUrl = (values.baseUrl || def.baseUrl || '').replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(baseUrl)) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'providerWasNot2'));
            wizard.stepIndex = Math.max(0, providerWizardSteps(holder, wizardTranslate(ctx)).findIndex(step => step.id === 'base-url'));
            showProviderWizardStep(ctx, holder);
            return;
        }
        const tiers = values.tiers || 'auto';
        const authFields = {
            ...(values.authMode === 'key' && values.credential ? { apiKey: values.credential } : {}),
            ...(values.authMode === 'env' && values.credential ? { apiKeyEnv: values.credential } : {})
        };
        if (ctx.appRpc) {
            const validation = await ctx.appRpc.request('provider.test', {
                provider: def.adapter, baseUrl, ...authFields
            }, ctx.rpcRequestContext()).catch(() => undefined);
            if (validation && validation.ok === false) {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'providerNotSaved', { validation: validation.error || 'connection test failed' }));
                showProviderWizardStep(ctx, holder);
                return;
            }
        }
        const makeProfile = (model: string): { provider: string; model: string; baseUrl: string; apiKey?: string; apiKeyEnv?: string } => ({
            provider: def.adapter,
            model,
            baseUrl,
            ...authFields
        });
        if (ctx.appRpc) {
            await ctx.appRpc.request('model.add', {
                name,
                provider: def.adapter,
                baseUrl,
                ...authFields,
                ...(tiers === 'single'
                    ? { model: values.modelFast }
                    : {
                        fastModel: values.modelFast,
                        ...(tiers === 'auto' ? { balancedModel: values.modelBalanced || values.modelFast } : {}),
                        strongModel: values.modelStrong || values.modelFast
                    })
            }, ctx.rpcRequestContext());
        } else {
            const current = (ctx.options.model || {}) as AgentUiResolvedModelProfile;
            const profiles = { ...(current.profiles || {}) };
            profiles[`${name}-fast`] = makeProfile(values.modelFast);
            const next: AgentUiResolvedModelProfile = {
                ...current,
                provider: def.adapter,
                model: values.modelFast,
                baseUrl,
                profiles
            };
            if (tiers !== 'single') {
                profiles[`${name}-strong`] = makeProfile(values.modelStrong || values.modelFast);
            }
            if (tiers === 'auto') {
                profiles[`${name}-balanced`] = makeProfile(values.modelBalanced || values.modelFast);
            }
            if (tiers !== 'single') {
                next.complexityRouting = {
                    ...(current.complexityRouting || {}),
                    simple: `${name}-fast`,
                    moderate: tiers === 'auto' ? `${name}-balanced` : `${name}-fast`,
                    complex: `${name}-strong`
                };
            }
            next.defaultProfile = `${name}-fast`;
            if (values.authMode === 'key' && values.credential) {
                next.apiKey = values.credential;
            } else if (values.authMode === 'env' && values.credential) {
                next.apiKeyEnv = values.credential;
            }
            ctx.options.model = next as any;
            ctx.uiConfig!.writeModelProfile(ctx.uiConfig!.resolve().root, next);
        }
        const label = def.label;
        resetProviderWizardComposer(ctx, holder);
        ctx.notify(formatAgentUiNotice(ctx.translator, 'addedProviderType', { label: label, name: name }));
    }

export async function advanceProviderWizard(ctx: ProviderWizardContext, holder: AgentWizardHolder, value: string): Promise<void> {
        const wizard = holder.wizard;
        if (!wizard) return;
        const step = providerWizardSteps(holder, wizardTranslate(ctx))[wizard.stepIndex];
        if (step.kind !== 'enter') return;
        const trimmed = String(value || '').trim();
        const values = wizard.values;
        if (!trimmed) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'stepRequiredPressEsc', { label: step.label }));
            return;
        }
        if (step.id === 'base-url' && !/^https?:\/\//i.test(trimmed)) {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'baseUrlMust'));
            return;
        }
        applyWizardStepEnter(values, step.id, trimmed);
        wizard.stepIndex += 1;
        ctx.state.setInput('', 0);
        ctx.state.inputSecret = false;
        showProviderWizardStep(ctx, holder);
    }
