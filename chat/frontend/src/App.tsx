import { useEffect, useRef, useState } from "react";
import { fetchModels, streamChat, type HistoryItem } from "./api";
import {
  applyPipelineEvent,
  emptyPipelineState,
  type AssistantMsg,
  type Message,
  type ModelInfo,
  type ModelKey,
  type PipelineStepId,
  type Thread,
  type UserMsg,
} from "./types";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Welcome } from "./components/Welcome";
import { Composer } from "./components/Composer";
import { UserMessage } from "./components/UserMessage";
import { AssistantMessage } from "./components/AssistantMessage";
import { ThinkingState } from "./components/ThinkingState";
import { PipelineStrip } from "./components/PipelineStrip";
import { StepModal } from "./components/StepModal";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState<ModelKey>("qwen");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeStep, setActiveStep] = useState<{ msgId: string; stepId: PipelineStepId } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  useEffect(() => {
    fetchModels()
      .then(({ models, default: def }) => {
        setModels(models);
        if (models.length > 0 && !models.some(m => m.key === model)) {
          setModel(def || models[0].key);
        }
      })
      .catch(err => console.error("fetchModels falhou:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      pipeline: null,
      query: text,
      pending: true,
    };

    const history: HistoryItem[] = messages
      .filter(m => m.role === "user" || (m.role === "assistant" && !m.pending && m.text))
      .map(m => ({ role: m.role, content: m.text }));

    setMessages(ms => [...ms, userMsg, assistantMsg]);
    setPending(true);

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
      for await (const event of streamChat(text, model, history)) {
        if (event.type === "token") {
          updateAssistant(assistantId, m => ({ ...m, text: m.text + event.data.text }));
        } else if (event.type === "tool_call") {
          const call = event.data;
          updateAssistant(assistantId, m => ({
            ...m,
            toolCalls: [...m.toolCalls, call],
            pipeline: call.name === "pipeline_medico" && !m.pipeline
              ? emptyPipelineState(text)
              : m.pipeline,
          }));
        } else if (event.type === "pipeline_step") {
          updateAssistant(assistantId, m => {
            const prev = m.pipeline || emptyPipelineState(text);
            return { ...m, pipeline: applyPipelineEvent(prev, event.data) };
          });
        } else if (event.type === "error") {
          const msg = event.data.message || "Erro desconhecido no servidor.";
          updateAssistant(assistantId, m => ({
            ...m,
            text: m.text ? `${m.text}\n\n${msg}` : msg,
            pending: false,
          }));
        } else if (event.type === "done") {
          updateAssistant(assistantId, m => ({
            ...m,
            pending: false,
            pipeline: m.pipeline
              ? { ...m.pipeline, complete: true, totalMs: m.pipeline.totalMs || (Date.now() - m.pipeline.startedAt) }
              : null,
          }));
          // Update thread metadata with verdict
          setThreads(ts => ts.map(t => {
            if (t.id !== threadId) return t;
            const stage6 = (messages.find(mm => mm.id === assistantId) as AssistantMsg | undefined)?.pipeline?.data.stage6;
            if (!stage6) return t;
            return { ...t, verdict: stage6.label, tone: stage6.tone };
          }));
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
    setActiveStep(null);
  };

  const lastMsg = messages[messages.length - 1];
  const showThinking =
    pending &&
    lastMsg?.role === "assistant" &&
    lastMsg.text === "" &&
    lastMsg.toolCalls.length === 0 &&
    !lastMsg.pipeline;

  const activePipeline = (() => {
    if (activeStep) {
      const m = messages.find(mm => mm.id === activeStep.msgId);
      if (m && m.role === "assistant" && m.pipeline) return m.pipeline;
    }
    const latest = [...messages].reverse().find(m => m.role === "assistant" && m.pipeline) as AssistantMsg | undefined;
    return latest?.pipeline || null;
  })();

  return (
    <div className="app">
      <Sidebar
        threads={threads}
        activeId={activeThread}
        models={models}
        model={model}
        collapsed={sidebarCollapsed}
        onNew={newChat}
        onPick={() => {}}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />
      <main className="main">
        <Topbar sessionId={activeThread} />

        {activePipeline && (
          <PipelineStrip
            run={activePipeline}
            onPick={stepId => {
              const msg = [...messages].reverse().find(
                mm => mm.role === "assistant" && mm.pipeline,
              ) as AssistantMsg | undefined;
              if (msg) setActiveStep({ msgId: msg.id, stepId });
            }}
          />
        )}

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
                  <AssistantMessage
                    key={m.id}
                    msg={m}
                    onOpenStep={stepId => setActiveStep({ msgId: m.id, stepId })}
                  />
                ),
              )}
            </div>
          )}
        </div>

        <Composer onSend={send} disabled={pending} models={models} model={model} onModelChange={setModel} />
      </main>

      {activeStep && (() => {
        const msg = messages.find(mm => mm.id === activeStep.msgId) as AssistantMsg | undefined;
        if (!msg || !msg.pipeline) return null;
        return (
          <StepModal
            stepId={activeStep.stepId}
            run={msg.pipeline}
            onClose={() => setActiveStep(null)}
            onNav={delta => {
              const order: PipelineStepId[] = [
                "translate_pt_en", "extract_question", "mesh_search",
                "pubmed_search", "extract_articles", "verdict", "translate_en_pt",
              ];
              const idx = order.indexOf(activeStep.stepId);
              const next = order[idx + delta];
              if (next) setActiveStep({ ...activeStep, stepId: next });
            }}
          />
        );
      })()}
    </div>
  );
}
