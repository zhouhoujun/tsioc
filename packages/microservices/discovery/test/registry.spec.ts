import expect = require('expect');
import { ServiceDiscovery } from '../src/registry';
import { EndpointSelector } from '../src/registry';

describe('ServiceDiscovery abstract class', () => {
    it('ServiceDiscovery is an abstract class', () => {
        expect(typeof ServiceDiscovery).toBe('function');
    });

    it('EndpointSelector is an abstract class', () => {
        expect(typeof EndpointSelector).toBe('function');
    });
});
