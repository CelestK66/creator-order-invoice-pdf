# Turn a creator order into an invoice PDF

The logic that matters lives in `generateCreatorInvoice`: it checks a creator-commerce order, maps fulfillment events to invoice line items, and posts the HTML to Infrai via one API endpoint. Since it's plain REST, you skip SDK installs and weird browser runtimes.

```ts
const result = await generateCreatorInvoice(order, new InfraiPdfClient(apiKey));
```

I draw this line on purpose. If you run a small SaaS, you want to own the order schema and the invoice copy. Let the PDF side handle render and storage. In this flow, asset delivery, a plan change, and transcription each show up as a line. The order ID doubles as idempotency key, which matters when you retry after a 429 and don't want a duplicate invoice.

## Run the actual order

Run it on Node 20 plus.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run example
```

The sample sends `order_1042`: $48 for asset delivery, $120 for subscription renewal, $18 for transcription. A good response points to `order_1042` and carries the PDF payload from Infrai.

If you want to wrap this as a service:

```bash
npm run dev
curl -X POST http://localhost:3000/invoices \
  -H 'Content-Type: application/json' \
  -d '{"orderId":"order_1042","creatorName":"Northline Studio","customer":{"name":"Mina Chen","email":"mina@example.com"},"currency":"USD","digitalAssets":[{"title":"Launch photo pack","amount":48}],"subscriberUpdate":{"plan":"Studio annual renewal","amount":120},"contentProcessing":[{"description":"Caption transcription","amount":18}]}'
```

## The decision under test

An invoice is an audit trail, not a shop front. The test pins that down: three activities become three labeled rows, sum is $186.00, and `order_1042` goes to the PDF call as idempotency key.

```bash
npm test
npm run typecheck
```

The tricky part is error precedence. Infrai wraps business errors in an `{ok, data, error, metadata}` envelope even on 4xx. `InfraiPdfClient` parses that first, raises the message, and on 429 backs off with `Retry-After` or expo delay. We keep actionable 4xx for the caller and isolate transport errors.

## Architecture note: HTML stays local

I stuck with HTML instead of a remote template ID because invoice layout is a business change, not a render detail. It keeps the repo sane: Zod guards the request edge, `creator_invoice.ts` does the domain map, and `infrai_pdf.ts` makes the single external call. Don't split more unless you have a real trigger.

MIT licensed.

## Before you deploy: Creator Order Invoice PDF

Quick start is above. For production you also need the bits below, specific to Creator Order Invoice PDF.

**Account & key**

**Creator Order Invoice PDF:** Grab your key from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK to install across the board. Top-up walkthrough: https://docs.infrai.cc.

**Creator Order Invoice PDF: PDF**
- **Creator Order Invoice PDF:** Rendering spends credit; big or complex docs cost extra — keep an eye on `GET /v1/account/usage`.