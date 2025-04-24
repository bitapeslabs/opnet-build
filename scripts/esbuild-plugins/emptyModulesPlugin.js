export function emptyModulesPlugin(modulesToEmpty) {
    return {
        name: 'empty-modules',
        setup(build) {
            for (const mod of modulesToEmpty) {
                build.onResolve({ filter: new RegExp(`^${mod}$`) }, () => ({
                    path: mod,
                    namespace: 'empty-modules',
                }));
            }

            build.onLoad({ filter: /.*/, namespace: 'empty-modules' }, () => ({
                contents: 'export default {};',
            }));
        },
    };
}
