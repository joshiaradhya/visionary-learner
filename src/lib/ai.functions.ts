import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const QuizInput = z.object({ lessonId: z.string().uuid() });

/** Generates 3 multiple-choice questions grounded only in a lesson's glosses. */
export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => QuizInput.parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const { chatCompletion, AiGatewayError } = await import("./ai-gateway.server");

    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: signs, error } = await supabase
      .from("signs")
      .select("gloss, description")
      .eq("lesson_id", data.lessonId)
      .order("order_index");
    if (error) throw new Error(error.message);
    if (!signs?.length) throw new Error("This lesson has no signs yet.");

    const glossList = signs.map((s) => s.gloss);

    try {
      const raw = await chatCompletion(
        [
          {
            role: "system",
            content:
              "You write short sign-language comprehension quizzes. Use ONLY the provided gloss list — never invent signs or vocabulary. " +
              'Respond with strict JSON: {"questions":[{"prompt":string,"options":[string,string,string,string],"correct_index":number}]} with exactly 3 questions. ' +
              "Every option must be a gloss from the list. Vary the correct index.",
          },
          {
            role: "user",
            content: `Glosses and their descriptions:\n${signs
              .map((s) => `- ${s.gloss}: ${s.description ?? ""}`)
              .join("\n")}\n\nAllowed options: ${glossList.join(", ")}`,
          },
        ],
        { jsonObject: true },
      );

      const parsed = z
        .object({
          questions: z
            .array(
              z.object({
                prompt: z.string(),
                options: z.array(z.string()).length(4),
                correct_index: z.number().int().min(0).max(3),
              }),
            )
            .min(1),
        })
        .parse(JSON.parse(raw));

      return { questions: parsed.questions.slice(0, 3), source: "ai" as const };
    } catch (e) {
      if (e instanceof AiGatewayError) throw new Error(e.message);
      throw new Error("The quiz generator returned an unexpected response.");
    }
  });

const TutorInput = z.object({
  gloss: z.string().min(1),
  confidence: z.number().min(0).max(100),
  regions: z.object({ handShape: z.number(), palm: z.number(), movement: z.number() }),
});

/** Turns a raw matcher score into one coaching sentence. */
export const tutorFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TutorInput.parse(input))
  .handler(async ({ data }) => {
    const { chatCompletion, AiGatewayError } = await import("./ai-gateway.server");
    try {
      const text = await chatCompletion([
        {
          role: "system",
          content:
            "You are a warm, concise sign-language coach. Given a learner's attempt score, reply with ONE short sentence " +
            "(max 22 words) of specific, encouraging coaching. No emoji, no preamble.",
        },
        {
          role: "user",
          content: `Sign: ${data.gloss}. Confidence: ${data.confidence}%. Deviation — hand shape ${data.regions.handShape.toFixed(
            2,
          )}, palm/position ${data.regions.palm.toFixed(2)}, movement ${data.regions.movement.toFixed(3)}. Higher means worse.`,
        },
      ]);
      return { feedback: text.trim() };
    } catch (e) {
      if (e instanceof AiGatewayError) throw new Error(e.message);
      throw new Error("Coaching feedback is unavailable right now.");
    }
  });
