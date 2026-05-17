import { useEffect, useRef, useState } from "react";
import { streamChat } from "./api";
import { mapVerdict, type AssistantMsg, type Message, type ModelKey, type Thread, type UserMsg } from "./types";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Welcome } from "./components/Welcome";
import { Composer } from "./components/Composer";
import { UserMessage } from "./components/UserMessage";
import { AssistantMessage } from "./components/AssistantMessage";
import { ThinkingState } from "./components/ThinkingState";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [model, setModel] = useState<ModelKey>("qwen");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  const updateAssistant = (id: string, patch: (prev: AssistantMsg) => AssistantMsg) => {
    setMessages(ms =>
      ms.map(m => (m.id === id && m.role === "assistant" ? patch(m) : m)),
    );
  };

  const send = async (text: string) => {
    const userMsg: UserMsg = { id: "u" + Date.now(), role: "user", text };
    const assistantId = "a" + Date.now();
    const assistantMsg: AssistantMsg = {
      id: assistantId,
      role: "assistant",
      text: "",
      toolCalls: [],
      verdict: null,
      pending: true,
    };

    setMessages(ms => [...ms, userMsg, assistantMsg]);
    setPending(true);

    // Thread bookkeeping
    let threadId = activeThread;
    if (!threadId) {
      threadId = "t" + Date.now();
      setActiveThread(threadId);
      setThreads(ts => [{
        id: threadId!,
        title: text.length > 48 ? text.slice(0, 48) + "…" : text,
        messageCount: 2,
      }, ...ts]);
    } else {
      setThreads(ts => ts.map(t => t.id === threadId ? { ...t, messageCount: t.messageCount + 2 } : t));
    }

    try {
      for await (const event of streamChat(text, model)) {
        if (event.type === "token") {
          updateAssistant(assistantId, m => ({ ...m, text: m.text + event.data.text }));
        } else if (event.type === "tool_call") {
          const call = event.data;
          const verdict = call.name === "avaliador" ? mapVerdict(call.result) : null;
          updateAssistant(assistantId, m => ({
            ...m,
            toolCalls: [...m.toolCalls, call],
            verdict: verdict || m.verdict,
          }));
        } else if (event.type === "done") {
          updateAssistant(assistantId, m => ({ ...m, pending: false }));
        }
      }
    } catch (err) {
      console.error(err);
      updateAssistant(assistantId, m => ({
        ...m,
        text: m.text || `Erro: ${err instanceof Error ? err.message : String(err)}`,
        pending: false,
      }));
    } finally {
      setPending(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    setActiveThread(null);
  };

  // The assistant message at the end of `messages` is pending when SSE is in-flight
  // but has no text yet. ThinkingState renders only if there's no text yet on a pending msg.
  const lastMsg = messages[messages.length - 1];
  const showThinking =
    pending &&
    lastMsg?.role === "assistant" &&
    lastMsg.text === "" &&
    lastMsg.toolCalls.length === 0;

  return (
    <div className="app">
      <Sidebar
        threads={threads}
        activeId={activeThread}
        model={model}
        collapsed={sidebarCollapsed}
        onNew={newChat}
        onPick={() => {}}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />
      <main className="main">
        <Topbar sessionId={activeThread} model={model} onModelChange={setModel} />

        <div className="chat-scroll" ref={scrollRef}>
          {messages.length === 0 ? (
            <Welcome onPick={send} />
          ) : (
            <div className="chat-thread">
              {messages.map(m =>
                m.role === "user" ? (
                  <UserMessage key={m.id} msg={m} />
                ) : showThinking && m.id === lastMsg.id ? (
                  <ThinkingState key={m.id} />
                ) : (
                  <AssistantMessage key={m.id} msg={m} />
                ),
              )}
            </div>
          )}
        </div>

        <Composer onSend={send} disabled={pending} />
      </main>
    </div>
  );
}
