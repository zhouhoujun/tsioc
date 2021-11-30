import { Application, ApplicationContext } from '@tsdi/core';
import { After, Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { MockTransBootTest, option } from './app';
import { Role, User } from './models/models';


@Suite()
export class TransactionTest {

    constructor(private ctx: ApplicationContext) { }

    @Before()
    async beforeInit() {
        this.ctx = await Application.run({
            type: MockTransBootTest,
            exit: false,
            configures: [
                {
                    models: ['./models/**/*.ts'],
                    repositories: ['./repositories/**/*.ts'],
                    connections: option
                }
            ]
        });
    }

    @Test()
    async postRolebackUser() {
        const rep = await this.ctx.send('/users', { method: 'post', body: { name: 'test111', account: 'post_test', password: '111111' }, query: { check: true } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(500);
        expect(rep.error).toBeDefined();
        expect(rep.body).not.toBeInstanceOf(User);
    }

    @Test()
    async checkhasNotSavedUser() {
        const rep = await this.ctx.send('/users/test111', { method: 'get' });
        expect(rep.status).toEqual(200);
        expect(rep.body).not.toBeInstanceOf(User);
    }

    @Test()
    async postCommitUser() {
        const rep = await this.ctx.send('/users', { method: 'post', body: { name: 'post_test', account: 'post_test', password: '111111' } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(User);
        expect(rep.body.name).toEqual('post_test');
    }

    @Test()
    async checkhasSavedUser() {
        const rep = await this.ctx.send('/users/post_test', { method: 'get' });
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(User);
        expect(rep.body.account).toEqual('post_test');
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
    async postRolebackRole() {
        const rep = await this.ctx.send('/roles', { method: 'post', body: { name: 'opter1' }, query: { check: true } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(500);
        expect(rep.error).toBeDefined();
        expect(rep.body).not.toBeInstanceOf(Role);
    }

    @Test()
    async checkhasNotSavedRole() {
        const rep = await this.ctx.send('/roles/opter1', { method: 'get' });
        expect(rep.status).toEqual(200);
        expect(rep.body).not.toBeInstanceOf(Role);
    }

    @Test()
    async postCommitRole() {
        const rep = await this.ctx.send('/roles', { method: 'post', body: { name: 'opter' } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(Role);
        expect(rep.body.name).toEqual('opter');
    }

    @Test()
    async checkSuccessSavedRole() {
        const rep = await this.ctx.send('/roles/opter', { method: 'get' });
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(Role);
        expect(rep.body.name).toEqual('opter');
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