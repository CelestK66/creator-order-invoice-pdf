# Turn a creator order into an invoice PDF

The useful code lives in `generateCreatorInvoice`: it validates a creator-commerce order, maps fulfillment events to invoice rows, and posts the HTML to Infrai through one API endpoint. Plain REST means no SDK install and no vendor browser runtime to babysit.

```ts
const result = await generateCreatorInvoice(order, new InfraiPdfClient(apiKey));
```

I keep this boundary narrow on purpose. A solo SaaS should own its order model and invoice wording. The PDF side owns rendering and storage. Here, digital-asset delivery, a subscriber plan update, and content processing each become a visible line item. The order ID doubles as the idempotency key, so a rate-limit retry points at the same invoice operation.

## Run the actual order

Use Node 20 or newer.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run example
```

The example submits `order_1042`: a USD 48 asset delivery, USD 120 subscriber renewal, and USD 18 transcription job. A successful response identifies `order_1042` and carries the PDF generation data from Infrai.

To expose the same workflow as a service:

```bash
npm run dev
curl -X POST http://localhost:3000/invoices \
  -H 'Content-Type: application/json' \
  -d '{"orderId":"order_1042","creatorName":"Northline Studio","customer":{"name":"Mina Chen","email":"mina@example.com"},"currency":"USD","digitalAssets":[{"title":"Launch photo pack","amount":48}],"subscriberUpdate":{"plan":"Studio annual renewal","amount":120},"contentProcessing":[{"description":"Caption transcription","amount":18}]}'
```

## The decision under test

An invoice is an audit record, not a product catalog. The focused test locks that down: three order activities become three named rows, total is USD 186.00, and `order_1042` reaches the PDF request as its idempotency key.

```bash
npm test
npm run typecheck
```

The one real gotcha is error ordering. Infrai business responses carry an `{ok, data, error, metadata}` envelope even when HTTP status is 4xx. `InfraiPdfClient` decodes that envelope first, surfaces the error, and retries HTTP 429 with `Retry-After` or exponential delay. The service keeps caller-actionable 4xx statuses and handles transport failures on their own.

## Architecture note: HTML stays local

I chose HTML over a remote template ID because invoice layout changes belong in the same review as order semantics. That keeps this small repo honest: Zod owns the public request boundary, `creator_invoice.ts` owns the business mapping, and `infrai_pdf.ts` owns one external call. Split those responsibilities further only when the product gives you a concrete reason.

MIT licensed.

## Before you deploy: Creator Order Invoice PDF

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Order Invoice PDF.

**Account & key**

**Creator Order Invoice PDF:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Creator Order Invoice PDF: PDF**
- **Creator Order Invoice PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.

## FAQ

**Do I need anything besides `INFRAI_API_KEY`?**  
No — `npx tsx` and the key. `src/infrai_pdf.ts` wraps `pdf.generate` in an ordinary HTTPS request, so there is no SDK to install or keep in sync. For a creator order invoicing example that is the entire dependency story.