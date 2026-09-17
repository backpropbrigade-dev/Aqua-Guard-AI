import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PORT = Number(process.env.PORT) || 3001;
const origins =
  process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean) ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: origins,
    allowHeaders: ["Content-Type", "X-Aquaguard-User"],
    credentials: true,
  }),
);

function userId(c: { req: { header: (n: string) => string | undefined } }): string | null {
  const v = c.req.header("X-Aquaguard-User")?.trim();
  return v || null;
}

app.get("/health", (c) => c.json({ ok: true }));

/** Load persisted citizen bundle (same JSON shape as SPA `UserBundle`). */
app.get("/citizen/bundle", async (c) => {
  const uid = userId(c);
  if (!uid) return c.json({ error: "Missing X-Aquaguard-User" }, 400);

  const row = await prisma.citizenBundle.findUnique({ where: { userId: uid } });
  if (!row) return c.body(null, 404);

  return c.json(row.bundle);
});

/** Create or replace bundle for this user. */
app.put("/citizen/bundle", async (c) => {
  const uid = userId(c);
  if (!uid) return c.json({ error: "Missing X-Aquaguard-User" }, 400);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return c.json({ error: "Bundle must be a JSON object" }, 400);
  }

  await prisma.citizenBundle.upsert({
    where: { userId: uid },
    create: { userId: uid, bundle: body as object },
    update: { bundle: body as object },
  });

  return c.json({ ok: true });
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`AquaGuard API listening on http://localhost:${info.port}`);
});
