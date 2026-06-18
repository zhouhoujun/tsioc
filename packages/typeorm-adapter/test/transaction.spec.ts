import { HttpClient } from '@tsdi/http';
import { Application, ApplicationContext } from '@tsdi/core';
import { After, Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import { TypeormAdapter } from '../src/TypeormAdapter';
import { MockTransBootTest } from './app';
import { Role, User } from './models/models';
// import { UserRepository } from './repositories/UserRepository';


@Suite()
export class TransactionTest {

    private ctx!: ApplicationContext;

    @Before()
    async beforeInit() {
        this.ctx = await Application.run({
            module: MockTransBootTest,
            baseURL: __dirname
        });

        const em = this.ctx.get(TypeormAdapter).getConnection().manager;
        try {
            await em.query(`DELETE FROM "user" WHERE account IN ('test_111', 'post_test', 'test_112')`);
            await em.query(`DELETE FROM "role" WHERE name IN ('opter_1', 'opter_2')`);
        } catch { /* ignore */ }

    }

    @Test()
    async postRolebackUser() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post('/users', { name: 'test_111', account: 'test_111', password: '111111' }, { observe: 'response', params: { check: true } })
            .pipe(
                catchError((err, caught) => {
                    this.ctx.getLogger().error(err);
                    return of(err);
                })
            ));
        expect(rep.status).toEqual(500);
        expect(rep.body).toBeDefined();
        expect(rep.body?.message).toEqual('Internal Server Error');

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get('/users', { observe: 'response', params: { name: 'test_111' } })
            .pipe(
                catchError((err, caught) => {
                    this.ctx.getLogger().error(err);
                    return of(err);
                })
            ));
        expect(rep2.status).toEqual(204);
        expect(rep2.body).toBeNull();
    }

    @Test()
    async postRolebackUser2() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post('/users/save', { name: 'test_112', account: 'test_112', password: '111111' }, { observe: 'response', params: { check: true } })
            .pipe(
                catchError((err, caught) => {
                    this.ctx.getLogger().error(err);
                    return of(err);
                })
            ));
        expect(rep.status).toEqual(500);
        expect(rep.body).toBeDefined();
        expect(rep.body?.message).toEqual('Internal Server Error');

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get('/users', { observe: 'response', params: { name: 'test_112' } }));
        expect(rep2.status).toEqual(204);
        expect(rep2.body).toBeNull();
    }

    @Test()
    async postCommitUser() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post('/users', { name: 'post_test', account: 'post_test', password: '111111' }, { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeDefined();
        expect(rep.body?.name).toEqual('post_test');
        // await lang.delay(100);

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get('/users', { observe: 'response', params: { name: 'post_test' } }));
        expect(rep2.status).toEqual(200);
        expect(rep2.body).toBeDefined();
        expect(rep2.body?.account).toEqual('post_test');
    }

    @Test()
    async clearUser() {
        const rep1 = await lastValueFrom(this.ctx.resolve(HttpClient).get('/users', { observe: 'response', params: { name: 'post_test' } }));
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toBeDefined();
        expect(rep1.body?.id).toBeDefined();
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).delete('/users', { observe: 'response', params: { id: rep1.body?.id } }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }

    @Test()
    async postRolebackRole() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post('/roles', { name: 'opter_1' }, { observe: 'response', params: { check: true } })
            .pipe(
                catchError((err, caught) => {
                    this.ctx.getLogger().error(err);
                    return of(err);
                })
            ));
        expect(rep.status).toEqual(500);
        expect(rep.body).toBeDefined();
        expect(rep.body?.message).toEqual('Internal Server Error');
        // await lang.delay(100);

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get('/roles', { observe: 'response', params: { name: 'opter_1' } }));
        expect(rep2.status).toEqual(204);
        expect(rep2.body).toBeNull();
    }

    @Test()
    async postRolebackRole2() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post('/roles/save2', { name: 'opter_2' }, { observe: 'response', params: { check: true } })
            .pipe(
                catchError((err, caught) => {
                    this.ctx.getLogger().error(err);
                    return of(err);
                })
            ));
        expect(rep.status).toEqual(500);
        expect(rep.body).toBeDefined();
        expect(rep.body?.message).toEqual('Internal Server Error');
        // await lang.delay(100);

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get('/roles', { observe: 'response', params: { name: 'opter_2' } }));
        expect(rep2.status).toEqual(204);
        expect(rep2.body).toBeNull();
    }

    @Test()
    async postCommitRole() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post('/roles', { name: 'opter' }, { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeDefined();
        expect(rep.body?.name).toEqual('opter');

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get('/roles', { observe: 'response', params: { name: 'opter' } }));
        expect(rep2.status).toEqual(200);
        expect(rep2.body).toBeDefined();
        expect(rep2.body?.name).toEqual('opter');
    }

    @Test()
    async clearRole() {
        const rep1 = await lastValueFrom(this.ctx.resolve(HttpClient).get('/roles', { observe: 'response', params: { name: 'opter' } }));
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toHaveProperty('id');
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).delete('/roles', { observe: 'response', params: { id: rep1.body?.id } }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }


    @After()
    async after() {
        await this.ctx.destroy();
    }

}
