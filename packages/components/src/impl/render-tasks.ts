const renderTasks = new WeakMap<object, Promise<any>[]>();

/** Track an async child component render so its parent render can await it. */
export function trackRenderTask(owner: object, task: Promise<any>): void {
    if (!owner || typeof owner !== 'object') {
        return;
    }
    const tasks = renderTasks.get(owner);
    if (tasks) {
        tasks.push(task);
    } else {
        renderTasks.set(owner, [task]);
    }
}

/** Take and clear pending child render tasks for an owner. */
export function takeRenderTasks(owner: object): Promise<any>[] {
    if (!owner || typeof owner !== 'object') {
        return [];
    }
    const tasks = renderTasks.get(owner);
    renderTasks.delete(owner);
    return tasks || [];
}
