import { ApplicationContext, Application } from '@tsdi/core';
import { HttpClient } from '@tsdi/common';
import { Suite, Before, Test, After } from '@tsdi/unit';
import * as expect from 'expect';
import { lastValueFrom } from 'rxjs';

import { Role, User } from './models/models';
import { TypeormAdapter } from '../src';
// import { UserRepository } from './repositories/UserRepository';
import { option, MockBootTest } from './app';
import { Repository } from 'typeorm';

@Suite('load Repository test')
export class LoadReposTest {

    private ctx!: ApplicationContext;

    @Before()
    async beforeInit() {
        this.ctx = await Application.run({
            module: MockBootTest,
            baseURL: __dirname
        });

    }

    @Test()
    async hasUserRepository() {
        expect(this.ctx.injector.get(TypeormAdapter).getRepository(User)).toBeDefined();
        // expect(this.ctx.injector.has(UserRepository)).toBeTruthy();
    }

    @Test()
    async canGetUserRepository() {
        const rep = this.ctx.injector.get(TypeormAdapter).getRepository(User);
        expect(rep).toBeInstanceOf(Repository);
    }

    @Test()
    async save() {
        const rep = this.ctx.injector.get(TypeormAdapter).getRepository(User);
        const newUr = new User();
        newUr.name = 'admin----test';
        newUr.account = 'admin----test';
        newUr.password = '111111';
        await rep.save(newUr);
        const svu = await rep.findOne({ where: { account: 'admin----test' } })
        // console.log(svu);
        expect(svu).toBeInstanceOf(User);
        expect(svu?.id).toBeDefined();
    }

    @Test()
    async getUser0() {
        const usrRep = this.ctx.injector.get(TypeormAdapter).getRepository(User);
        expect(usrRep).toBeInstanceOf(Repository);
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).get<User>('/users/admin----test', { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeDefined();
        expect(rep.body?.account).toEqual('admin----test');
    }

    @Test()
    async deleteUser() {
        const rep = this.ctx.injector.get(TypeormAdapter).getRepository(User);
        const svu = await rep.findOne({ where: { account: 'admin----test' } });
        const rmd = await rep.remove(svu!);
        expect(rmd).toBeDefined();

        const svu1 = await rep.findOne({ where: { account: 'post_test' } });
        if (svu1) {
            await rep.remove(svu1);
        }
    }

    @Test()
    async postUser() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post<User>('/users', { name: 'post_test', account: 'post_test', password: '111111' }, { observe: 'response' }));
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeDefined();
        expect(rep.body?.name).toEqual('post_test');
    }

    @Test()
    async getUser() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).get<User>('/users/post_test', { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeDefined();
        expect(rep.body?.account).toEqual('post_test');
    }

    @Test()
    async detUser() {
        const rep1 = await lastValueFrom(this.ctx.resolve(HttpClient).get<User>('/users/post_test', { observe: 'response' }));
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toBeDefined();
        expect(rep1.body?.id).toBeDefined();
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).delete<User>('/users/' + rep1.body?.id, { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }

    @Test()
    async postRole() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).post<Role>('/roles', { name: 'opter' }, { observe: 'response' }));
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeDefined();
        expect(rep.body?.name).toEqual('opter');
    }

    @Test()
    async getRole() {
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).get<Role>('/roles/opter', { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeDefined();
        expect(rep.body?.name).toEqual('opter');
    }

    @Test()
    async detRole() {
        const rep1 = await lastValueFrom(this.ctx.resolve(HttpClient).get<Role>('/roles/opter', { observe: 'response' }));
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toBeDefined();
        expect(rep1.body?.id).toBeDefined();
        const rep = await lastValueFrom(this.ctx.resolve(HttpClient).delete<Role>('/roles/' + rep1.body?.id, { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }


    @After()
    async after() {
        await this.ctx.destroy();
    }

}
