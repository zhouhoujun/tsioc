export async function loadLocalTodoPlan(
    sessionId: string,
    toolRegistry: any,
    state: any,
    normalizeTodoStatus: (status: unknown) => string
): Promise<any[]> {
    if (!sessionId || !toolRegistry || typeof toolRegistry.invoke !== 'function') {
        return [];
    }
    try {
        const output = await toolRegistry.invoke('todo', undefined, sessionId, undefined, state.workspace);
        return Array.isArray(output?.todos)
            ? output.todos.map((item: any) => ({
                id: String(item?.id || '').trim(),
                content: String(item?.content || '').trim(),
                status: normalizeTodoStatus(item?.status)
            })).filter((item: any) => !!item.id && !!item.content)
            : [];
    } catch {
        return [];
    }
}
