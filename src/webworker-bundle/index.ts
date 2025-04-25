import { buildContractWasm } from '../runtime-bundle';
import asc from 'assemblyscript/dist/asc.js';

type IParams = {
    type: 'ping' | 'payload';
    templateData?: { [key: string]: string };
};

onmessage = async function (params: MessageEvent<IParams>) {
    if (params.data.type === 'ping') {
        return postMessage('pong');
    }

    if (params.data.type === 'payload') {
        const { templateData } = params.data;

        if (templateData) {
            return postMessage({ status: 'error', error: 'Invalid message structure.' });
        }

        try {
            postMessage({ status: 'loading' });

            let binary = await buildContractWasm(templateData, asc);

            return postMessage({ status: 'success', binary });
        } catch (error) {
            return postMessage({ status: 'error', error: error.message || JSON.stringify(error) });
        }
    }
};

onerror = function (error) {
    console.error('Worker error:', error);
    postMessage({ status: 'error', error });
};
