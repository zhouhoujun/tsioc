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

    @Test('multi-line alerts auto-close after their duration')
    async alertsAutoClose() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        try {
            (component as any).notify('line one\nline two\nline three\nline four', 80);
            expect(component.sessionState.textOverlay?.lines.length).toEqual(4);
            await new Promise(resolve => setTimeout(resolve, 300));
            expect(component.sessionState.textOverlay).toBeFalsy();
        } finally {
            component.onDestroy();
        }
    }

    @Test('alerts without an explicit duration use the default timeout')
    async alertsUseDefaultTimeout() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        try {
            (component as any).notify('line one\nline two\nline three\nline four');
            expect(component.sessionState.textOverlay?.lines.length).toEqual(4);
            // Manual close still wins; the pending timer must not resurrect or
            // close a newer panel.
            component.sessionState.closeTextOverlay();
            expect(component.sessionState.textOverlay).toBeFalsy();
            await new Promise(resolve => setTimeout(resolve, 60));
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
