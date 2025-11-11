import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { FinancialDataManagement } from "@/components/financial-data-management";
import { FinancialWorkspace } from "@/components/financial-workspace";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { auth } from "../(auth)/auth";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");

  const initialModel = modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  return (
    <>
      <div className="flex min-h-dvh flex-col gap-6 p-4 lg:flex-row lg:items-stretch">
        <div className="w-full shrink-0 lg:h-dvh lg:w-[420px] lg:max-w-[520px]">
          <div className="flex h-full min-h-[70vh] min-w-0 flex-col rounded-3xl border border-white/5 bg-background/90 shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
            <Chat
              autoResume={false}
              className="h-full min-h-0"
              id={id}
              initialChatModel={initialModel}
              initialMessages={[]}
              initialVisibilityType="private"
              isReadonly={false}
              key={id}
            />
          </div>
        </div>
        <div className="hidden flex-1 gap-6 lg:flex lg:flex-col">
          {/* Financial Chart - 1/3 height */}
          <div className="flex h-[40vh] flex-col overflow-hidden rounded-3xl border border-gray-700 bg-gray-900 shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
            <FinancialWorkspace />
          </div>

          {/* Financial Data Management - 2/3 height */}
          <div className="flex-1 overflow-hidden rounded-3xl border border-gray-700 bg-gray-900 shadow-[0_30px_80px_rgba(3,3,4,0.45)]">
            <FinancialDataManagement />
          </div>
        </div>
      </div>
      <DataStreamHandler />
    </>
  );
}
