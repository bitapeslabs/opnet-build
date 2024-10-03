import fs from 'fs';
import path from 'path';

interface IPackage {
    path: string;
    resolveTo: string;
}

const __dirname = import.meta.dirname;

const start = async () => {
    const { packages }: { packages: IPackage[] } = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../configs/bundler.config.json'), 'utf-8'),
    );

    let bundle = {};

    for (let packageRoot of packages) {
        const { path: rootFolder, resolveTo } = packageRoot;

        //recursively read all files in the root folder and save their path to bundle object

        const readFiles = (folderPath: string) => {
            const files = fs.readdirSync(folderPath);
            for (let file of files) {
                const path = folderPath + '/' + file;
                if (fs.lstatSync(path).isDirectory()) {
                    readFiles(path);
                } else {
                    const finalPath = path.replace(rootFolder, resolveTo);
                    bundle[finalPath] = Buffer.from(fs.readFileSync(path, 'utf-8')).toString(
                        'base64',
                    );
                }
            }
        };

        readFiles(rootFolder);
    }

    fs.writeFileSync(
        path.join(__dirname, '../src/runtime-bundle/runtime.ts'),
        'export default ' + JSON.stringify(bundle, null, 2),
    );

    console.log('(bundler) built runtime.ts with latest version of opnet runtime');
    return;
};

start();
