import { Injectable, Injector, createInjector, Module, RunContext } from '@tsdi/ioc';
import expect = require('expect');
import { Vaildator, VaildatorFn, VaildatorLike, ValidateResult } from '../src/vaildator';

@Injectable()
class StringValidator implements Vaildator<string> {
    vaild(input: string): ValidateResult {
        if (input.length === 0) {
            return { status: false, message: 'String cannot be empty' };
        }
        return { status: true };
    }
}

@Injectable()
class NumberValidator implements Vaildator<number> {
    vaild(input: number): ValidateResult {
        if (isNaN(input)) {
            return { status: false, message: 'Not a valid number' };
        }
        if (input < 0) {
            return { status: false, message: 'Number must be positive' };
        }
        return { status: true };
    }
}

@Injectable()
class EmailValidator implements Vaildator<string> {
    vaild(input: string): ValidateResult {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input)) {
            return { status: false, message: 'Invalid email format' };
        }
        return { status: true };
    }
}

@Injectable()
class AsyncValidator implements Vaildator<string> {
    async vaild(input: string): Promise<ValidateResult> {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(input.length > 3 ? { status: true } : { status: false, message: 'Too short' });
            }, 10);
        });
    }
}

@Injectable()
class RangeValidator implements Vaildator<number> {
    constructor(private min: number, private max: number) {}
    
    vaild(input: number): ValidateResult {
        if (input < this.min) {
            return { status: false, message: `Value must be at least ${this.min}` };
        }
        if (input > this.max) {
            return { status: false, message: `Value must be at most ${this.max}` };
        }
        return { status: true };
    }
}

const validatorFn: VaildatorFn = (input: any) => ({
    status: input !== null && input !== undefined,
    message: input === null || input === undefined ? 'Value is required' : undefined
} as ValidateResult);

@Module({
    providers: [
        StringValidator,
        NumberValidator,
        EmailValidator,
        AsyncValidator
    ]
})
class TestModule { }

describe('Validator Tests', () => {
    let injector: Injector;

    beforeEach(() => {
        injector = createInjector();
    });

    describe('StringValidator', () => {
        it('should validate non-empty strings', () => {
            const validator = new StringValidator();
            const result = validator.vaild('test');
            expect(result.status).toBeTruthy();
        });

        it('should reject empty strings', () => {
            const validator = new StringValidator();
            const result = validator.vaild('');
            expect(result.status).toBeFalsy();
            expect(result.message).toBe('String cannot be empty');
        });
    });

    describe('NumberValidator', () => {
        it('should validate positive numbers', () => {
            const validator = new NumberValidator();
            const result = validator.vaild(42);
            expect(result.status).toBeTruthy();
        });

        it('should validate zero', () => {
            const validator = new NumberValidator();
            const result = validator.vaild(0);
            expect(result.status).toBeTruthy();
        });

        it('should reject NaN', () => {
            const validator = new NumberValidator();
            const result = validator.vaild(NaN);
            expect(result.status).toBeFalsy();
            expect(result.message).toBe('Not a valid number');
        });

        it('should reject negative numbers', () => {
            const validator = new NumberValidator();
            const result = validator.vaild(-5);
            expect(result.status).toBeFalsy();
            expect(result.message).toBe('Number must be positive');
        });
    });

    describe('EmailValidator', () => {
        it('should validate correct email format', () => {
            const validator = new EmailValidator();
            const result = validator.vaild('test@example.com');
            expect(result.status).toBeTruthy();
        });

        it('should reject invalid email format', () => {
            const validator = new EmailValidator();
            const result = validator.vaild('invalid-email');
            expect(result.status).toBeFalsy();
            expect(result.message).toBe('Invalid email format');
        });

        it('should reject email without @', () => {
            const validator = new EmailValidator();
            const result = validator.vaild('testexample.com');
            expect(result.status).toBeFalsy();
        });

        it('should reject email without domain', () => {
            const validator = new EmailValidator();
            const result = validator.vaild('test@');
            expect(result.status).toBeFalsy();
        });
    });

    describe('AsyncValidator', () => {
        it('should validate strings longer than 3 characters', async () => {
            const validator = new AsyncValidator();
            const result = await validator.vaild('test');
            expect(result.status).toBeTruthy();
        });

        it('should reject strings of 3 or fewer characters', async () => {
            const validator = new AsyncValidator();
            const result = await validator.vaild('abc');
            expect(result.status).toBeFalsy();
            expect(result.message).toBe('Too short');
        });
    });

    describe('RangeValidator', () => {
        it('should validate numbers within range', () => {
            const validator = new RangeValidator(1, 100);
            expect(validator.vaild(50).status).toBeTruthy();
            expect(validator.vaild(1).status).toBeTruthy();
            expect(validator.vaild(100).status).toBeTruthy();
        });

        it('should reject numbers below minimum', () => {
            const validator = new RangeValidator(1, 100);
            const result = validator.vaild(0);
            expect(result.status).toBeFalsy();
            expect(result.message).toBe('Value must be at least 1');
        });

        it('should reject numbers above maximum', () => {
            const validator = new RangeValidator(1, 100);
            const result = validator.vaild(101);
            expect(result.status).toBeFalsy();
            expect(result.message).toBe('Value must be at most 100');
        });
    });

    describe('VaildatorFn Type', () => {
        it('should validate non-null values', () => {
            const result = validatorFn('test', {} as RunContext) as ValidateResult;
            expect(result.status).toBeTruthy();
        });

        it('should reject null values', () => {
            const result = validatorFn(null, {} as RunContext) as ValidateResult;
            expect(result.status).toBeFalsy();
            expect(result.message).toBe('Value is required');
        });

        it('should reject undefined values', () => {
            const result = validatorFn(undefined, {} as RunContext) as ValidateResult;
            expect(result.status).toBeFalsy();
        });
    });

    describe('ValidateResult Interface', () => {
        it('should have status property', () => {
            const result: ValidateResult = { status: true };
            expect(result.status).toBeTruthy();
        });

        it('should have optional message property', () => {
            const result: ValidateResult = { status: false, message: 'Error' };
            expect(result.message).toBe('Error');
        });
    });
});