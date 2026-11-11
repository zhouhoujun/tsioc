import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateContract, importOpenApi, importProto, MicroserviceContract } from './index';

interface CliOptions {
    manifest: string;
    outDir: string;
    dto?: string;
    openapi?: string;
    proto?: string;
    decorators?: boolean;
    dtoStyle?: 'class' | 'interface';
    protoPackage?: string;
    check: boolean;
    fromOpenApi?: string;
    fromProto?: string;
    manifestOut?: string;
}

function usage(): void {
    console.log(`Usage: npm run generate -- <contract.json> [options]

Options:
  --out <dir>        output directory (default: contract)
  --dto <file>       DTO output path (default: <out>/dto.ts)
  --openapi <file>   OpenAPI output path (default: <out>/openapi.json)
  --proto <file>     proto output path (default: <out>/<name>.proto)
  --decorators       add @ApiModelProperty decorators to DTO classes
  --interface        generate interfaces instead of classes
  --proto-package <pkg>  override the proto package
  --from-openapi <file>  import an OpenAPI 3 document into a manifest
  --from-proto <file>    import a proto3 file into a manifest
  --manifest <file>      imported manifest output (default: <name>.contract.json)
  --check            fail when generated files differ from disk
  --help             show this help
`);
}

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        manifest: '',
        outDir: 'contract',
        check: false
    };
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        switch (arg) {
            case '--help':
            case '-h':
                usage();
                process.exit(0);
                break;
            case '--out':
                options.outDir = argv[++index] ?? options.outDir;
                break;
            case '--dto':
                options.dto = argv[++index];
                break;
            case '--openapi':
                options.openapi = argv[++index];
                break;
            case '--proto':
                options.proto = argv[++index];
                break;
            case '--decorators':
                options.decorators = true;
                break;
            case '--interface':
                options.dtoStyle = 'interface';
                break;
            case '--proto-package':
                options.protoPackage = argv[++index];
                break;
            case '--from-openapi':
                options.fromOpenApi = argv[++index];
                break;
            case '--from-proto':
                options.fromProto = argv[++index];
                break;
            case '--manifest':
                options.manifestOut = argv[++index];
                break;
            case '--check':
                options.check = true;
                break;
            default:
                if (!arg.startsWith('-') && !options.manifest) {
                    options.manifest = arg;
                }
                break;
        }
    }
    return options;
}

function writeOrCheck(file: string, content: string, check: boolean): boolean {
    const absolute = path.resolve(file);
    if (check) {
        const existing = fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf-8') : undefined;
        if (existing !== content) {
            console.error(`contract drift: ${absolute}`);
            return false;
        }
        console.log(`contract ok: ${absolute}`);
        return true;
    }
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content, 'utf-8');
    console.log(`wrote ${absolute}`);
    return true;
}

function importManifest(options: CliOptions): void {
    const source = options.fromOpenApi || options.fromProto!;
    const content = fs.readFileSync(path.resolve(source), 'utf-8');
    const contract = options.fromOpenApi
        ? importOpenApi(JSON.parse(content))
        : importProto(content);
    const manifest = `${JSON.stringify(contract, null, 2)}\n`;
    const target = path.resolve(options.manifestOut || options.manifest || `${contract.name}.contract.json`);
    if (!writeOrCheck(target, manifest, options.check)) {
        process.exit(1);
    }
}

function main(): void {
    const options = parseArgs(process.argv.slice(2));
    if (options.fromOpenApi || options.fromProto) {
        importManifest(options);
        return;
    }
    if (!options.manifest) {
        usage();
        process.exit(1);
    }
    const manifestPath = path.resolve(options.manifest);
    const contract = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as MicroserviceContract;
    const generated = generateContract(contract, {
        decorators: options.decorators,
        dtoStyle: options.dtoStyle,
        protoPackage: options.protoPackage
    });
    const outDir = path.resolve(options.outDir);
    const dtoFile = options.dto ?? path.join(outDir, 'dto.ts');
    const openapiFile = options.openapi ?? path.join(outDir, 'openapi.json');
    const protoFile = options.proto ?? path.join(outDir, `${contract.name}.proto`);
    const openapi = `${JSON.stringify(generated.openapi, null, 2)}\n`;
    const ok = [
        writeOrCheck(dtoFile, generated.dto, options.check),
        writeOrCheck(openapiFile, openapi, options.check),
        writeOrCheck(protoFile, generated.proto, options.check)
    ].every(Boolean);
    if (!ok) {
        process.exit(1);
    }
}

main();
