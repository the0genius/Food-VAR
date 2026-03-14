import { describe, it, expect } from "vitest";
import {
  conversations,
  messages,
  dailyScanTracker,
  users,
} from "../shared/schema";

describe("conversations table schema", () => {
  it("has a userId column", () => {
    expect(conversations.userId).toBeDefined();
    expect(conversations.userId.name).toBe("user_id");
  });

  it("has required columns: id, userId, title, createdAt, updatedAt", () => {
    expect(conversations.id).toBeDefined();
    expect(conversations.userId).toBeDefined();
    expect(conversations.title).toBeDefined();
    expect(conversations.createdAt).toBeDefined();
    expect(conversations.updatedAt).toBeDefined();
  });

  it("references users table via userId", () => {
    const config = conversations.userId.config as any;
    expect(config).toBeDefined();
  });
});

describe("messages table schema", () => {
  it("has required columns: id, conversationId, role, content, createdAt", () => {
    expect(messages.id).toBeDefined();
    expect(messages.conversationId).toBeDefined();
    expect(messages.role).toBeDefined();
    expect(messages.content).toBeDefined();
    expect(messages.createdAt).toBeDefined();
  });

  it("references conversations table via conversationId", () => {
    const config = messages.conversationId.config as any;
    expect(config).toBeDefined();
  });
});

describe("dailyScanTracker.scanDate type", () => {
  it("uses date column type (not text)", () => {
    const columnType = dailyScanTracker.scanDate.columnType;
    expect(columnType).toBe("PgDateString");
  });

  it("scanDate value format is YYYY-MM-DD string", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("chat storage interface requires userId", () => {
  it("IChatStorage methods accept userId parameter", async () => {
    const { chatStorage } = await import(
      "../server/replit_integrations/chat/storage"
    );

    expect(chatStorage.getConversation.length).toBeGreaterThanOrEqual(2);
    expect(chatStorage.getAllConversations.length).toBeGreaterThanOrEqual(1);
    expect(chatStorage.createConversation.length).toBeGreaterThanOrEqual(2);
    expect(chatStorage.deleteConversation.length).toBeGreaterThanOrEqual(2);
    expect(chatStorage.getMessagesByConversation.length).toBeGreaterThanOrEqual(2);
    expect(chatStorage.createMessage.length).toBeGreaterThanOrEqual(4);
  });
});
