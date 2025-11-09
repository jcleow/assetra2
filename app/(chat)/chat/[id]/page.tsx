import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  const initialModel = chatModelFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  return (
    <>
      <div className="flex min-h-dvh flex-col gap-6 p-4 lg:flex-row lg:items-stretch">
        <div className="w-full shrink-0 lg:h-dvh lg:w-[420px] lg:max-w-[520px]">
          <div className="flex h-full min-h-[70vh] min-w-0 flex-col rounded-3xl border border-white/5 bg-background/90 shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
            <Chat
              autoResume={true}
              className="h-full min-h-0"
              id={chat.id}
              initialChatModel={initialModel}
              initialLastContext={chat.lastContext ?? undefined}
              initialMessages={uiMessages}
              initialVisibilityType={chat.visibility}
              isReadonly={session?.user?.id !== chat.userId}
            />
          </div>
        </div>
        <div className="hidden min-h-[320px] flex-1 rounded-3xl border border-white/10 border-dashed bg-muted/10 p-6 text-muted-foreground text-sm lg:flex">
          <div className="m-auto space-y-2 text-center">
            <p className="font-semibold text-base text-foreground">
              Workspace Canvas
            </p>
            <p>
              Use this canvas for future planning modules or visualizations.
            </p>
          </div>
        </div>
      </div>
      <DataStreamHandler />
    </>
  );
}
