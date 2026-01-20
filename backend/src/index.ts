import { createApplication } from "@specific-dev/framework";
import * as schema from './db/schema.js';
import * as journalRoutes from './routes/journal.js';

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Register all route modules
journalRoutes.register(app, app.fastify);

await app.run();
app.logger.info('Application running');
