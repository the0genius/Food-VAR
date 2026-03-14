import { db } from "../../db";
import { conversations, messages } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: number, userId: number): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(userId: number): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(title: string, userId: number): Promise<typeof conversations.$inferSelect>;
  deleteConversation(id: number, userId: number): Promise<boolean>;
  getMessagesByConversation(conversationId: number, userId: number): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(conversationId: number, role: string, content: string, userId: number): Promise<typeof messages.$inferSelect>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number, userId: number) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return conversation;
  },

  async getAllConversations(userId: number) {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  },

  async createConversation(title: string, userId: number) {
    const [conversation] = await db
      .insert(conversations)
      .values({ title, userId })
      .returning();
    return conversation;
  },

  async deleteConversation(id: number, userId: number) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    if (!conversation) return false;

    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    return true;
  },

  async getMessagesByConversation(conversationId: number, userId: number) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
    if (!conversation) return [];

    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  },

  async createMessage(conversationId: number, role: string, content: string, userId: number) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    const [message] = await db
      .insert(messages)
      .values({ conversationId, role, content })
      .returning();
    return message;
  },
};
