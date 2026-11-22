import { defaultAgentOptions } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RuntimeStub, SchedulerStub, createConsoleParts } from './_helpers';

/**
 * The IoC `AGENT_OPTIONS` fallback is the shared `defaultAgentOptions`
 * singleton. Bootstrap must clone it before the provider wizard / profile
 * activation replace `options.model`, or one console leaks models into every
 * later console (observed as random test-order failures on model.activate).
 */
@Suite('default agent options isolation')
export class DefaultOptionsIsolationTest {
    @Test('bootstrap clones the injected default before model writes')
    async clonesDefault() {
        const { component } = createConsoleParts(
            new RuntimeStub(),
            new SchedulerStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            defaultAgentOptions
        );
        const sharedModel = defaultAgentOptions.model;
        await (component as any).onInit();
        expect((component as any).options).not.toBe(defaultAgentOptions);
        expect((component as any).options.model).not.toBe(sharedModel);
        (component as any).options.model = {
            ...(component as any).options.model,
            defaultProfile: 'strong',
            profiles: { strong: {} }
        };
        expect((defaultAgentOptions.model as any).defaultProfile).toBeUndefined();
        expect((defaultAgentOptions.model as any).profiles).toBeUndefined();
    }
}
