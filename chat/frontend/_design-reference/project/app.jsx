// Main MedGraph chat app
const { useState, useEffect, useRef, useMemo } = React;

// --- Flat science illustrations for welcome state -----------------------
function MoleculeIllustration() {
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%">
      <line x1="40" y1="50" x2="80" y2="80" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="120" y2="50" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="80" y2="125" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="40" y1="50" x2="20" y2="100" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="120" y1="50" x2="140" y2="100" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="40" cy="50" r="14" fill="#c6ff3d" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="120" cy="50" r="14" fill="#c6ff3d" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="80" cy="80" r="18" fill="#0a0a0a" />
      <circle cx="80" cy="125" r="12" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="20" cy="100" r="10" fill="#ffd400" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="140" cy="100" r="10" fill="#ffd400" stroke="#0a0a0a" strokeWidth="2" />
    </svg>
  );
}
function DnaIllustration() {
  const rungs = [];
  for (let i = 0; i < 7; i++) {
    const y = 20 + i * 18;
    const phase = i * 0.7;
    const x1 = 80 + Math.sin(phase) * 36;
    const x2 = 80 - Math.sin(phase) * 36;
    rungs.push(<line key={"r" + i} x1={x1} y1={y} x2={x2} y2={y} stroke="#0a0a0a" strokeWidth="1.5" />);
    rungs.push(<circle key={"l" + i} cx={x1} cy={y} r="6" fill={i % 2 ? "#3d7dff" : "#c6ff3d"} stroke="#0a0a0a" strokeWidth="1.5" />);
    rungs.push(<circle key={"r2" + i} cx={x2} cy={y} r="6" fill={i % 2 ? "#ffd400" : "#ff4d4d"} stroke="#0a0a0a" strokeWidth="1.5" />);
  }
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%">
      <path d="M 116,20 Q 44,52 116,84 Q 188,116 44,148" fill="none" stroke="#0a0a0a" strokeWidth="2" transform="translate(-20,0)" />
      <path d="M 44,20 Q 116,52 44,84 Q -28,116 116,148" fill="none" stroke="#0a0a0a" strokeWidth="2" transform="translate(20,0)" />
      {rungs}
    </svg>
  );
}
function NeuronIllustration() {
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%">
      <line x1="80" y1="80" x2="20" y2="40" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="30" y2="80" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="20" y2="120" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="50" y2="20" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="55" y2="135" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="80" y1="80" x2="145" y2="80" stroke="#0a0a0a" strokeWidth="3" />
      <line x1="145" y1="80" x2="155" y2="65" stroke="#0a0a0a" strokeWidth="2" />
      <line x1="145" y1="80" x2="155" y2="95" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="20" cy="40" r="6" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="30" cy="80" r="6" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="20" cy="120" r="6" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="50" cy="20" r="6" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="55" cy="135" r="6" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="80" cy="80" r="22" fill="#c6ff3d" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="80" cy="80" r="8" fill="#0a0a0a" />
      <circle cx="155" cy="65" r="5" fill="#ff4d4d" stroke="#0a0a0a" strokeWidth="1.5" />
      <circle cx="155" cy="95" r="5" fill="#ff4d4d" stroke="#0a0a0a" strokeWidth="1.5" />
    </svg>
  );
}
function PetriIllustration() {
  return (
    <svg viewBox="0 0 160 160" width="100%" height="100%">
      <circle cx="80" cy="80" r="62" fill="#fafaf6" stroke="#0a0a0a" strokeWidth="2" />
      <circle cx="80" cy="80" r="50" fill="none" stroke="#0a0a0a" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="60" cy="60" r="10" fill="#ff4d4d" />
      <circle cx="100" cy="55" r="6" fill="#ff4d4d" />
      <circle cx="105" cy="95" r="14" fill="#3d7dff" />
      <circle cx="55" cy="100" r="8" fill="#3d7dff" />
      <circle cx="80" cy="115" r="5" fill="#3d7dff" />
      <circle cx="72" cy="78" r="4" fill="#ffd400" />
      <circle cx="118" cy="75" r="5" fill="#c6ff3d" />
    </svg>
  );
}

const ILLUSTRATIONS = [
  { Comp: MoleculeIllustration, label: "Compostos" },
  { Comp: DnaIllustration, label: "Genética" },
  { Comp: NeuronIllustration, label: "Neurociência" },
  { Comp: PetriIllustration, label: "Microbiologia" }
];

