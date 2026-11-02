import { z } from 'zod';

export type RecipeDraft = {
  title: string;
  description: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  cuisine: string | null;
  course: string | null;
  tags: string[];
  ingredients: { group: string | null; raw: string }[];
  steps: { group: string | null; text: string }[];
  notes: string | null;
  sourceUrl: string | null;
  imageUrls: string[];
};

const str = z.string().max(4000);
const minutes = z.number().int().min(0).max(100000).nullable();

export const recipeDraftSchema = z.object({
  title: z.string().min(1).max(200),
  description: str.nullable(),
  servings: z.number().min(0).max(10000).nullable(),
  prepMinutes: minutes,
  cookMinutes: minutes,
  cuisine: z.string().max(200).nullable(),
  course: z.string().max(200).nullable(),
  tags: z.array(z.string().max(100)).max(50),
  ingredients: z
    .array(z.object({ group: z.string().max(200).nullable(), raw: str }))
    .max(200),
  steps: z
    .array(z.object({ group: z.string().max(200).nullable(), text: str }))
    .max(100),
  notes: str.nullable(),
  sourceUrl: z.string().max(2000).nullable(),
  imageUrls: z.array(z.string().max(2000)).max(20),
}) satisfies z.ZodType<RecipeDraft>;
