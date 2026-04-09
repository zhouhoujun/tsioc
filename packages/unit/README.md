# packaged @tsdi/unit

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/unit`： unit testing framework, base on AOP, Ioc container.

version 5+ of [`@ts-ioc/core`](https://www.npmjs.com/package/@ts-ioc/core) [`tsioc`](https://www.npmjs.com/package/tsioc)

# Install

```shell

npm install @tsdi/unit
npm install @tsdi/unit-console

// in browser
npm install @tsdi/platform-browser

// in server
npm install @tsdi/platform-server
```

## add extends modules

### use unit


```ts

import { Suite, BeforeEach, UnitTest, Test, After, AfterEach Assert, Expect, ExpectToken } from '@tsdi/unit';
import { ConsoleReporter } from '@tsdi/unit-console';
import { PromiseUtil } from '@tsdi/core';


@Suite('Unit Test')
export class SuiteTest {

    // testContainer: AnyApplicationBuilder;

    @BeforeEach()
    async initTest() {
        console.log('---------beofre test-----------');
    }

    @Test('assert test timeout', 200)
    async testTimeout() {
        console.log('--------assert test timeout------');
        await lang.delay(300);
        return 'out time do...';
    }

    @Test('assert test in time', 200)
    async testInTime() {
        console.log('--------assert test in time------');
        await lang.delay(100);
        return 'in time do...';
    }


    @Test('assert test in time', 200)
    async testInTime(assert: Assert) {
        console.log('--------assert test in time------');
        await lang.delay(100);
        assert.strictEqual('0', 0);
        return 'in time do...';
    }

    @Test('expect test')
    async testEqural(@Inject(ExpectToken) expect: Expect) {
        await expect('true').toBe(true);
    }

    @AfterEach()
    clean(){
        //clean each data.
    }

    @After()
    destroy(){

    }
}



```

### E2E Testing

The Suite decorator supports E2E testing by adding a third boolean parameter:

```ts
import { Suite, Test, BeforeEach, AfterEach, Expect, ExpectToken } from '@tsdi/unit';

@Suite('E2E Test Suite', 60000, true)
export class E2ETestSuite {
    @BeforeEach()
    setup() {
        // Setup before each scenario
    }

    @Test('E2E test case', 5000)
    async testCase(@Inject(ExpectToken) expect: Expect) {
        expect(true).toBe(true);
    }

    @AfterEach()
    teardown() {
        // Cleanup after each scenario
    }
}
```

**Parameters:**
- `describe`: Suite description (string)
- `timeout`: Suite timeout in milliseconds (number, optional)
- `e2e`: Mark as E2E test suite (boolean, default: false)

When `e2e: true`, the test suite runs with E2E runner supporting Given/When/Then step patterns.

**Using Given/When/Then step decorators:**

```ts
import { Suite, Test, BeforeEach, AfterEach } from '@tsdi/unit';
import { Given, When, Then, And } from '@tsdi/unit';

@Suite('User Login E2E Tests', 60000, true)
export class UserLoginE2ETest {

    @Given('a registered user with valid credentials', 5000)
    async setupUser() {
        // Setup user data
    }

    @When('user enters username and password', 5000)
    async enterCredentials() {
        // Enter login credentials
    }

    @When('user clicks the login button', 5000)
    async clickLogin() {
        // Click login button
    }

    @Then('user should be redirected to dashboard', 5000)
    async verifyRedirect() {
        // Verify redirect to dashboard
    }

    @And('success message should be displayed', 5000)
    async verifyMessage() {
        // Verify success message
    }
}
```

**Step Decorators:**
- `@Given(description, timeout)` - Given step
- `@When(description, timeout)` - When step  
- `@Then(description, timeout)` - Then step
- `@And(description, timeout)` - And step
- `@But(description, timeout)` - But step
- `@BeforeScenario()` - Run before scenario (alias for @Before)
- `@AfterScenario()` - Run after scenario (alias for @After)

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

* use runTest to run

```ts
// run Test
/**
 * unit test.
 *
 * @export
 * @param {(string | Type | (string | Type)[])} src test source.
 * @param {(string | AppConfigure)} [config] test configure.
 * @param {...LoadType[]} deps custom set unit test dependencies.
 * @returns {Promise<any>}
 */
export function runTest(src: string | Type | (string | Type)[], config?: string | UnitTestConfigure, ...deps: LoadType[]): Promise<any>;

runTest(SuiteTest, {...}, ConsoleReporter);

```

* use boot application
```ts
import { BootApplication, DIModule, ConfigureRegister } from '@tsdi/boot';
import { UnitTest } from '@tsdi/unit';

BootApplication.run(UnitTestContext.parse({ module: UnitTest, deps: [ConsoleReporter], configures: [config, { src: src }] }))
```

### use command run test code
`tsdi test [test/**/*.ts]`

```shell

tsdi test  //default load test/**/*.ts

//or
tsdi test test/**/*.ts

// Run with browser environment
tsdi test --browser

// Run with node environment (default)
tsdi test --node

// Run with coverage
tsdi test --coverage

// Run with coverage (short form)
tsdi test -c

// Run with browser environment and coverage
tsdi test --browser --coverage

// Run with node environment and coverage
tsdi test --node --coverage
```

### Programmatic API

```typescript
import { runTest } from '@tsdi/unit';

runTest('test/**/*.ts', {
    env: 'node',  // 'node' | 'browser' | 'auto'
    coverage: {
        enabled: true,
        reporters: ['text', 'text-summary']
    }
});
```


* test result:
![image](https://github.com/zhouhoujun/tsioc/blob/master/packages/unit-console/assets/ConsoleReport1.png?raw=true)



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