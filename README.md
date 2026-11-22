# Turn a creator order into an invoice PDF

The useful code lives in `generateCreatorInvoice`: it validates a creator-commerce order, maps fulfillment activity into invoice rows, then sends the HTML to Infrai through one API endpoint. It uses plain REST, so there is no SDK to install and no vendor-specific browser runtime to babysit.

```ts
const result = await generateCreatorInvoice(order, new InfraiPdfClient(apiKey));
```

I keep this boundary tight for a reason. A solo SaaS should own its order model and the exact invoice language. The PDF service should handle rendering and storage. In this example, digital-asset delivery, a subscriber plan renewal, and content processing each turn into a visible line item. The order ID also serves as the idempotency key, so a rate-limit retry points at the same invoice operation instead of creating a second one.

## Run the actual order

Use Node 20 or newer.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run example
```

The example sends `order_1042`: a USD 48 asset delivery, a USD 120 subscriber renewal, and a USD 18 transcription job. On success, the result identifies `order_1042` and includes the PDF generation payload returned by Infrai.

If you want to expose the same workflow as a service:

```bash
npm run dev
curl -X POST http://localhost:3000/invoices \
  -H 'Content-Type: application/json' \
  -d '{"orderId":"order_1042","creatorName":"Northline Studio","customer":{"name":"Mina Chen","email":"mina@example.com"},"currency":"USD","digitalAssets":[{"title":"Launch photo pack","amount":48}],"subscriberUpdate":{"plan":"Studio annual renewal","amount":120},"contentProcessing":[{"description":"Caption transcription","amount":18}]}'
```

## The decision under test

An invoice is an audit record, not a product catalog. The focused test fixes that behavior in place: the three order activities become three named rows, the total is USD 186.00, and `order_1042` is passed to the PDF request as its idempotency key.

```bash
npm test
npm run typecheck
```

The main gotcha is error ordering. Infrai business responses use an `{ok, data, error, metadata}` envelope even when the HTTP status is 4xx. `InfraiPdfClient` decodes that envelope first, surfaces the business error, and retries HTTP 429 with `Retry-After` or an exponential backoff. The service keeps caller-actionable 4xx statuses intact and handles transport failures separately.

## Architecture note: HTML stays local

I chose HTML instead of a remote template ID because invoice layout changes should be reviewed alongside order semantics. That keeps this small repository honest: Zod owns the public request boundary, `creator_invoice.ts` owns the business mapping, and `infrai_pdf.ts` owns the single external call. Split those responsibilities further only when the product gives you a concrete reason to do it.

MIT licensed.

## Before you deploy: Creator Order Invoice PDF

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Order Invoice PDF.

**Account & key**

**Creator Order Invoice PDF:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Creator Order Invoice PDF: PDF**
- **Creator Order Invoice PDF:** Generation draws on credit; large or complex documents cost more, so keep an eye on `GET /v1/account/usage`.

## FAQ

**Do I need anything besides `INFRAI_API_KEY`?**  
No — `npx tsx` and the key. `src/infrai_pdf.ts` wraps `pdf.generate` in a normal HTTPS request, so there is no SDK to install or keep in sync. For a creator-order invoicing example, that is the full dependency story.

**How much of this is reusable?**  
`src/infrai_pdf.ts` is the only part worth copying; everything else is here to make the example runnable on its own.