import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

function normaliseMath(text) {
  return text
    // \[...\]  →  $$...$$  (display math)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`)
    // \(...\)  →  $...$    (inline math, including LaTeX commands like \frac)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);
}

const MathContent = memo(function MathContent({ text, color }) {
  return (
    <div className="math-content-md" style={{ color }}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normaliseMath(text)}
      </ReactMarkdown>
    </div>
  );
});

export default MathContent;
