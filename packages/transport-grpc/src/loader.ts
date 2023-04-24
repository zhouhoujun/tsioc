import { GrpcObject } from '@grpc/grpc-js';
import { Options, PackageDefinition } from '@grpc/proto-loader';
import { Abstract, lang } from '@tsdi/ioc';
import { INamespace } from 'protobufjs';


@Abstract()
export abstract class DefinitionLoader {
    abstract load(filename: string | string[], options?: Options): Promise<PackageDefinition>;
    abstract fromJSON(json: INamespace, options?: Options): PackageDefinition
    abstract FromBuffer(descriptorSet: Buffer, options?: Options): Promise<PackageDefinition>;


    public lookupPackage(root: GrpcObject, packageName: string) {
        let pkg = root;

        if (packageName) {
            for (const name of packageName.split('.')) {
                pkg = pkg[name] as GrpcObject;
            }
        }

        return pkg;
    }

    getSevices(pkg: GrpcObject): { name: string, service: any }[] {
        const services: { name: string, service: any }[] = [];
        lang.deepIn(pkg, (name, defi) => {
            if (defi.service) {
                services.push({
                    name,
                    service: defi
                })
            }
        })
        return services;
    }

}
