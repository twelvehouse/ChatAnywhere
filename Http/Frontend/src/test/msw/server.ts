import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** MSW server used by vitest tests (Node environment). */
export const server = setupServer(...handlers);
