import { Module } from '@tsdi/ioc';
import { Controller, Get, provideService, provideServiceFromDi } from '@tsdi/service';
import { withTcpTransport } from '../src/server';
import expect = require('expect');

describe('TCP Microservice Integration', () => {

    it('should create providers for TCP microservice with decorated controller', () => {
        @Controller('/api')
        class TestController {
            @Get('/hello')
            hello() {
                return { message: 'Hello World' };
            }
        }

        @Module({
            declarations: [TestController],
            providers: [
                ...provideService(
                    withTcpTransport({
                        listenOpts: { port: 0, host: 'localhost' },
                        asDefault: true
                    })
                )
            ]
        })
        class TestModule { }

        expect(TestModule).toBeDefined();
        // Just verify the providers can be created without error
        const providers = provideService(
            withTcpTransport({
                listenOpts: { port: 0, host: 'localhost' },
                asDefault: true
            })
        );
        expect(Array.isArray(providers)).toBe(true);
        expect(providers.length).toBeGreaterThan(0);
    });

    it('should create TCP transport with multiple services', () => {
        @Controller('/first')
        class FirstController { }

        @Controller('/second')
        class SecondController { }

        @Module({
            declarations: [FirstController, SecondController],
            providers: [
                ...provideService(
                    withTcpTransport(
                        { listenOpts: { port: 8080 }, name: 'service1' },
                        { listenOpts: { port: 8081 }, name: 'service2' }
                    )
                )
            ]
        })
        class MultiServiceModule { }

        expect(MultiServiceModule).toBeDefined();
        // Just verify the providers can be created without error
        const providers = provideService(
            withTcpTransport(
                { listenOpts: { port: 8080 }, name: 'service1' },
                { listenOpts: { port: 8081 }, name: 'service2' }
            )
        );
        expect(Array.isArray(providers)).toBe(true);
        expect(providers.length).toBeGreaterThan(0);
    });

    it('should work with provideServiceFromDi', () => {
        // verify that provideServiceFromDi can be called with TCP config
        const providers = provideServiceFromDi({
            transport: require('@tsdi/common').Transport.TCP,
            name: 'test-service'
        });
        expect(Array.isArray(providers)).toBe(true);
        expect(providers.length).toBeGreaterThan(0);
    });
});
