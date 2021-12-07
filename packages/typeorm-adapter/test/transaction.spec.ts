import { Application, ApplicationContext } from '@tsdi/core';
import { lang } from '@tsdi/ioc';
import { After, Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { MockTransBootTest, option } from './app';
import { Role, User } from './models/models';
import { UserRepository } from './repositories/UserRepository';


@Suite()
export class TransactionTest {

    constructor(private ctx: ApplicationContext) { }

    @Before()
    async beforeInit() {
        this.ctx = await Application.run({
            type: MockTransBootTest,
            configures: [
                {
                    models: ['./models/**/*.ts'],
                    repositories: ['./repositories/**/*.ts'],
                    connections: option
                }
            ]
        });


        const urep = this.ctx.injector.get(UserRepository);
        const u1 = await urep.findByAccount('test_111');
        if (u1) await urep.remove(u1);
        const u2 = await urep.findByAccount('post_test');
        if (u2) await urep.remove(u2);

    }

    @Test()
    async postRolebackUser() {
        const rep = await this.ctx.send('/users', { method: 'post', body: { name: 'test_111', account: 'test_111', password: '111111' }, query: { check: true } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(500);
        expect(rep.error).toBeDefined();
        expect(rep.error.message).toEqual('check');
        expect(rep.body).not.toBeInstanceOf(User);
        
        const rep2 = await this.ctx.send('/users/test_111', { method: 'get' });
        expect(rep2.status).toEqual(200);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).not.toBeInstanceOf(User);
    }

    @Test()
    async postCommitUser() {
        const rep = await this.ctx.send('/users', { method: 'post', body: { name: 'post_test', account: 'post_test', password: '111111' } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(User);
        expect(rep.body.name).toEqual('post_test');
        // await lang.delay(100);
        
        const rep2 = await this.ctx.send('/users/post_test', { method: 'get' });
        expect(rep2.status).toEqual(200);
        expect(rep2.body).toBeInstanceOf(User);
        expect(rep2.body.account).toEqual('post_test');
    }

    @Test()
    async clearUser() {
        const rep1 = await this.ctx.send('/users/post_test', { method: 'get' });
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toBeInstanceOf(User);
        const rep = await this.ctx.send('/users/' + rep1.body.id, { method: 'delete' });
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }

    @Test()
    async postRolebackUser2() {
        const rep = await this.ctx.send('/users/save', { method: 'post', body: { name: 'test_112', account: 'test_112', password: '111111' }, query: { check: true } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(500);
        expect(rep.error).toBeDefined();
        expect(rep.error.message).toEqual('check');
        expect(rep.body).not.toBeInstanceOf(User);

        const rep2 = await this.ctx.send('/users/test_112', { method: 'get' });
        expect(rep2.status).toEqual(200);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).not.toBeInstanceOf(User);
    }

    @Test()
    async postRolebackRole() {
        const rep = await this.ctx.send('/roles', { method: 'post', body: { name: 'opter_1' }, query: { check: true } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(500);
        expect(rep.error).toBeDefined();
        expect(rep.error.message).toEqual('check');
        expect(rep.body).not.toBeInstanceOf(Role);
        // await lang.delay(100);

        const rep2 = await this.ctx.send('/roles/opter_1', { method: 'get' });
        expect(rep2.status).toEqual(200);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).not.toBeInstanceOf(Role);
    }

    @Test()
    async postRolebackRole2() {
        const rep = await this.ctx.send('/roles/save2', { method: 'post', body: { name: 'opter_2' }, query: { check: true } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(500);
        expect(rep.error).toBeDefined();
        expect(rep.error.message).toEqual('check');
        expect(rep.body).not.toBeInstanceOf(Role);
        // await lang.delay(100);

        const rep2 = await this.ctx.send('/roles/opter_2', { method: 'get' });
        expect(rep2.status).toEqual(200);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).not.toBeInstanceOf(Role);
    }

    @Test()
    async postCommitRole() {
        const rep = await this.ctx.send('/roles', { method: 'post', body: { name: 'opter' } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(Role);
        expect(rep.body.name).toEqual('opter');
        
        const rep2 = await this.ctx.send('/roles/opter', { method: 'get' });
        expect(rep2.status).toEqual(200);
        expect(rep2.body).toBeInstanceOf(Role);
        expect(rep2.body.name).toEqual('opter');
    }

    @Test()
    async clearRole() {
        const rep1 = await this.ctx.send('/roles/opter', { method: 'get' });
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toBeInstanceOf(Role);
        const rep = await this.ctx.send('/roles/' + rep1.body.id, { method: 'delete' });
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }


    @After()
    async after() {
        await this.ctx.dispose();
    }

}