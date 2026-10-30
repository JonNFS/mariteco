/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

let supabaseHost = null;
try {
  supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
} catch {}

// CSP — inclui os domínios do Mercado Pago necessários para o formulário de cartão embutido (Bricks)
// e para o identificador antifraude. ⚠ Teste o cartão no ambiente de testes após o deploy: se o
// navegador (F12 > Console) mostrar "Refused to ... Content Security Policy", acrescente o domínio citado.
const MP = 'https://*.mercadopago.com https://*.mercadopago.com.br https://*.mercadolibre.com https://*.mlstatic.com';
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} ${MP}`,
  `style-src 'self' 'unsafe-inline' ${MP}`,
  `img-src 'self' data: blob: https://*.supabase.co ${MP}`,
  `font-src 'self' data: ${MP}`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${MP}${isDev ? ' ws:' : ''}`,
  `frame-src ${MP}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
