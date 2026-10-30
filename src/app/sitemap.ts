import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/constants';
import { getProducts } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts({});
  return [
    { url: SITE.url, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.url}/loja`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE.url}/privacidade`, priority: 0.2 },
    { url: `${SITE.url}/termos`, priority: 0.2 },
    ...products.map((p) => ({ url: `${SITE.url}/produto/${p.slug}`, lastModified: p.created_at, priority: 0.7 })),
  ];
}
