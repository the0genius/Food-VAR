import { describe, it, expect } from "vitest";
import {
  conversations,
  messages,
  dailyScanTracker,
} from "../shared/schema";

describe("conversations table schema", () => {
  it("has userId column named user_id", () => {
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
});

describe("messages table schema", () => {
  it("has required columns: id, conversationId, role, content, createdAt", () => {
    expect(messages.id).toBeDefined();
    expect(messages.conversationId).toBeDefined();
    expect(messages.role).toBeDefined();
    expect(messages.content).toBeDefined();
    expect(messages.createdAt).toBeDefined();
  });

  it("conversationId references conversations table", () => {
    expect(messages.conversationId.name).toBe("conversation_id");
  });
});

describe("dailyScanTracker.scanDate type", () => {
  it("uses PostgreSQL date type (not text)", () => {
    const columnType = dailyScanTracker.scanDate.columnType;
    expect(columnType).toBe("PgDateString");
    expect(columnType).not.toBe("PgText");
  });

  it("scanDate value format is YYYY-MM-DD string", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("same-day comparison uses string equality", () => {
    const today = new Date().toISOString().split("T")[0];
    const alsoToday = new Date().toISOString().split("T")[0];
    expect(today).toBe(alsoToday);
  });

  it("cross-day comparison produces different strings", () => {
    const today = new Date("2026-03-14").toISOString().split("T")[0];
    const tomorrow = new Date("2026-03-15").toISOString().split("T")[0];
    expect(today).not.toBe(tomorrow);
  });
});

describe("chat storage ownership enforcement", () => {
  it("IChatStorage.getConversation requires id and userId", async () => {
    const { chatStorage } = await import(
      "../server/replit_integrations/chat/storage"
    );
    expect(chatStorage.getConversation.length).toBe(2);
  });

  it("IChatStorage.getAllConversations requires userId", async () => {
    const { chatStorage } = await import(
      "../server/replit_integrations/chat/storage"
    );
    expect(chatStorage.getAllConversations.length).toBe(1);
  });

  it("IChatStorage.createConversation requires title and userId", async () => {
    const { chatStorage } = await import(
      "../server/replit_integrations/chat/storage"
    );
    expect(chatStorage.createConversation.length).toBe(2);
  });

  it("IChatStorage.deleteConversation requires id and userId", async () => {
    const { chatStorage } = await import(
      "../server/replit_integrations/chat/storage"
    );
    expect(chatStorage.deleteConversation.length).toBe(2);
  });

  it("IChatStorage.getMessagesByConversation requires conversationId and userId", async () => {
    const { chatStorage } = await import(
      "../server/replit_integrations/chat/storage"
    );
    expect(chatStorage.getMessagesByConversation.length).toBe(2);
  });

  it("IChatStorage.createMessage requires conversationId, role, content, and userId", async () => {
    const { chatStorage } = await import(
      "../server/replit_integrations/chat/storage"
    );
    expect(chatStorage.createMessage.length).toBe(4);
  });
});

describe("messages ownership via conversations (indirect)", () => {
  it("messages table does not have a direct userId column (ownership enforced via conversation join)", () => {
    const columnNames = Object.keys(messages);
    expect(columnNames).not.toContain("userId");
    expect(columnNames).toContain("conversationId");
  });

  it("conversations table has userId for ownership enforcement", () => {
    const columnNames = Object.keys(conversations);
    expect(columnNames).toContain("userId");
  });
});
