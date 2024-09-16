// Save this as bundle.js

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Set of processed files to prevent duplicates
const processedFiles = new Set();
// Set of top-level declared identifiers to prevent duplicates
const declaredIdentifiers = new Set();

const ignoreBundler = process.argv.includes('--ignore-bundler');

function isStdLibModule(moduleName) {
    return (
        moduleName.startsWith('~lib/') ||
        [
            'arraybuffer',
            'string',
            'console',
            'math',
            'number',
            'util/number',
            'util/string',
            'index',
            // Add other standard library or third-party modules as needed
            'as-bignum',
            'bigint',
        ].includes(moduleName)
    );
}

function resolveModule(moduleName, containingFile) {
    if (isStdLibModule(moduleName)) {
        return null; // Do not resolve standard library modules
    }

    const result = ts.nodeModuleNameResolver(
        moduleName,
        containingFile,
        {
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            target: ts.ScriptTarget.ESNext,
            baseUrl: './',
        },
        ts.sys,
    );

    if (result.resolvedModule) {
        return path.normalize(result.resolvedModule.resolvedFileName);
    } else {
        // Try appending '.ts' extension
        const possiblePath = path.resolve(path.dirname(containingFile), moduleName + '.ts');
        if (fs.existsSync(possiblePath)) {
            return path.normalize(possiblePath);
        }
        throw new Error(`Cannot resolve module '${moduleName}' from '${containingFile}'`);
    }
}

function processFile(filePath) {
    filePath = path.resolve(filePath);
    if (processedFiles.has(filePath)) {
        return ''; // File already processed
    }
    processedFiles.add(filePath);

    const code = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
        filePath,
        code,
        ts.ScriptTarget.ESNext,
        /* setParentNodes */ true,
    );

    let importCode = '';
    let moduleCode = '';

    function visit(node, isTopLevel) {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            if (node.moduleSpecifier) {
                const moduleName = node.moduleSpecifier.text;
                const resolvedPath = resolveModule(moduleName, filePath);
                if (resolvedPath) {
                    // Process imports first
                    importCode += processFile(resolvedPath);
                } else {
                    // Keep the import/export statement as is for standard library modules
                    moduleCode += node.getFullText();
                }
            } else {
                // Export without module specifier
                moduleCode += node.getFullText();
            }
        } else if (
            ts.isFunctionDeclaration(node) ||
            ts.isClassDeclaration(node) ||
            ts.isInterfaceDeclaration(node) ||
            ts.isTypeAliasDeclaration(node)
        ) {
            const identifier = node.name ? node.name.text : null;
            if (isTopLevel) {
                if (identifier && declaredIdentifiers.has(identifier)) {
                    // Skip duplicate declaration
                    return;
                }
                if (identifier) {
                    declaredIdentifiers.add(identifier);
                }
            }
            // Remove 'export' modifier from the declaration using regex
            let text = node.getFullText().replace(/\bexport\s+/, '');

            moduleCode += text;
            // No need to recurse into child nodes
        } else if (ts.isVariableStatement(node)) {
            if (isTopLevel) {
                const declarations = node.declarationList.declarations;
                let hasDuplicate = false;
                for (const decl of declarations) {
                    const identifier = decl.name ? decl.name.text : null;
                    if (identifier && declaredIdentifiers.has(identifier)) {
                        // Skip this variable declaration
                        hasDuplicate = true;
                        break;
                    }
                }
                if (!hasDuplicate) {
                    for (const decl of declarations) {
                        const identifier = decl.name ? decl.name.text : null;
                        if (identifier) {
                            declaredIdentifiers.add(identifier);
                        }
                    }
                    // Remove 'export' modifier from the variable statement using regex
                    let text = node.getFullText().replace(/\bexport\s+/, '');

                    moduleCode += text;
                }
                // If there's a duplicate, we skip this VariableStatement entirely
            } else {
                // Inside a function or other scope, include all variable declarations
                // Remove 'export' modifier if present
                let text = node.getFullText().replace(/\bexport\s+/, '');
                moduleCode += text;
            }
            // No need to recurse into child nodes
        } else {
            moduleCode += node.getFullText();
            // No need to recurse into child nodes
        }
    }

    ts.forEachChild(sourceFile, (node) => visit(node, true));

    const outputCode = importCode + moduleCode;
    return outputCode;
}

function bundle(entryFile) {
    try {
        const code = !ignoreBundler ? processFile(entryFile) : fs.readFileSync(entryFile, 'utf8');
        const defaultBuildPath = path.join(__dirname, 'assembly');

        const extension = process.argv.includes('--ts') ? 'ts' : 'txt';
        const usePath = path.join(defaultBuildPath, 'build.' + extension);

        fs.writeFileSync(
            usePath,
            extension === 'txt' ? Buffer.from(code, 'utf8').toString('base64') : code,
            'utf8',
        );
        console.log(`Bundled to ${usePath}`);
    } catch (error) {
        console.error(error.message);
    }
}

// Usage: node bundle.js <entryFile> <outFile>
const [, , entryFile] = process.argv;

if (!entryFile) {
    console.error('Usage: node bundle.js <entryFile> <optional: --ts>');
    process.exit(1);
}

bundle(entryFile);
