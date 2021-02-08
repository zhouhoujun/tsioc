import { IBootContext, BootApplication, ROOT_QUEUE } from '@tsdi/boot';

import { User } from './models/models';
import { Suite, Before, Test, After } from '@tsdi/unit';
import { TypeOrmHelper } from '../src';
import * as expect from 'expect';
import { UserRepository } from './repositories/UserRepository';
import { connectOption, MockBootTest } from './MockBootTest';



@Suite('load Repository test')
export class LoadReposTest {

    private ctx: IBootContext;

    @Before()
    async beforeInit() {
        this.ctx = await BootApplication.run({
            type: MockBootTest,
            configures: [
                {
                    models: ['./models/**/*.ts'],
                    repositories: ['./repositories/**/*.ts'],
                    connections: connectOption
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
        expect(svu.id).toBeDefined();
    }

    @Test()
    async getUser0() {
        const usrRep = this.ctx.injector.getInstance(UserRepository);
        expect(usrRep).toBeInstanceOf(UserRepository);
        const rep = await this.ctx.send('/users/admin----test', { method: 'get', providers: [{ provide: UserRepository, useValue: usrRep }] });
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(User);
        expect(rep.body.account).toEqual('admin----test');
    }

    @Test()
    async deleteUser() {
        const rep = this.ctx.injector.get(UserRepository);
        let svu = await rep.findByAccount('admin----test');
        await rep.remove(svu);
    }

    @Test()
    async postUser() {
        const rep = await this.ctx.send('/users', { method: 'post', body: { name: 'post_test', account: 'post_test', password: '111111' } });
        expect(rep.status).toEqual(200);
        expect(rep.body).toBeInstanceOf(User);
        expect(rep.body.name).toEqual('test1');
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

    @After()
    async after() {
        this.ctx.destroy();
    }

}
