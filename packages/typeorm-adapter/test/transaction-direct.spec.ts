import { Application, ApplicationContext } from '@tsdi/core';
import { After, Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { TypeormAdapter } from '../src/TypeormAdapter';
import { MockBootTest } from './app';
import { Role, User } from './models/models';
import { Repository } from 'typeorm';
import { EntityManager } from 'typeorm';


@Suite('TransactionDirect')
export class TransactionDirectTest {

    private ctx!: ApplicationContext;

    @Before()
    async beforeInit() {
        this.ctx = await Application.run(MockBootTest);

        const em = this.ctx.get(TypeormAdapter).getConnection().manager;
        try {
            await em.query(`DELETE FROM "user" WHERE account IN ('tx_test', 'tx_test2', 'tx_test3')`);
            await em.query(`DELETE FROM "role" WHERE name IN ('tx_role', 'tx_role2')`);
        } catch { /* ignore */ }
    }

    @Test()
    async shouldGetRepository() {
        const rep = this.ctx.get(TypeormAdapter).getRepository(User);
        expect(rep).toBeInstanceOf(Repository);
    }

    @Test()
    async shouldSaveAndFind() {
        const rep = this.ctx.get(TypeormAdapter).getRepository(User);
        const user = new User();
        user.name = 'tx_test';
        user.account = 'tx_test';
        user.password = '111111';
        const saved = await rep.save(user);
        expect(saved).toBeDefined();
        expect(saved.id).toBeDefined();

        const found = await rep.findOne({ where: { account: 'tx_test' } });
        expect(found).toBeDefined();
        expect(found?.name).toEqual('tx_test');
    }

    @Test()
    async shouldUpdateEntity() {
        const rep = this.ctx.get(TypeormAdapter).getRepository(User);
        const user = new User();
        user.name = 'tx_test2';
        user.account = 'tx_test2';
        user.password = '111111';
        const saved = await rep.save(user);
        expect(saved.id).toBeDefined();

        saved.name = 'tx_test2_updated';
        await rep.save(saved);

        const found = await rep.findOne({ where: { account: 'tx_test2' } });
        expect(found?.name).toEqual('tx_test2_updated');
    }

    @Test()
    async shouldDeleteEntity() {
        const rep = this.ctx.get(TypeormAdapter).getRepository(User);
        const user = new User();
        user.name = 'tx_test3';
        user.account = 'tx_test3';
        user.password = '111111';
        const saved = await rep.save(user);
        expect(saved.id).toBeDefined();

        await rep.remove(saved);

        const found = await rep.findOne({ where: { account: 'tx_test3' } });
        expect(found).toBeNull();
    }

    @Test()
    async shouldHaveManager() {
        const mgr = this.ctx.get(TypeormAdapter).getManager();
        expect(mgr).toBeDefined();
        expect(mgr).toBeInstanceOf(EntityManager);
    }

    @Test()
    async shouldSaveRole() {
        const rep = this.ctx.get(TypeormAdapter).getRepository(Role);
        const role = new Role();
        role.name = 'tx_role';
        const saved = await rep.save(role);
        expect(saved).toBeDefined();
        expect(saved.id).toBeDefined();

        const found = await rep.findOne({ where: { name: 'tx_role' } });
        expect(found).toBeDefined();
        expect(found?.name).toEqual('tx_role');

        await rep.remove(saved);
    }

    @Test()
    async shouldCountEntities() {
        const rep = this.ctx.get(TypeormAdapter).getRepository(User);
        const count = await rep.count();
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
    }

    @Test()
    async shouldCheckConnectionStatus() {
        const adapter = this.ctx.get(TypeormAdapter);
        const hasConn = adapter.hasConnection('xx');
        expect(hasConn).toBe(true);

        const status = adapter.getConnectionStatus('xx');
        expect(status.initialized).toBe(true);
        expect(status.connected).toBe(true);

        const names = adapter.getConnectionNames();
        expect(names).toContain('xx');
    }

    @Test()
    async shouldGetAllConnectionStatus() {
        const adapter = this.ctx.get(TypeormAdapter);
        const allStatus = adapter.getAllConnectionStatus();
        expect(Array.isArray(allStatus)).toBe(true);
        expect(allStatus.length).toBeGreaterThan(0);
        expect(allStatus[0].name).toBe('xx');
        expect(allStatus[0].initialized).toBe(true);
    }

    @After()
    async after() {
        await this.ctx?.destroy();
    }
}
