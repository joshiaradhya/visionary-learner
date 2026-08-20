const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMessage = { role: "system" | "user"; content: string };

export class AiGatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Calls the Lovable AI Gateway and returns the assistant text. */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: { model?: string; jsonObject?: boolean } = {},
): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiGatewayError(401, "AI is not configured for this project.");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3.7-flash",
      messages,
      ...(opts.jsonObject ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      message = JSON.parse(body)?.error?.message ?? JSON.parse(body)?.message ?? body;
    } catch {
      /* keep raw body */
    }
    if (res.status === 429) message = "AI is rate limited right now — try again in a moment.";
    if (res.status === 402) message = message || "AI credits are exhausted for this workspace.";
    throw new AiGatewayError(res.status, message || `AI request failed (${res.status}).`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}
