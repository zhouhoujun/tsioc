import type { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import type { AgentUiResolvedModelProfile } from './AgentUiConfigReader';
import { formatAgentUiLabel } from './agent-ui.i18n';
import { AgentConsoleRuntimeCommandHost } from './AgentConsoleRuntimeHost';
import {
    getModelProfileOptions,
    loadModelProfileOptions,
    openModelSwitcher,
    resolveModelProfileConfig
} from './AgentConsoleModelHandlers';
import {
    AGENT_WIZARD_PROVIDERS,
    AGENT_WIZARD_TIERS,
    AgentWizardProviderDef,
    AgentWizardStepDef,
    buildProviderWizardConfirmOptions,
    buildProviderWizardSteps,
    buildProviderWizardSummary,
    buildWizardStepHelp,
    resolveWizardPrefill,
    resolveWizardProviderDef,
    resolveWizardProviderName,
    resolveWizardTierLabel
} from './AgentConsoleProviderWizard';
import {
    advanceProviderWizard,
    AgentWizardHolder,
    AgentWizardState,
    cancelProviderWizard,
    commitProviderWizard,
    handleProviderWizardChoice,
    handleProviderWizardConfirm,
    handleWizardEscape,
    openProviderWizardChoice,
    openProviderWizardConfirm,
    openProviderWizardEditor,
    ProviderWizardContext,
    resetProviderWizardComposer,
    showProviderWizardStep,
    startProviderWizard,
    testProviderConnection
} from './AgentConsoleProviderWizardFlow';

/** Provider wizard and model switcher projections. */
export abstract class AgentConsoleModelHost extends AgentConsoleRuntimeCommandHost {
    protected abstract pwctx(): ProviderWizardContext;
    protected wizHolder: AgentWizardHolder = {};
    protected get providerWizard(): AgentWizardState | undefined {
        return this.wizHolder.wizard;
    }
    protected set providerWizard(value: AgentWizardState | undefined) {
        this.wizHolder.wizard = value;
    }

    protected startProviderWizard(): void {
        return startProviderWizard(this.pwctx(), this.wizHolder);
    }

    protected wizardProviderDef(id?: string): AgentWizardProviderDef | undefined {
        return resolveWizardProviderDef(id);
    }

    protected wizardTierLabel(tier?: string): string {
        return resolveWizardTierLabel(tier, (key: string, fallback: string, params?: Record<string, any>) => formatAgentUiLabel(this.translator, key, fallback, params));
    }

    protected handleWizardEscape(): boolean {
        return handleWizardEscape(this.pwctx(), this.wizHolder);
    }

    protected cancelProviderWizard(): boolean {
        return cancelProviderWizard(this.pwctx(), this.wizHolder);
    }

    protected resetProviderWizardComposer(): void {
        return resetProviderWizardComposer(this.pwctx(), this.wizHolder);
    }

    protected providerWizardSteps(): AgentWizardStepDef[] {
        return buildProviderWizardSteps(this.providerWizard?.values || {}, (key: string, fallback: string, params?: Record<string, any>) => formatAgentUiLabel(this.translator, key, fallback, params));
    }

    protected wizardStepHelp(step: AgentWizardStepDef, values: NonNullable<typeof this.providerWizard>['values']): string {
        return buildWizardStepHelp(step, values, (key: string, fallback: string, params?: Record<string, any>) => formatAgentUiLabel(this.translator, key, fallback, params));
    }

    protected providerWizardPrefill(step: AgentWizardStepDef, values: NonNullable<typeof this.providerWizard>['values']): string {
        return resolveWizardPrefill(step, values);
    }

    protected providerWizardSummary(): string[] {
        return buildProviderWizardSummary(this.providerWizard?.values || {}, (key: string, fallback: string, params?: Record<string, any>) => formatAgentUiLabel(this.translator, key, fallback, params));
    }

    protected showProviderWizardStep(): void {
        return showProviderWizardStep(this.pwctx(), this.wizHolder);
    }

    protected openProviderWizardChoice(step: AgentWizardStepDef): void {
        return openProviderWizardChoice(this.pwctx(), this.wizHolder, step);
    }

    protected async handleProviderWizardChoice(value?: string): Promise<void> {
        return await handleProviderWizardChoice(this.pwctx(), this.wizHolder, value);
    }

    protected wizardProviderName(values: NonNullable<typeof this.providerWizard>['values']): string {
        return resolveWizardProviderName(values);
    }

    protected providerWizardConfirmOptions(): AgentConsoleSelectOption[] {
        return buildProviderWizardConfirmOptions(this.providerWizard?.values || {}, !!this.appRpc, (key: string, fallback: string, params?: Record<string, any>) => formatAgentUiLabel(this.translator, key, fallback, params));
    }

    protected openProviderWizardConfirm(): void {
        return openProviderWizardConfirm(this.pwctx(), this.wizHolder);
    }

    protected async handleProviderWizardConfirm(action?: string): Promise<void> {
        return await handleProviderWizardConfirm(this.pwctx(), this.wizHolder, action);
    }

    protected async openProviderWizardEditor(): Promise<void> {
        return await openProviderWizardEditor(this.pwctx(), this.wizHolder);
    }

    protected async testProviderConnection(): Promise<void> {
        return await testProviderConnection(this.pwctx(), this.wizHolder);
    }

    protected async commitProviderWizard(): Promise<void> {
        return await commitProviderWizard(this.pwctx(), this.wizHolder);
    }

    protected async advanceProviderWizard(value: string): Promise<void> {
        return await advanceProviderWizard(this.pwctx(), this.wizHolder, value);
    }

    protected getModelProfileOptions(): AgentConsoleSelectOption[] {
        return getModelProfileOptions(this.modelCtx());
    }

    protected async loadModelProfileOptions(): Promise<AgentConsoleSelectOption[]> {
        return loadModelProfileOptions(this.modelCtx());
    }

    protected resolveModelProfileConfig(profileName: string): AgentUiResolvedModelProfile {
        return resolveModelProfileConfig(this.modelCtx(), profileName);
    }

    protected async openModelSwitcher(): Promise<void> {
        return openModelSwitcher(this.modelCtx());
    }
}
