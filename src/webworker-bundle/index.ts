import { buildContractWasm, templates } from '../runtime-bundle';
import asc from 'assemblyscript/dist/asc.js';

type IParams = {
    type: 'ping' | 'payload';
    templateName?: templates.templateName;
    templateData?: any;
};

onmessage = async function (params: MessageEvent<IParams>) {
    if (params.data.type === 'ping') {
        return postMessage('pong');
    }

    if (params.data.type === 'payload') {
        const { templateName, templateData } = params.data;

        if (!templateName || !templateData) {
            return postMessage({ status: 'error', error: 'Invalid message structure.' });
        }

        try {
            postMessage({ status: 'loading' });

            let binary = await buildContractWasm(templates[templateName](templateData), asc);

            postMessage({ status: 'success', binary });
        } catch (error) {
            postMessage({ status: 'error', error: error.message || JSON.stringify(error) });
        }
    }
};

onerror = function (error) {
    console.error('Worker error:', error);
    postMessage({ status: 'error', error });
};
