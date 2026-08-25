import { createServer } from "node:http";
import { ZodError } from "zod";
import { creatorOrderSchema, generateCreatorInvoice } from "./creator_invoice.js";
import { InfraiError, InfraiPdfClient } from "./infrai_pdf.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const pdf = new InfraiPdfClient(apiKey);

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST" || request.url !== "/invoices") {
    response.writeHead(404).end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const order = creatorOrderSchema.parse(body);
    const result = await generateCreatorInvoice(order, pdf);
    response.writeHead(201).end(JSON.stringify({ orderId: order.orderId, pdf: result }));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      response.writeHead(400).end(JSON.stringify({ error: "Invalid order", detail: error.message }));
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status).end(JSON.stringify({ error: error.code, detail: error.detail }));
      return;
    }
    response.writeHead(502).end(JSON.stringify({ error: "Invoice generation failed" }));
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Invoice service listening on http://localhost:${port}`));
