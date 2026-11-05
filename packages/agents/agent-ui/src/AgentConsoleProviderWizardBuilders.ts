import type { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import {
    AGENT_WIZARD_PROVIDERS,
    AGENT_WIZARD_TIERS,
    AgentWizardProviderDef,
    AgentWizardStepDef,
    AgentWizardStepId,
    AgentWizardValues,
    WIZARD_STEP_HANDLERS,
    defaultWizardTranslate,
    resolveWizardProviderDef,
    resolveWizardProviderLabel,
    resolveWizardProviderName,
    wizardLiveModels,
    resolveWizardTierLabel,
    type WizardTranslate
} from './AgentConsoleProviderWizard';

export function buildProviderWizardSteps(
    values: AgentWizardValues = {},
    t: WizardTranslate = defaultWizardTranslate
): AgentWizardStepDef[] {
    const def = resolveWizardProviderDef(values.providerId);
    const steps: AgentWizardStepDef[] = [
        { id: 'provider', kind: 'choose', label: WIZARD_STEP_HANDLERS.provider.label(values, t) }
    ];
    if (!def || !def.baseUrl) {
        steps.push({ id: 'base-url', kind: 'enter', label: WIZARD_STEP_HANDLERS['base-url'].label(values, t) });
    }
    steps.push({ id: 'auth', kind: 'choose', label: WIZARD_STEP_HANDLERS.auth.label(values, t) });
    steps.push({ id: 'credential', kind: 'enter', label: WIZARD_STEP_HANDLERS.credential.label(values, t) });
    steps.push({ id: 'tiers', kind: 'choose', label: WIZARD_STEP_HANDLERS.tiers.label(values, t) });
    const tiers = values.tiers || 'auto';
    const modelKind: 'choose' | 'enter' = wizardLiveModels(values).length && !values.manualModels ? 'choose' : 'enter';
    steps.push({ id: 'model-fast', kind: modelKind, label: WIZARD_STEP_HANDLERS['model-fast'].label(values, t) });
    if (tiers === 'auto') {
        steps.push({ id: 'model-balanced', kind: modelKind, label: WIZARD_STEP_HANDLERS['model-balanced'].label(values, t) });
    }
    if (tiers !== 'single') {
        steps.push({ id: 'model-strong', kind: modelKind, label: WIZARD_STEP_HANDLERS['model-strong'].label(values, t) });
    }
    steps.push({ id: 'confirm', kind: 'confirm', label: WIZARD_STEP_HANDLERS.confirm.label(values, t) });
    return steps;
}

export function buildWizardStepHelp(
    step: AgentWizardStepDef,
    values: AgentWizardValues = {},
    t: WizardTranslate = defaultWizardTranslate
): string {
    return WIZARD_STEP_HANDLERS[step.id]?.help(values, t) ?? '';
}

export function resolveWizardPrefill(step: AgentWizardStepDef, values: AgentWizardValues = {}): string {
    return WIZARD_STEP_HANDLERS[step.id]?.prefill?.(values) ?? '';
}

export function applyWizardStepChoice(values: AgentWizardValues, stepId: AgentWizardStepId, value: string): void {
    WIZARD_STEP_HANDLERS[stepId]?.applyChoice?.(values, value);
}

export function applyWizardStepEnter(values: AgentWizardValues, stepId: AgentWizardStepId, value: string): void {
    WIZARD_STEP_HANDLERS[stepId]?.applyEnter?.(values, value);
}

export function buildProviderWizardSummary(
    values: AgentWizardValues = {},
    t: WizardTranslate = defaultWizardTranslate
): string[] {
    const def = resolveWizardProviderDef(values.providerId);
    const baseUrl = values.baseUrl || def?.baseUrl || '';
    const credential = values.authMode === 'env'
        ? t('agent.menu.provider.steps.summaryEnv', 'env {name}', { name: values.credential || '' })
        : t('agent.menu.provider.steps.summaryApiKey', 'API key set');
    const models = [values.modelFast, values.modelBalanced, values.modelStrong].filter(Boolean).join(' · ');
    return [
        `${def?.label || values.providerId || t('agent.menu.provider.steps.summaryProviderFallback', 'Provider')} · ${baseUrl || t('agent.menu.provider.steps.summaryDefaultBaseUrl', 'no base URL')}`,
        credential,
        resolveWizardTierLabel(values.tiers, t),
        models ? t('agent.menu.provider.steps.summaryModels', 'Models: {models}', { models }) : ''
    ].filter(Boolean);
}

export function buildProviderWizardConfirmOptions(
    values: AgentWizardValues = {},
    canTest = false,
    t: WizardTranslate = defaultWizardTranslate
): AgentConsoleSelectOption[] {
    const summary = buildProviderWizardSummary(values, t).join('\n');
    const name = resolveWizardProviderName(values);
    const options: AgentConsoleSelectOption[] = [
        {
            label: t('agent.menu.provider.steps.saveActive', 'Save & activate'),
            value: 'save-active',
            description: t('agent.menu.provider.steps.saveActiveDescription', 'Use {name} immediately', { name }),
            detail: summary
        },
        {
            label: t('agent.menu.provider.steps.save', 'Save only'),
            value: 'save',
            description: t('agent.menu.provider.steps.saveDescription', 'Configure now, switch later with /model'),
            detail: summary
        }
    ];
    if (canTest && (values.credential || resolveWizardProviderDef(values.providerId)?.apiKeyEnv)) {
        options.push({
            label: t('agent.menu.provider.steps.test', 'Test connection'),
            value: 'test',
            description: t('agent.menu.provider.steps.testDescription', 'Verify the key and base URL reach the provider'),
            detail: summary
        });
    }
    options.push({
        label: t('agent.menu.provider.steps.edit', 'Edit…'),
        value: 'edit',
        description: t('agent.menu.provider.steps.editDescription', 'Change a field before saving')
    });
    options.push({
        label: t('agent.menu.provider.steps.cancel', 'Cancel'),
        value: 'cancel',
        description: t('agent.menu.provider.steps.cancelOptionDescription', 'Discard this provider')
    });
    return options;
}

export function buildProviderWizardChoiceOptions(
    step: AgentWizardStepDef,
    values: AgentWizardValues = {},
    t: WizardTranslate = defaultWizardTranslate
): { title: string; options: AgentConsoleSelectOption[]; selected: number } | undefined {
    const handler = WIZARD_STEP_HANDLERS[step.id];
    const options = handler?.choices?.(values, t);
    if (!options?.length) {
        return undefined;
    }
    return {
        title: handler.choiceTitle?.(values, t) || t('agent.menu.provider.steps.defaultChoiceTitle', 'Add provider'),
        options,
        selected: handler.choiceIndex?.(values) ?? 0
    };
}
