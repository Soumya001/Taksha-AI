import { useState, useRef, useEffect } from "react";
import { buildSystemPrompt } from "../prompts";
import { LANG_NAMES } from "../data";

const STYLE_LABELS = {
  stepbystep:    "step-by-step with full calculations",
  conversational:"friendly and conversational",
  socratic:      "Socratic (guided questions)",
};

const POLL_INTERVAL_MS  = 1500; // fallback polling (if SSE fails)
const POLL_MAX_ATTEMPTS = 160;

export function parseCanvas(raw) {
  const match = raw.match(/\[CANVAS\]([\s\S]*?)\[\/CANVAS\]/);
  if (!match) return { text: raw, canvas: null };
  const text = raw.replace(/\[CANVAS\][\s\S]*?\[\/CANVAS\]/, "").trim();
  try { return { text, canvas: JSON.parse(match[1].trim()) }; }
  catch { return { text, canvas: null }; }
}

export function useChat({ lang, subject, style, board, grade, initialMessages = [] }) {
  const [messages,       setMessages]       = useState(initialMessages);
  const [loading,        setLoading]        = useState(false);
  const [queuePos,       setQueuePos]       = useState(null);
  const [retryFn,        setRetryFn]        = useState(null);
  const [input,          setInput]          = useState("");
  const [imageData,      setImageData]      = useState(null);
  const [imagePreview,   setImagePreview]   = useState(null);
  const [thinkingStream, setThinkingStream] = useState("");
  const [contentStream,  setContentStream]  = useState("");
  const [streamPhase,    setStreamPhase]    = useState("idle"); // idle|queued|thinking|content|verifying

  const settingsRef = useRef({ lang, style, board, grade });
  const esRef       = useRef(null); // EventSource

  // Clean up SSE on unmount
  useEffect(() => () => { esRef.current?.close(); }, []);

  const clearInput = (textareaRef) => {
    setInput(""); setImageData(null); setImagePreview(null);
    if (textareaRef?.current) textareaRef.current.style.height = "auto";
  };

  const sendMessage = async (textareaRef, overrideText = null, bypassCache = false) => {
    const text = overrideText ?? input.trim();
    if (!text && !imageData) return;
    setRetryFn(null);

    const userMsg = { role: "user", content: text || "Please solve this problem from the image.", image: imagePreview };
    setMessages(prev => [...prev, userMsg]);
    clearInput(textareaRef);
    setLoading(true);

    // Detect mid-chat setting changes
    const prev = settingsRef.current;
    const langChanged  = prev.lang  !== lang;
    const styleChanged = prev.style !== style;
    const boardChanged = prev.board !== board;
    settingsRef.current = { lang, style, board, grade };

    try {
      const apiMsgs = messages.slice(1).map(m => ({ role: m.role, content: m.content }));

      // Only inject setting change hints when there's actual conversation history
      // and we're not on the very first message (apiMsgs includes the current user msg already)
      const hasPriorConversation = messages.filter(m => m.role === "assistant").length > 0;
      if ((langChanged || styleChanged || boardChanged) && apiMsgs.length > 1 && hasPriorConversation) {
        const hints = [];
        if (langChanged)  hints.push(`respond entirely in ${LANG_NAMES[lang] || lang}`);
        if (styleChanged) hints.push(`use a ${STYLE_LABELS[style] || style} style`);
        if (boardChanged) hints.push(`adapt to ${board || "general"} curriculum`);
        apiMsgs.push({ role: "user",      content: `[Setting changed: please ${hints.join(" and ")} from now on]` });
        apiMsgs.push({ role: "assistant", content: "Understood, following new settings." });
      }

      const uc = [];
      if (imageData) uc.push({ type: "image", source: { type: "base64", media_type: imageData.type, data: imageData.base64 } });
      uc.push({ type: "text", text: text || "Solve the math problem in this image." });
      apiMsgs.push({ role: "user", content: uc });

      // Submit to queue — check ok BEFORE parsing JSON
      const submitRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystemPrompt(lang, subject, style, board, grade),
          messages: apiMsgs, lang, board, grade, subject, style,
          bypassCache,
        }),
      });

      if (!submitRes.ok) {
        const errData = await submitRes.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${submitRes.status}`);
      }

      const submitData = await submitRes.json();

      // Cache hit — immediate response, no polling needed
      if (submitData.cached) {
        setMessages(prev => [...prev, {
          role: "assistant", content: submitData.content,
          canvas: submitData.canvas ?? null,
          thinking: submitData.thinking ?? null,
          cached: true,
        }]);
        return;
      }

      const { jobId } = submitData;
      setQueuePos(submitData.position);
      setStreamPhase("queued");

      // Connect to SSE stream — live thinking + content chunks
      const result = await new Promise((resolve, reject) => {
        const es = new EventSource(`/api/chat/stream/${jobId}`);
        esRef.current = es;
        let thinkAcc = "";
        let contentAcc = "";

        es.addEventListener("queued",     (e) => { const d = JSON.parse(e.data); setQueuePos(d.position); setStreamPhase("queued"); });
        es.addEventListener("processing", ()  => { setQueuePos(0); setStreamPhase("thinking"); });

        es.addEventListener("thinking", (e) => {
          const { chunk } = JSON.parse(e.data);
          thinkAcc += chunk;
          setThinkingStream(thinkAcc);
          setStreamPhase("thinking");
        });

        es.addEventListener("content", (e) => {
          const { chunk } = JSON.parse(e.data);
          contentAcc += chunk;
          setContentStream(contentAcc);
          setStreamPhase("content");
        });

        es.addEventListener("verifying", () => setStreamPhase("verifying"));

        es.addEventListener("done", (e) => {
          es.close(); esRef.current = null;
          resolve(JSON.parse(e.data));
        });

        es.addEventListener("appError", (e) => {
          es.close(); esRef.current = null;
          const msg = JSON.parse(e.data).error || "Model error";
          reject(new Error(msg));
        });

        // Connection-level error — fall back to polling
        es.onerror = () => {
          es.close(); esRef.current = null;

          // makePoll(id) returns a resilient poll loop for the given jobId.
          // Network errors are retried (not fatal). Only definitive server errors stop it.
          const makePoll = (id) => {
            let attempts = 0;
            const poll = async () => {
              if (++attempts > POLL_MAX_ATTEMPTS) { reject(new Error("Response timeout")); return; }
              try {
                const r = await fetch(`/api/chat/status/${id}`);

                if (r.status === 404) {
                  // Job lost (server restart) — silently resubmit once
                  try {
                    const resubRes = await fetch("/api/chat", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        system: buildSystemPrompt(lang, subject, style, board, grade),
                        messages: apiMsgs, lang, board, grade, subject, style,
                        bypassCache: false,
                      }),
                    });
                    if (!resubRes.ok) { reject(new Error("Server unavailable — please retry")); return; }
                    const resubData = await resubRes.json();
                    if (resubData.cached) { resolve(resubData); return; }
                    makePoll(resubData.jobId)();
                  } catch { reject(new Error("Server unavailable — please retry")); }
                  return;
                }

                if (!r.ok) { reject(new Error(`Status ${r.status}`)); return; }

                const d = await r.json();
                setQueuePos(d.position);
                if (d.status === "done")  { resolve(d); return; }
                if (d.status === "error") { reject(new Error(d.error || "Model error")); return; }

              } catch {
                // Network error — don't give up, just retry on next interval
              }
              setTimeout(poll, Math.min(POLL_INTERVAL_MS * Math.pow(1.08, attempts), 5000));
            };
            return poll;
          };

          setTimeout(makePoll(jobId), POLL_INTERVAL_MS);
        };
      });

      // Add assistant message from completed job
      setMessages(prev => [...prev, {
        role: "assistant",
        content:       result.content       ?? "",
        canvas:        result.canvas        ?? null,
        thinking:      result.thinking      ?? null,
        selfCorrected: result.selfCorrected ?? false,
      }]);

    } catch (err) {
      const errMsg = err.message || "Something went wrong. Please try again.";
      // Store retry function so UI can offer a retry button
      setRetryFn(() => () => sendMessage(textareaRef, text));
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${errMsg}`, isError: true }]);
    } finally {
      setLoading(false);
      setQueuePos(null);
      setThinkingStream("");
      setContentStream("");
      setStreamPhase("idle");
    }
  };

  const sendFeedback = async (questionText, rating, { board, subject, style, lang }) => {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText, board, subject, style, lang, rating }),
      });
    } catch { /* feedback is best-effort */ }
  };

  const resetChat = () => {
    esRef.current?.close(); esRef.current = null;
    setMessages([]); setInput(""); setImageData(null); setImagePreview(null); setRetryFn(null);
    setThinkingStream(""); setContentStream(""); setStreamPhase("idle");
    settingsRef.current = { lang, style, board, grade };
  };

  return {
    messages, setMessages,
    loading, queuePos, retryFn,
    input, setInput,
    imageData, setImageData,
    imagePreview, setImagePreview,
    thinkingStream, contentStream, streamPhase,
    sendMessage, sendFeedback, resetChat,
  };
}
