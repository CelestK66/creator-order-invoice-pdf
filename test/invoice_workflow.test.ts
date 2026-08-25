import assert from "node:assert/strict";
import test from "node:test";
import { generateCreatorInvoice, invoiceLines } from "../src/creator_invoice.js";

const order = {
  orderId: "order_1042",
  creatorName: "Northline Studio",
  customer: { name: "Mina Chen", email: "mina@example.com" },
  currency: "USD",
  digitalAssets: [{ title: "Launch photo pack", amount: 48 }],
  subscriberUpdate: { plan: "Studio annual renewal", amount: 120 },
  contentProcessing: [{ description: "Caption transcription", amount: 18 }]
};

test("one creator order becomes three explicit invoice activities", async () => {
  let receivedHtml = "";
  let receivedKey = "";
  const result = await generateCreatorInvoice(order, {
    async generate(html, idempotencyKey) {
      receivedHtml = html;
      receivedKey = idempotencyKey;
      return { job_id: "job_example" };
    }
  });

  assert.deepEqual(invoiceLines(order).map((line) => line.description), [
    "Digital delivery: Launch photo pack",
    "Subscriber update: Studio annual renewal",
    "Content processing: Caption transcription"
  ]);
  assert.match(receivedHtml, /USD 186\.00/);
  assert.equal(receivedKey, "order_1042");
  assert.deepEqual(result, { job_id: "job_example" });
});
