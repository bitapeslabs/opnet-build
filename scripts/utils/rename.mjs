import fs from 'fs/promises';
import path from 'path';

const [, , src, dest] = process.argv;

if (!src || !dest) {
    console.error('Usage: node renameFile.mjs <source> <destination>');
    process.exit(1);
}

try {
    const resolvedSrc = path.resolve(src);
    const resolvedDest = path.resolve(dest);

    await fs.rename(resolvedSrc, resolvedDest);
    console.log(`✅ Renamed:\n  ${resolvedSrc}\n→ ${resolvedDest}`);
} catch (err) {
    console.log('Skipping file ' + src + " because it doesn't exist or is not a file.");
}
