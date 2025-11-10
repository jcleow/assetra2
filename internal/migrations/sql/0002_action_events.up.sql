CREATE TABLE IF NOT EXISTS "ActionEvent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "intentId" varchar(128) NOT NULL UNIQUE,
  "chatId" uuid,
  "userId" uuid,
  "verb" varchar(32) NOT NULL,
  "entity" varchar(32) NOT NULL,
  "target" text,
  "amount" double precision,
  "currency" varchar(16),
  "payload" jsonb NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "ActionEvent_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL,
  CONSTRAINT "ActionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);
