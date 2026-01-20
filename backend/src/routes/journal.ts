import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { journalEntries } from '../db/schema.js';
import type { App } from '../index.js';

export function register(app: App, fastify: FastifyInstance) {
  // GET /api/journal/entries - Returns array of journal entries sorted by createdAt desc
  fastify.get('/api/journal/entries', async (request, reply) => {
    app.logger.info({}, 'Fetching all journal entries');
    try {
      const entries = await app.db
        .select()
        .from(journalEntries)
        .orderBy(desc(journalEntries.createdAt));

      app.logger.info({ count: entries.length }, 'Journal entries fetched successfully');
      return entries;
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch journal entries');
      throw error;
    }
  });

  // GET /api/journal/entries/:id - Returns single journal entry
  fastify.get<{ Params: { id: string } }>(
    '/api/journal/entries/:id',
    async (request, reply) => {
      const { id } = request.params;
      app.logger.info({ entryId: id }, 'Fetching journal entry');
      try {
        const entry = await app.db
          .select()
          .from(journalEntries)
          .where(eq(journalEntries.id, id));

        if (entry.length === 0) {
          app.logger.info({ entryId: id }, 'Journal entry not found');
          return reply.code(404).send({ error: 'Journal entry not found' });
        }

        app.logger.info({ entryId: id }, 'Journal entry fetched successfully');
        return entry[0];
      } catch (error) {
        app.logger.error({ err: error, entryId: id }, 'Failed to fetch journal entry');
        throw error;
      }
    }
  );

  // POST /api/journal/entries - Create new journal entry
  fastify.post<{ Body: { title: string; content: string; mood?: string } }>(
    '/api/journal/entries',
    async (request, reply) => {
      app.logger.info({ body: request.body }, 'Creating journal entry');
      try {
        const { title, content, mood } = request.body;

        if (!title || !content) {
          return reply.code(400).send({ error: 'Title and content are required' });
        }

        const created = await app.db
          .insert(journalEntries)
          .values({
            title,
            content,
            mood: mood || null,
          })
          .returning();

        app.logger.info({ entryId: created[0].id }, 'Journal entry created successfully');
        return reply.code(201).send(created[0]);
      } catch (error) {
        app.logger.error({ err: error, body: request.body }, 'Failed to create journal entry');
        throw error;
      }
    }
  );

  // PUT /api/journal/entries/:id - Update journal entry
  fastify.put<{ Params: { id: string }; Body: { title?: string; content?: string; mood?: string } }>(
    '/api/journal/entries/:id',
    async (request, reply) => {
      const { id } = request.params;
      app.logger.info({ entryId: id, body: request.body }, 'Updating journal entry');
      try {
        // Check if entry exists
        const existing = await app.db
          .select()
          .from(journalEntries)
          .where(eq(journalEntries.id, id));

        if (existing.length === 0) {
          app.logger.info({ entryId: id }, 'Journal entry not found for update');
          return reply.code(404).send({ error: 'Journal entry not found' });
        }

        // Build update object with only provided fields
        const updateData: Record<string, any> = {
          updatedAt: new Date(),
        };

        if (request.body.title !== undefined) {
          updateData.title = request.body.title;
        }
        if (request.body.content !== undefined) {
          updateData.content = request.body.content;
        }
        if (request.body.mood !== undefined) {
          updateData.mood = request.body.mood;
        }

        const updated = await app.db
          .update(journalEntries)
          .set(updateData)
          .where(eq(journalEntries.id, id))
          .returning();

        app.logger.info({ entryId: id }, 'Journal entry updated successfully');
        return updated[0];
      } catch (error) {
        app.logger.error({ err: error, entryId: id, body: request.body }, 'Failed to update journal entry');
        throw error;
      }
    }
  );

  // DELETE /api/journal/entries/:id - Delete journal entry
  fastify.delete<{ Params: { id: string } }>(
    '/api/journal/entries/:id',
    async (request, reply) => {
      const { id } = request.params;
      app.logger.info({ entryId: id }, 'Deleting journal entry');
      try {
        // Check if entry exists
        const existing = await app.db
          .select()
          .from(journalEntries)
          .where(eq(journalEntries.id, id));

        if (existing.length === 0) {
          app.logger.info({ entryId: id }, 'Journal entry not found for deletion');
          return reply.code(404).send({ error: 'Journal entry not found' });
        }

        await app.db
          .delete(journalEntries)
          .where(eq(journalEntries.id, id));

        app.logger.info({ entryId: id }, 'Journal entry deleted successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, entryId: id }, 'Failed to delete journal entry');
        throw error;
      }
    }
  );
}
