import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/checkout', '/conta', '/sacola', '/pedido', '/entrar'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
