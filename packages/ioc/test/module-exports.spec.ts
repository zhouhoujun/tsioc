import expect = require('expect');
import { Abstract, createInjector, InjectUtil, Injectable, Injector, Module } from '../src';

@Abstract()
abstract class Storage {
    abstract read(): string;
}

@Injectable()
class MemoryStorage extends Storage {
    read(): string {
        return 'memory';
    }
}

@Module({
    providers: [
        { provide: Storage, useClass: MemoryStorage }
    ],
    exports: [
        Storage
    ]
})
class StorageModule { }

describe('module exports', () => {
    let injector: Injector;

    before(async () => {
        injector = createInjector();
        await InjectUtil.useAsync(injector, [StorageModule]);
    });

    after(() => {
        injector.destroy();
    });

    it('does not let an exported abstract token shadow its concrete provider', () => {
        expect(injector.has(Storage)).toBe(true);
        const storage = injector.get(Storage);
        expect(storage).toBeInstanceOf(MemoryStorage);
        expect(storage.read()).toBe('memory');
    });
});
