import * as expect from 'expect';
import { Application, ApplicationContext } from '@tsdi/core';
import { TypeOrmHelper, TypeormAdapter } from '../src';
import { Suite, Before, Test, After } from '@tsdi/unit';
import { User, Role } from './models/models';
// import { UserRepository } from './repositories/UserRepository';
import { option, MockBootTest } from './app';
import { Repository } from 'typeorm';





@Suite('Repository test')
export class ReposTest {

    private ctx!: ApplicationContext;

    @Before()
    async beforeInit() {
        this.ctx = await Application.run(MockBootTest);
    }

    @Test()
    async hasUserRepository() {
        expect(this.ctx.injector.get(TypeOrmHelper).getRepository(User)).toBeDefined();
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
    async deleteUser() {
        const rep = this.ctx.injector.get(TypeormAdapter).getRepository(User);
        const svu = await rep.findOne({ where: { account: 'admin----test' } });
        await rep.remove(svu!);
    }


    @After()
    async after() {
        await this.ctx.destroy();
    }

}

