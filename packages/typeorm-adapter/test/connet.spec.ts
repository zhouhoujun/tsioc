
import * as expect from 'expect';
import { DIModule, IBootContext, BootApplication, IConnectionOptions } from '@tsdi/boot';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import { TypeOrmModule, TypeormConnectionStatupService, TypeOrmHelper } from '../src';
import { Suite, Before, Test, After } from '@tsdi/unit';

import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, OneToMany, EntityRepository, Repository } from 'typeorm';


@Entity()
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @OneToMany(type => User, user => user.role)
    users: User[]
}


@Entity()
export class User {
    constructor() {
    }

    @PrimaryGeneratedColumn('uuid')
    id: string;


    @Column()
    name: string;

    @Column({
        unique: true
    })
    account: string;

    @Column()
    password: string;

    @Column({ nullable: true, length: 50 })
    email: string;

    @Column({ nullable: true, length: 50 })
    phone: string;

    @Column({ type: 'boolean', nullable: true })
    gender: boolean;

    @Column({ type: 'int', nullable: true })
    age: number;

    @ManyToOne(type => Role, role => role.users)
    role: Role;

}

@EntityRepository(User)
export class UserRepository extends Repository<User> {
    async findByAccount(name: string) {
        return await this.findOne({ where: { account: name } });
    }
}

@DIModule({
    imports: [
        ServerBootstrapModule,
        TypeOrmModule
    ]
})
class MockBootTest {

}




@Suite('Machine status Repository')
export class ReposTest {

    private ctx: IBootContext;

    @Before()
    async beforeInit() {
        this.ctx = await BootApplication.run({
            type: MockBootTest,
            configures: [
                {
                    connections: <IConnectionOptions>{
                        name: 'xx',
                        entities: [
                            Role,
                            User
                        ],
                        type: 'postgres',
                        host: 'localhost',
                        port: 5432,
                        username: 'postgres',
                        password: '',
                        database: 'dbedge',
                        useNewUrlParser: true,
                        synchronize: true, // 同步数据库
                        logging: false  // 日志
                    }
                }
            ]
        });
    }

    @Test()
    async hasUserRepository() {
        expect(this.ctx.get(TypeOrmHelper).getRepository(User)).toBeDefined();
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
    async deleteUser() {
        const rep = this.ctx.injector.get(UserRepository);
        let svu = await rep.findByAccount('admin----test');
        await rep.remove(svu);
    }


    @After()
    async after() {
        this.ctx.destroy()
    }

}
