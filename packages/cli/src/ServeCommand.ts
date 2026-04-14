#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as chalk from 'chalk';

/**
 * Serve command options.
 * 预览服务命令选项
 */
export interface ServeOptions {
    /** Port to listen on */
    port?: number;
    /** Host to bind to */
    host?: string;
    /** Root directory to serve */
    root?: string;
    /** Component preview entry file */
    entry?: string;
    /** Enable hot reload */
    watch?: boolean;
    /** Open browser automatically */
    open?: boolean;
    /** Enable CORS */
    cors?: boolean;
    /** Index HTML file */
    index?: string;
    /** TypeScript config file */
    tsconfig?: string;
    /** Debug mode */
    debug?: boolean;
    /** Configuration file path */
    config?: string;
}

/**
 * Serve command handler.
 * 预览服务命令处理器
 */
export async function handleServe(options: ServeOptions, processRoot: string): Promise<void> {
    const port = options.port || 3000;
    const host = options.host || 'localhost';
    const root = path.isAbsolute(options.root || '') 
        ? options.root! 
        : path.join(processRoot, options.root || 'lib');
    const indexFile = options.index || 'index.html';

    console.log(chalk.gray('Starting preview server...'));

    if (!fs.existsSync(root)) {
        console.log(chalk.yellow(`Root directory ${root} does not exist. Creating...`));
        fs.mkdirSync(root, { recursive: true });
    }

    // Check for component preview entry
    const entryFile = options.entry || findComponentEntry(processRoot);
    if (entryFile && !fs.existsSync(path.join(processRoot, entryFile))) {
        console.log(chalk.yellow(`Entry file ${entryFile} not found`));
    }

    // Create preview HTML if needed
    const indexPath = path.join(root, indexFile);
    if (!fs.existsSync(indexPath)) {
        createPreviewHtml(indexPath, entryFile);
        console.log(chalk.gray(`Created preview HTML at ${indexPath}`));
    }

    // Start HTTP server
    const server = createServer(root, options);

    server.listen(port, host, () => {
        console.log(chalk.green(`Preview server running at http://${host}:${port}`));
        console.log(chalk.gray(`Serving files from: ${root}`));

        if (options.open) {
            openBrowser(`http://${host}:${port}`);
        }

        if (options.watch) {
            startWatchMode(processRoot, root, options);
        }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log(chalk.gray('\nShutting down server...'));
        server.close();
        process.exit(0);
    });
}

/**
 * Find component entry file.
 * 查找组件入口文件
 */
function findComponentEntry(processRoot: string): string | null {
    const candidates = [
        'src/index.ts',
        'src/main.ts',
        'src/app.ts',
        'lib/index.js',
        'lib/main.js',
        'lib/app.js'
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(path.join(processRoot, candidate))) {
            return candidate;
        }
    }

    return null;
}

/**
 * Create preview HTML file.
 * 创建预览 HTML 文件
 */
function createPreviewHtml(indexPath: string, entryFile: string | null): void {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Component Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .preview-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .preview-header {
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            font-size: 24px;
            margin: 0;
        }
        #preview-root {
            min-height: 200px;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-header">
            <h1>@tsdi/components Preview</h1>
        </div>
        <div id="preview-root">
            <p>Loading component...</p>
        </div>
    </div>
    <script src="${entryFile ? path.basename(entryFile.replace(/\.ts$/, '.js')) : 'index.js'}"></script>
    <script>
        if (typeof window !== 'undefined' && window.runPreview) {
            window.runPreview(document.getElementById('preview-root'));
        }
    </script>
</body>
</html>`;

    fs.writeFileSync(indexPath, htmlContent);
}

/**
 * Create HTTP server.
 * 创建 HTTP 服务器
 */
function createServer(root: string, options: ServeOptions): http.Server {
    const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ts': 'text/plain'
    };

    return http.createServer((req, res) => {
        const url = req.url || '/';
        let filePath = path.join(root, url === '/' ? options.index || 'index.html' : url);

        if (!fs.existsSync(filePath)) {
            if (fs.existsSync(path.join(root, 'index.html'))) {
                filePath = path.join(root, 'index.html');
            } else {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
        }

        const ext = path.extname(filePath);
        const mimeType = mimeTypes[ext] || 'application/octet-stream';

        if (options.cors) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        }

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Internal Server Error');
                return;
            }

            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(data);
        });
    });
}

/**
 * Open browser.
 * 打开浏览器
 */
function openBrowser(url: string): void {
    const { exec } = require('child_process');
    const platform = process.platform;

    let command: string;
    if (platform === 'darwin') {
        command = `open ${url}`;
    } else if (platform === 'win32') {
        command = `start ${url}`;
    } else {
        command = `xdg-open ${url}`;
    }

    exec(command, (error: Error | null) => {
        if (error) {
            console.log(chalk.yellow(`Could not open browser: ${error.message}`));
        }
    });
}

/**
 * Start watch mode for hot reload.
 * 启动监视模式实现热重载
 */
function startWatchMode(processRoot: string, root: string, options: ServeOptions): void {
    const chokidarPath = path.join(processRoot, 'node_modules/chokidar');
    const srcDir = path.join(processRoot, 'src');

    if (!fs.existsSync(srcDir)) {
        console.log(chalk.yellow('Source directory not found for watch mode'));
        return;
    }

    if (fs.existsSync(chokidarPath)) {
        const chokidar = require(chokidarPath);
        const watcher = chokidar.watch(srcDir, {
            ignored: /(^|[\/\\])\../,
            persistent: true
        });

        console.log(chalk.gray('Watch mode enabled. File changes will trigger rebuild...'));

        watcher.on('change', async (filePath: string) => {
            console.log(chalk.blue(`File changed: ${filePath}`));

            const relativePath = path.relative(srcDir, filePath);
            const outFile = path.join(root, relativePath.replace(/\.ts$/, '.js'));

            try {
                const esbuildPath = path.join(processRoot, 'node_modules/esbuild');
                if (fs.existsSync(esbuildPath)) {
                    const esbuild = require(esbuildPath);
                    await esbuild.build({
                        entryPoints: [filePath],
                        outfile: outFile,
                        format: 'iife',
                        platform: 'browser',
                        target: 'es2020',
                        bundle: true,
                        sourcemap: true,
                        write: true
                    });
                    console.log(chalk.green(`Rebuilt: ${relativePath}`));
                }
            } catch (error) {
                console.error(chalk.red(`Build error: ${(error as Error).message}`));
            }
        });
    } else {
        console.log(chalk.yellow('chokidar not installed. Watch mode disabled.'));
    }
}