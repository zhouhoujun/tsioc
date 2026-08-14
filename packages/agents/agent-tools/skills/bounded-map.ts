export async function boundedMap<T, R>(
    values: readonly T[],
    limit: number,
    mapper: (value: T, index: number) => Promise<R>
): Promise<R[]> {
    const results = new Array<R>(values.length);
    let nextIndex = 0;
    const workerCount = Math.min(values.length, Math.max(1, Math.floor(limit) || 1));
    const workers = Array.from({ length: workerCount }, async () => {
        while (nextIndex < values.length) {
            const index = nextIndex++;
            results[index] = await mapper(values[index], index);
        }
    });
    await Promise.all(workers);
    return results;
}
