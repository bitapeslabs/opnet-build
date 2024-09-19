// emptyModulesPlugin.js
export default function emptyModulesPlugin(modules = []) {
    const emptyModuleIds = new Set(modules);

    return {
        name: 'resolve-empty-modules',

        resolveId(source) {
            if (emptyModuleIds.has(source)) {
                // Return a virtual module ID for the empty modules
                return '\0empty:' + source;
            }
            return null; // Let other modules resolve as usual
        },

        load(id) {
            if (id.startsWith('\0empty:')) {
                // Provide an empty module for the specified modules
                return 'export default {};';
            }
            return null; // Let other modules load as usual
        },
    };
}
