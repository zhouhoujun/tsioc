import { MqttServer, MqttServOptions, mqttTransportFactory, useMqttTransport, MQTT_SERV_OPTIONS } from '../src/server';
import { withMqttTransport, MQTT_CLIENT_OPTIONS } from '../src/client';
import { Transport, TransferSide } from '@tsdi/common';
import { createInjector } from '@tsdi/ioc';
import { getServiceRouterToken } from '@tsdi/service';
import expect = require('expect');

describe('MQTT Microservice', () => {

    describe('MqttServOptions', () => {
        it('should create valid MQTT server options', () => {
            const options: Partial<MqttServOptions> = {
                transport: Transport.MQTT,
                side: TransferSide.server,
                microservice: true,
                url: 'mqtt://localhost:1883'
            };

            expect(options.transport).toBe(Transport.MQTT);
            expect(options.side).toBe(TransferSide.server);
            expect(options.microservice).toBe(true);
            expect(options.url).toBe('mqtt://localhost:1883');
        });

        it('should accept asDefault property', () => {
            const options: Partial<MqttServOptions> = {
                transport: Transport.MQTT,
                microservice: true,
                asDefault: true
            };

            expect(options.asDefault).toBe(true);
        });

        it('should accept subscribeTopics', () => {
            const options: Partial<MqttServOptions> = {
                transport: Transport.MQTT,
                subscribeTopics: [{ topic: 'test/+', qos: 1 }]
            };

            expect(options.subscribeTopics).toBeDefined();
            expect(options.subscribeTopics!.length).toBe(1);
            expect(options.subscribeTopics![0].topic).toBe('test/+');
        });
    });

    describe('mqttTransportFactory', () => {
        it('should create a valid MQTT transport feature', () => {
            const feature = mqttTransportFactory({
                url: 'mqtt://localhost:1883'
            });

            expect(feature.kind).toBeDefined();
            expect(feature.config).toBeDefined();
            expect(feature.providers).toBeDefined();
            expect(feature.config.transport).toBe(Transport.MQTT);
            expect(feature.config.side).toBe(TransferSide.server);
            expect(feature.config.microservice).toBe(true);
            expect(Array.isArray(feature.providers)).toBe(true);
            expect(feature.providers.length).toBeGreaterThan(0);
        });

        it('should include MQTT_SERV_OPTIONS provider', () => {
            const feature = mqttTransportFactory({
                url: 'mqtt://localhost:1883'
            });

            const configProviders = (feature.config as any).providers || [];
            const hasInConfig = configProviders.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === MQTT_SERV_OPTIONS;
                }
                return false;
            });

            const hasInMain = feature.providers.some((p: any) => {
                if ('provide' in p) {
                    return p.provide === MQTT_SERV_OPTIONS;
                }
                return false;
            });

            expect(hasInConfig || hasInMain).toBe(true);
        });

        it('should use message transfer on server side', () => {
            const feature = mqttTransportFactory({
                url: 'mqtt://localhost:1883'
            });

            expect(feature.config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve an explicit default transfer override', () => {
            const defaultTransfer = () => [];
            const feature = mqttTransportFactory({
                url: 'mqtt://localhost:1883',
                features: { defaultTransfer }
            });

            expect(feature.config.features?.defaultTransfer).toBe(defaultTransfer);
        });
    });

    describe('useMqttTransport', () => {
        it('should create multiple transport features for multiple options', () => {
            const features = useMqttTransport(
                { url: 'mqtt://localhost:1883' },
                { url: 'mqtt://localhost:1884' }
            );
            expect(features.length).toBe(2);
        });
    });

    describe('withMqttTransport', () => {
        it('should use json packet transfer by default', () => {
            const features = withMqttTransport({
                url: 'mqtt://localhost:1883'
            });

            expect(features[0].config.features?.defaultTransfer).toBeDefined();
        });

        it('should preserve host client mode when microservice is false', () => {
            const features = withMqttTransport({
                microservice: false,
                url: 'mqtt://localhost:1883'
            });

            expect(features[0].config.microservice).toBe(false);
        });
    });

    describe('MQTT_SERV_OPTIONS token', () => {
        it('should be defined', () => {
            expect(MQTT_SERV_OPTIONS).toBeDefined();
            expect(MQTT_SERV_OPTIONS.toString()).toContain('MQTT_SERV_OPTIONS');
        });
    });

    describe('MQTT_CLIENT_OPTIONS token', () => {
        it('should be defined', () => {
            expect(MQTT_CLIENT_OPTIONS).toBeDefined();
            expect(MQTT_CLIENT_OPTIONS.toString()).toContain('MQTT_CLIENT_OPTIONS');
        });
    });

    describe('MqttServer', () => {
        it('should exist as a class', () => {
            expect(MqttServer).toBeDefined();
            expect(typeof MqttServer).toBe('function');
        });

        it('merges subscribe routes into mqtt topics', () => {
            const options = mqttTransportFactory({ url: 'mqtt://localhost:1883' }).config as MqttServOptions;
            const injector = createInjector([
                {
                    provide: getServiceRouterToken(options as any),
                    useValue: {
                        formatter: { format: (pattern: any) => String(pattern) },
                        routes: [
                            { pattern: 'sensor/+/start', subscribe: true },
                            { pattern: 'sensor/+/start', subscribe: true },
                            { pattern: 'sensor/ignore', subscribe: false }
                        ]
                    }
                } as any
            ]);
            const server = new MqttServer({ injector } as any, options);

            expect((server as any).resolveSubscribeTopics()).toEqual([
                { topic: 'sensor/+/start', qos: 0 }
            ]);
        });
    });
});
