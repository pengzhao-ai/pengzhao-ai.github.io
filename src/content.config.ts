import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const metadataDefinition = () =>
  z
    .object({
      title: z.string().optional(),
      ignoreTitleTemplate: z.boolean().optional(),

      canonical: z.url().optional(),

      robots: z
        .object({
          index: z.boolean().optional(),
          follow: z.boolean().optional(),
        })
        .optional(),

      description: z.string().optional(),

      openGraph: z
        .object({
          url: z.string().optional(),
          siteName: z.string().optional(),
          images: z
            .array(
              z.object({
                url: z.string(),
                width: z.number().optional(),
                height: z.number().optional(),
              })
            )
            .optional(),
          locale: z.string().optional(),
          type: z.string().optional(),
        })
        .optional(),

      twitter: z
        .object({
          handle: z.string().optional(),
          site: z.string().optional(),
          cardType: z.string().optional(),
        })
        .optional(),
    })
    .optional();

const postCollection = defineCollection({
  loader: glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/post' }),
  schema: z.object({
    publishDate: z.date().optional(),
    updateDate: z.date().optional(),
    draft: z.boolean().optional(),

    title: z.string(),
    excerpt: z.string().optional(),
    image: z.string().optional(),
    /** Alternative text for the cover image. Leave empty for decorative stock photos. */
    imageAlt: z.string().optional(),

    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),

    metadata: metadataDefinition(),
  }),
});

const projectCollection = defineCollection({
  loader: glob({
    pattern: '*.mdx',
    base: 'src/content/projects',
    // Pin the id to the bare filename so `entry.id` is always the URL slug.
    // The default id derivation differs by Astro version and for some
    // extensions retains the `.mdx`; three call sites depend on this value
    // (the card link, the getStaticPaths param, and the verify-build check),
    // so it is stated here rather than inferred.
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    year: z.number(),
    role: z.string().optional(),
    status: z.enum(['shipped', 'in-progress', 'research']).optional(),
    /** Tech-stack tags, rendered as badges on the card. */
    stack: z.array(z.string()).default([]),
    /** Hardware components / parts list, rendered as a mono spec list. */
    components: z.array(z.string()).default([]),
    repo: z.url().optional(),
    demo: z.url().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    featured: z.boolean().default(false),
    /** Sort order, descending. Higher first. */
    weight: z.number().default(0),
  }),
});

export const collections = {
  post: postCollection,
  project: projectCollection,
};
