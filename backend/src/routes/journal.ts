import type { FastifyRequest, FastifyReply } from 'fastify';
import { desc, eq, and } from 'drizzle-orm';
import { journalEntries } from '../db/schema.js';
import type { App } from '../index.js';

export function register(app: App) {
  const requireAuth = app.requireAuth();

  // GET /api/journal/entries - Returns array of journal entries sorted by createdAt desc (auth required)
  app.fastify.get('/api/journal/entries', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    app.logger.info({ userId }, 'Fetching journal entries for user');
    try {
      const entries = await app.db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.userId, userId))
        .orderBy(desc(journalEntries.createdAt));

      app.logger.info({ userId, count: entries.length }, 'Journal entries fetched successfully');
      return entries;
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch journal entries');
      throw error;
    }
  });

  // GET /api/journal/entries/:id - Returns single journal entry (auth required)
  app.fastify.get<{ Params: { id: string } }>(
    '/api/journal/entries/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const userId = session.user.id;
      app.logger.info({ userId, entryId: id }, 'Fetching journal entry');
      try {
        const entry = await app.db
          .select()
          .from(journalEntries)
          .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));

        if (entry.length === 0) {
          app.logger.info({ userId, entryId: id }, 'Journal entry not found');
          return reply.code(404).send({ error: 'Journal entry not found' });
        }

        app.logger.info({ userId, entryId: id }, 'Journal entry fetched successfully');
        return entry[0];
      } catch (error) {
        app.logger.error({ err: error, userId, entryId: id }, 'Failed to fetch journal entry');
        throw error;
      }
    }
  );

  // POST /api/journal/entries - Create new journal entry (auth required)
  app.fastify.post<{ Body: { title: string; content: string; mood?: string; type?: 'note' | 'checklist' } }>(
    '/api/journal/entries',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId, body: request.body }, 'Creating journal entry');
      try {
        const body = request.body as { title: string; content: string; mood?: string; type?: 'note' | 'checklist' };
        const { title, content, mood, type = 'note' } = body;

        if (!title || !content) {
          return reply.code(400).send({ error: 'Title and content are required' });
        }

        if (type !== 'note' && type !== 'checklist') {
          return reply.code(400).send({ error: 'Type must be "note" or "checklist"' });
        }

        const created = await app.db
          .insert(journalEntries)
          .values({
            userId,
            title,
            content,
            mood: mood || null,
            type,
          })
          .returning();

        app.logger.info({ userId, entryId: created[0].id, type }, 'Journal entry created successfully');
        return reply.code(201).send(created[0]);
      } catch (error) {
        app.logger.error({ err: error, userId, body: request.body }, 'Failed to create journal entry');
        throw error;
      }
    }
  );

  // PUT /api/journal/entries/:id - Update journal entry (auth required)
  app.fastify.put<{ Params: { id: string }; Body: { title?: string; content?: string; mood?: string; type?: 'note' | 'checklist' } }>(
    '/api/journal/entries/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const userId = session.user.id;
      app.logger.info({ userId, entryId: id, body: request.body }, 'Updating journal entry');
      try {
        const body = request.body as { title?: string; content?: string; mood?: string; type?: 'note' | 'checklist' };

        // Check if entry exists and belongs to user
        const existing = await app.db
          .select()
          .from(journalEntries)
          .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));

        if (existing.length === 0) {
          app.logger.info({ userId, entryId: id }, 'Journal entry not found for update');
          return reply.code(404).send({ error: 'Journal entry not found' });
        }

        // Validate type if provided
        if (body.type !== undefined && body.type !== 'note' && body.type !== 'checklist') {
          return reply.code(400).send({ error: 'Type must be "note" or "checklist"' });
        }

        // Build update object with only provided fields
        const updateData: Record<string, any> = {
          updatedAt: new Date(),
        };

        if (body.title !== undefined) {
          updateData.title = body.title;
        }
        if (body.content !== undefined) {
          updateData.content = body.content;
        }
        if (body.mood !== undefined) {
          updateData.mood = body.mood;
        }
        if (body.type !== undefined) {
          updateData.type = body.type;
        }

        const updated = await app.db
          .update(journalEntries)
          .set(updateData)
          .where(eq(journalEntries.id, id))
          .returning();

        app.logger.info({ userId, entryId: id }, 'Journal entry updated successfully');
        return updated[0];
      } catch (error) {
        app.logger.error({ err: error, userId, entryId: id, body: request.body }, 'Failed to update journal entry');
        throw error;
      }
    }
  );

  // DELETE /api/journal/entries/:id - Delete journal entry (auth required)
  app.fastify.delete<{ Params: { id: string } }>(
    '/api/journal/entries/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };
      const userId = session.user.id;
      app.logger.info({ userId, entryId: id }, 'Deleting journal entry');
      try {
        // Check if entry exists and belongs to user
        const existing = await app.db
          .select()
          .from(journalEntries)
          .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));

        if (existing.length === 0) {
          app.logger.info({ userId, entryId: id }, 'Journal entry not found for deletion');
          return reply.code(404).send({ error: 'Journal entry not found' });
        }

        await app.db
          .delete(journalEntries)
          .where(eq(journalEntries.id, id));

        app.logger.info({ userId, entryId: id }, 'Journal entry deleted successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId, entryId: id }, 'Failed to delete journal entry');
        throw error;
      }
    }
  );
}
