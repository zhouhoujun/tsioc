# packaged @tsdi/typeorm-adapter

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/type-mvc).

`@tsdi/typeorm-adapter` is model parser for boot frameworker. base on ioc [`@tsdi`](https://www.npmjs.com/package/@tsdi/core). help you develop your project easily.



## Install

You can install this package either with `npm`

### npm

```shell

npm install @tsdi/typeorm-adapter


```

## Documentation

### add orm for application

```ts
import { Application, Module, Transactional, TransactionModule, RouteMapping, Repository }  from '@tsdi/core';
import { Logger, Logger, LogModule } from '@tsdi/logger';
import { TypeOrmModule }  from '@tsdi/typeorm-adapter';
import { ServerBootstrapModule } from '@tsdi/platform-server';
import { Repository as ORMRepository } from 'typeorm';


@RouteMapping('/users')
export class UserController {

    // as property inject
    // @Log() logger!: Logger;

    constructor(private usrRep: UserRepository, @Log() private logger: Logger) {

    }


    @RouteMapping('/:name', 'get')
    getUser(name: string) {
        this.logger.log('name:', name);
        return this.usrRep.findByAccount(name);
    }

    @Transactional()
    @RouteMapping('/', 'post')
    @RouteMapping('/', 'put')
    async modify(user: User, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        let val = await this.usrRep.save(user);
        if(check) throw new Error('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @RouteMapping('/save', 'post')
    @RouteMapping('/save', 'put')
    async modify2(user: User, @Repository() userRepo: UserRepository, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        let val = await userRepo.save(user);
        if(check) throw new Error('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @RouteMapping('/:id', 'delete')
    async del(id: string) {
        this.logger.log('id:', id);
        await this.usrRep.delete(id);
        return true;
    }

}


@RouteMapping('/roles')
export class RoleController {

    constructor(@Repository(Role) private repo: ORMRepository<Role>, @Log() private logger: Logger) {

    }

    @Transactional()
    @RouteMapping('/', 'post')
    @RouteMapping('/', 'put')
    async save(role: Role, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(role);
        console.log('save isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        const value = await this.repo.save(role);
        if (check) throw new Error('check');
        this.logger.info(value);
        return value;
    }

    @Transactional()
    @RouteMapping('/save2', 'post')
    @RouteMapping('/save2', 'put')
    async save2(role: Role, @Repository(Role) roleRepo: ORMRepository<Role>, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(role);
        console.log('save2 isTransactionActive:', roleRepo.queryRunner?.isTransactionActive);
        const value = await roleRepo.save(role);
        if (check) throw new Error('check');
        this.logger.info(value);
        return value;
    }


    @RouteMapping('/:name', 'get')
    async getRole(name: string) {
        this.logger.log('name:', name);
        console.log('getRole isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        return await this.repo.findOne({ where: { name } });
    }


    @Transactional()
    @RouteMapping('/:id', 'delete')
    async del(id: string) {
        this.logger.log('id:', id);
        console.log('del isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        await this.repo.delete(id);
        return true;
    }

}


@Module({
    // baseURL: __dirname,
    imports: [
        LogModule,
        ServerBootstrapModule,
        // import TransactionModule can enable transaction by AOP.
        TransactionModule, 
        TypeOrmModule
    ],
    providers: [
        UserController,
        RoleController
    ]
})
export class MockTransBootTest {

}

Application.run({
    type: MockTransBootTest,
    baseURL: __dirname,
    configures: [
        {
            models: ['./models/**/*.ts'],
            repositories: ['./repositories/**/*.ts'],
            connections: option
        }
    ]
})

```

```ts
// model flies in  ./models/**/*.ts
import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, OneToMany, EntityRepository, Repository, Connection } from 'typeorm';

@Entity()
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @OneToMany(type => User, user => user.role, { nullable: true })
    users!: User[]
}


@Entity()
export class User {
    constructor() {
    }

    @PrimaryGeneratedColumn('uuid')
    id!: string;


    @Column()
    name!: string;

    @Column({
        unique: true
    })
    account!: string;

    @Column()
    password!: string;

    @Column({ nullable: true, length: 50 })
    email!: string;

    @Column({ nullable: true, length: 50 })
    phone!: string;

    @Column({ type: 'boolean', nullable: true })
    gender!: boolean;

    @Column({ type: 'int', nullable: true })
    age!: number;

    @ManyToOne(type => Role, role => role.users, { nullable: true })
    role!: Role;

}

```

```ts
// repositories in  ./repositories/**/*.ts
import { EntityRepository, Repository } from 'typeorm';
import { User } from '../models';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
    
    async findByAccount(account: string) {
        return await this.findOne({ where: { account } });
    }

    search(key: string, skip?: number, take?: number) {
        const keywords =  `%${key}%`;
        return this.createQueryBuilder('usr')
            .where('usr.name = :keywords OR usr.id = :key', { keywords, key })
            .skip(skip)
            .take(take)
            .getManyAndCount();
    }
}


```


## Documentation
Documentation is available on the
* [@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
* [@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
* [@tsdi/logger document](https://github.com/zhouhoujun/tsioc/tree/master/packages/logger).
* [@tsdi/common document](https://github.com/zhouhoujun/tsioc/tree/master/packages/common).
* [@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
* [@tsdi/endpoints document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport).
* [@tsdi/amqp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/amqp).
* [@tsdi/coap document](https://github.com/zhouhoujun/tsioc/tree/master/packages/coap).
* [@tsdi/http document](https://github.com/zhouhoujun/tsioc/tree/master/packages/http).
* [@tsdi/kafka document](https://github.com/zhouhoujun/tsioc/tree/master/packages/kafka).
* [@tsdi/mqtt document](https://github.com/zhouhoujun/tsioc/tree/master/packages/mqtt).
* [@tsdi/nats document](https://github.com/zhouhoujun/tsioc/tree/master/packages/nats).
* [@tsdi/redis document](https://github.com/zhouhoujun/tsioc/tree/master/packages/redis).
* [@tsdi/tcp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/tcp).
* [@tsdi/udp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/udp).
* [@tsdi/ws document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ws).
* [@tsdi/swagger document](https://github.com/zhouhoujun/tsioc/tree/master/packages/swagger).
* [@tsdi/repository document](https://github.com/zhouhoujun/tsioc/tree/master/packages/repository).
* [@tsdi/typeorm-adapter document](https://github.com/zhouhoujun/tsioc/tree/master/packages/typeorm-adapter).
* [@tsdi/boot document](https://github.com/zhouhoujun/tsioc/tree/master/packages/boot).
* [@tsdi/components document](https://github.com/zhouhoujun/tsioc/tree/master/packages/components).
* [@tsdi/compiler document](https://github.com/zhouhoujun/tsioc/tree/master/packages/compiler).
* [@tsdi/activities document](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities).
* [@tsdi/pack document](https://github.com/zhouhoujun/tsioc/tree/master/packages/pack).
* [@tsdi/unit document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit).
* [@tsdi/unit-console document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit-console).
* [@tsdi/cli document](https://github.com/zhouhoujun/tsioc/tree/master/packages/cli).



### packages
[@tsdi/cli](https://www.npmjs.com/package/@tsdi/cli)
[@tsdi/ioc](https://www.npmjs.com/package/@tsdi/ioc)
[@tsdi/aop](https://www.npmjs.com/package/@tsdi/aop)
[@tsdi/logger](https://www.npmjs.com/package/@tsdi/logger)
[@tsdi/common](https://www.npmjs.com/package/@tsdi/common)
[@tsdi/core](https://www.npmjs.com/package/@tsdi/core)
[@tsdi/endpoints](https://www.npmjs.com/package/@tsdi/endpoints)
[@tsdi/amqp](https://www.npmjs.com/package/@tsdi/amqp)
[@tsdi/coap](https://www.npmjs.com/package/@tsdi/coap)
[@tsdi/http](https://www.npmjs.com/package/@tsdi/http)
[@tsdi/kafka](https://www.npmjs.com/package/@tsdi/kafka)
[@tsdi/mqtt](https://www.npmjs.com/package/@tsdi/mqtt)
[@tsdi/nats](https://www.npmjs.com/package/@tsdi/nats)
[@tsdi/redis](https://www.npmjs.com/package/@tsdi/redis)
[@tsdi/tcp](https://www.npmjs.com/package/@tsdi/tcp)
[@tsdi/udp](https://www.npmjs.com/package/@tsdi/udp)
[@tsdi/ws](https://www.npmjs.com/package/@tsdi/ws)
[@tsdi/swagger](https://www.npmjs.com/package/@tsdi/swagger)
[@tsdi/repository](https://www.npmjs.com/package/@tsdi/repository)
[@tsdi/typeorm-adapter](https://www.npmjs.com/package/@tsdi/typeorm-adapter)
[@tsdi/boot](https://www.npmjs.com/package/@tsdi/boot)
[@tsdi/components](https://www.npmjs.com/package/@tsdi/components)
[@tsdi/compiler](https://www.npmjs.com/package/@tsdi/compiler)
[@tsdi/activities](https://www.npmjs.com/package/@tsdi/activities)
[@tsdi/pack](https://www.npmjs.com/package/@tsdi/pack)
[@tsdi/unit](https://www.npmjs.com/package/@tsdi/unit)
[@tsdi/unit-console](https://www.npmjs.com/package/@tsdi/unit-console)

## License

MIT © [Houjun](https://github.com/zhouhoujun/)