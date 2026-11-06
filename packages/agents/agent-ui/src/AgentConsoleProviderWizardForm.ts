import { FormControl, FormGroup, Validators } from '@tsdi/components/forms';
import { AgentWizardStepId, AgentWizardValues, resolveWizardProviderDef } from './AgentConsoleProviderWizard';

const HTTP_URL = /^https?:\/\/[^\s]+$/i;

const STEP_CONTROLS: Partial<Record<AgentWizardStepId, string>> = {
    'base-url': 'baseUrl',
    credential: 'credential',
    'model-fast': 'modelFast',
    'model-balanced': 'modelBalanced',
    'model-strong': 'modelStrong'
};

/**
 * Reactive validation model for the multi-step provider submission. Keeping
 * the field rules in a FormGroup means step advancement and final submission
 * use the same validators instead of duplicating ad-hoc checks.
 */
export function createAgentProviderWizardForm(values: AgentWizardValues = {}): FormGroup {
    const def = resolveWizardProviderDef(values.providerId);
    return new FormGroup({
        providerId: new FormControl(values.providerId || '', Validators.required),
        baseUrl: new FormControl(values.baseUrl || def?.baseUrl || '', [Validators.required, Validators.pattern(HTTP_URL)]),
        credential: new FormControl(values.credential || '', Validators.required),
        modelFast: new FormControl(values.modelFast || '', Validators.required),
        modelBalanced: new FormControl(values.modelBalanced || values.modelFast || '', Validators.required),
        modelStrong: new FormControl(values.modelStrong || values.modelFast || '', Validators.required)
    });
}

export interface ProviderWizardStepValidation {
    valid: boolean;
    reason?: 'required' | 'baseUrl';
}

export function validateProviderWizardStep(
    values: AgentWizardValues,
    stepId: AgentWizardStepId,
    value: string
): ProviderWizardStepValidation {
    const controlName = STEP_CONTROLS[stepId];
    if (!controlName) {
        return { valid: true };
    }
    const form = createAgentProviderWizardForm(values);
    const control = form.get(controlName);
    if (!control) {
        return { valid: true };
    }
    const def = resolveWizardProviderDef(values.providerId);
    control.setValue(stepId === 'base-url' ? (value || def?.baseUrl || '') : value);
    if (control.valid) {
        return { valid: true };
    }
    return {
        valid: false,
        reason: control.errors?.pattern ? 'baseUrl' : 'required'
    };
}

/** Validate the complete wizard payload before writing provider configuration. */
export function validateProviderWizardSubmission(values: AgentWizardValues): boolean {
    const form = createAgentProviderWizardForm(values);
    form.patchValue({
        providerId: values.providerId || '',
        baseUrl: values.baseUrl || resolveWizardProviderDef(values.providerId)?.baseUrl || '',
        credential: values.credential || '',
        modelFast: values.modelFast || '',
        modelBalanced: values.modelBalanced || values.modelFast || '',
        modelStrong: values.modelStrong || values.modelFast || ''
    });
    return form.valid;
}
