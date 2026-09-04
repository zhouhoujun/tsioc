import * as http from 'http';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import {
    COMMAND_EXCHANGE_STORE, CommandExchangeStore,
    CommandExchangeRecord, CommandExchangePageOptions
} from '@tsdi/agent';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { getRequestPrincipalId } from '../auth/AuthMiddleware';
import { SessionOwnerStore } from '../auth/SessionOwnerStore';
import { redactCommandExchangeRecord } from './command-exchange-redact';

@Injectable()
export class CommandExchangeHandler {
    constructor(
        @Optional() @Inject(COMMAND_EXCHANGE_STORE) private store?: CommandExchangeStore | null,
        private owners?: SessionOwnerStore | null
    ) {
    }

    getRoutes(): GatewayRoute[] {
        if (!this.store) return [];
        const store = this.store;

        const append: RouteHandler = async (req, res) => {
            const body = await readBody(req);
            const sessionId = body?.sessionId;
            if (!sessionId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'sessionId required' }));
                return;
            }
            const principal = getRequestPrincipalId(req);
            if (this.owners && !await this.owners.isOwner(sessionId, principal)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            const { sessionEpoch = 0, kind = 'command', key = '', content = '', sequence = 0, attempt, receipt, requestId, status, durationMs, toolCallId, command, args, outputIds, error, retryable, source, timestamp } = body ?? {};
            const record: Omit<CommandExchangeRecord, 'seq'> = {
                id: body?.id || `cmdex:${sessionId}:${Date.now()}`,
                sessionId,
                sessionEpoch: Number(sessionEpoch) || 0,
                kind: String(kind),
                key: String(key),
                content: String(content),
                sequence: Number(sequence) || 0,
                attempt: attempt != null ? Number(attempt) : undefined,
                receipt: receipt != null ? String(receipt) : undefined,
                requestId: requestId != null ? String(requestId) : undefined,
                status: status != null ? String(status) : undefined,
                durationMs: durationMs != null ? Number(durationMs) : undefined,
                toolCallId: toolCallId != null ? String(toolCallId) : undefined,
                command: command != null ? String(command) : undefined,
                args: args != null ? String(args) : undefined,
                outputIds: Array.isArray(outputIds) ? outputIds.map(String) : undefined,
                error: error != null ? String(error) : undefined,
                retryable: retryable != null ? Boolean(retryable) : undefined,
                source: source != null ? String(source) : undefined,
                timestamp: Number(timestamp) || Date.now()
            };
            const saved = await store.append(record);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(redactCommandExchangeRecord(saved)));
        };

        const query: RouteHandler = async (req, res) => {
            const url = new URL(req.url || '/', 'http://gateway.local');
            const sessionId = url.searchParams.get('sessionId') || '';
            if (!sessionId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'sessionId required' }));
                return;
            }
            const principal = getRequestPrincipalId(req);
            if (this.owners && !await this.owners.isOwner(sessionId, principal)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            const options: CommandExchangePageOptions = {};
            if (url.searchParams.has('cursor')) options.cursor = url.searchParams.get('cursor')!;
            if (url.searchParams.has('sinceSeq')) options.sinceSeq = Number(url.searchParams.get('sinceSeq'));
            if (url.searchParams.has('limit')) options.limit = Number(url.searchParams.get('limit'));
            const page = await store.query(sessionId, options);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                ...page,
                records: page.records.map(redactCommandExchangeRecord)
            }));
        };

        const replay: RouteHandler = async (req, res) => {
            const url = new URL(req.url || '/', 'http://gateway.local');
            const sessionId = url.searchParams.get('sessionId') || '';
            if (!sessionId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'sessionId required' }));
                return;
            }
            const principal = getRequestPrincipalId(req);
            if (this.owners && !await this.owners.isOwner(sessionId, principal)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            const sinceSeq = url.searchParams.has('sinceSeq') ? Number(url.searchParams.get('sinceSeq')) : undefined;
            const records = await store.replay(sessionId, sinceSeq);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ records: records.map(redactCommandExchangeRecord) }));
        };

        const cleanup: RouteHandler = async (req, res) => {
            const body = await readBody(req);
            const sessionId = body?.sessionId;
            const beforeSeq = body?.beforeSeq;
            if (!sessionId || typeof beforeSeq !== 'number') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'sessionId and beforeSeq required' }));
                return;
            }
            const principal = getRequestPrincipalId(req);
            if (this.owners && !await this.owners.isOwner(sessionId, principal)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'forbidden' }));
                return;
            }
            const deleted = await store.cleanup(sessionId, beforeSeq);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ deleted }));
        };

        return [
            { method: 'POST', path: '/api/command-exchange/append', handler: append },
            { method: 'GET', path: '/api/command-exchange', handler: query },
            { method: 'GET', path: '/api/command-exchange/replay', handler: replay },
            { method: 'POST', path: '/api/command-exchange/cleanup', handler: cleanup }
        ];
    }
}

async function readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (!raw) { resolve(undefined); return; }
            try { resolve(JSON.parse(raw)); }
            catch { resolve(undefined); }
        });
        req.on('error', reject);
    });
}