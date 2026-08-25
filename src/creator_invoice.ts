import { z } from "zod";
import type { PdfGenerator, PdfResult } from "./infrai_pdf.js";

const moneySchema = z.number().finite().nonnegative();

export const creatorOrderSchema = z.object({
  orderId: z.string().min(1),
  creatorName: z.string().min(1),
  customer: z.object({ name: z.string().min(1), email: z.string().email() }),
  currency: z.string().regex(/^[A-Z]{3}$/),
  digitalAssets: z.array(z.object({ title: z.string().min(1), amount: moneySchema })),
  subscriberUpdate: z.object({ plan: z.string().min(1), amount: moneySchema }).optional(),
  contentProcessing: z.array(z.object({ description: z.string().min(1), amount: moneySchema })).default([])
});

export type CreatorOrder = z.infer<typeof creatorOrderSchema>;

type InvoiceLine = { description: string; amount: number };

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
}[character] ?? character));

export function invoiceLines(order: CreatorOrder): InvoiceLine[] {
  return [
    ...order.digitalAssets.map((asset) => ({ description: `Digital delivery: ${asset.title}`, amount: asset.amount })),
    ...(order.subscriberUpdate
      ? [{ description: `Subscriber update: ${order.subscriberUpdate.plan}`, amount: order.subscriberUpdate.amount }]
      : []),
    ...order.contentProcessing.map((work) => ({ description: `Content processing: ${work.description}`, amount: work.amount }))
  ];
}

export function renderInvoice(order: CreatorOrder): string {
  const lines = invoiceLines(order);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const rows = lines.map((line) =>
    `<tr><td>${escapeHtml(line.description)}</td><td>${order.currency} ${line.amount.toFixed(2)}</td></tr>`
  ).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px sans-serif;color:#202124;padding:32px}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}td:last-child,th:last-child{text-align:right}.total{font-weight:700}</style></head><body><h1>Invoice ${escapeHtml(order.orderId)}</h1><p>${escapeHtml(order.creatorName)} → ${escapeHtml(order.customer.name)} (${escapeHtml(order.customer.email)})</p><table><thead><tr><th>Order activity</th><th>Amount</th></tr></thead><tbody>${rows}<tr class="total"><td>Total</td><td>${order.currency} ${total.toFixed(2)}</td></tr></tbody></table></body></html>`;
}

export async function generateCreatorInvoice(input: unknown, pdf: PdfGenerator): Promise<PdfResult> {
  const order = creatorOrderSchema.parse(input);
  return pdf.generate(renderInvoice(order), order.orderId);
}
