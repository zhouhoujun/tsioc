import { ChildProcess, spawn } from 'child_process';
import { Socket } from 'net';

export const MQTT_TEST_HOST = '127.0.0.1';
export const MQTT_TEST_PORT = 18883;
export const MQTT_TEST_URL = `mqtt://${MQTT_TEST_HOST}:${MQTT_TEST_PORT}`;

let brokerProcess: ChildProcess | undefined;
let brokerRefs = 0;
let brokerStart: Promise<void> | undefined;

export async function startMqttBroker(): Promise<void> {
    brokerRefs += 1;
    if (brokerProcess) {
        return;
    }
    if (!brokerStart) {
        brokerStart = launchBroker().catch(err => {
            brokerStart = undefined;
            brokerRefs = Math.max(0, brokerRefs - 1);
            throw err;
        });
    }
    await brokerStart;
}

export async function stopMqttBroker(): Promise<void> {
    brokerRefs = Math.max(0, brokerRefs - 1);
    if (brokerRefs > 0) {
        return;
    }
    brokerStart = undefined;
    const child = brokerProcess;
    brokerProcess = undefined;
    if (!child) {
        return;
    }
    await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) {
                return;
            }
            settled = true;
            resolve();
        };
        child.once('exit', finish);
        child.once('error', finish);
        child.kill('SIGTERM');
        const timeout = setTimeout(() => {
            child.kill('SIGKILL');
            finish();
        }, 2000);
        if (typeof (timeout as any).unref === 'function') {
            (timeout as any).unref();
        }
    });
}

async function launchBroker(): Promise<void> {
    const child = spawn('/usr/sbin/mosquitto', ['-p', String(MQTT_TEST_PORT)], {
        stdio: 'ignore'
    });
    if (typeof child.unref === 'function') {
        child.unref();
    }
    brokerProcess = child;

    await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (err?: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            child.off('exit', onExit);
            child.off('error', onError);
            if (timer) {
                clearTimeout(timer);
            }
            err ? reject(err) : resolve();
        };
        const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
            finish(new Error(`mosquitto exited before ready (code=${code}, signal=${signal})`));
        };
        const onError = (err: Error) => finish(err);
        const timer = setTimeout(() => {
            finish(new Error('Timed out waiting for mosquitto to accept connections'));
        }, 5000);
        if (typeof (timer as any).unref === 'function') {
            (timer as any).unref();
        }

        child.once('exit', onExit);
        child.once('error', onError);
        waitForPort().then(() => finish(), finish);
    });
}

function waitForPort(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const deadline = Date.now() + 5000;
        const probe = () => {
            const socket = new Socket();
            const cleanup = () => {
                socket.removeAllListeners();
                socket.destroy();
            };
            socket.once('connect', () => {
                cleanup();
                resolve();
            });
            socket.once('error', () => {
                cleanup();
                if (Date.now() >= deadline) {
                    reject(new Error('Timed out waiting for MQTT broker port'));
                    return;
                }
                const retry = setTimeout(probe, 100);
                if (typeof (retry as any).unref === 'function') {
                    (retry as any).unref();
                }
            });
            socket.connect(MQTT_TEST_PORT, MQTT_TEST_HOST);
        };
        probe();
    });
}
