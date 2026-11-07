import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsole, RuntimeStub, SchedulerStub } from './_helpers';

@Suite('console toast notifications')
export class ToastNotificationsTest {
    @Test('timed notices become closable toasts instead of status notice lines')
    async timedNoticesUseToasts() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        try {
            (component as any).notify('Copied selected message.', 1800);
            expect(component.notice).toEqual('');
            expect(component.sessionState.toasts.map(entry => entry.message)).toEqual(['Copied selected message.']);

            const id = component.sessionState.toasts[0].id;
            component.dismissToast(id);
            expect(component.sessionState.toasts).toEqual([]);
        } finally {
            component.onDestroy();
        }
    }

    @Test('persistent notices keep the status line')
    async persistentNoticesKeepTheStatusLine() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        try {
            (component as any).notify('Unknown command: /zzz');
            expect(component.notice).toEqual('Unknown command: /zzz');
            expect(component.sessionState.toasts).toEqual([]);
        } finally {
            component.onDestroy();
        }
    }
}
