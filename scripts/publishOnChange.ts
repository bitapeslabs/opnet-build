import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import { execSync, ExecSyncOptions } from 'child_process';

const __dirname = import.meta.dirname;

let versions = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../configs/versions.config.json'), 'utf-8'),
);

const start = async () => {
    let hasMismatch = false;
    for (let packageName of Object.keys(versions)) {
        const installedVersion = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, `../node_modules/${packageName}/package.json`),
                'utf-8',
            ),
        ).version;

        if (installedVersion !== versions[packageName]) {
            hasMismatch = true;
            versions[packageName] = installedVersion;
        }
    }

    if (!hasMismatch) {
        console.log('(publisher) No mismatch found on packages, exiting...');
        return;
    }

    console.log('(publisher) Mismatch found on packages, publishing...');

    let currentPackageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'),
    );
    currentPackageJson.version = currentPackageJson.version
        .split('.')
        .map((v, i) => (i === 2 ? parseInt(v) + 1 : v))
        .join('.');

    fs.writeFileSync(
        path.join(__dirname, '../package.json'),
        JSON.stringify(currentPackageJson, null, 2),
    );

    const execOptions: ExecSyncOptions = {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
    };

    execSync('npm publish --access restricted', execOptions);
    execSync('git add .', execOptions);
    execSync(
        'git commit -m "(bot) automated build - update to @btc-vision/btc-runtime^' +
            versions['@btc-vision/btc-runtime'] +
            '"',
        execOptions,
    );

    execSync('git push -f origin main', execOptions);

    fs.writeFileSync(
        path.join(__dirname, '../configs/versions.config.json'),
        JSON.stringify(versions, null, 2),
    );

    console.log('(publisher) Packges published and pushed to git');
    console.log('(publisher) New version: ' + currentPackageJson.version);
    console.log(
        '(publisher) Webworker CDN: https://cdn.jsdelivr.net/gh/bitapeslabs/opnet-build/dist/webworker-bundle/opnetBuilder.js',
    );
    return;
};

start();
