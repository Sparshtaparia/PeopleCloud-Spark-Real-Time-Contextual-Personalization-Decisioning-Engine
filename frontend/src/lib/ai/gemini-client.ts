import { z } from "zod"

export const CreativeVariantSchema = z.object({
  strategy: z.string(),
  headline: z.string().min(5).max(120),
  body: z.string().min(10).max(500),
  cta: z.string().min(2).max(30),
  subject: z.string().max(150).optional(),
  preheader: z.string().max(150).optional(),
  personalizationReason: z.string().max(200).optional(),
})

export const CreativeBatchSchema = z.object({
  variants: z.array(CreativeVariantSchema).min(1).max(5),
})

export const ExperimentSummarySchema = z.object({
  summary: z.string().min(10).max(1000),
  recommendation: z.string().min(10).max(500),
  keyInsight: z.string().min(10).max(300),
})

export type CreativeVariantOutput = z.infer<typeof CreativeVariantSchema>
export type CreativeBatchOutput = z.infer<typeof CreativeBatchSchema>
export type ExperimentSummaryOutput = z.infer<typeof ExperimentSummarySchema>

export interface GeminiConfig {
  apiKey?: string
  model?: string
  temperature?: number
  maxRetries?: number
}

export class GeminiClient {
  private config: GeminiConfig
  private isAvailable: boolean

  constructor(config: GeminiConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.GEMINI_API_KEY || "",
      model: config.model || "gemini-2.5-flash",
      temperature: config.temperature ?? 0.7,
      maxRetries: config.maxRetries ?? 2,
    }
    const key = this.config.apiKey || ""
    this.isAvailable = key.length > 0 && !key.startsWith("mock_")
  }

  get available(): boolean {
    return this.isAvailable
  }

  async generateCreative(
    prompt: string,
    schema: z.ZodSchema<CreativeBatchOutput> = CreativeBatchSchema
  ): Promise<CreativeBatchOutput> {
    if (!this.isAvailable) {
      throw new GeminiError("Gemini API key not configured or mock key detected", "UNAVAILABLE")
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.config.maxRetries!; attempt++) {
      try {
        const response = await this.callAPI(prompt)
        const parsed = this.parseResponse(response, schema)
        return parsed
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < this.config.maxRetries!) {
          await sleep(1000 * (attempt + 1))
        }
      }
    }

    throw lastError || new GeminiError("Creative generation failed after retries", "GENERATION_FAILED")
  }

  async generateExperimentSummary(
    prompt: string
  ): Promise<ExperimentSummaryOutput> {
    if (!this.isAvailable) {
      throw new GeminiError("Gemini API key not configured", "UNAVAILABLE")
    }

    const response = await this.callAPI(prompt)
    return this.parseResponse(response, ExperimentSummarySchema)
  }

  async generateNaturalLanguageExplanation(
    context: string
  ): Promise<string> {
    if (!this.isAvailable) {
      throw new GeminiError("Gemini API key not configured", "UNAVAILABLE")
    }

    const prompt = `You are a marketing analytics explainer. Explain the following in plain language for a non-technical marketer. Keep it under 3 sentences:\n\n${context}`

    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const response = await this.callAPI(prompt)
        const cleaned = response
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim()
        if (cleaned.length <= 10) throw new GeminiError("Response too short", "EMPTY_RESPONSE")
        return cleaned
      } catch (err) {
        const isRateLimit = err instanceof GeminiError && err.code === "RATE_LIMITED"
        if (isRateLimit) throw err
        if (attempt < 1) await sleep(1000)
      }
    }

    throw new GeminiError("Explanation generation failed", "GENERATION_FAILED")
  }

  private async callAPI(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: 2048,
        },
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => "Unknown")
      const isRateLimit = res.status === 429
      throw new GeminiError(
        `Gemini API error ${res.status}: ${errBody}`,
        isRateLimit ? "RATE_LIMITED" : "API_ERROR"
      )
    }

    const data = await res.json()

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new GeminiError("Empty response from Gemini", "EMPTY_RESPONSE")
    }

    return text
  }

  private parseResponse<T>(text: string, schema: z.ZodSchema<T>): T {
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      const extracted = this.extractJSON(cleaned)
      if (extracted) {
        try {
          parsed = JSON.parse(extracted)
        } catch {
          throw new GeminiError("Failed to parse Gemini response as JSON", "PARSE_ERROR")
        }
      } else {
        throw new GeminiError("Failed to parse Gemini response as JSON", "PARSE_ERROR")
      }
    }

    const result = schema.safeParse(parsed)
    if (!result.success) {
      throw new GeminiError(
        `Zod validation failed: ${result.error.message}`,
        "VALIDATION_ERROR"
      )
    }

    return result.data
  }

  private extractJSON(text: string): string | null {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? match[0] : null
  }
}

export class GeminiError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = "GeminiError"
    this.code = code
  }
}

export function getGeminiClient(): GeminiClient {
  return new GeminiClient()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
