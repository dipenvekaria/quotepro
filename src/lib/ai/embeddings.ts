import { embeddingClient } from './gemini'

/**
 * Text → vector, for catalog search.
 *
 * The dimension is fixed at 768 by `document_embeddings.embedding vector(768)`.
 * That column was created long before anything wrote to it, and changing it now
 * would mean re-embedding every row in every company, so the model is chosen to
 * fit the schema rather than the other way round.
 *
 * Every function here returns null rather than throwing. A missing key or a bad
 * response must degrade quoting to the keyword path it already has, not take it
 * down — the same contract the rest of `src/lib/ai` keeps.
 */

export const EMBEDDING_DIMS = 768
const EMBEDDING_MODEL = 'text-embedding-004'

/** Vertex rejects oversized batches; this is comfortably inside the limit. */
const BATCH = 100

/**
 * What a catalog item looks like to a search.
 *
 * Name, description and category together, because a contractor searching
 * "thermostat" should find "Ecobee Smart" whose name never says thermostat, and
 * one searching "electrical" should find the category. Price is deliberately
 * left out: it is not what anyone searches by, and it would make the embedding
 * churn on every price rise.
 */
export function catalogItemText(item: {
  name: string
  description?: string | null
  category?: string | null
}): string {
  return [item.name, item.category, item.description].filter(Boolean).join(' — ')
}

/** One vector, or null if embedding is unavailable. */
export async function embedText(text: string): Promise<number[] | null> {
  const [v] = (await embedTexts([text])) ?? []
  return v ?? null
}

/**
 * Vectors for many texts, in input order.
 *
 * Returns null if the call fails at all — a partially embedded catalog is worse
 * than an unembedded one, because search silently returns only the half that
 * worked and looks like a thin price book rather than a broken index.
 */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return []
  const ai = embeddingClient()
  if (!ai) return null

  const out: number[][] = []
  try {
    for (let i = 0; i < texts.length; i += BATCH) {
      const chunk = texts.slice(i, i + BATCH)
      const res = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: chunk,
        config: { outputDimensionality: EMBEDDING_DIMS },
      })

      const vectors = res.embeddings?.map((e) => e.values ?? [])
      if (!vectors || vectors.length !== chunk.length) {
        console.error('embedding batch returned the wrong count', vectors?.length, chunk.length)
        return null
      }
      for (const v of vectors) {
        if (v.length !== EMBEDDING_DIMS) {
          console.error('embedding has the wrong dimension', v.length)
          return null
        }
        out.push(v)
      }
    }
    return out
  } catch (e) {
    console.error('embedding failed', e)
    return null
  }
}

/** pgvector's literal form: `[0.1,0.2,…]`. */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`
}
