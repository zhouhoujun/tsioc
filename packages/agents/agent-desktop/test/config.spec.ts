import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DEFAULT_DESKTOP_OPTIONS, resolveDesktopConfig } from '../src';

@Suite('Agent desktop config')
export class AgentDesktopConfigTest {
    @Test('applies defaults when argv and env are empty')
    defaults() {
        const config = resolveDesktopConfig([], {});
        expect(config.gatewayUrl).toEqual('http://127.0.0.1:3000');
        expect(config.title).toEqual('TSDI Agent');
        expect(config.width).toEqual(1200);
        expect(config.height).toEqual(800);
        expect(config.tray).toEqual(true);
        expect(config.closeToTray).toEqual(true);
        expect(config.singleInstance).toEqual(true);
        expect(config.token).toEqual('');
    }

    @Test('parses argv flags and normalizes the gateway URL')
    argv() {
        const config = resolveDesktopConfig([
            '--gateway-url=https://gw.example/',
            '--token=tok-1',
            '--session-id=sess-1',
            '--workspace=/ws/proj',
            '--width=1000',
            '--height=700',
            '--title=My Agent'
        ], {});
        expect(config.gatewayUrl).toEqual('https://gw.example');
        expect(config.token).toEqual('tok-1');
        expect(config.sessionId).toEqual('sess-1');
        expect(config.workspace).toEqual('/ws/proj');
        expect(config.width).toEqual(1000);
        expect(config.height).toEqual(700);
        expect(config.title).toEqual('My Agent');
    }

    @Test('falls back to env vars when argv is absent and argv wins over env')
    envPrecedence() {
        const env = {
            TSDI_AGENT_GATEWAY_URL: 'http://env.example:3100',
            TSDI_AGENT_TOKEN: 'env-token',
            TSDI_AGENT_SESSION_ID: 'env-session',
            TSDI_AGENT_WIDTH: '900'
        };
        const fromEnv = resolveDesktopConfig([], env);
        expect(fromEnv.gatewayUrl).toEqual('http://env.example:3100');
        expect(fromEnv.token).toEqual('env-token');
        expect(fromEnv.sessionId).toEqual('env-session');
        expect(fromEnv.width).toEqual(900);

        const argvWins = resolveDesktopConfig(['--token=argv-token'], env);
        expect(argvWins.token).toEqual('argv-token');
        expect(argvWins.gatewayUrl).toEqual('http://env.example:3100');
    }

    @Test('rejects non-http gateway URLs at resolution time')
    invalidGateway() {
        expect(() => resolveDesktopConfig(['--gateway-url=ws://socket'], {})).toThrow(/http:\/\/ or https:\/\//);
    }

    @Test('parses boolean flags and invalid numbers fall back to defaults')
    booleansAndNumbers() {
        const config = resolveDesktopConfig([
            '--tray=false',
            '--close-to-tray=false',
            '--start-hidden=true',
            '--width=abc'
        ], {});
        expect(config.tray).toEqual(false);
        expect(config.closeToTray).toEqual(false);
        expect(config.startHidden).toEqual(true);
        expect(config.width).toEqual(DEFAULT_DESKTOP_OPTIONS.width);
    }

    @Test('--no-single-instance disables the single instance lock')
    singleInstanceFlag() {
        expect(resolveDesktopConfig(['--no-single-instance'], {}).singleInstance).toEqual(false);
        expect(resolveDesktopConfig([], {}).singleInstance).toEqual(true);
    }
}
