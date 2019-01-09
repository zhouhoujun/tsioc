# packaged @ts-ioc/unit

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@ts-ioc/unit`： unit testing framework, base on AOP, Ioc container.

version 2+ of [`tsioc`](https://www.npmjs.com/zhouhoujun/package/tsioc)
# Install

```shell

npm install @ts-ioc/unit

// in browser
npm install @ts-ioc/platform-browser

// in server
npm install @ts-ioc/platform-server
```

## add extends modules

### use unit


```ts

import { Suite, BeforeEach, UnitTest, Test } from '@ts-ioc/unit';
import { ConsoleReporter } from '@ts-ioc/unit-console';
import { Defer } from '@ts-ioc/core';


@Suite('Unit Test')
export class SuiteTest {

    // testContainer: AnyApplicationBuilder;

    @BeforeEach()
    async initTest() {
        console.log('---------beofre test-----------');
    }

    @Test('assert test timeout', 200)
    testTimeout() {
        console.log('--------assert test timeout------');
        let def = new Defer();
        setTimeout(() => {
            def.resolve('out time do...')
        }, 300)
        return def.promise;
    }

    @Test('assert test in time', 200)
    testInTime() {
        console.log('--------assert test in time------');
        let def = new Defer();
        setTimeout(() => {
            def.resolve('in time do...')
        }, 100)
        return def.promise;
    }

    testEqural() {
    }
}


new UnitTest()
    .use(ConsoleReporter)
    .test(SuiteTest);


```

* test result:
![image](https://github.com/zhouhoujun/tsioc/blob/master/packages/unit-console/assets/ConsoleReport.png?raw=true)

## Container Interface

see more interface. all document is typescript .d.ts.

* [IMethodAccessor](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/IMethodAccessor.ts).
* [IContainer](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/IContainer.ts)
* [LifeScope](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/LifeScope.ts)

Documentation is available on the
[@ts-ioc/core docs site](https://github.com/zhouhoujun/tsioc).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)