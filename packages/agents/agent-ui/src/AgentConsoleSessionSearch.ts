export async function searchSessionContent(
    query: string,
    sessions: any[],
    state: any,
    loadSessionMessages: (sessionId: string) => Promise<any[]>,
    mapWithConcurrency: (items: any[], limit: number, fn: (item: any) => Promise<any>) => Promise<Array<{ result?: { sessionId: string; matched: any[] } }>>,
    concurrency: number
): Promise<Map<string, { count: number; snippet: string }>> {
    const hits = new Map<string, { count: number; snippet: string }>();
    const candidates = sessions.slice(0, state.consoleOptions.searchSessionLimit);
    const results = await mapWithConcurrency(
        candidates,
        concurrency,
        async (session: any) => {
            const messages = await loadSessionMessages(session.id);
            const matched = messages.filter(message => String(message.content || '').toLowerCase().includes(query));
            return { sessionId: session.id, matched };
        }
    );
    for (const entry of results) {
        if (!entry.result || !entry.result.matched.length) {
            continue;
        }
        const first = entry.result.matched[0];
        hits.set(entry.result.sessionId, {
            count: entry.result.matched.length,
            snippet: `[${first.role}] ${state.summarize(String(first.content || ''))}`
        });
    }
    return hits;
}
