"use client";

import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { Chat } from "@/components/chat";
import { cn } from "@/lib/utils";

type ChatFloatingLauncherProps = {
  chatId: string;
  initialModel: string;
};

export function ChatFloatingLauncher({
  chatId,
  initialModel,
}: ChatFloatingLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => setIsOpen((previous) => !previous);

  return (
    <>
      <div
        aria-hidden={!isOpen}
        className={cn(
          "pointer-events-none fixed right-4 bottom-24 z-50 w-[min(90vw,460px)] transition-all duration-200",
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "translate-y-4 opacity-0"
        )}
      >
        <div className="flex h-[min(80vh,600px)] min-h-[420px] flex-col rounded-3xl border border-white/10 bg-background/95 shadow-[0_30px_80px_rgba(3,3,4,0.65)] backdrop-blur">
          <div className="flex items-center justify-between border-white/5 border-b px-4 py-3">
            <div>
              <p className="font-semibold text-sm text-white">
                Financial Copilot
              </p>
              <p className="text-white/60 text-xs">Chat with Assetra</p>
            </div>
            <button
              aria-label="Close chat"
              className="rounded-full border border-white/10 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              onClick={toggleChat}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <Chat
              autoResume={false}
              className="h-full min-h-0"
              id={chatId}
              initialChatModel={initialModel}
              initialMessages={[]}
              initialVisibilityType="private"
              isReadonly={false}
              key={chatId}
            />
          </div>
        </div>
      </div>

      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 focus-visible:outline-offset-2"
        onClick={toggleChat}
        type="button"
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
        <span className="sr-only">Toggle financial chat</span>
      </button>
    </>
  );
}
