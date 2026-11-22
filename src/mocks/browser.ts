import { setupWorker } from 'msw/browser';
import { handlersFor } from './handlers';

export const worker = setupWorker(...handlersFor(import.meta.env.VITE_API_MOCK_ONLY));
