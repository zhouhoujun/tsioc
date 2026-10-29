import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ModelFailure } from '@tsdi/agent';
import { isModelUnavailableFailure } from '../src/AgentConsoleModelAvailability';

function failure(overrides: Partial<ModelFailure> = {}): ModelFailure {
    return {
        kind: 'server', status: 503, provider: 'openai-compatible', model: 'gpt-5.5',
        detail: 'Service temporarily unavailable', retryable: true, ...overrides
    };
}

@Suite('model availability detection')
export class ModelAvailabilityTest {
    @Test('a configured model missing from the live catalogue is unavailable')
    configuredModelMissing() {
        expect(isModelUnavailableFailure(failure(), [{ id: 'gpt-5.6-sol' }, { id: 'gpt-6.1-sol' }])).toEqual(true);
    }

    @Test('a transient 503 for a model still in the catalogue is not an update prompt')
    transientServerError() {
        expect(isModelUnavailableFailure(failure({ status: 503 }), [{ id: 'gpt-5.5' }])).toEqual(false);
    }

    @Test('404 and explicit model-not-found details are unavailable')
    notFound() {
        expect(isModelUnavailableFailure(failure({ status: 404, detail: '' }), [])).toEqual(true);
        expect(isModelUnavailableFailure(failure({ status: 503, detail: 'model_not_found' }), [])).toEqual(true);
        expect(isModelUnavailableFailure(failure({ status: 400, detail: 'The model does not exist' }), [])).toEqual(true);
    }

    @Test('rate limits for a known model do not prompt for a model update')
    rateLimitKnownModel() {
        expect(isModelUnavailableFailure(failure({ kind: 'rate-limit', status: 429, detail: 'rate limit' }), [{ id: 'gpt-5.5' }])).toEqual(false);
    }
}
