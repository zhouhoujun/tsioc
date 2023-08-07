# packaged @tsdi/common

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/core`： DI Module manager, application core. base on AOP, Ioc container, via `@tsdi/ioc`.

old packages:
[`tsioc`](https://www.npmjs.com/package/tsioc)
## Install

```shell

npm install @tsdi/common

// in browser
npm install @tsdi/platform-browser

// in server
npm install @tsdi/platform-server
```



## Decorators
Module manager, application bootstrap. base on AOP.

*  `@Module` Module decorator, use to define class as ioc Module. alias name @DIModule.
*  `@ComponentScan`ComponentScan decorator, use to auto scan server or client for application.
*  `@Handle`  Handle decorator, for class. use to define the class as handle register in global handle queue or parent; for method as message handle, use to handle route message event, in class with decorator {@link RouteMapping}.
*  `@RouteMapping` route mapping decorator, for class. use to define this class as message route.
*  `@RequestPath` Request path parameter decorator for route mapping.
*  `@RequestParam` Request query parameter decorator for route mapping.
*  `@RequestBody` Request body parameter decorator for route mapping.
*  `@Pipe` Pipe decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`PipeLifecycle`]
*  `@Repository` Repository Decorator, to autowired repository for paramerter or filed.
*  `@Transactional` Transactional Decorator, define transaction propagation behaviors.

[mvc boot simple](https://github.com/zhouhoujun/type-mvc/tree/master/packages/simples)


## Application Sample

### Quick start
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
    async modify(@RequestBody() user: User, @RequestParam({ nullable: true }) check?: boolean) {
        //will auto check user entity and user filed, throw MissingModelFieldError or ArgumentError missing pipe to transform property.
        // if query user name lenght > 50, will throw ArgumentError "InvalidPipeArgument: 'name xxx' for pipe 'ParseStringPipe' more than max lenght: 50".

        // RequestParam nullable will not throw MissingParameterError if request query has not check param.
        // if query check param value as '1', will throw ArgumentError  "InvalidPipeArgument: '1' for pipe 'ParseBoolPipe'".
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
        //will auto check user entity and user filed, throw MissingModelFieldError or ArgumentError missing pipe to transform property.
        // if query user name lenght > 50, will throw ArgumentError "InvalidPipeArgument: 'name xxx' for pipe 'ParseStringPipe' more than max lenght: 50".

        // RequestParam nullable will not throw MissingParameterError if request query has not check param.
        // if query check param value as '1', will throw ArgumentError  "InvalidPipeArgument: '1' for pipe 'ParseBoolPipe'".
        this.logger.log(lang.getClassName(this.usrRep), user);
        let val = await userRepo.save(user);
        if(check) throw new Error('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @RouteMapping('/:id', 'delete')
    async del(id: string) { // if no path value id will throw MissingParameterError
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
        //will auto check role entity and role filed, throw MissingModelFieldError or ArgumentError missing pipe to transform property.
        // if query role name lenght > 50, will throw ArgumentError "InvalidPipeArgument: 'name xxx' for pipe 'ParseStringPipe' more than max lenght: 50".

        // RequestParam nullable will not throw MissingParameterError if request query has not check param.
        // if query check param value as '1', will throw ArgumentError "InvalidPipeArgument: '1' for pipe 'ParseBoolPipe'".
        this.logger.log(role);
        const value = await this.repo.save(role);
        if (check) throw new Error('check'); // if throw error will rollback transaction
        this.logger.info(value);
        return value;
    }

    @Transactional()
    @RouteMapping('/save2', 'post')
    @RouteMapping('/save2', 'put')
    async save2(role: Role, @Repository(Role) roleRepo: ORMRepository<Role>, @RequestParam({ nullable: true }) check?: boolean) {
        //will auto check role entity and role filed, throw MissingModelFieldError or ArgumentError missing pipe to transform property.
        // if query role name lenght > 50, will throw ArgumentError "InvalidPipeArgument: 'name xxx' for pipe 'ParseStringPipe' more than max lenght: 50".

        // RequestParam nullable will not throw MissingParameterError if request query has not check param.
        // if query check param value as '1', will throw ArgumentError "InvalidPipeArgument: '1' for pipe 'ParseBoolPipe'".
        this.logger.log(role);
        const value = await roleRepo.save(role);
        if (check) throw new Error('check');
        this.logger.info(value);
        return value;
    }


    @RouteMapping('/:name', 'get')
    async getRole(name: string) {
        this.logger.log('name:', name);
        return await this.repo.findOne({ where: { name } });
    }


    @Transactional()
    @RouteMapping('/:id', 'delete')
    async del(id: string) {  // if no path value id will throw MissingParameterError
        this.logger.log('id:', id);
        await this.repo.delete(id);
        return true;
    }

}

```

