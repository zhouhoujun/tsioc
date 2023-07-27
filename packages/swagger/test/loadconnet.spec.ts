import { ApplicationContext, Application } from '@tsdi/core';
import { HttpClient } from '@tsdi/common/http';
import { Suite, Before, Test, After } from '@tsdi/unit';
import { TypeOrmHelper } from '@tsdi/typeorm-adapter';
import { lastValueFrom } from 'rxjs';
import * as expect from 'expect';

import { User } from './models/models';
import { UserRepository } from './repositories/UserRepository';
import { option, MockBootTest } from './app';

@Suite('load Repository test')
export class LoadReposTest {

    private ctx!: ApplicationContext;

    @Before()
    async beforeInit() {
        this.ctx = await Application.run(MockBootTest);
    }

    @Test()
    async hasUserRepository() {
        expect(this.ctx.injector.get(TypeOrmHelper).getRepository(User)).toBeDefined();
        expect(this.ctx.injector.has(UserRepository)).toBeTruthy();
    }

    @Test()
    async canGetUserRepository() {
        const rep = this.ctx.injector.get(UserRepository);
        expect(rep).toBeInstanceOf(UserRepository);
    }

    @Test()
    async save() {
        const rep = this.ctx.injector.get(UserRepository);
        const newUr = new User();
        newUr.name = 'admin----test';
        newUr.account = 'admin----test';
        newUr.password = '111111';
        await rep.save(newUr);
        const svu = await rep.findByAccount('admin----test')
        // console.log(svu);
        expect(svu).toBeInstanceOf(User);
        expect(svu?.id).toBeDefined();
    }

    @Test()
    async getUser0() {
        const usrRep = this.ctx.injector.get(UserRepository);
        expect(usrRep).toBeInstanceOf(UserRepository);
        const rep = await lastValueFrom(this.ctx.get(HttpClient).get<User>('/users/admin----test', { observe: 'response' }));
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(User);
        expect(rep.body?.account).toEqual('admin----test');
    }

    @Test()
    async deleteUser() {
        const rep = this.ctx.injector.get(UserRepository);
        const svu = await rep.findByAccount('admin----test');
        await rep.remove(svu!);
    }

    @Test()
    async postUser() {
        const rep = await lastValueFrom(this.ctx.get(HttpClient).post<User>('/users', { name: 'post_test', account: 'post_test', password: '111111' }, { observe: 'response' }));
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(User);
        expect(rep.body?.name).toEqual('post_test');
    }

    @Test()
    async getUser() {
        const rep = await lastValueFrom(this.ctx.get(HttpClient).get<User>('/users/post_test'));
        expect(rep).toBeInstanceOf(User);
        expect(rep.account).toEqual('post_test');
    }

    @Test()
    async detUser() {
        const rep1 = await lastValueFrom(this.ctx.get(HttpClient).get<User>('/users/post_test'));
        expect(rep1).toBeInstanceOf(User);
        const rep = await lastValueFrom(this.ctx.get(HttpClient).delete('/users/' + rep1.id));
        expect(rep).toBeTruthy();
    }

    @After()
    async after() {
        this.ctx.destroy();
    }

}
