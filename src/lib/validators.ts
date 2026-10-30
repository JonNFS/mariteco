import { z } from 'zod';
import { UFS } from './constants';
import { isValidCpf } from './cpf';

const digits = (s: string) => s.replace(/\D/g, '');

export const cepSchema = z
  .string()
  .transform(digits)
  .refine((v) => /^\d{8}$/.test(v), 'CEP inválido');

export const uuidSchema = z.string().uuid();

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(254),
  password: z.string().min(1, 'Informe a senha').max(72),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(80),
  phone: z
    .string()
    .transform(digits)
    .refine((v) => v.length >= 10 && v.length <= 13, 'Informe seu WhatsApp com DDD'),
  accept: z.literal('on', { message: 'Aceite os termos e a política de privacidade para criar a conta' }),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(254),
  password: z
    .string()
    .min(8, 'A senha precisa ter pelo menos 8 caracteres')
    .max(72, 'Senha muito longa')
    .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Use letras e números na senha'),
});

export const checkoutSchema = z.object({
  recipient: z.string().trim().min(2, 'Informe o nome de quem vai receber').max(80),
  phone: z
    .string()
    .transform(digits)
    .refine((v) => v.length >= 10 && v.length <= 13, 'Telefone inválido'),
  cep: cepSchema,
  street: z.string().trim().min(2, 'Informe a rua').max(120),
  number: z.string().trim().min(1, 'Informe o número').max(10),
  complement: z.string().trim().max(60).optional().default(''),
  neighborhood: z.string().trim().min(2, 'Informe o bairro').max(80),
  city: z.string().trim().min(2, 'Informe a cidade').max(80),
  state: z.string().trim().toUpperCase().refine((v) => (UFS as readonly string[]).includes(v), 'UF inválida'),
  shipping: z.enum(['retirada', 'local', 'economico', 'expresso']),
});

const imagePath = z
  .string()
  .max(200)
  .refine(
    (p) => /^products\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif)$/i.test(p) || /^\/demo\/[a-z0-9-]+\.(webp|jpg|png)$/.test(p),
    'Caminho de imagem inválido',
  );

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Nome muito curto').max(120),
  description: z.string().trim().max(4000).default(''),
  categoryId: z.string().uuid().nullable(),
  gender: z.enum(['menina', 'menino', 'unissex']),
  sizeType: z.enum(['roupa', 'calcado', 'unico']),
  priceCents: z.number().int().min(1, 'Informe o preço').max(10_000_00),
  compareAtCents: z.number().int().max(10_000_00).nullable(),
  weightGrams: z.number().int().min(10).max(30000),
  active: z.boolean(),
  featured: z.boolean(),
  variants: z
    .array(z.object({ size: z.string().trim().min(1).max(12), stock: z.number().int().min(0).max(100000) }))
    .min(1, 'Cadastre pelo menos um tamanho')
    .max(40),
  images: z.array(imagePath).max(8),
});
export type ProductInput = z.infer<typeof productSchema>;

const trimmed = (max: number) => z.string().trim().max(max);

/** Entrada do checkout v2. Repare: NÃO existe nenhum campo de preço/total — o servidor calcula tudo. */
export const payOrderSchema = checkoutSchema.extend({
  orderId: z.string().uuid().optional(),                       // retomar um pedido já criado (nova tentativa)
  cpf: z.string().transform(digits).refine(isValidCpf, 'CPF inválido'),
  couponCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{0,32}$/, 'Cupom inválido').optional().default(''),
  giftWrap: z.coerce.boolean().optional().default(false),
  giftFrom: trimmed(60).optional().default(''),
  giftTo: trimmed(60).optional().default(''),
  giftMessage: trimmed(200).optional().default(''),
  method: z.enum(['pix', 'credit_card', 'boleto']),
  card: z
    .object({
      token: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/, 'Cartão inválido'),
      paymentMethodId: z.string().regex(/^[a-z0-9_]{2,30}$/, 'Bandeira inválida'),
      installments: z.coerce.number().int().min(1).max(12),
    })
    .optional(),
  deviceId: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/).optional(),
  accept: z.literal(true, { message: 'Aceite os termos para continuar' }),
}).refine((d) => d.method !== 'credit_card' || !!d.card, { message: 'Preencha os dados do cartão', path: ['card'] })
  .refine((d) => !d.giftWrap || (d.giftFrom && d.giftTo), { message: 'Informe quem envia e quem recebe o presente', path: ['giftFrom'] });

export const couponPreviewSchema = z.object({
  cep: cepSchema,
  shipping: z.enum(['retirada', 'local', 'economico', 'expresso']),
  couponCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{0,32}$/).optional().default(''),
  giftWrap: z.coerce.boolean().optional().default(false),
});
