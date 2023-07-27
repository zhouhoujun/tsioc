tsioc is application frameworks.


# source build

```shell
build: npm run build

//build with version:
npm run build -- --setvs=4.0.0-beta

//deploy: 
./deploy.cmd
//or
 npm run build -- --deploy=true

```


# Install cli

```shell
npm i -g @tsdi/cli
```

# Quick start
## new project

```shell
tsdi new [application name] 
```

## test project

* use shell
```shell
tsdi test
```
* debug test use vscode debug



# publish modules

## ioc, module `@tsdi/ioc` 

### use aop

```shell

// install aop
npm install @tsdi/aop

```

```ts

import { AopModule } from '@tsdi/aop';
import { IocContainer } from '@tsdi/ioc';

let container = new IocContainer();

// use aop.
container.use(AopModule);
// also can
container.register(AopModule);
// or
container.inject(AopModule)

```

### use aop logs

```shell
// install aop logs
npm install @tsdi/logger
```

```ts

import { LogModule } from '@tsdi/logger';
// in server
import { ContainerBuilder } from '@tsdi/platform-server'
// in browser
import { ContainerBuilder } from '@tsdi/platform-browser'

let builder = new ContainerBuilder();

let container = build.create();

container.use(LogModule);

```

# Documentation

## ioc, module `@tsdi/ioc`
1. Register one class will auto register depdence class (must has a class decorator).

2. get Instance can auto create constructor param.  (must has a class decorator or register in container).

### decorators

1. `@Abstract`  abstract class decorator.
2. `@Autorun`   class and method decorator, use to define the class auto run (via a method or not) after registered.
3. `@Autowried` alias name `@AutoWried` property or param decorator, use to auto wried type instance or value to the instance of one class with the decorator.
4. `@Inject`  property or param decorator, use to auto wried type instance or value to the instance of one class with the decorator.
5. `@Injectable` class decortator, use to define the class. it can setting provider to some token, singleton or not.
6. `@IocExt` class decortator, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
7. `@Param`   param decorator, use to auto wried type instance or value to the instance of one class with the decorator.
8. `@Singleton` class decortator, use to define the class is singleton in global.
9. `@Static` class decortator, use to define the class is static in injector.
10. `@Providers` Providers decorator, for class. use to add private ref service for the class.
11. `@ProviderIn` alias `@Refs` ProviderIn decorator, for class. use to define the class as a service for target.
12. `@Nullable` param decoator. define param can enable null.
13. `@Optional` Parameter decorator to be used on constructor parameters, which marks the parameter as being an optional dependency. The DI framework provides `null` if the dependency is not found. Can be used together with other parameter decorators that modify how dependency injection operates.
14. `@Self` Parameter decorator to be used on constructor parameters, which tells the DI framework to start dependency resolution from the local injector. Resolution works upward through the injector hierarchy, so the children of this class must configure their own providers or be prepared for a `null` result.
15. `@SkipSelf` Parameter decorator to be used on constructor parameters, which tells the DI framework to start dependency resolution from the parent injector. Resolution works upward through the injector hierarchy, so the local injector is not checked for a provider.
16. `@Host` Parameter decorator on a compose element provider parameter of a class constructor that tells the DI framework to resolve the view by checking injectors of child elements, and stop when reaching the host element of the current component.

## aop, module `@tsdi/aop`
It's a dynamic aop base on ioc.

define a Aspect class, must with decorator:

* `@Aspect()` Aspect decorator, define for class.  use to define class as aspect. it can setting provider to some token, singleton or not.

* `@Before(matchstring|RegExp)` method decorator,  aop Before advice decorator.

* `@After(matchstring|RegExp)`  method decorator,  aop after advice decorator.

* `@Around(matchstring|RegExp)`  method decorator,  aop around advice decorator.

* `@AfterThrowing(matchstring|RegExp)`  method decorator,  aop AfterThrowing advice decorator.

* `@AfterReturning(matchstring|RegExp)`  method decorator,  aop AfterReturning advice decorator.

* `@Pointcut(matchstring|RegExp)`  method decorator,  aop Pointcut advice decorator.


see [simples](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop/test/aop)

## core, module `@tsdi/core`
Application framework.

### Decorators
Module manager, application bootstrap. base on AOP.

