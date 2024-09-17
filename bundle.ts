import fs from 'fs';
import path from 'path';

const start = async () => {
    const { packages }: { packages: string[] } = JSON.parse(
        fs.readFileSync('bdconfig.json', 'utf-8'),
    );

    let bundle = {};

    for (let packageRoot of packages) {
        const rootFolder = 'node_modules/' + packageRoot;

        //recursively read all files in the root folder and save their path to bundle object

        const readFiles = (folderPath: string) => {
            const files = fs.readdirSync(folderPath);
            for (let file of files) {
                const path = folderPath + '/' + file;
                if (fs.lstatSync(path).isDirectory()) {
                    readFiles(path);
                } else {
                    bundle['./' + path] = Buffer.from(fs.readFileSync(path, 'utf-8')).toString(
                        'base64',
                    );
                }
            }
        };

        readFiles(rootFolder);
    }

    fs.writeFileSync('./src/runtime.ts', 'export default ' + JSON.stringify(bundle, null, 2));

    console.log('Bundle built! Check ./src/runtime.ts');
    return;
};

start();
