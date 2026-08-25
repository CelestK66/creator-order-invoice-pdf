import { generateCreatorInvoice } from "../src/creator_invoice.js";
import { InfraiPdfClient } from "../src/infrai_pdf.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the example");

const result = await generateCreatorInvoice({
  orderId: "order_1042",
  creatorName: "Northline Studio",
  customer: { name: "Mina Chen", email: "mina@example.com" },
  currency: "USD",
  digitalAssets: [{ title: "Launch photo pack", amount: 48 }],
  subscriberUpdate: { plan: "Studio annual renewal", amount: 120 },
  contentProcessing: [{ description: "Caption transcription", amount: 18 }]
}, new InfraiPdfClient(apiKey));

console.log(JSON.stringify({ orderId: "order_1042", pdf: result }, null, 2));
