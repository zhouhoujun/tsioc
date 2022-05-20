import { HttpClient } from '@tsdi/common';
import { Application, ApplicationContext } from '@tsdi/core';
import { After, Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import { TypeOrmHelper } from '@tsdi/typeorm-adapter';
import { MockTransBootTest } from './app';
import { Role, User } from './models/models';
import { UserRepository } from './repositories/UserRepository';


@Suite()
export class TransactionTest {

    private ctx!: ApplicationContext;

    @Before()
    async beforeInit() {
        this.ctx = await Application.run({
            module: MockTransBootTest,
            baseURL: __dirname
        });


        const urep = this.ctx.injector.get(UserRepository);
        const u1 = await urep.findByAccount('test_111');
        if (u1) await urep.remove(u1);
        const u2 = await urep.findByAccount('post_test');
        if (u2) await urep.remove(u2);
        const rrep = await this.ctx.injector.get(TypeOrmHelper).getRepository(Role);
        const role1 = await rrep.find({ where: { name: 'opter_1' } });
        if (role1) await rrep.remove(role1);
        const role2 = await rrep.find({ where: { name: 'opter_2' } });
        if (role2) await rrep.remove(role2);

        console.log('clean data');
    }

    @Test()
    async postRolebackUser() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post<User>('/users', { name: 'test_111', account: 'test_111', password: '111111' }, { observe: 'response', params: { check: true } })
            .pipe(
                catchError((err, caught) => {
                    this.ctx.getLogger().error(err);
                    return of(err);
                })
            ));
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(500);
        expect(rep.error).toBeDefined();
        expect(rep.error).toEqual('check');
        expect(rep.body).toBeNull();

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get<User>('/users/test_111', { observe: 'response' })
            .pipe(
                catchError((err, caught) => {
                    this.ctx.getLogger().error(err);
                    return of(err);
                })
            ));
        expect(rep2.status).toEqual(200);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).not.toHaveProperty('id');
    }

    @Test()
    async postRolebackUser2() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post<User>('/users/save', { name: 'test_112', account: 'test_112', password: '111111' }, { observe: 'response', params: { check: true } })
            .pipe(
                catchError((err, caught) => {
                    this.ctx.getLogger().error(err);
                    return of(err);
                })
            ));
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(500);
        expect(rep.error).toBeDefined();
        expect(rep.error).toEqual('check');
        expect(rep.body).toBeNull();

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get<User>('/users/test_112', { observe: 'response' }));
        expect(rep2.status).toEqual(200);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).not.toHaveProperty('id');
    }

    @Test()
    async postCommitUser() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post<User>('/users', { name: 'post_test', account: 'post_test', password: '111111' }, { observe: 'response' }));
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeDefined();
        expect(rep.body?.name).toEqual('post_test');
        // await lang.delay(100);

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get<User>('/users/post_test', { observe: 'response' }));
        expect(rep2.status).toEqual(200);
        expect(rep2.body).toBeDefined();
        expect(rep2.body?.account).toEqual('post_test');
    }

    @Test()
    async clearUser() {
        const rep1 = await lastValueFrom(this.ctx.resolve(HttpClient).get<User>('/users/post_test', { observe: 'response' }));
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toBeDefined();
        expect(rep1.body?.id).toBeDefined();
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).delete('/users/' + rep1.body?.id, { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }

    @Test()
    async postRolebackRole() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post<Role>('/roles', { name: 'opter_1' }, { observe: 'response', params: { check: true } })
            .pipe(
                catchError((err, caught) => {
                    this.ctx.getLogger().error(err);
                    return of(err);
                })
            ));
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(500);
        expect(rep.error).toBeDefined();
        expect(rep.error).toEqual('check');
        expect(rep.body).toBeNull();
        // await lang.delay(100);

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get<Role>('/roles/opter_1', { observe: 'response' }));
        expect(rep2.status).toEqual(200);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).not.toHaveProperty('id');
    }

    @Test()
    async postRolebackRole2() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post<Role>('/roles/save2', { name: 'opter_2' }, { observe: 'response', params: { check: true } })
            .pipe(
                catchError((err, caught) => {
                    this.ctx.getLogger().error(err);
                    return of(err);
                })
            ));
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(500);
        expect(rep.error).toBeDefined();
        expect(rep.error).toEqual('check');
        expect(rep.body).toBeNull();
        // await lang.delay(100);

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get<Role>('/roles/opter_2', { observe: 'response' }));
        expect(rep2.status).toEqual(200);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).not.toHaveProperty('id');
    }

    @Test()
    async postCommitRole() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post<Role>('/roles', { name: 'opter' }, { observe: 'response' }));
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeDefined();
        expect(rep.body?.name).toEqual('opter');

        const rep2 = await lastValueFrom(this.ctx.resolve(HttpClient).get<Role>('/roles/opter', { observe: 'response' }));
        expect(rep2.status).toEqual(200);
        expect(rep2.body).toBeDefined();
        expect(rep2.body?.name).toEqual('opter');
    }

    @Test()
    async clearRole() {
        const rep1 = await lastValueFrom(this.ctx.resolve(HttpClient).get<Role>('/roles/opter', { observe: 'response' }));
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toHaveProperty('id');
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).delete('/roles/' + rep1.body?.id, { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }


    @After()
    async after() {
        await this.ctx.destroy();
    }

}