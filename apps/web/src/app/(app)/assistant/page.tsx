"use client";

import React, { useState, useRef, useEffect } from "react";
import { formatCFA } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  aiResponse?: {
    diagnostic: string;
    alerte_tresorerie: boolean;
    chiffres_cles_cites: { libelle: string; valeur: number }[];
    actions_recommandees: {
      titre: string;
      explication: string;
      impact: "tresorerie" | "rentabilite" | "risque";
      difficulte: "simple" | "moyen" | "complexe";
    }[];
    memoire_entreprise_utilisee?: boolean;
  };
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getConversationHistory } = await import('./actions');
        const historyWrapper = await getConversationHistory();
        const history = historyWrapper.data || historyWrapper;
        if (cancelled || !Array.isArray(history)) return;

        const restored: ChatMessage[] = [];
        type HistoryMessage = {
          id?: string;
          role?: string;
          content?: string;
          aiResponse?: ChatMessage["aiResponse"];
        };
        for (const item of history as { messages?: HistoryMessage[] }[]) {
          const msgs = item.messages || [];
          for (const m of msgs) {
            if (m.role === "user") {
              restored.push({ id: m.id || `${Date.now()}-${restored.length}`, role: "user", content: m.content || "" });
            } else {
              let ai = m.aiResponse;
              if (!ai && m.content) {
                try { ai = JSON.parse(m.content) as ChatMessage["aiResponse"]; } catch { ai = undefined; }
              }
              if (ai) {
                restored.push({ id: m.id || `${Date.now()}-${restored.length}`, role: "ai", content: "", aiResponse: ai });
              }
            }
          }
        }
        if (restored.length > 0) setMessages(restored);
      } catch (error) {
        console.error("Échec du chargement de l'historique:", error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Appel via Server Action pour inclure le JWT Auth de manière sécurisée
      const { askAssistant } = await import('./actions');
      const responseWrapper = await askAssistant(userMessage.content);
      const data = responseWrapper.data || responseWrapper;
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "",
        aiResponse: data,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Désolé, une erreur est survenue lors de la communication avec l'assistant.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const aiIconSvg = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M15 4l1.3 3.2L19.5 8.5 16.3 9.8 15 13l-1.3-3.2L10.5 8.5l3.2-1.3L15 4Z" strokeLinejoin="round"></path>
      <path d="M5 14l.8 2 2 .8-2 .8L5 19.6l-.8-2-2-.8 2-.8L5 14Z" strokeLinejoin="round"></path>
      <path d="M4 21l7-7" strokeLinecap="round"></path>
    </svg>
  );

  return (
    <section className="view" id="v-assistant">
      <div className="topbar">
        <div>
          <div className="eyebrow">
            <svg className="wave-rule" viewBox="0 0 46 14" fill="none">
              <path d="M0 7h4L6 2l4 10 3-9 2 6 3-6 3 6 2-6 3 9 4-10 2 5h4" stroke="url(#wg)" strokeWidth="1.4" strokeLinecap="round" fill="none"></path>
              <defs>
                <linearGradient id="wg" x1="0" y1="0" x2="46" y2="0">
                  <stop stopColor="#A9761F"></stop>
                  <stop offset="1" stopColor="#1A4A3C"></stop>
                </linearGradient>
              </defs>
            </svg>
            <span>Espace de dialogue</span>
          </div>
          <h1 className="page-title">Assistant</h1>
          <p className="page-sub">Répond uniquement à partir des données réelles de votre entreprise.</p>
        </div>
      </div>

      <div className="chat-wrap" style={{ marginBottom: "20px" }}>
        {messages.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-light)" }}>
            Posez-moi une question sur votre trésorerie ou votre rentabilité !
          </div>
        )}
        
        {messages.map((msg) => (
          <React.Fragment key={msg.id}>
            {msg.role === "user" ? (
              <div className="msg-user">{msg.content}</div>
            ) : (
              <div className="msg-ai">
                <div className="avatar-ai">{aiIconSvg}</div>
                <div className="bubble">
                  {msg.content && (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {msg.aiResponse && (
                    <>
                      {msg.aiResponse.alerte_tresorerie && (
                        <div style={{ marginBottom: "10px" }}>
                          <span className="chip" style={{ background: "var(--red)", color: "white", borderColor: "var(--red)" }}>
                            ⚠️ Urgence Trésorerie
                          </span>
                        </div>
                      )}

                      {msg.aiResponse.memoire_entreprise_utilisee && (
                        <div style={{ marginBottom: "10px" }}>
                          <span className="chip" style={{ background: "rgba(20, 184, 166, 0.1)", color: "var(--teal)", borderColor: "var(--teal)" }}>
                            🧠 Mémoire entreprise synchronisée
                          </span>
                        </div>
                      )}
                      
                      {msg.aiResponse.diagnostic && (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>{msg.aiResponse.diagnostic}</ReactMarkdown>
                        </div>
                      )}
                      
                      {msg.aiResponse.chiffres_cles_cites && msg.aiResponse.chiffres_cles_cites.length > 0 && (
                        <div className="chip-row" style={{ marginTop: "10px" }}>
                          {msg.aiResponse.chiffres_cles_cites.map((chiffre, idx) => (
                            <span key={idx} className="chip">
                              📊 {chiffre.libelle}: <strong>{formatCFA(chiffre.valeur)}</strong>
                            </span>
                          ))}
                        </div>
                      )}

                      {msg.aiResponse.actions_recommandees && msg.aiResponse.actions_recommandees.length > 0 && (
                        <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          {msg.aiResponse.actions_recommandees.map((action, idx) => (
                            <div key={idx} style={{ 
                              padding: "12px", 
                              background: "#fff", 
                              border: "1px solid var(--line)", 
                              borderRadius: "12px",
                              cursor: "pointer",
                              boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
                            }} className="group hover:bg-white hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 ease-out">
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <strong className="group-hover:text-primary transition-colors">{action.titre}</strong>
                                <span style={{ fontSize: "12px", color: "var(--text-light)" }}>Impact: {action.impact}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-light)" }}>{action.explication}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </React.Fragment>
        ))}

        {isLoading && (
          <div className="msg-ai">
            <div className="avatar-ai">{aiIconSvg}</div>
            <div className="bubble" style={{ color: "var(--text-light)" }}>
              L&apos;assistant analyse vos données...
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      <div className="chip-row" style={{ marginBottom: "14px" }}>
        <span className="chip" style={{ background: "#fff", border: "1px solid var(--line)", color: "var(--text)", cursor: "pointer" }} onClick={() => setInput("Qui me doit de l’argent ?")}>Qui me doit de l’argent ?</span>
        <span className="chip" style={{ background: "#fff", border: "1px solid var(--line)", color: "var(--text)", cursor: "pointer" }} onClick={() => setInput("Mes dépenses principales")}>Mes dépenses principales</span>
        <span className="chip" style={{ background: "#fff", border: "1px solid var(--line)", color: "var(--text)", cursor: "pointer" }} onClick={() => setInput("Produits les plus rentables")}>Produits les plus rentables</span>
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <input 
          className="field" 
          placeholder="Posez une question sur vos ventes, dépenses, clients…" 
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          disabled={isLoading}
        />
        <button 
          className="btn btn-primary teal transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]" 
          onClick={handleSend}
          disabled={isLoading}
        >
          Envoyer
        </button>
      </div>
    </section>
  );
}
