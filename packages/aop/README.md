# packaged @ts-ioc/aop

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@ts-ioc/aop` is AOP base on Ioc container, via [@ts-ioc/core](https://www.npmjs.com/package/@ts-ioc/core), typescript decorator.

# Install

```shell

npm install @ts-ioc/aop

```

```ts
import { AopModule } from '@ts-ioc/aop';
// in server
import { ContainerBuilder } from '@ts-ioc/platform-server'
// in browser
import { ContainerBuilder } from '@ts-ioc/platform-browser'

let builder = new ContainerBuilder();

let container = build.create();

container.use(AopModule);

```

# Documentation

## AOP

It's a dynamic aop base on ioc.

define a Aspect class, must with decorator:

* @Aspect

define advice decorator have

* @Before(matchstring|RegExp)

* @After(matchstring|RegExp)

* @Around(matchstring|RegExp)

* @AfterThrowing(matchstring|RegExp)

* @AfterReturning(matchstring|RegExp)

* @Pointcut(matchstring|RegExp)

see [simples](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop/test/aop)

```ts

import { TypeMetadata, IClassMethodDecorator, createClassMethodDecorator} from '@ts-ioc/core';

import { Joinpoint, Around, Aspect , Pointcut } from '@ts-ioc/aop';

export const Authorization: IClassMethodDecorator<TypeMetadata> = createClassMethodDecorator<TypeMetadata>('Authorization');

// auth check simple.
@Aspect
export class AuthAspect {
    // pointcut for method has @Authorization decorator.
    @Pointcut('@annotation(Authorization)', 'authAnnotation')
    auth(joinPoint: Joinpoint, authAnnotation:MethodMetadata[]) {
        console.log('aspect annotation Before log, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }
}

@Aspect
export class SecrityAspect {
    // before AuthAspect.auth check some.
    @Before('execution(AuthAspect.auth)', 'authAnnotation')
    sessionCheck(authAnnotation:MethodMetadata[],joinPoint: Joinpoint) {
        console.log('aspect execution check session secrity Before AnnotationAspect.auth, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }
}

// Log simple
@Singleton
@Aspect
export class DebugLog {

    @Before(/\w+Controller.\w+$/)
    // @Before('execution(*Controller.*)')
    Beforlog(joinPoint: Joinpoint) {
        console.log('aspect Before log:', joinPoint.fullName);
    }

    @Around('execution(*Controller.*)')
    log(joinPoint: Joinpoint) {
        console.log('aspect Around log, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' Args:', joinPoint.args, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }
}


```

## Container Interface

see more interface. all document is typescript .d.ts.

* [IMethodAccessor](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/IMethodAccessor.ts).
* [IContainer](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/IContainer.ts)
* [LifeScope](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/LifeScope.ts)

Documentation is available on the
[@ts-ioc/aop docs site](https://github.com/zhouhoujun/tsioc).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)