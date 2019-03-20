import { Next } from './Handle';
import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { ProviderParser, Type, ProviderTypes, isArray, Singleton } from '@ts-ioc/ioc';

@Singleton
export class RegisterModuleProvidersHandle extends AnnoationHandle {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        let parser = ctx.resolve(ProviderParser);
        let container = ctx.moduleContainer;
        let tRef = container.getTypeReflects();
        let config = ctx.annoation;
        let map = parser.parse(...config.providers || []);
        // bind module providers
        container.bindProviders(map);

        let exptypes: Type<any>[] = [].concat(...container.getLoader().getTypes(config.exports || []));
        exptypes.forEach(ty => {
            let classPd = tRef.get(ty);
            map.add(ty, (...pds: ProviderTypes[]) => container.resolve(ty, ...pds));
            if (classPd && isArray(classPd.provides) && classPd.provides.length) {
                classPd.provides.forEach(p => {
                    if (!map.has(p)) {
                        map.add(p, (...pds: ProviderTypes[]) => container.resolve(p, ...pds));
                    }
                });
            }
        });

        ctx.exports = map;

        await next();
    }

}
