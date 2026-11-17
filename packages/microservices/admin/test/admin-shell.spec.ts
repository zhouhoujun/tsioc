import expect = require('expect');
import { AdminShellController } from '../web/admin.shell.controller';

describe('AdminShellController', () => {
    function createHost() {
        let reloads = 0;
        const written: Array<[string, string]> = [];
        const host = {
            locale: 'en',
            theme: 'light',
            page: 'dashboard',
            needsLogin: false,
            status: '',
            t: (key: string) => key,
            documentRef: {
                defaultView: {
                    localStorage: {
                        getItem: () => null,
                        setItem: (key: string, value: string) => written.push([key, value])
                    }
                }
            } as any,
            reload: async () => { reloads += 1; }
        } as any;
        return { host, written, reloads: () => reloads };
    }

    it('changes locale without refetching or discarding staged state', async () => {
        const { host, written, reloads } = createHost();
        const shell = new AdminShellController(host);

        await shell.start();
        expect(reloads()).toBe(1);

        shell.setLocale('zh-CN');
        expect(host.locale).toBe('zh-CN');
        expect(reloads()).toBe(1); // no extra state fetch for a label change
        expect(written).toContainEqual(['tsdi-gateway-admin-locale', 'zh-CN']);

        shell.setLocale('zh-CN');
        expect(reloads()).toBe(1);
    });

    it('persists theme without touching gateway state', async () => {
        const { host, written, reloads } = createHost();
        const shell = new AdminShellController(host);
        await shell.start();

        shell.setTheme('dark');
        expect(host.theme).toBe('dark');
        expect(reloads()).toBe(1);
        expect(written).toContainEqual(['tsdi-gateway-admin-theme', 'dark']);
    });
});
