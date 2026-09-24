import { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { AgentUiResolvedModelProfile } from './AgentUiConfigReader';
import {
    AgentWizardStepDef,
    buildProviderWizardChoiceOptions,
    buildProviderWizardConfirmOptions,
    buildProviderWizardSteps,
    buildProviderWizardSummary,
    buildWizardStepHelp,
    resolveWizardPrefill,
    resolveWizardProviderDef,
    resolveWizardProviderName,
    resolveWizardTierLabel
} from './AgentConsoleProviderWizard';

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

export function providerWizardSteps(holder: AgentWizardHolder): AgentWizardStepDef[] {
    return buildProviderWizardSteps(holder.wizard?.values || {});
}

export function providerWizardSummary(holder: AgentWizardHolder): string[] {
    return buildProviderWizardSummary(holder.wizard?.values || {});
}

export function providerWizardConfirmOptions(holder: AgentWizardHolder, ctx: ProviderWizardContext): AgentConsoleSelectOption[] {
    return buildProviderWizardConfirmOptions(holder.wizard?.values || {}, !!ctx.appRpc);
}

export function startProviderWizard(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): void {
        if (!ctx.appRpc && !ctx.uiConfig) {
            ctx.notify('Model configuration storage is unavailable.');
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
        ctx.notify('Add provider cancelled.');
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
        const steps = providerWizardSteps(holder);
        wizard.stepIndex = Math.min(wizard.stepIndex, steps.length - 1);
        const step = steps[wizard.stepIndex];
        const count = steps.length;
        const progress = `Step ${wizard.stepIndex + 1}/${count}`;
        const summary = providerWizardSummary(holder);
        if (step.kind === 'choose') {
            ctx.state.setProviderWizard({
                phase: 'choose', stepIndex: wizard.stepIndex, stepCount: count,
                stepLabel: step.label, progress, prompt: '',
                help: buildWizardStepHelp(step, wizard.values),
                hint: 'enter confirm   esc back', secret: false, summary
            });
            openProviderWizardChoice(ctx, holder, step);
            return;
        }
        if (step.kind === 'confirm') {
            ctx.state.setProviderWizard({
                phase: 'confirm', stepIndex: wizard.stepIndex, stepCount: count,
                stepLabel: step.label, progress, prompt: '',
                help: buildWizardStepHelp(step, wizard.values),
                hint: 'enter confirm   esc back', secret: false, summary
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
            help: buildWizardStepHelp(step, wizard.values),
            hint: 'enter confirm   esc back', secret, summary
        });
        ctx.state.setInputFocused(true);
        ctx.notify(`${progress}: ${buildWizardStepHelp(step, wizard.values)}`);
    }

export function openProviderWizardChoice(ctx: ProviderWizardContext, holder: AgentWizardHolder, step: AgentWizardStepDef): void {
        const built = buildProviderWizardChoiceOptions(step, holder.wizard?.values || {});
        if (!built) return;
        ctx.state.selectMenuAction = (value: string | undefined) => handleProviderWizardChoice(ctx, holder, value);
        ctx.state.closeSelectMenu();
        ctx.state.openSelectMenu(built.title, built.options, built.selected, 'enter confirm   esc back');
    }

export async function handleProviderWizardChoice(ctx: ProviderWizardContext, holder: AgentWizardHolder, value?: string): Promise<void> {
        const wizard = holder.wizard;
        if (!wizard) return;
        if (value === undefined || value === '__cancel__') {
            handleWizardEscape(ctx, holder);
            return;
        }
        const step = providerWizardSteps(holder)[wizard.stepIndex];
        const values = wizard.values;
        switch (step.id) {
            case 'provider': {
                values.providerId = value;
                const def = resolveWizardProviderDef(value);
                values.baseUrl = def?.baseUrl || '';
                values.authMode = 'key';
                values.tiers = 'auto';
                break;
            }
            case 'auth':
                if (value === 'key' || value === 'env') {
                    values.authMode = value;
                    if (value === 'env') {
                        values.credential = resolveWizardProviderDef(values.providerId)?.apiKeyEnv || values.credential;
                    }
                }
                break;
            case 'tiers':
                values.tiers = value as 'single' | 'pair' | 'auto';
                break;
            default:
                return;
        }
        wizard.stepIndex += 1;
        showProviderWizardStep(ctx, holder);
    }

export function openProviderWizardConfirm(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): void {
        ctx.state.selectMenuAction = (value: string | undefined) => handleProviderWizardConfirm(ctx, holder, value);
        ctx.state.closeSelectMenu();
        ctx.state.openSelectMenu('Confirm provider', providerWizardConfirmOptions(holder, ctx), 0, 'enter confirm   esc back');
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
        const steps = providerWizardSteps(holder);
        const entries = steps
            .map((step, index) => ({ step, index }))
            .filter(item => !['provider', 'confirm'].includes(item.step.id))
            .map(item => ({
                label: item.step.label,
                value: String(item.index),
                description: `Back to ${item.step.label.toLowerCase()}`
            }));
        const choice = await ctx.state.selectAsync('Edit provider', entries, 0, 'enter confirm   esc back');
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
            ctx.notify('Enter a valid base URL before testing.');
            return;
        }
        ctx.notify('Testing connection…');
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
        const summaryLines = providerWizardSummary(holder);
        const summary = summaryLines.join('\n');
        if (!holder.wizard) return;
        const count = result.models?.length || 0;
        const options: AgentConsoleSelectOption[] = result.ok
            ? [
                { label: 'Save & activate', value: 'save-active', description: `Connection OK · ${count} model${count === 1 ? '' : 's'} found`, detail: summary },
                { label: 'Save only', value: 'save', description: 'Connection OK · save for later', detail: summary },
                { label: 'Edit…', value: 'edit', description: 'Change a field before saving' },
                { label: 'Cancel', value: 'cancel', description: 'Discard this provider' }
            ]
            : [
                { label: 'Retry test', value: 'test', description: `Last attempt failed: ${result.error || 'unknown error'}`, detail: summary },
                { label: 'Save & activate', value: 'save-active', description: 'Save anyway and continue', detail: summary },
                { label: 'Save only', value: 'save', description: 'Save anyway for later', detail: summary },
                { label: 'Edit…', value: 'edit', description: 'Fix the connection before saving' },
                { label: 'Cancel', value: 'cancel', description: 'Discard this provider' }
            ];
        const details = result.ok ? `${count} model(s) available` : `Connection failed: ${result.error || 'unknown error'}`;
        ctx.state.setProviderWizard({
            phase: 'confirm', summary: summaryLines, help: details, hint: 'enter confirm   esc back',
            secret: false
        });
        ctx.state.selectMenuAction = (value: string | undefined) => handleProviderWizardConfirm(ctx, holder, value);
        ctx.state.closeSelectMenu();
        ctx.state.openSelectMenu(result.ok ? 'Connection OK' : 'Connection failed', options, 0, 'enter confirm   esc back');
    }

export async function commitProviderWizard(ctx: ProviderWizardContext, holder: AgentWizardHolder, ): Promise<void> {
        const wizard = holder.wizard;
        if (!wizard) return;
        const values = wizard.values;
        const def = resolveWizardProviderDef(values.providerId);
        if (!def || !values.providerId || !values.modelFast) {
            ctx.notify('Provider was not saved: a provider and model are required.');
            showProviderWizardStep(ctx, holder);
            return;
        }
        const name = resolveWizardProviderName(values);
        const baseUrl = (values.baseUrl || def.baseUrl || '').replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(baseUrl)) {
            ctx.notify('Provider was not saved: enter a valid http(s) API base URL.');
            wizard.stepIndex = Math.max(0, providerWizardSteps(holder).findIndex(step => step.id === 'base-url'));
            showProviderWizardStep(ctx, holder);
            return;
        }
        const tiers = values.tiers || 'auto';
        const makeProfile = (model: string): { provider: string; model: string; baseUrl: string; apiKey?: string; apiKeyEnv?: string } => ({
            provider: def.adapter,
            model,
            baseUrl,
            ...(values.authMode === 'key' && values.credential ? { apiKey: values.credential } : {}),
            ...(values.authMode === 'env' && values.credential ? { apiKeyEnv: values.credential } : {})
        });
        if (ctx.appRpc) {
            await ctx.appRpc.request('model.add', {
                name,
                provider: def.adapter,
                baseUrl,
                ...(values.authMode === 'key' && values.credential ? { apiKey: values.credential } : {}),
                ...(values.authMode === 'env' && values.credential ? { apiKeyEnv: values.credential } : {}),
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
        ctx.notify(`Added ${label} provider (${name}). Type /model to use it.`);
    }

export async function advanceProviderWizard(ctx: ProviderWizardContext, holder: AgentWizardHolder, value: string): Promise<void> {
        const wizard = holder.wizard;
        if (!wizard) return;
        const step = providerWizardSteps(holder)[wizard.stepIndex];
        if (step.kind !== 'enter') return;
        const trimmed = String(value || '').trim();
        const values = wizard.values;
        if (!trimmed) {
            ctx.notify(`${step.label} is required. Press Esc to go back.`);
            return;
        }
        if (step.id === 'base-url' && !/^https?:\/\//i.test(trimmed)) {
            ctx.notify('Base URL must start with http(s)://.');
            return;
        }
        switch (step.id) {
            case 'base-url':
                values.baseUrl = trimmed.replace(/\/+$/, '');
                break;
            case 'credential':
                values.credential = trimmed;
                break;
            case 'model-fast':
                values.modelFast = trimmed;
                break;
            case 'model-balanced':
                values.modelBalanced = trimmed;
                break;
            case 'model-strong':
                values.modelStrong = trimmed;
                break;
            default:
                return;
        }
        wizard.stepIndex += 1;
        ctx.state.setInput('', 0);
        ctx.state.inputSecret = false;
        showProviderWizardStep(ctx, holder);
    }
