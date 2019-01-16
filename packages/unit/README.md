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

import { Suite, BeforeEach, UnitTest, Test, Assert, Expect, ExpectToken } from '@ts-ioc/unit';
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


    @Test('assert test in time', 200)
    testInTime(assert: Assert) {
        console.log('--------assert test in time------');
        let def = new Defer();
        setTimeout(() => {
            def.resolve('in time do...')
        }, 100)
        assert.strictEqual('0', 0);
        return def.promise;
    }

    @Test('expect test')
    async testEqural(@Inject(ExpectToken) expect: Expect) {
        await expect('true').toBe(true);
    }
}



```

### support old TDD BDD style unit test.
* TDD-style interface:
```js
suite('Array', function() {
  suite('#indexOf()', function() {
    suiteSetup(function() {
    });
    test('should return -1 when not present', function() {
    });
    test('should return the index when present', function() {
    });
    suiteTeardown(function() {
    });
  });
});
```
* BDD-style interface:
```js
describe('Array', function(){
    describe('Array#indexOf()', function() {
        it('should return -1 when not present', function() {
        // ...
        });
        it('should return the index when present', function() {
        // ...
        });
    });
});
```

### custom run test code
```ts

new UnitTest()
    .use(ConsoleReporter)
    .use(...) // your assert expect ...
    .test(SuiteTest);
    // match test file. will auto load class with @Suite decorator.
    //.test('test/');
```

### use command run test code
`pk test [test/**/*.ts]`

```shell

pk test  //default load test/**/*.ts

//or
pk test test/**/*.ts

```


* test result:
![image](https://github.com/zhouhoujun/tsioc/blob/master/packages/unit-console/assets/ConsoleReport1.png?raw=true)


Documentation is available on the
[@ts-ioc/unit docs site](https://github.com/zhouhoujun/tsioc/blob/master/packages/unit#readme).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)