### In Server side.

```ts
import { Application, Module, TransactionModule }  from '@tsdi/core';
import { LogModule } from '@tsdi/logger';
import { TypeOrmModule }  from '@tsdi/typeorm-adapter';
import { ServerBootstrapModule } from '@tsdi/platform-server';

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


### In Browser side.

```ts
import { Application, Module, TransactionModule }  from '@tsdi/core';
import { LogModule } from '@tsdi/logger';
import { TypeOrmModule }  from '@tsdi/typeorm-adapter';
import { BrowserBootstrapModule } from '@tsdi/platform-browser';

@Module({
    imports: [
        LogModule,
        BrowserBootstrapModule,
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
    configures: [
        {
            connections: {
                ...option,
                entities: [
                    Role,
                    User
                ]
                repositories: [UserRepository]
            }
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

    @Column({ length: 50 })
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


    @Column({ length: 50 })
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


### message route

```ts

import { Application, Module, Message, MessageQueue, MessageContext, Middleware,  RouteMapping, ApplicationContext, Handle } from '../src';
import expect = require('expect');
import { Injector, Injectable, lang } from '@tsdi/ioc';

@RouteMapping('/device')
class DeviceController {

    @RouteMapping('/init', 'post')
    req(name: string) {
        return { name };
    }

    @RouteMapping('/update', 'post')
    async update(version: string) {
        // do smth.
        console.log('update version:', version);
        let defer = lang.defer();

        setTimeout(()=> {
            defer.resolve(version);
        }, 10);

        return await defer.promise;
    }


}

// @RouteMapping('/map')
// class MapController {

//     @Inject() mapAdapter: MapAdapter;

//     @RouteMapping('/mark', 'post')
//     drawMark(name: string, @Inject(CONTEXT) ctx: MessageContext ) {
//         ctx.body;
//         this.mapAdapter.drow(ctx.body);
//     }

// }

@Handle('/hdevice')
class DeviceQueue extends MessageQueue {
    async execute(ctx: MessageContext, next?: () => Promise<void>): Promise<void> {
        console.log('device msg start.');
        ctx.setValue('device', 'device data')
        await super.execute(ctx, async () => {
            ctx.setValue('device', 'device next');
        });
        console.log('device sub msg done.');
    }
}

@Handle({
    parent: DeviceQueue
})
class DeviceStartQueue extends MessageQueue {

}

@Handle(DeviceStartQueue)
class DeviceStartupHandle extends Middleware {

    async execute(ctx: MessageContext, next: () => Promise<void>): Promise<void> {
        console.log('DeviceStartupHandle.')
        if (ctx.event === 'startup') {
            // todo sth.
            let ret = ctx.injector.get(MyService).dosth();
            ctx.setValue('deviceB_state', ret);
        }
    }
}

@Handle(DeviceStartQueue)
class DeviceAStartupHandle extends Middleware {

    async execute(ctx: MessageContext, next: () => Promise<void>): Promise<void> {
        console.log('DeviceAStartupHandle.')
        if (ctx.event === 'startup') {
            // todo sth.
            let ret = ctx.injector.get(MyService).dosth();
            ctx.setValue('deviceA_state', ret);
        }
        return next()
    }
}

@Module({
    providers: [
        DeviceQueue,
        DeviceStartQueue
    ]
})
class DeviceManageModule {

}

@Injectable()
class MyService {
    dosth() {
        return 'startuped';
    }
}

@Module({
    providers: [
        MyService,
        DeviceAStartupHandle
    ]
})
class DeviceAModule {

}

@Module({
    imports: [
        DeviceManageModule,
        DeviceAModule
    ],
    providers: [
        DeviceController,
        DeviceStartupHandle
    ]
})
class MainApp {

}

describe('app message queue', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    before(async () => {
        ctx = await Application.run(MainApp);
        injector = ctx.injector;
    });

    it('make sure singleton', async () => {
        // ctx.getMessager().send('msg:://decice/init', { body: {mac: 'xxx-xx-xx-xxxx'}, query: {name:'xxx'} })
        // console.log(ctx.getMessager());
        const a = injector.get(DeviceQueue);
        const b = injector.get(DeviceQueue);
        expect(a).toBeInstanceOf(DeviceQueue);
        expect(a).toEqual(b);
    });

    it('has registered', async () => {
        const a = injector.get(DeviceQueue);
        expect(a.has(DeviceStartQueue)).toBeTruthy();
        expect(injector.get(DeviceStartQueue).has(DeviceStartupHandle)).toBeTruthy();
    });


    it('msg work', async () => {
        const a = injector.get(DeviceQueue);
        let device, aState, bState;
        a.done(ctx => {
            device = ctx.getValue('device');
            aState = ctx.getValue('deviceA_state');
            bState = ctx.getValue('deviceB_state');
        })
        await ctx.getMessager().send('/hdevice', { event: 'startup' });
        expect(device).toBe('device next');
        expect(aState).toBe('startuped');
        expect(bState).toBe('startuped');
    });

    it('route response', async () => {
        const a = await ctx.getMessager().send('/device/init', { method: 'post', query: { name: 'test' } });
        expect(a.status).toEqual(200);
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');

        const b = await ctx.getMessager().send('/device/update', { method: 'post', query: { version: '1.0.0' } });
        expect(b.status).toEqual(200);
        expect(b.body).toEqual('1.0.0');
    });

    after(() => {
        ctx.destroy();
    })
});

```


## Documentation
Documentation is available on the
* [@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
* [@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
* [@tsdi/logger document](https://github.com/zhouhoujun/tsioc/tree/master/packages/logger).
* [@tsdi/common document](https://github.com/zhouhoujun/tsioc/tree/master/packages/common).
* [@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
* [@tsdi/transport document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport).
* [@tsdi/transport-amqp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-amqp).
* [@tsdi/transport-coap document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-coap).
* [@tsdi/transport-http document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-http).
* [@tsdi/transport-kafka document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-kafka).
* [@tsdi/transport-mqtt document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-mqtt).
* [@tsdi/transport-nats document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-nats).
* [@tsdi/transport-redis document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-redis).
* [@tsdi/transport-tcp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-tcp).
* [@tsdi/transport-udp document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-udp).
* [@tsdi/transport-ws document](https://github.com/zhouhoujun/tsioc/tree/master/packages/transport-ws).
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
[@tsdi/transport](https://www.npmjs.com/package/@tsdi/transport)
[@tsdi/transport-amqp](https://www.npmjs.com/package/@tsdi/transport-amqp)
[@tsdi/transport-coap](https://www.npmjs.com/package/@tsdi/transport-coap)
[@tsdi/transport-http](https://www.npmjs.com/package/@tsdi/transport-http)
[@tsdi/transport-kafka](https://www.npmjs.com/package/@tsdi/transport-kafka)
[@tsdi/transport-mqtt](https://www.npmjs.com/package/@tsdi/transport-mqtt)
[@tsdi/transport-nats](https://www.npmjs.com/package/@tsdi/transport-nats)
[@tsdi/transport-redis](https://www.npmjs.com/package/@tsdi/transport-redis)
[@tsdi/transport-tcp](https://www.npmjs.com/package/@tsdi/transport-tcp)
[@tsdi/transport-udp](https://www.npmjs.com/package/@tsdi/transport-udp)
[@tsdi/transport-ws](https://www.npmjs.com/package/@tsdi/transport-ws)
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