import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    createAgentProviderWizardForm,
    validateProviderWizardStep,
    validateProviderWizardSubmission
} from '../src/AgentConsoleProviderWizardForm';

@Suite('provider wizard form validation')
export class ProviderWizardFormTest {
    @Test('validates base URL and required steps through a FormGroup')
    stepValidation() {
        const values = { providerId: 'custom-openai', authMode: 'key', credential: 'sk-test' };
        expect(validateProviderWizardStep(values, 'base-url', 'ftp://example.com').reason).toEqual('baseUrl');
        expect(validateProviderWizardStep(values, 'base-url', 'https://example.com/v1').valid).toEqual(true);
        expect(validateProviderWizardStep(values, 'credential', '').reason).toEqual('required');
        expect(validateProviderWizardStep(values, 'model-fast', 'model-a').valid).toEqual(true);
    }

    @Test('checks the complete submission model')
    submissionValidation() {
        const good = {
            providerId: 'openai', baseUrl: 'https://api.openai.com',
            credential: 'sk-test', modelFast: 'gpt-4.1-mini', modelBalanced: 'gpt-4.1', modelStrong: 'gpt-4.1'
        };
        expect(validateProviderWizardSubmission(good)).toEqual(true);
        expect(validateProviderWizardSubmission({ ...good, baseUrl: 'not-a-url' })).toEqual(false);
        expect(validateProviderWizardSubmission({ ...good, modelFast: '' })).toEqual(false);
    }

    @Test('a preset provider is valid without an explicit base URL')
    presetDefaults() {
        const form = createAgentProviderWizardForm({ providerId: 'deepseek' });
        expect(form.get('baseUrl')?.value).toEqual('https://api.deepseek.com');
        expect(form.get('baseUrl')?.valid).toEqual(true);
    }
}
