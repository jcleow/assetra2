ALTER TABLE "ActionEvent"
  ADD CONSTRAINT "ActionEvent_chatId_fkey"
  FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL;
ALTER TABLE "ActionEvent"
  ADD CONSTRAINT "ActionEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