// --- Verdict badge ------------------------------------------------------
function VerdictBadge({ verdict }) {
  const tones = {
    ok:   { bg: "#e7fbe7", fg: "#0a6b25", dot: "#22a06b" },
    warn: { bg: "#fff4d6", fg: "#7a5a00", dot: "#d4a300" },
    info: { bg: "#e6efff", fg: "#1f3d8a", dot: "#3d7dff" },
    bad:  { bg: "#ffe6e6", fg: "#8a1f1f", dot: "#ff4d4d" }
  };
  const t = tones[verdict.tone] || tones.info;
  return (
    <div className="verdict" style={{ background: t.bg, color: t.fg }}>
      <span className="verdict-dot" style={{ background: t.dot }} />
      <span className="verdict-label">{verdict.label}</span>
      <span className="verdict-text">{verdict.text}</span>
    </div>
  );
}

// --- Match a query to canned data --------------------------------------
function matchConversation(query) {
  const q = query.toLowerCase();
  for (const c of window.MG_DATA.conversations) {
    if (c.matches.some(m => q.includes(m.toLowerCase()))) return c;
  }
  return null;
}

// --- Streaming message hook --------------------------------------------
function useStream(chunks, speed = 14) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setText("");
    setDone(false);
    if (!chunks) return;
    const full = chunks.join("");
    let i = 0;
    const id = setInterval(() => {
      // step variable chars per tick
      const step = Math.max(2, Math.floor(Math.random() * 5) + 2);
      i = Math.min(full.length, i + step);
      setText(full.slice(0, i));
      if (i >= full.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [chunks, speed]);
  return { text, done };
}

// --- Graph card (inside response) --------------------------------------
function GraphCard({ data, onOpen }) {
  // mini preview: a few colored dots and lines
  const previewNodes = data.nodes.slice(0, 8);
  return (
    <button className="graph-card" onClick={onOpen}>
      <div className="graph-card-preview">
        <svg viewBox="0 0 120 60" width="100%" height="100%">
          {data.edges.slice(0, 10).map((e, i) => {
            const a = previewNodes[i % previewNodes.length];
            const b = previewNodes[(i + 3) % previewNodes.length];
            if (!a || !b) return null;
            const ax = 10 + (i % 5) * 24;
            const ay = 12 + ((i % 2) ? 0 : 36);
            const bx = 10 + ((i + 2) % 5) * 24;
            const by = 12 + (((i + 1) % 2) ? 0 : 36);
            return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke="#9ca3af" strokeWidth="0.8" />;
          })}
          {previewNodes.map((n, i) => {
            const c = window.MG_NODE_COLORS[n.type] || window.MG_NODE_COLORS.mechanism;
            const x = 10 + (i % 5) * 24;
            const y = 12 + (((i) % 2) ? 0 : 36);
            return <circle key={i} cx={x} cy={y} r={3 + (n.size / 14)} fill={c.bg} stroke={c.ring} strokeWidth="1" />;
          })}
        </svg>
      </div>
      <div className="graph-card-meta">
        <div className="graph-card-title">
          <span className="badge mono">GRAFO</span>
          Knowledge graph extraído
        </div>
        <div className="graph-card-stats">
          {data.nodes.length} entidades · {data.edges.length} relações · clique para abrir
        </div>
      </div>
      <div className="graph-card-arrow">↗</div>
    </button>
  );
}

// --- Graph modal --------------------------------------------------------
function GraphModal({ conv, layout, onLayout, onClose }) {
  const [selectedId, setSelectedId] = useState(null);
  const [size, setSize] = useState({ w: 720, h: 520 });
  const wrapRef = useRef(null);

  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      setSize({ w: Math.max(400, r.width), h: Math.max(360, r.height) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const node = selectedId ? conv.graph.nodes.find(n => n.id === selectedId) : null;
  const relatedEdges = selectedId
    ? conv.graph.edges.filter(e => e.s === selectedId || e.t === selectedId)
    : [];

  // Heuristic: match citations to selected node
  const matchedCitations = useMemo(() => {
    if (!node) return [];
    const lbl = node.label.toLowerCase().split(/\s+|\(|\)/)[0];
    return conv.citations.filter(c => {
      const blob = (c.title + " " + c.authors).toLowerCase();
      return blob.includes(lbl) || blob.includes(node.label.toLowerCase());
    });
  }, [node, conv.citations]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <span className="badge mono">GRAFO</span>
            <span>{conv.query}</span>
          </div>
          <div className="modal-controls">
            <div className="layout-toggle" role="tablist">
              {["force", "hierarchical", "radial"].map(l => (
                <button
                  key={l}
                  className={"layout-btn mono" + (layout === l ? " active" : "")}
                  onClick={() => onLayout(l)}
                >
                  {l === "force" ? "force" : l === "hierarchical" ? "hier" : "radial"}
                </button>
              ))}
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar">×</button>
          </div>
        </div>

        <div className="modal-body">
          <div className="graph-stage" ref={wrapRef}>
            <MGGraph
              data={conv.graph}
              layout={layout}
              onSelect={setSelectedId}
              selectedId={selectedId}
              width={size.w}
              height={size.h}
            />
            <div className="graph-legend">
              {Object.entries(window.MG_NODE_COLORS).map(([k, c]) => (
                <div key={k} className="legend-item mono">
                  <span className="legend-dot" style={{ background: c.bg, borderColor: c.ring }} />
                  {k}
                </div>
              ))}
            </div>
          </div>

          <aside className="graph-side">
            {!node && (
              <div className="empty-side">
                <div className="empty-side-eyebrow mono">SELECIONE UM NÓ</div>
                <p>Clique em qualquer entidade do grafo para ver relações, nível de confiança e evidências citadas.</p>
                <div className="legend-block">
                  <div className="legend-title mono">RELAÇÕES</div>
                  {Object.entries(window.MG_EDGE_STYLES).map(([k, s]) => (
                    <div key={k} className="legend-row mono">
                      <svg width="28" height="10">
                        <line x1="2" y1="5" x2="26" y2="5" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} />
                      </svg>
                      <span>{k}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {node && (
              <div className="node-detail">
                <div className="node-detail-head">
                  <div className="node-type mono">{node.type.toUpperCase()}</div>
                  <h3>{node.label}</h3>
                  {node.sub && <div className="node-sub mono">{node.sub}</div>}
                </div>
                <div className="section-eyebrow mono">RELAÇÕES ({relatedEdges.length})</div>
                <div className="edges-list">
                  {relatedEdges.map((e, i) => {
                    const other = e.s === selectedId ? e.t : e.s;
                    const otherNode = conv.graph.nodes.find(n => n.id === other);
                    const style = window.MG_EDGE_STYLES[e.type] || window.MG_EDGE_STYLES.correlates;
                    const dir = e.s === selectedId ? "→" : "←";
                    return (
                      <div key={i} className="edge-row" onClick={() => setSelectedId(other)}>
                        <div className="edge-dir mono">
                          <span style={{ color: style.color }}>{e.type}</span> {dir}
                        </div>
                        <div className="edge-target">{otherNode ? otherNode.label : other}</div>
                        <div className="conf-bar">
                          <div className="conf-fill" style={{ width: (e.conf * 100) + "%", background: style.color }} />
                          <span className="conf-num mono">{(e.conf * 100).toFixed(0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="section-eyebrow mono">EVIDÊNCIAS</div>
                <div className="citations-list">
                  {(matchedCitations.length ? matchedCitations : conv.citations).map(c => (
                    <div key={c.id} className="citation">
                      <div className="citation-meta mono">
                        {c.authors} · {c.year} · <span className="citation-journal">{c.journal}</span>
                        {c.n != null && <span> · n={c.n.toLocaleString("pt-BR")}</span>}
                      </div>
                      <div className="citation-title">{c.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

// --- Single message bubble ---------------------------------------------
function AssistantMessage({ msg, onOpenGraph }) {
  const { text, done } = useStream(msg.streamed);
  return (
    <div className="msg msg-assistant">
      <div className="msg-avatar mono">MG</div>
      <div className="msg-body">
        <div className="msg-eyebrow mono">
          MEDGRAPH · {done ? "RESPOSTA" : "GERANDO…"}
          {!done && <span className="cursor-pulse" />}
        </div>
        {msg.verdict && done && <VerdictBadge verdict={msg.verdict} />}
        <div className="msg-text">
          {text}
          {!done && <span className="cursor">▍</span>}
        </div>
        {done && msg.graph && (
          <GraphCard data={msg.graph} onOpen={() => onOpenGraph(msg)} />
        )}
        {done && msg.citations && (
          <div className="cite-strip mono">
            {msg.citations.length} citações · {msg.graph?.nodes.length || 0} entidades extraídas
          </div>
        )}
      </div>
    </div>
  );
}

function UserMessage({ msg }) {
  return (
    <div className="msg msg-user">
      <div className="msg-body">
        <div className="msg-text">{msg.text}</div>
      </div>
    </div>
  );
}

// --- Composer ----------------------------------------------------------
function Composer({ onSend, disabled }) {
  const [val, setVal] = useState("");
  const taRef = useRef(null);
  const submit = () => {
    const t = val.trim();
    if (!t || disabled) return;
    onSend(t);
    setVal("");
    if (taRef.current) taRef.current.style.height = "auto";
  };
  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="composer-inner">
        <textarea
          ref={taRef}
          rows="1"
          value={val}
          placeholder="Pergunte ou afirme algo: ex. 'metformina reduz risco de Alzheimer?'"
          onChange={(e) => {
            setVal(e.target.value);
            const t = e.target;
            t.style.height = "auto";
            t.style.height = Math.min(160, t.scrollHeight) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
        />
        <div className="composer-toolbar">
          <div className="composer-hint mono">
            <kbd>↵</kbd> enviar · <kbd>⇧↵</kbd> nova linha
          </div>
          <button type="submit" className="send-btn mono" disabled={!val.trim() || disabled}>
            ANALISAR →
          </button>
        </div>
      </div>
    </form>
  );
}

// --- Welcome state -----------------------------------------------------
function Welcome({ onPick }) {
  const examples = window.MG_DATA.conversations.map(c => c.query);
  return (
    <div className="welcome">
      <div className="welcome-bg" aria-hidden="true">
        {ILLUSTRATIONS.map(({ Comp, label }, i) => (
          <div key={i} className={"illus illus-" + i}>
            <Comp />
            <div className="illus-label mono">{label}</div>
          </div>
        ))}
      </div>
      <div className="welcome-content">
        <div className="eyebrow mono">MEDGRAPH · v0.4 · experimental</div>
        <h1>Pergunte. <br /><span className="hl">Receba um grafo.</span></h1>
        <p className="subtitle">
          Interface conversacional para pesquisadores. Cada resposta é embasada em um
          grafo de conhecimento extraído de literatura biomédica — entidades, mecanismos
          e níveis de confiança são clicáveis.
        </p>

        <div className="example-grid">
          {examples.map((q, i) => (
            <button key={i} className="example-card" onClick={() => onPick(q)}>
              <div className="example-eyebrow mono">EXEMPLO {String(i + 1).padStart(2, "0")}</div>
              <div className="example-q">{q}</div>
              <div className="example-cta mono">analisar →</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Sidebar -----------------------------------------------------------
function Sidebar({ threads, activeId, onPick, onNew, collapsed, onToggle }) {
  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-head">
        <div className="logo">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <circle cx="6" cy="6" r="3" fill="#c6ff3d" stroke="#0a0a0a" strokeWidth="1.5" />
              <circle cx="18" cy="8" r="3" fill="#ff4d4d" stroke="#0a0a0a" strokeWidth="1.5" />
              <circle cx="12" cy="18" r="3" fill="#3d7dff" stroke="#0a0a0a" strokeWidth="1.5" />
              <line x1="6" y1="6" x2="18" y2="8" stroke="#0a0a0a" strokeWidth="1.5" />
              <line x1="6" y1="6" x2="12" y2="18" stroke="#0a0a0a" strokeWidth="1.5" />
              <line x1="18" y1="8" x2="12" y2="18" stroke="#0a0a0a" strokeWidth="1.5" />
            </svg>
          </div>
          {!collapsed && <span className="logo-text mono">MedGraph</span>}
        </div>
        <button className="collapse-btn mono" onClick={onToggle} title="Recolher">
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {!collapsed && (
        <>
          <button className="new-btn mono" onClick={onNew}>
            <span>+ nova consulta</span>
          </button>

          <div className="threads">
            <div className="threads-eyebrow mono">HISTÓRICO</div>
            {threads.length === 0 && (
              <div className="threads-empty mono">nenhuma consulta ainda</div>
            )}
            {threads.map(t => (
              <button
                key={t.id}
                className={"thread" + (t.id === activeId ? " active" : "")}
                onClick={() => onPick(t.id)}
              >
                <div className="thread-title">{t.title}</div>
                <div className="thread-meta mono">
                  {t.nodes} nós · {t.cites} cit.
                </div>
              </button>
            ))}
          </div>

          <div className="sidebar-foot mono">
            <div className="kv"><span>modelo</span><span>medgraph-3.2</span></div>
            <div className="kv"><span>corpus</span><span>PubMed · 2026-05</span></div>
            <div className="kv"><span>status</span><span className="ok">● online</span></div>
          </div>
        </>
      )}
    </aside>
  );
}

// --- Main App ----------------------------------------------------------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "graphLayout": "force"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [pending, setPending] = useState(false);
  const [openGraph, setOpenGraph] = useState(null);
  const [layout, setLayout] = useState(tweaks.graphLayout || "force");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { setLayout(tweaks.graphLayout || "force"); }, [tweaks.graphLayout]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, pending]);

  const send = (text) => {
    const userMsg = { id: "u" + Date.now(), role: "user", text };
    setMessages(m => [...m, userMsg]);
    setPending(true);

    setTimeout(() => {
      const match = matchConversation(text);
      const conv = match || {
        ...window.MG_DATA.generic,
        query: text,
        graph: null,
        citations: []
      };
      const aiMsg = {
        id: "a" + Date.now(),
        role: "assistant",
        verdict: conv.verdict,
        streamed: conv.streamed,
        graph: conv.graph,
        citations: conv.citations || [],
        query: text
      };
      setMessages(m => [...m, aiMsg]);
      setPending(false);

      // Update thread list
      if (!activeThread) {
        const id = "t" + Date.now();
        setActiveThread(id);
        setThreads(ts => [{
          id,
          title: text.length > 48 ? text.slice(0, 48) + "…" : text,
          nodes: conv.graph ? conv.graph.nodes.length : 0,
          cites: (conv.citations || []).length
        }, ...ts]);
      } else {
        setThreads(ts => ts.map(t => t.id === activeThread
          ? { ...t, nodes: t.nodes + (conv.graph?.nodes.length || 0), cites: t.cites + (conv.citations?.length || 0) }
          : t));
      }
    }, 420);
  };

  const newChat = () => {
    setMessages([]);
    setActiveThread(null);
    setOpenGraph(null);
  };

  return (
    <div className="app">
      <Sidebar
        threads={threads}
        activeId={activeThread}
        onPick={() => {}}
        onNew={newChat}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />
      <main className="main">
        <header className="topbar">
          <div className="topbar-left mono">
            <span className="dot ok"></span>
            sessão · {activeThread ? activeThread.slice(0, 10) : "nova"}
          </div>
          <div className="topbar-right mono">
            <span>pesquisador</span>
            <span className="user-avatar">RS</span>
          </div>
        </header>

        <div className="chat-scroll" ref={scrollRef}>
          {messages.length === 0 ? (
            <Welcome onPick={send} />
          ) : (
            <div className="chat-thread">
              {messages.map(m =>
                m.role === "user"
                  ? <UserMessage key={m.id} msg={m} />
                  : <AssistantMessage key={m.id} msg={m} onOpenGraph={(msg) => setOpenGraph(msg)} />
              )}
              {pending && (
                <div className="msg msg-assistant pending-msg">
                  <div className="msg-avatar mono">MG</div>
                  <div className="msg-body">
                    <div className="msg-eyebrow mono">MEDGRAPH · ANALISANDO<span className="cursor-pulse" /></div>
                    <div className="thinking mono">
                      <div className="thinking-step"><span className="dot"></span>extraindo entidades</div>
                      <div className="thinking-step"><span className="dot"></span>consultando corpus</div>
                      <div className="thinking-step"><span className="dot"></span>construindo grafo</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Composer onSend={send} disabled={pending} />
      </main>

      {openGraph && (
        <GraphModal
          conv={{
            query: openGraph.query,
            graph: openGraph.graph,
            citations: openGraph.citations
          }}
          layout={layout}
          onLayout={(l) => { setLayout(l); setTweak("graphLayout", l); }}
          onClose={() => setOpenGraph(null)}
        />
      )}

      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Grafo">
            <window.TweakRadio
              label="Layout"
              value={tweaks.graphLayout}
              onChange={(v) => setTweak("graphLayout", v)}
              options={[
                { value: "force", label: "force" },
                { value: "hierarchical", label: "hier" },
                { value: "radial", label: "radial" }
              ]}
            />
            <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "JetBrains Mono, monospace", marginTop: 8 }}>
              afeta a apresentação do grafo quando aberto.
            </div>
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

window.App = App;
