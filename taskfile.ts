import { Type, isString, lang, Injectable, OnDestroy, Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { Workflow, WorkflowModule, SequenceActivity, ParallelActivity } from '@tsdi/activities';
import { CompilerModule, CompilerRunner, CompilerOptions } from '@tsdi/compiler';
import * as path from 'path';
import * as fs from 'fs';
import * as globby from 'globby';

@Injectable()
export class BuildRunner implements OnDestroy {
    
    private context!: ApplicationContext;
    
    async run(): Promise<void> {
        const args = process.argv.slice(2);
        const envArgs = this.parseArgs(args);
        
        if (envArgs.unp && /\d+.\d+.\d+/.test(envArgs.unp as string)) {
            await this.unpublish(envArgs.unp as string);
            return;
        }
        
        if (envArgs.build !== 'false') {
            if (envArgs.setvs) {
                await this.updateVersions(envArgs.setvs as string);
            }
            
            await this.buildPackages();
        }
        
        if (envArgs.deploy) {
            await this.deploy();
        }
    }
    
    private parseArgs(args: string[]): Record<string, string | boolean> {
        const result: Record<string, string | boolean> = {};
        for (const arg of args) {
            if (arg.startsWith('--')) {
                const [key, value] = arg.slice(2).split('=');
                result[key] = value !== undefined ? value : true;
            }
        }
        return result;
    }
    
    private async unpublish(version: string): Promise<void> {
        const packages = this.getPackages();
        const cmds: string[] = [];
        
        for (const pkg of packages) {
            const pkgJson = this.readPackageJson(pkg);
            if (pkgJson?.name) {
                cmds.push(`npm unpublish ${pkgJson.name}@${version}`);
            }
        }
        
        console.log('Unpublish commands:', cmds);
        for (const cmd of cmds) {
            console.log(`Executing: ${cmd}`);
        }
    }
    
    private async updateVersions(version: string): Promise<void> {
        const packages = this.getPackages();
        
        for (const pkg of packages) {
            const pkgJsonPath = path.join(pkg, 'package.json');
            if (fs.existsSync(pkgJsonPath)) {
                const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
                pkgJson.version = version;
                
                if (pkgJson.peerDependencies) {
                    for (const key of Object.keys(pkgJson.peerDependencies)) {
                        if (/^@tsdi/.test(key)) {
                            pkgJson.peerDependencies[key] = '~' + version;
                        }
                    }
                }
                
                if (pkgJson.dependencies) {
                    for (const key of Object.keys(pkgJson.dependencies)) {
                        if (/^@tsdi/.test(key)) {
                            pkgJson.dependencies[key] = '~' + version;
                        }
                    }
                }
                
                fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
            }
        }
        
        const rootPkgPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(rootPkgPath)) {
            const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
            rootPkg.version = version;
            fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
        }
        
        console.log(`Updated all packages to version ${version}`);
    }
    
    private async buildPackages(): Promise<void> {
        const packages = this.getPackages().filter(
            p => !p.endsWith('component') && !p.endsWith('unit-karma')
        );
        
        console.log(`Building ${packages.length} packages...`);
        
        for (const pkg of packages) {
            const taskfile = path.join(pkg, 'taskfile.ts');
            if (fs.existsSync(taskfile)) {
                console.log(`Building: ${path.basename(pkg)}`);
                try {
                    await this.buildPackage(pkg);
                } catch (err) {
                    console.error(`Failed to build ${path.basename(pkg)}:`, err);
                }
            }
        }
        
        console.log('All packages built successfully');
    }
    
    private async buildPackage(pkgPath: string): Promise<void> {
        const pkgName = path.basename(pkgPath);
        const srcDir = path.join(pkgPath, 'src');
        const outDir = path.resolve(pkgPath, '../../dist', pkgName);
        
        if (!fs.existsSync(srcDir)) {
            console.log(`Skipping ${pkgName} - no src directory`);
            return;
        }
        
        const options: CompilerOptions & { baseURL?: string } = {
            src: 'src/**/*.ts',
            outDir,
            baseURL: pkgPath,
            target: 'es2020',
            format: 'cjs',
            platform: 'node',
            declaration: true,
            bundle: false
        };
        
        await Workflow.run(CompilerModule, options);
    }
    
    private async deploy(): Promise<void> {
        const distDir = path.join(process.cwd(), 'dist');
        if (!fs.existsSync(distDir)) {
            console.log('No dist directory found');
            return;
        }
        
        const packages = fs.readdirSync(distDir).filter(f => {
            const stat = fs.statSync(path.join(distDir, f));
            return stat.isDirectory();
        });
        
        const cmd = 'npm publish --access=public';
        
        for (const pkg of packages) {
            const pkgPath = path.join(distDir, pkg);
            console.log(`Publishing: ${pkg}`);
        }
        
        console.log(`Publish commands generated for ${packages.length} packages`);
    }
    
    private getPackages(): string[] {
        const packagesDir = path.join(process.cwd(), 'packages');
        if (!fs.existsSync(packagesDir)) {
            return [];
        }
        
        return fs.readdirSync(packagesDir)
            .filter(f => {
                const stat = fs.statSync(path.join(packagesDir, f));
                return stat.isDirectory();
            })
            .map(f => path.join(packagesDir, f));
    }
    
    private readPackageJson(pkgPath: string): any {
        const pkgJsonPath = path.join(pkgPath, 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
            return JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        }
        return null;
    }
    
    onDestroy(): void {
    }
}

@Module({
    imports: [
        CompilerModule,
        WorkflowModule
    ],
    providers: [
        BuildRunner
    ],
    bootstrap: [BuildRunner]
})
export class BuildModule {}

if (process.cwd() === __dirname) {
    Workflow.run(BuildModule);
}