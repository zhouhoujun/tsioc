import { lang, Inject } from '@tsdi/ioc';
import { Suite, BeforeEach, Test, Expect, ExpectToken, AfterEach } from '../src';
import { Given, When, Then, And } from '../src/e2e/E2EMetadata';

@Suite('E2E Test Suite', 30000, true)
export class E2ETestSuite {

    private idx = 0;

    @BeforeEach()
    async initTest() {
        console.log('---------E2E before test case ' + (++this.idx) + '-----------');
    }

    @AfterEach()
    async afterTest() {
        console.log('---------E2E after  test case ' + this.idx + '-----------');
    }

    @Given('a user is logged in', 1000)
    async userLoggedIn() {
        console.log('  Given: user is logged in');
    }

    @When('user clicks the submit button', 1000)
    async userClicksSubmit() {
        console.log('  When: user clicks submit');
    }

    @Then('the form should be submitted successfully', 1000)
    async verifySubmission() {
        console.log('  Then: form submitted');
    }

    @And('the success message should be displayed', 1000)
    async verifySuccessMessage() {
        console.log('  And: success message shown');
    }

    @Test('E2E test with Given/When/Then')
    async testScenario(@Inject(ExpectToken) expect: Expect) {
        await expect(true).toBe(true);
    }
}

@Suite('E2E Scenario Only Suite (no @Test)', 30000, true)
export class E2EScenarioOnlySuite {

    @Given('a test environment is ready', 1000)
    async envReady() {
        console.log('  Given: test environment ready');
    }

    @When('I execute the test scenario', 1000)
    async executeScenario() {
        console.log('  When: executing scenario');
    }

    @Then('the result should be verified', 1000)
    async verifyResult() {
        console.log('  Then: result verified');
    }
}

@Suite('E2E Mixed Suite', 30000, true)
export class E2EMixedSuite {

    @BeforeEach()
    setup() {
        console.log('  Setup before each test');
    }

    @AfterEach()
    teardown() {
        console.log('  Teardown after each test');
    }

    @Given('a test environment is prepared')
    prepareEnv() {
        console.log('  Given: environment prepared');
    }

    @When('test executes')
    executeTest() {
        console.log('  When: test executes');
    }

    @Then('test passes')
    testPasses() {
        console.log('  Then: test passes');
    }

    @Test('regular test case')
    regularTest(@Inject(ExpectToken) expect: Expect) {
        expect(true).toBe(true);
    }

    @Test('another test case')
    anotherTest() {
        console.log('  Another test running');
    }
}

@Suite('Regular Unit Test Suite')
export class RegularUnitTestSuite {

    @Test('regular test 1')
    test1(@Inject(ExpectToken) expect: Expect) {
        expect(1).toBe(1);
    }

    @Test('regular test 2')
    test2() {
        console.log('  Regular test 2');
    }
}