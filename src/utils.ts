export const resolveDuplicatedPath = (path: string): string => {
    let originPathParts = path.split('/');

    let duplicateIndex = originPathParts.slice(1).indexOf(originPathParts[0]) + 1;

    if (duplicateIndex > originPathParts.length) return path;

    if (
        originPathParts.slice(duplicateIndex, duplicateIndex * 2).join('/') ===
        originPathParts.slice(0, duplicateIndex).join('/')
    ) {
        path = originPathParts.slice(duplicateIndex).join('/');
    }
    return path;
};
