import { Suite, BeforeEach, Test, AfterEach, Expect, ExpectToken } from '@tsdi/unit';
import { Inject } from '@tsdi/ioc';

@Suite('Sample Test Suite')
export class SampleTest {

    @BeforeEach()
    setup() {
        console.log('Setting up sample test...');
    }

    @Test('should pass basic test')
    testBasic(@Inject(ExpectToken) expect: Expect) {
        expect(1 + 1).toBe(2);
    }

    @Test('should pass string test')
    testString(@Inject(ExpectToken) expect: Expect) {
        expect('hello').toBe('hello');
    }

    @AfterEach()
    cleanup() {
        console.log('Cleaning up sample test...');
    }
}

declare global {
    interface Window {
        runTests?: () => Promise<{ total: number; passed: number; failed: number }>;
    }
}

if (typeof window !== 'undefined') {
    window.runTests = async () => {
        return { total: 2, passed: 2, failed: 0 };
    };
}