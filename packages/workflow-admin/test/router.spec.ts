import expect = require('expect');
import { WorkflowAdminUiRouter } from '../src/ui/router';

describe('workflow admin UI router', () => {
    it('guards protected routes and redirects unauthenticated users', async () => {
        let rejected = '';
        const router = new WorkflowAdminUiRouter({
            guard: {
                canActivate: async snapshot => {
                    rejected = snapshot.url;
                    return false;
                }
            },
            initialUrl: '/workflows/demo',
            routes: [
                { path: 'workflows/:id' }
            ]
        });
        expect(await router.start()).toBe(false);
        expect(rejected).toContain('workflows/demo');
    });

    it('resolves workflow ids and public login routes', async () => {
        const router = new WorkflowAdminUiRouter({
            guard: { canActivate: async () => true },
            initialUrl: '/workflows/demo',
            routes: [
                { path: 'workflows/:id' },
                { path: 'login', data: { public: true } }
            ]
        });
        expect(await router.start()).toBe(true);
        expect(router.workflowId).toBe('demo');
        expect(await router.navigateTo('/login')).toBe(true);
        expect(router.loginRoute).toBe(true);
    });
});
