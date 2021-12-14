import { ApplicationContext, Application } from '@tsdi/core';

import { Role, User } from './models/models';
import { Suite, Before, Test, After } from '@tsdi/unit';
import { TypeOrmHelper } from '../src';
import * as expect from 'expect';
import { UserRepository } from './repositories/UserRepository';
import { option, MockBootTest } from './app';


@Suite('load Repository test')
export class LoadReposTest {

    private ctx!: ApplicationContext;

    @Before()
    async beforeInit() {
        this.ctx = await Application.run({
            type: MockBootTest,
            baseURL: __dirname,
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
    async hasUserRepository() {
        expect(this.ctx.injector.get(TypeOrmHelper).getRepository(User)).toBeDefined();
        expect(this.ctx.injector.has(UserRepository)).toBeTruthy();
    }

    @Test()
    async canGetUserRepository() {
        let rep = this.ctx.injector.get(UserRepository);
        expect(rep).toBeInstanceOf(UserRepository);
    }

    @Test()
    async save() {
        let rep = this.ctx.injector.get(UserRepository);
        let newUr = new User();
        newUr.name = 'admin----test';
        newUr.account = 'admin----test';
        newUr.password = '111111';
        await rep.save(newUr);
        let svu = await rep.findByAccount('admin----test')
        // console.log(svu);
        expect(svu).toBeInstanceOf(User);
        expect(svu?.id).toBeDefined();
    }

    @Test()
    async getUser0() {
        const usrRep = this.ctx.injector.get(UserRepository);
        expect(usrRep).toBeInstanceOf(UserRepository);
        const rep = await this.ctx.send('/users/admin----test', { method: 'get' });
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(User);
        expect(rep.body.account).toEqual('admin----test');
    }

    @Test()
    async deleteUser() {
        const rep = this.ctx.injector.get(UserRepository);
        let svu = await rep.findByAccount('admin----test');
        const rmd = await rep.remove(svu!);
        expect(rmd).toBeDefined();
        
        let svu1 = await rep.findByAccount('post_test');
        if (svu1) {
            await rep.remove(svu1);
        }
    }

    @Test()
    async postUser() {
        const rep = await this.ctx.send('/users', { method: 'post', body: { name: 'post_test', account: 'post_test', password: '111111' } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(User);
        expect(rep.body.name).toEqual('post_test');
    }

    @Test()
    async getUser() {
        const rep = await this.ctx.send('/users/post_test', { method: 'get' });
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(User);
        expect(rep.body.account).toEqual('post_test');
    }

    @Test()
    async detUser() {
        const rep1 = await this.ctx.send('/users/post_test', { method: 'get' });
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toBeInstanceOf(User);
        const rep = await this.ctx.send('/users/' + rep1.body.id, { method: 'delete' });
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }

    @Test()
    async postRole() {
        const rep = await this.ctx.send('/roles', { method: 'post', body: { name: 'opter' } });
        rep.error && console.log(rep.error)
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(Role);
        expect(rep.body.name).toEqual('opter');
    }

    @Test()
    async getRole() {
        const rep = await this.ctx.send('/roles/opter', { method: 'get' });
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(Role);
        expect(rep.body.name).toEqual('opter');
    }

    @Test()
    async detRole() {
        const rep1 = await this.ctx.send('/roles/opter', { method: 'get' });
        expect(rep1.status).toEqual(200);
        expect(rep1.body).toBeInstanceOf(Role);
        const rep = await this.ctx.send('/roles/' + rep1.body.id, { method: 'delete' });
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeTruthy();
    }


    @After()
    async after() {
        await this.ctx.destroy();
    }

}
