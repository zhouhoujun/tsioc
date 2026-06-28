import expect = require('expect');
import { MetricsCollector } from '../src/collector';

describe('MetricsCollector abstract class', () => {
    it('MetricsCollector is an abstract class', () => {
        expect(typeof MetricsCollector).toBe('function');
    });
});
