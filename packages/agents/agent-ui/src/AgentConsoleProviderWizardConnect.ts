import type { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import type { AgentUiResolvedModelProfile } from './AgentUiConfigReader';
import {
    AgentWizardStepDef,
    applyWizardStepEnter,
    buildProviderWizardConfirmOptions,
    buildProviderWizardSteps,
    buildProviderWizardSummary,
    resolveWizardProviderDef,
    resolveWizardProviderName,
    WizardTranslate,
    defaultWizardTranslate
} from './AgentConsoleProviderWizard';
import { formatAgentUiLabel, formatAgentUiNotice } from './agent-ui.i18n';
import {
    AgentWizardHolder,
    ProviderWizardContext,
    handleProviderWizardConfirm,
    resetProviderWizardComposer,
    showProviderWizardStep
} from './AgentConsoleProviderWizardFlow';

export function wizardTranslate(ctx: ProviderWizardContext): WizardTranslate {
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
        if (step.id === 'credential') {
            await discoverProviderModels(ctx, holder);
        }
        wizard.stepIndex += 1;
        ctx.state.setInput('', 0);
        ctx.state.inputSecret = false;
        showProviderWizardStep(ctx, holder);
    }

/** Fetch the provider's live model list before the model steps. */
export async function discoverProviderModels(ctx: ProviderWizardContext, holder: AgentWizardHolder): Promise<void> {
        const wizard = holder.wizard;
        if (!wizard || !ctx.appRpc) return;
        const values = wizard.values;
        const def = resolveWizardProviderDef(values.providerId);
        const baseUrl = String(values.baseUrl || def?.baseUrl || '').replace(/\/+$/, '');
        values.availableModels = undefined;
        values.manualModels = false;
        values.modelFetchError = undefined;
        if (!/^https?:\/\//i.test(baseUrl)) return;
        const auth = values.authMode === 'key' && values.credential
            ? { apiKey: values.credential }
            : values.authMode === 'env' && values.credential
                ? { apiKeyEnv: values.credential }
                : {};
        ctx.notify(formatAgentUiNotice(ctx.translator, 'fetchingProviderModels', { baseUrl }));
        const result: any = await ctx.appRpc.request('provider.test', {
            provider: def?.adapter || 'openai-compatible',
            baseUrl,
            ...auth
        }, ctx.rpcRequestContext()).catch((error: any) => ({ ok: false, models: [], error: error?.message || String(error) }));
        const models = Array.isArray(result?.models) ? result.models.map(String).filter(Boolean) : [];
        values.availableModels = models;
        values.modelFetchError = result?.ok === false ? String(result.error || 'connection failed') : undefined;
        if (!models.length) {
            ctx.notify(formatAgentUiNotice(ctx.translator, result?.ok === false ? 'providerModelsFetchFailed' : 'providerModelsEmpty', {
                error: values.modelFetchError || '',
                baseUrl
            }));
        }
    }
