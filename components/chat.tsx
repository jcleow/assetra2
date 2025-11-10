"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { ChatHeader } from "@/components/chat-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import type { Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { cn, fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import type { IntentReviewDisplay } from "./intent-review-card";
import { useDataStream } from "./data-stream-provider";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";

type IntentReviewState = IntentReviewDisplay & {
  attachments: Attachment[];
};

type SubmitPayload = {
  message: string;
  attachments: Attachment[];
};

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialLastContext,
  className,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
  className?: string;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const currentModelIdRef = useRef(currentModelId);

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        return {
          body: {
            id: request.id,
            message: request.messages.at(-1),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibilityType,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      if (dataPart.type === "data-usage") {
        setUsage(dataPart.data);
      }
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        // Check if it's a credit card error
        if (
          error.message?.includes("AI Gateway requires a valid credit card")
        ) {
          setShowCreditCardAlert(true);
        } else {
          toast({
            type: "error",
            description: error.message,
          });
        }
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [intentReviews, setIntentReviews] = useState<IntentReviewState[]>([]);
  const [isIntentRequestPending, setIsIntentRequestPending] = useState(false);
  const intentReviewDisplays = useMemo<IntentReviewDisplay[]>(
    () =>
      intentReviews
        .slice()
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(({ attachments: _attachments, ...review }) => review),
    [intentReviews]
  );

  const dispatchMessage = useCallback(
    ({ message, attachments }: SubmitPayload) => {
      if (!message.trim() && attachments.length === 0) {
        return;
      }

      sendMessage({
        role: "user",
        parts: [
          ...attachments.map((attachment) => ({
            type: "file" as const,
            url: attachment.url,
            name: attachment.name,
            mediaType: attachment.contentType,
          })),
          ...(message.trim()
            ? [
                {
                  type: "text" as const,
                  text: message,
                },
              ]
            : []),
        ],
      });
    },
    [sendMessage]
  );

  const handleIntentSubmit = useCallback(
    async ({ message, attachments }: SubmitPayload) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return false;
      }

      setIsIntentRequestPending(true);
      try {
        const response = await fetch("/api/intent", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ message }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          console.error(
            "Intent parser HTTP error",
            response.status,
            errorPayload
          );
          return false;
        }

        const payload = await response.json();
        if (!Array.isArray(payload.actions)) {
          console.error("Intent parser malformed payload", payload);
          return false;
        }

        if (payload.actions.length === 0) {
          return false;
        }

        const intentId =
          payload.intentId ??
          (typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : generateUUID());
        setIntentReviews((prev) => [
          ...prev,
          {
            id: intentId,
            intentId,
            message,
            raw: payload.raw ?? message,
            actions: payload.actions,
            status: "pending",
            attachments,
            createdAt: Date.now(),
          },
        ]);
        setInput("");
        setAttachments([]);
        return true;
      } catch (error) {
        console.error("Intent parser failed", error);
        toast({
          type: "error",
          description: "Intent parser failed. Sending message as typed.",
        });
        return false;
      } finally {
        setIsIntentRequestPending(false);
      }
    },
    [setAttachments, setInput]
  );

  const handleIntentConfirm = useCallback(
    (intentId: string) => {
      let pendingReview: IntentReviewState | null = null;
      setIntentReviews((prev) =>
        prev.map((review) => {
          if (review.id === intentId && review.status === "pending") {
            pendingReview = review;
            return { ...review, status: "confirmed" };
          }
          return review;
        })
      );
      if (pendingReview) {
        dispatchMessage({
          message: pendingReview.message,
          attachments: pendingReview.attachments,
        });
      }
    },
    [dispatchMessage]
  );

  const handleIntentCancel = useCallback(
    (intentId: string) => {
      let pendingReview: IntentReviewState | null = null;
      setIntentReviews((prev) =>
        prev.map((review) => {
          if (review.id === intentId && review.status === "pending") {
            pendingReview = review;
            return { ...review, status: "cancelled" };
          }
          return review;
        })
      );

      if (pendingReview) {
        setInput(pendingReview.message);
        setAttachments(pendingReview.attachments);
      }
    },
    [setAttachments, setInput]
  );
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div
        className={cn(
          "overscroll-behavior-contain flex h-dvh min-h-0 min-w-0 touch-pan-y flex-col bg-background",
          className
        )}
      >
        <ChatHeader
          chatId={id}
          isReadonly={isReadonly}
          selectedVisibilityType={initialVisibilityType}
        />

        <Messages
          chatId={id}
          isArtifactVisible={isArtifactVisible}
          isReadonly={isReadonly}
          intentReviews={intentReviewDisplays}
          messages={messages}
          onCancelIntent={handleIntentCancel}
          onConfirmIntent={handleIntentConfirm}
          regenerate={regenerate}
          selectedModelId={initialChatModel}
          setMessages={setMessages}
          status={status}
          votes={votes}
        />

        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
          {!isReadonly && (
            <MultimodalInput
              attachments={attachments}
              chatId={id}
              input={input}
              intentRequestPending={isIntentRequestPending}
              messages={messages}
              onModelChange={setCurrentModelId}
              onSubmitMessage={handleIntentSubmit}
              selectedModelId={currentModelId}
              selectedVisibilityType={visibilityType}
              sendMessage={sendMessage}
              setAttachments={setAttachments}
              setInput={setInput}
              setMessages={setMessages}
              status={status}
              stop={stop}
              usage={usage}
            />
          )}
        </div>
      </div>

      <Artifact
        attachments={attachments}
        chatId={id}
        input={input}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        selectedModelId={currentModelId}
        selectedVisibilityType={visibilityType}
        sendMessage={sendMessage}
        setAttachments={setAttachments}
        setInput={setInput}
        setMessages={setMessages}
        status={status}
        stop={stop}
        votes={votes}
      />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = "/";
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
