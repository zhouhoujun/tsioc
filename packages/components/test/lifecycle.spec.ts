import expect = require('expect');
import { Change, Changes, OnChanges, OnInit, AfterContentInit, AfterViewInit, OnDestroy } from '../src/lifecycle';

describe('Lifecycle Interfaces', () => {

    describe('Change interface', () => {
        it('should have previousValue and currentValue', () => {
            const change: Change = {
                previousValue: 'old',
                currentValue: 'new'
            };
            expect(change.previousValue).toBe('old');
            expect(change.currentValue).toBe('new');
        });

        it('should have optional firstChange', () => {
            const change: Change = {
                previousValue: null,
                currentValue: 'first',
                firstChange: true
            };
            expect(change.firstChange).toBeTruthy();
        });

        it('should allow firstChange to be undefined', () => {
            const change: Change = {
                previousValue: 'old',
                currentValue: 'new'
            };
            expect(change.firstChange).toBeUndefined();
        });
    });

    describe('Changes interface', () => {
        it('should hold multiple changes', () => {
            const changes: Changes = {
                name: { previousValue: 'old', currentValue: 'new' },
                age: { previousValue: 10, currentValue: 20 }
            };
            expect(changes.name.currentValue).toBe('new');
            expect(changes.age.currentValue).toBe(20);
        });

        it('should be indexable by string', () => {
            const changes: Changes = {};
            changes['prop'] = { previousValue: null, currentValue: 'value' };
            expect(changes['prop']).toBeDefined();
        });
    });

    describe('OnChanges interface', () => {
        it('should implement onChanges method', () => {
            const impl: OnChanges = {
                onChanges: (changes: Changes) => {}
            };
            expect(typeof impl.onChanges).toBe('function');
        });
    });

    describe('OnInit interface', () => {
        it('should implement onInit method', () => {
            const impl: OnInit = {
                onInit: () => {}
            };
            expect(typeof impl.onInit).toBe('function');
        });

        it('should allow async onInit', async () => {
            const impl: OnInit = {
                onInit: async () => {
                    return Promise.resolve();
                }
            };
            await impl.onInit();
        });
    });

    describe('AfterContentInit interface', () => {
        it('should implement onAfterContentInit method', () => {
            const impl: AfterContentInit = {
                onAfterContentInit: () => {}
            };
            expect(typeof impl.onAfterContentInit).toBe('function');
        });

        it('should allow async onAfterContentInit', async () => {
            const impl: AfterContentInit = {
                onAfterContentInit: async () => {}
            };
            await impl.onAfterContentInit();
        });
    });

    describe('AfterViewInit interface', () => {
        it('should implement onAfterViewInit method', () => {
            const impl: AfterViewInit = {
                onAfterViewInit: () => {}
            };
            expect(typeof impl.onAfterViewInit).toBe('function');
        });

        it('should allow async onAfterViewInit', async () => {
            const impl: AfterViewInit = {
                onAfterViewInit: async () => {}
            };
            await impl.onAfterViewInit();
        });
    });

    describe('OnDestroy interface', () => {
        it('should implement onDestroy method', () => {
            const impl: OnDestroy = {
                onDestroy: () => {}
            };
            expect(typeof impl.onDestroy).toBe('function');
        });
    });

    describe('Component lifecycle implementation', () => {
        it('should implement all lifecycle hooks', () => {
            class MyComponent implements OnInit, OnChanges, AfterContentInit, AfterViewInit, OnDestroy {
                onInit() {}
                onChanges(changes: Changes) {}
                onAfterContentInit() {}
                onAfterViewInit() {}
                onDestroy() {}
            }
            
            const comp = new MyComponent();
            expect(typeof comp.onInit).toBe('function');
            expect(typeof comp.onChanges).toBe('function');
            expect(typeof comp.onAfterContentInit).toBe('function');
            expect(typeof comp.onAfterViewInit).toBe('function');
            expect(typeof comp.onDestroy).toBe('function');
        });
    });
});