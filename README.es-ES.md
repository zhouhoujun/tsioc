

# @tsdi/ioc (Paquete)

Este repositorio es para su distribución en `npm`. El código fuente de este módulo se encuentra en el
[repositorio principal](https://github.com/zhouhoujun/tsioc).

`@tsdi/ioc` es un contenedor IoC e inector a través de decoradores de TypeScript.

versión 5+ de [`@ts-ioc/core`](https://www.npmjs.com/package/@ts-ioc/core) [`tsioc`](https://www.npmjs.com/package/tsioc)

# Builder

```shell
build: npm run build

//build with version:
npm run build -- --setvs=4.0.0-beta

//deploy: 
./deploy.cmd
//or
 npm run build -- --deploy=true

```

# Instalación

```shell

npm install @tsdi/ioc

```

## Agregar módulos de extensión

### Usar AOP

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
//or
container.injectModule(AopModule)

```

### Usar logs AOP

```shell
// install aop logs
npm install @tsdi/logs
```

```ts

import { LogModule } from '@tsdi/logs';
// in server
import { ContainerBuilder } from '@tsdi/platform-server'
// in browser
import { ContainerBuilder } from '@tsdi/platform-browser'

let builder = new ContainerBuilder();

let container = build.create();

container.use(LogModule);

```

# Documentación

## Core

### extends ioc
1. `@IocExt` decorador de clase, se usa para definir que la clase es un módulo de extensión de IoC. Se ejecutará automáticamente después de ser registrada para ayudarle a configurar el módulo.
2. agregar resolución de servicios.
3. inyección de módulos.


## IoC

1. Registrar una clase registrará automáticamente las clases dependientes (debe tener un decorador de clase).

2. Instanciar puede crear automáticamente los parámetros del constructor. (debe tener un decorador de clase o estar registrado en el contenedor).

### Decoradores

1. `@Abstract` decorador de clase abstracta.
2. `@AutoRun`   decorador de clase y método, se usa para definir que la clase se ejecute automáticamente (vía un método o no) después de ser registrada.
3. `@AutoWried`  decorador de propiedad o parámetro, se usa para inyectar automáticamente una instancia del tipo o un valor a la instancia de una clase con el decorador.
4. `@Inject`  decorador de propiedad o parámetro, se usa para inyectar automáticamente una instancia del tipo o un valor a la instancia de una clase con el decorador.
5. `@Injectable` decorador de clase, se usa para definir la clase. Puede establecer un proveedor para algún token, ser singleton o no.
6. `@AutoWried` decorador de método.
7. `@Param`   decorador de parámetro, se usa para inyectar automáticamente una instancia del tipo o un valor a la instancia de una clase con el decorador.
8. `@Singleton` decorador de clase, se usa para definir que la clase es singleton.
9. `@Providers` decorador de Proveedores, para clase. se usa para agregar servicios de referencia privada para la clase.
10. `@Refs` decorador de Referencias, para clase. se usa para definir la clase como un servicio para el objetivo.


## AOP

Es un AOP dinámico basado en IoC.

Defina una clase `Aspect`, debe tener decorador:

* `@Aspect` decorador Aspect, definido para clase. Se usa para definir la clase como aspect. Puede establecer un proveedor para algún token, ser singleton o no.

* `@Before(matchstring|RegExp)` decorador de método, decorador de consejo AOP Before.

* `@After(matchstring|RegExp)`  decorador de método, decorador de consejo AOP After.

* `@Around(matchstring|RegExp)`  decorador de método, decorador de consejo AOP Around.

* `@AfterThrowing(matchstring|RegExp)`  decorador de método, decorador de consejo AOP AfterThrowing.

* `@AfterReturning(matchstring|RegExp)`  decorador de método, decorador de consejo AOP AfterReturning.

* `@Pointcut(matchstring|RegExp)`  decorador de método, decorador de consejo AOP Pointcut.


ver [simples](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop/test/aop)


## boot
Gestor de módulos DI, inicio de la aplicación. basado en AOP.

*  `@DIModule` decorador DIModule, se usa para definir la clase como módulo DI.
*  `@Bootstrap` decorador Bootstrap, se usa para definir la clase como módulo de inicio.
*  `@Annotation` decorador Annotation, se usa para definir la clase de configuración de metadatos.
*  `@Message`  decorador Message, para clase. se usa para definir la clase como manejador de mensajes registrado en la cola de mensajes global.

[simples de inicio mvc](https://github.com/zhouhoujun/type-mvc/tree/master/packages/simples)

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

@Injectable
export class ClassSevice {
    @Inject('mark')
    mark: string;
    state: string;
    start() {
        console.log(this.mark);
    }
}

@Aspect
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

## componentes
*  `@Component`  decorador Component, se usa para definir la clase como componente con plantilla.
*  `@Input` decorador Input, se usa para definir propiedad o parámetro como campo de enlace o argumentos del componente.

ver [ejemplo de inicio de actividad](https://github.com/zhouhoujun/tsioc/blob/master/packages/activities/taskfile.ts)


## [Actividades](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities)

* [activities](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities)
* [pack](https://github.com/zhouhoujun/tsioc/tree/master/packages/pack)

### Crear Contenedor

```ts

let container = new IocContainer();

```

###  El Contenedor es la raíz de IoC.

ver la interfaz de @tsdi/ioc [IIocContainer](https://github.com/zhouhoujun/tsioc/blob/master/packages/ioc/src/IIocContainer.ts)

ver la interfaz de @tsdi/core [IContainer](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/IContainer.ts)

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

// bind provider
container.bindProvider
// bind providers.
container.bindProviders

```

### El Inyector es un inyector de IoC básico.

ver interfaz [IInjector](https://github.com/zhouhoujun/tsioc/blob/master/packages/ioc/src/IInjector.ts)

```ts

// get the injector of Person class type injected.
let injector =  container.getInjector(Person);

// create new injector
let injector = container.createInjector();
// or create new injector via
let injector = container.getInstance(InjectorFactoryToken);
```

### Invocar método

puede usar su propio `MethodAccessor` implementando IMethodAccessor, registrar `MethodAccessorToken` con su `MethodAccessor` en el contenedor, ver [interfaz](https://github.com/zhouhoujun/tsioc/blob/master/packages/ioc/src/IIocContainer.ts).

```ts

@Injectable
class Person {
    constructor() {

    }
    say() {
        return 'I love you.'
    }
}

@Injectable
class Child extends Person {
    constructor() {
        super();
    }
    say() {
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

@Injectable
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


## Demo de Uso

```ts

import { Method, ContainerBuilder, AutoWired, Injectable, Singleton, IContainer, ParameterMetadata, Param, Aspect } from '@tsdi/core';


export class SimppleAutoWried {
    constructor() {
    }

    @AutoWired
    dateProperty: Date;
}

@Singleton
export class Person {
    name = 'testor';
}
// > v0.3.5 all class decorator can depdence.
@Singleton
// @Injectable
export class RoomService {
    constructor() {

    }
    @AutoWired
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
    sayHi() {
        return 'I am a middle school student';
    }
}

@Injectable()
export class MClassRoom {
    @AutoWired(MiddleSchoolStudent)
    leader: Student;
    constructor() {

    }
}


@Injectable({ provide: Student, alias: 'college' })
export class CollegeStudent extends Student {
    constructor() {
        super();
    }
    sayHi() {
        return 'I am a college student';
    }
}

@Injectable
export class CollegeClassRoom {
    constructor(
        @Param(CollegeStudent)
        @AutoWired(CollegeStudent)
        public leader: Student) {

    }
}


@Injectable
export class InjMClassRoom {
    // @Inject(MiddleSchoolStudent)
    @Inject
    // @Inject({ type: MiddleSchoolStudent })
    // @Inject({ provider: MiddleSchoolStudent })
    leader: Student;
    constructor() {

    }
}


export interface IClassRoom {
    leader: Student;
}

@Injectable
export class InjCollegeClassRoom {
    constructor(
        // all below decorator can work, also @AutoWired, @Param is.
        // @Inject(new Registration(Student, 'college')) // need CollegeStudent also register.
        @Inject(CollegeStudent)
        // @Inject({ provider: CollegeStudent })
        // @Inject({ provider: Student, alias: 'college' }) //need CollegeStudent also register.
        // @Inject({ type: CollegeStudent })
        public leader: Student
    ) {

    }
}

@Injectable
export class InjCollegeAliasClassRoom {
    constructor(
        // all below decorator can work, also @AutoWired, @Param is.
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
    @Inject
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

@Injectable
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

## Extender decorador, Demo de extensión

ver AOP extends (https://github.com/zhouhoujun/tsioc/blob/master/packages/aop/src/AopModule.ts)
Puede extender su propio decorador a través de:

## Documentación
La documentación está disponible en
*   [documentación de @tsdi/ioc](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
*   [documentación de @tsdi/aop](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
*   [documentación de @tsdi/core](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
*   [documentación de @tsdi/boot](https://github.com/zhouhoujun/tsioc/tree/master/packages/boot).
*   [documentación de @tsdi/components](https://github.com/zhouhoujun/tsioc/tree/master/packages/components).
*   [documentación de @tsdi/activities](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities).
*   [documentación de @tsdi/typeorm-adapter](https://github.com/zhouhoujun/tsioc/tree/master/packages/typeorm-adapter).
*   [documentación de @tsdi/unit](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit).
*   [documentación de @tsdi/unit-console](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit-console).
*   [documentación de @tsdi/cli](https://github.com/zhouhoujun/tsioc/tree/master/packages/cli).

## Licencia

MIT © [Houjun](https://github.com/zhouhoujun/)
