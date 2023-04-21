import { Application, ApplicationContext } from '@tsdi/core';
import { Http, HttpClientOpts } from '@tsdi/transport-http';
import { After, Before, Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import { TypeormAdapter } from '../src/TypeormAdapter';
import { cert, Http2TransBootTest } from './app';
import { Role, User } from './models/models';
// import { UserRepository } from './repositories/UserRepository';


@Suite()
export class Http2TransactionTest {

    private ctx!: ApplicationContext;
    private client!: Http;

    @Before()
    async beforeInit() {
        this.ctx = await Application.run({
            module: Http2TransBootTest,
            baseURL: __dirname
        });

        this.client = this.ctx.injector.resolve(Http);

        const mgr = this.ctx.injector.get(TypeormAdapter).getConnection().manager;
       
        await mgr.createQueryBuilder()
            .delete()
            .from(User)
            .where('account IN (:...acs)', { acs: ['test_111', 'post_test', 'test_112'] })
            .execute();

        await mgr.createQueryBuilder()
            .delete()
            .from(Role)
            .where('name IN (:...acs)', { acs: ['opter_1', 'opter_2'] })
            .execute();

        console.log('clean data');
    }

    @Test()
    async postRolebackUser() {

        const rep = await lastValueFrom(this.client.post<User>('/users', { name: 'test_111', account: 'test_111', password: '111111' }, { observe: 'response', params: { check: true } })
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

        const rep2 = await lastValueFrom(this.client.get<User>('/users/test_111', { observe: 'response' })
            .pipe(
                catchError((err, caught) => {
                    this.ctx.getLogger().error(err);
                    return of(err);
                })
            ));
        expect(rep2.status).toEqual(204);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).toBeNull()
    }

    @Test()
    async postRolebackUser2() {
        const rep = await lastValueFrom(this.client.post<User>('/users/save', { name: 'test_112', account: 'test_112', password: '111111' }, { observe: 'response', params: { check: true } })
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

        const rep2 = await lastValueFrom(this.client.get<User>('/users/test_112', { observe: 'response' }));
        expect(rep2.status).toEqual(204);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).toBeNull();
    }

    @Test()
    async postCommitUser() {
        const rep = await lastValueFrom(this.client.post<User>('/users', { name: 'post_test', account: 'post_test', password: '111111' }, { observe: 'response' }));
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeDefined();
        expect(rep.body?.name).toEqual('post_test');
        // await lang.delay(100);

        const rep2 = await lastValueFrom(this.client.get<User>('/users/post_test', { observe: 'response' }));
        expect(rep2.status).toEqual(200);
        expect(rep2.body).toBeDefined();
        expect(rep2.body?.account).toEqual('post_test');
    }

    @Test()
    async clearUser() {
        const rep1 = await lastValueFrom(this.client.get<User>('/users/post_test', { observe: 'response' }));
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toBeDefined();
        expect(rep1.body?.id).toBeDefined();
        const rep = await lastValueFrom(this.client.delete('/users/' + rep1.body?.id, { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }

    @Test()
    async postRolebackRole() {
        const rep = await lastValueFrom(this.client.post<Role>('/roles', { name: 'opter_1' }, { observe: 'response', params: { check: true } })
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

        const rep2 = await lastValueFrom(this.client.get<Role>('/roles/opter_1', { observe: 'response' }));
        expect(rep2.status).toEqual(204);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).toBeNull();
    }

    @Test()
    async postRolebackRole2() {
        const rep = await lastValueFrom(this.client.post<Role>('/roles/save2', { name: 'opter_2' }, { observe: 'response', params: { check: true } })
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

        const rep2 = await lastValueFrom(this.client.get<Role>('/roles/opter_2', { observe: 'response' }));
        expect(rep2.status).toEqual(204);
        console.log('rep.body:', rep2.body);
        expect(rep2.body).toBeNull();
    }

    @Test()
    async postCommitRole() {
        const rep = await lastValueFrom(this.client.post<Role>('/roles', { name: 'opter' }, { observe: 'response' }));
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeDefined();
        expect(rep.body?.name).toEqual('opter');

        const rep2 = await lastValueFrom(this.client.get<Role>('/roles/opter', { observe: 'response' }));
        expect(rep2.status).toEqual(200);
        expect(rep2.body).toBeDefined();
        expect(rep2.body?.name).toEqual('opter');
    }

    @Test()
    async clearRole() {
        const rep1 = await lastValueFrom(this.client.get<Role>('/roles/opter', { observe: 'response' }));
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toHaveProperty('id');
        const rep = await lastValueFrom(this.client.delete('/roles/' + rep1.body?.id, { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }


    @After()
    async after() {
        await this.ctx.destroy();
    }

}