*  `@Module` Module decorator, use to define class as ioc Module. alias name @DIModule.
*  `@ComponentScan`ComponentScan decorator, use to auto scan server or client for application.
*  `@Handle`  Handle decorator, for class. use to define the class as handle register in global handle queue or parent; for method as message handle, use to handle route message event, in class with decorator {@link RouteMapping}.
*  `@RouteMapping` route mapping decorator, for class. use to define this class as message route.
*  `@RequestPath` Request path parameter decorator for route mapping.
*  `@RequestParam` Request query parameter decorator for route mapping.
*  `@RequestBody` Request body parameter decorator for route mapping.
*  `@Pipe` Pipe decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`PipeLifecycle`]

[application simple](https://github.com/zhouhoujun/type-mvc/tree/master/packages/simples)


### Quick start
```ts
import { Controller, Delete, Get, Post, Put, RequestParam } from '@tsdi/core';
import { lang } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { Repository, Transactional } from '@tsdi/repository';
import { InternalServerError } from '@tsdi/transport';
import { User } from '../models/models';
import { UserRepository } from '../repositories/UserRepository';

@Controller('/users')
export class UserController {

    // @Inject() injector!: Injector;
    // @Log() logger!: Logger;
    // @InjectLog() logger!: Logger;
    constructor(private usrRep: UserRepository, @InjectLog() private logger: Logger) {

    }


    @Get('/:name')
    getUser(name: string) {
        this.logger.log('name:', name);
        return this.usrRep.findByAccount(name);
    }

    @Transactional()
    @Post('/')
    @Put('/')
    async modify(user: User, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        const val = await this.usrRep.save(user);
        if(check) throw new InternalServerError('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @Post('/save')
    @Put('/save')
    async modify2(user: User, @Repository() userRepo: UserRepository, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(lang.getClassName(this.usrRep), user);
        const val = await userRepo.save(user);
        if(check) throw new InternalServerError('check');
        this.logger.log(val);
        return val;
    }

    @Transactional()
    @Delete('/:id')
    async del(id: string) {
        this.logger.log('id:', id);
        await this.usrRep.delete(id);
        return true;
    }

}



@Controller('/roles')
export class RoleController {

    constructor(@DBRepository(Role) private repo: Repository<Role>, @Log() private logger: Logger) {

    }

    @Transactional()
    @Post('/')
    @Put('/')
    async save(role: Role, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(role);
        console.log('save isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        const value = await this.repo.save(role);
        if (check) throw new InternalServerError('check');
        this.logger.info(value);
        return value;
    }

    @Transactional()
    @Post('/save2')
    @Put('/save2')
    async save2(role: Role, @DBRepository(Role) roleRepo: Repository<Role>, @RequestParam({ nullable: true }) check?: boolean) {
        this.logger.log(role);
        console.log('save2 isTransactionActive:', roleRepo.queryRunner?.isTransactionActive);
        const value = await roleRepo.save(role);
        if (check) throw new InternalServerError('check');
        this.logger.info(value);
        return value;
    }


    @Get('/:name')
    async getRole(name: string) {
        this.logger.log('name:', name);
        console.log('getRole isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        return await this.repo.findOne({ where: { name } });
    }


    @Transactional()
    @Delete('/:id')
    async del(id: string) {
        this.logger.log('id:', id);
        console.log('del isTransactionActive:', this.repo.queryRunner?.isTransactionActive);
        await this.repo.delete(id);
        return true;
    }


}


```

### service In nodejs.

```ts
import { Application, Module }  from '@tsdi/core';
import { LogModule } from '@tsdi/logger';
import { ConnectionOptions, TransactionModule } from '@tsdi/repository';
import { TypeOrmModule }  from '@tsdi/typeorm-adapter';
import { Http, HttpClientOptions, HttpModule, HttpServer } from '@tsdi/transport';
import { ServerModule } from '@tsdi/platform-server';

const key = fs.readFileSync(path.join(__dirname, './cert/localhost-privkey.pem'));
const cert = fs.readFileSync(path.join(__dirname, './cert/localhost-cert.pem'));

@Module({
    // baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        HttpModule.withOption({
            majorVersion: 2,
            options: {
                allowHTTP1: true,
                key,
                cert
            }
        }),
        TransactionModule,
        TypeOrmModule.withConnection({
            name: 'xx',
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'testdb',
            synchronize: true, // 同步数据库
            logging: false  // 日志,
            models: ['./models/**/*.ts'],
            repositories: ['./repositories/**/*.ts'],
        })
    ],
    declarations: [
        UserController,
        RoleController
    ],
    bootstrap: HttpServer
})
export class Http2ServerModule {

}

Application.run(Http2ServerModule);

```


### Service In Browser.

```ts
import { Application, Module }  from '@tsdi/core';
import { LogModule } from '@tsdi/logger';
import { ConnectionOptions, TransactionModule } from '@tsdi/repository';
import { TypeOrmModule }  from '@tsdi/typeorm-adapter';
import { BrowserModule } from '@tsdi/platform-browser';

@Module({
    imports: [
        LogModule,
        BrowserModule,
        // import TransactionModule can enable transaction by AOP.
        TransactionModule, 
        TypeOrmModule.withOptions({
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'testdb',
            entities: [
                Role,
                User
            ],
            repositories: [UserRepository]
        })
    ],
    providers: [
        UserController,
        RoleController
    ]
})
export class MockTransBootTest {

}

Application.run(MockTransBootTest)

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



## repository, module `@tsdi/repository`
orm repository for application.

### Decorators
application repository. base on AOP.

*  `@Repository` alias name `@DBRepository` Repository Decorator, to autowired repository for paramerter or filed.
*  `@Transactional` Transactional Decorator, define transaction propagation behaviors.

[mvc boot simple](https://github.com/zhouhoujun/type-mvc/tree/master/packages/simples)



## boot, module `@tsdi/boot`
bootstrap app base on core with application configuration.

[mvc boot simple](https://github.com/zhouhoujun/type-mvc/tree/master/packages/simples)

```ts

import { DIModule, BootApplication } from '@tsdi/boot';


export class TestService {
    testFiled = 'test';
    test() {
        console.log('test');
    }
}

@DIModule({
    providers: [
        { provide: 'mark', useFactory: () => 'marked' },
        TestService
    ],
    exports: [

    ]
})
export class ModuleA {

}

@Injectable()
export class ClassSevice {
    @Inject('mark')
    mark: string;
    state: string;
    start() {
        console.log(this.mark);
    }
}

@Aspect()
export class Logger {

    @Around('execution(*.start)')
    log() {
        console.log('start........');
    }
}


@DIModule({
    imports: [
        AopModule,
        ModuleA
    ],
    providers:[
        Logger,
        ClassSevice
    ]
    bootstrap: ClassSevice
})
export class ModuleB {

}

BootApplication.run(ModuleB);

```

## components
*  `@Component`  Component decorator,  use to defaine class as component with template.
*  `@Input` Input decorator, use to define property or param as component binding field or args.

see [ activity build boot simple](https://github.com/zhouhoujun/tsioc/blob/master/packages/activities/taskfile.ts)


## [Activites](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities)

* [activities](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities)
* [pack](https://github.com/zhouhoujun/tsioc/tree/master/packages/pack)

### create Container

```ts

let container = new IocContainer();

```

###  Container is ioc root.

see @tsdi/ioc interface [IIocContainer](https://github.com/zhouhoujun/tsioc/blob/master/packages/ioc/src/IIocContainer.ts)

see @tsdi/core interface [IContainer](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/IContainer.ts)

```ts

// 1. register a class
container.register(Person);

// 2. register a factory;
container.register(Person, (container)=> {
    ...
    return new Person(...);
});

// 3. register with keyword
container.register('keyword', Perosn);

// 4. register with alais
container.register(new Registration(Person, aliasname));

// register singleton
container.registerSingleton(Person)


```

### Injector is basic ioc injector.

see interface [IInjector](https://github.com/zhouhoujun/tsioc/blob/master/packages/ioc/src/IInjector.ts)

```ts

// get the injector of Person class type injected.
let injector =  container.getInjector(Person);

// create new injector
let injector = container.createInjector();
// or create new injector via
let injector = container.getInstance(InjectorFactoryToken);
```

### Invoke method

you can use yourself `MethodAccessor` by implement IMethodAccessor, register `MethodAccessorToken` with your `MethodAccessor` in container,   see [interface](https://github.com/zhouhoujun/tsioc/blob/master/packages/ioc/src/IIocContainer.ts).

```ts

@Injectable()
class Person {
    constructor() {

    }
    say() {
        return 'I love you.'
    }
}

@Injectable()
class Child extends Person {
    constructor() {
        super();
    }
    override say() {
        return 'Mama';
    }
}

class MethodTest {
    constructor() {

    }

    @AutoWried
    sayHello(person: Person) {
        return person.say();
    }
}

class MethodTest2 {
    constructor() {

    }

    @AutoWried()
    sayHello( @Inject(Child) person: Person) {
        return person.say();
    }
}

class MethodTest3 {
    constructor() {

    }

    @AutoWried
    sayHello( @Inject(Child) personA: Person, personB: Person) {
        return personA.say() + ', '  + personB.say();
    }
}

@Injectable()
class Geet {
    constructor(private name: string){

    }

    print(hi?:string){
        return `${hi}, from ${this.name}`;
    }
}

container.register(Geet);

container.invoke(Geet, gt=> gt.print, ... //inject providers.)

let instance = container.resolve(Geet, )

container.invoke(instance, gt=> gt.print, ...//inject providers.);
container.invoke(instance, 'print', ...);

container.register(MethodTest);
container.invoke(MethodTest, 'sayHello');

container.register(MethodTest2);
container.invoke(MethodTest2, tg=> tg.sayHello);

container.register(MethodTest3);
container.invoke(MethodTest3, 'sayHello');


```


## Use Demo

```ts

import { Method, ContainerBuilder, Autowired, Injectable, Singleton, IContainer, ParameterMetadata, Param, Aspect } from '@tsdi/core';


export class SimppleAutoWried {
    constructor() {
    }

    @Autowired()
    dateProperty: Date;
}

@Singleton()
export class Person {
    name = 'testor';
}
// > v0.3.5 all class decorator can depdence.
@Singleton()
// @Injectable()
export class RoomService {
    constructor() {

    }
    @Autowired()
    current: Date;
}

@Injectable()
export class ClassRoom {
    constructor(public service: RoomService) {

    }
}

export abstract class Student {
    constructor() {
    }
    abstract sayHi(): string;
}

@Injectable({ provide: Student })
export class MiddleSchoolStudent extends Student {
    constructor() {
        super();
    }
    override sayHi() {
        return 'I am a middle school student';
    }
}

@Injectable()
export class MClassRoom {
    @Autowired(MiddleSchoolStudent)
    leader: Student;
    constructor() {

    }
}


@Injectable({ provide: Student, alias: 'college' })
export class CollegeStudent extends Student {
    constructor() {
        super();
    }
    override sayHi() {
        return 'I am a college student';
    }
}

@Injectable()
export class CollegeClassRoom {
    constructor(
        @Param(CollegeStudent)
        @Autowired(CollegeStudent)
        public leader: Student) {

    }
}


@Injectable()
export class InjMClassRoom {
    // @Inject(MiddleSchoolStudent)
    @Inject()
    // @Inject({ type: MiddleSchoolStudent })
    // @Inject({ provider: MiddleSchoolStudent })
    leader: Student;
    constructor() {

    }
}


export interface IClassRoom {
    leader: Student;
}

@Injectable()
export class InjCollegeClassRoom {
    constructor(
        // all below decorator can work, also @Autowired(), @Param() is.
        // @Inject(new Registration(Student, 'college')) // need CollegeStudent also register.
        @Inject(CollegeStudent)
        // @Inject({ provider: CollegeStudent })
        // @Inject({ provider: Student, alias: 'college' }) //need CollegeStudent also register.
        // @Inject({ type: CollegeStudent })
        public leader: Student
    ) {

    }
}

@Injectable()
export class InjCollegeAliasClassRoom {
    constructor(
        // all below decorator can work, also @Autowired(), @Param() is.
        @Inject(new Registration(Student, 'college')) // need CollegeStudent also register.
        // @Inject(CollegeStudent)
        // @Inject({ provider: CollegeStudent })
        // @Inject({ provider: Student, alias: 'college' }) // need CollegeStudent also register.
        // @Inject({ type: CollegeStudent })
        public leader: Student
    ) {

    }
}


@Injectable('StringClassRoom')
export class StingMClassRoom {
    // @Inject(MiddleSchoolStudent)
    @Inject()
    // @Inject({ type: MiddleSchoolStudent })
    leader: Student;
    constructor() {

    }
}

export class StringIdTest {
    constructor(@Inject('StringClassRoom') public room: IClassRoom) {

    }
}

export const CollClassRoom = Symbol('CollegeClassRoom');

@Injectable(CollClassRoom)
export class SymbolCollegeClassRoom {

    @Inject(CollegeStudent)
    leader: Student;
    constructor() {

    }
}

export class SymbolIdest {
    @Inject(CollClassRoom)
    public room: IClassRoom
    constructor() {

    }
}

@Injectable()
class MethodTestPerson {
    say() {
        return 'hello word.'
    }
}

class MethodTest {

    @AutoWried
    sayHello(person: MethodTestPerson) {
        return person.say();
    }
}


// 1. Custom register one class will auto inject depdence class (must has a class decorator).

let builder = new ContainerBuilder();
let container = builder.create();


container.register(MethodTest);
container.invoke(MethodTest, 'sayHello')
    .then(data =>{
        console.log(data);
    });

container.register(SimppleAutoWried);
let instance = container.get(SimppleAutoWried);
console.log(instance.dateProperty);


container.register(ClassRoom);
let room = container.get(ClassRoom);
console.log(room.service.current);

container.register(MiddleSchoolStudent);
container.register(CollegeStudent);

let student = container.get(Student);
console.log(student.sayHi());

let student2 = container.get(new Registration(Student, 'college'));

console.log(student2.sayHi());

let student3 = container.get(Student, 'college'));

console.log(student3.sayHi());


builder.build({
    files: __dirname + '/*{.ts,.js}'
})
    .then(container => {
        let instance = container.get(Student);
        console.log(instance.sayHi());

        let instance2 = container.get(new Registration(Student, 'college'));
        console.log(instance2.sayHi());

        let instance3 = container.get(Student, 'college');
        console.log(instance3.sayHi())
    });



```

## Extend decorator, Demo fo extends 

see AOP extends (https://github.com/zhouhoujun/tsioc/blob/master/packages/aop/src/AopModule.ts)
You can extend yourself decorator via:

## Documentation
Documentation is available on the
* [@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
* [@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
* [@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
* [@tsdi/boot document](https://github.com/zhouhoujun/tsioc/tree/master/packages/boot).
* [@tsdi/components document](https://github.com/zhouhoujun/tsioc/tree/master/packages/components).
* [@tsdi/compiler document](https://github.com/zhouhoujun/tsioc/tree/master/packages/compiler).
* [@tsdi/activities document](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities).
* [@tsdi/pack document](https://github.com/zhouhoujun/tsioc/tree/master/packages/pack).
* [@tsdi/typeorm-adapter document](https://github.com/zhouhoujun/tsioc/tree/master/packages/typeorm-adapter).
* [@tsdi/unit document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit).
* [@tsdi/unit-console document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit-console).
* [@tsdi/cli document](https://github.com/zhouhoujun/tsioc/tree/master/packages/cli).


### packages
[@tsdi/cli](https://www.npmjs.com/package/@tsdi/cli)
[@tsdi/ioc](https://www.npmjs.com/package/@tsdi/ioc)
[@tsdi/aop](https://www.npmjs.com/package/@tsdi/aop)
[@tsdi/core](https://www.npmjs.com/package/@tsdi/core)
[@tsdi/boot](https://www.npmjs.com/package/@tsdi/boot)
[@tsdi/components](https://www.npmjs.com/package/@tsdi/components)
[@tsdi/compiler](https://www.npmjs.com/package/@tsdi/compiler)
[@tsdi/activities](https://www.npmjs.com/package/@tsdi/activities)
[@tsdi/pack](https://www.npmjs.com/package/@tsdi/pack)
[@tsdi/typeorm-adapter](https://www.npmjs.com/package/@tsdi/typeorm-adapter)
[@tsdi/unit](https://www.npmjs.com/package/@tsdi/unit)
[@tsdi/unit-console](https://www.npmjs.com/package/@tsdi/unit-console)

## License

MIT © [Houjun](https://github.com/zhouhoujun/)