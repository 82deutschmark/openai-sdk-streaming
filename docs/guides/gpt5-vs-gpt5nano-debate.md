# Building a GPT-5 vs GPT-5-Nano Debate Using the OpenAI **Responses** API

This short guide shows how to embed the new `responses` streaming endpoint (released April 2025) into **any** TypeScript / Node project and orchestrate a back-and-forth debate between two different models – `gpt-5` and the lighter `gpt-5-nano`.

> The same steps apply for **JavaScript** – just drop the type annotations.

---

## 1  Prerequisites

- Node 18 or later
- An OpenAI API key with access to the `gpt-5` and `gpt-5-nano` models
- A framework that can expose an HTTP route (Express, Next.js API route, Fastify, etc.)

---

## 2  Install / upgrade the SDK

```bash
npm install openai@^4.0.0  # or:  pnpm add openai@latest
```

`openai@4.x` ships the `responses` API and typed streaming helpers.

---

## 3  Bootstrap the OpenAI client

```ts
// src/lib/openai.ts
import OpenAI from "openai";

export const openai = new OpenAI({
  // key is automatically read from the OPENAI_API_KEY env var
});
```

Add `OPENAI_API_KEY` to your `.env` (or your CI / hosting platform secrets):

```env
OPENAI_API_KEY=sk-...
```

---

## 4  Create a streaming endpoint

Below is an **Express** example.  Adapt to your framework of choice.

```ts
// src/routes/debate.ts
import { Router } from "express";
import { openai } from "../lib/openai";

export const debateRoute = Router();

debateRoute.post("/debate", async (req, res) => {
  const { topic, turns = 6 } = req.body as { topic: string; turns?: number };

  // 1 – seed the debate with an initial user question
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "user", content: `Debate the following topic: ${topic}` },
  ];

  // 2 – helper to fire a single model turn and push its output into the array
  async function runTurn(model: string) {
    const events = await openai.responses.create({
      model,
      input: messages,
      stream: true,
    });

    let full = "";
    for await (const ev of events) {
      if (ev.type === "response.output_text.delta") {
        res.write(ev.data.delta); // stream straight to client
        full += ev.data.delta;
      }
    }

    messages.push({ role: "assistant", content: full, name: model });
  }

  // headers for Server-Sent Events (SSE)
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // alternates models for N turns
  for (let i = 0; i < turns; i++) {
    await runTurn(i % 2 === 0 ? "gpt-5" : "gpt-5-nano");
  }

  res.write("[DONE]");
  res.end();
});
```

**Why SSE?**  The Responses API streams a sequence of fine-grained events.  Server-Sent Events is the simplest transport that requires no additional libraries in browsers and works nicely with React, Vue, Svelte, etc.

---

## 5  Consume the stream on the client

```tsx
// any React component
import { useEffect, useState } from "react";

export function Debate({ topic }: { topic: string }) {
  const [log, setLog] = useState("");

  useEffect(() => {
    const es = new EventSource("/debate", {
      method: "POST",
      body: JSON.stringify({ topic }),
    } as any);

    es.onmessage = (e) => {
      if (e.data === "[DONE]") es.close();
      else setLog((prev) => prev + e.data);
    };

    return () => es.close();
  }, [topic]);

  return <pre className="whitespace-pre-wrap font-mono">{log}</pre>;
}
```

### Notes

- Browsers do **not** yet support `POST` with `EventSource`.  Work-around: initiate with `fetch` to a GET endpoint that relays the topic via query string, or use [fetch + ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) instead.
- Tailor the UI – for a real chat layout push each model’s response into its own bubble.

---

## 6  Customising the Debate Flow

1. **System messages** – Inject individual style instructions per model:
   ```ts
   const system5     = { role: "system", name: "gpt-5",      content: "You are an eloquent expert debater." };
   const system5Nano = { role: "system", name: "gpt-5-nano",  content: "You are concise and pragmatic." };
   messages.unshift(system5, system5Nano);
   ```
2. **Turn budget** – Cap `turns` or `max_tokens` for `gpt-5` to balance cost.
3. **Parallel streaming** – If you want simultaneous output, spawn both `responses.create({stream:true})` calls in `Promise.allSettled` and merge events client-side.

---

## 7  Handling Tool Calls (optional)

If you include `tools` in the request, the Responses API may return extra event types such as `response.web_search_call.completed`.  See `docs/guides/responses-api.md` in this repo for a full reference, or wire the events like so:

```ts
for await (const ev of events) {
  switch (ev.type) {
    case "response.web_search_call.completed":
      console.log("Search result:", ev.data.output);
      break;
  }
}
```

---

## 8  Rate limits and cost management

- `gpt-5` is priced ~8× higher than `gpt-5-nano`.  Keep debates short or downscale context when re-sending the growing message array.
- The `responses` endpoint counts **input tokens = entire messages array** on each call.  Trim earlier turns or summarise them after ~10 messages.

---

## 9  Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Only first message arrives | Missing `res.flush()` / `response.body!.getReader()` on client |
| `401 Unauthorized` | Wrong / missing `OPENAI_API_KEY` |
| `429` errors | Hit rate limit – exponential backoff or reduce requests |
| Event parsing fails | Make sure you split on **double** newlines (`\n\n`) |

---

## 10  Further reading

- [Responses API reference](https://platform.openai.com/docs/api-reference/responses)
- [Tools & function calling](https://platform.openai.com/docs/guides/tools)
- [SSE spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)

---

### Happy debating! 🙌
