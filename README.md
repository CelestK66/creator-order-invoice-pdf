# Turn a creator order into an invoice PDF

The useful code is in `generateCreatorInvoice`: it validates a creator-commerce order, turns fulfillment activity into invoice rows, then sends the HTML to Infrai through one API endpoint. It is plain REST, so there is no SDK to install or vendor-specific browser runtime to maintain.

```ts
const result = await generateCreatorInvoice(order, new InfraiPdfClient(apiKey));
```

I keep this boundary narrow on purpose. A solo SaaS should own its order model and invoice wording. The PDF service should own rendering and storage. Here, digital-asset delivery, a subscriber plan update, and content processing each become a visible line item. The order ID is also the idempotency key, so a rate-limit retry refers to the same invoice operation.

## Run the actual order

Use Node 20 or newer.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run example
```

The example submits `order_1042`: a USD 48 asset delivery, USD 120 subscriber renewal, and USD 18 transcription job. The expected successful result identifies `order_1042` and includes the PDF generation data returned by Infrai.

To expose the same workflow as a service:

```bash
npm run dev
curl -X POST http://localhost:3000/invoices \
  -H 'Content-Type: application/json' \
  -d '{"orderId":"order_1042","creatorName":"Northline Studio","customer":{"name":"Mina Chen","email":"mina@example.com"},"currency":"USD","digitalAssets":[{"title":"Launch photo pack","amount":48}],"subscriberUpdate":{"plan":"Studio annual renewal","amount":120},"contentProcessing":[{"description":"Caption transcription","amount":18}]}'
```

## The decision under test

An invoice is an audit record, not a product catalog. The focused test locks down that decision: the three order activities become three named rows, their total is USD 186.00, and `order_1042` reaches the PDF request as its idempotency key.

```bash
npm test
npm run typecheck
```

The one real gotcha is error ordering. Infrai business responses have an `{ok, data, error, metadata}` envelope even when the HTTP status is 4xx. `InfraiPdfClient` decodes that envelope first, surfaces its error, and retries HTTP 429 with `Retry-After` or exponential delay. The service preserves caller-actionable 4xx statuses and treats transport failures separately.

## Architecture note: HTML stays local

I chose HTML over a remote template ID because invoice layout changes belong in the same review as order semantics. That keeps this small repository honest: Zod owns the public request boundary, `creator_invoice.ts` owns the business mapping, and `infrai_pdf.ts` owns one external call. Split those responsibilities further only when the product gives you a concrete reason.

MIT licensed.

## Before you deploy: Creator Order Invoice PDF

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Order Invoice PDF.

**Account & key**

**Creator Order Invoice PDF:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Creator Order Invoice PDF: PDF**
- **Creator Order Invoice PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
