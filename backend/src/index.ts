import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.js";
import { authMiddleware } from "./middleware/auth.js";
import { prisma } from "./auth.js";
import { parseTransaction } from "./parsing.js";

const app = new Hono<{
    Variables: {
        user: any;
        session: any;
    };
}>();

app.use(
    "*",
    cors({
        origin: ["http://localhost:3000"],
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["POST", "GET", "OPTIONS"],
        exposeHeaders: ["Content-Length"],
        maxAge: 600,
        credentials: true,
    })
);

app.post("/api/auth/register", async (c) => {
    try {
        const { email, password, name } = await c.req.json();
        const signUpResponse = await auth.api.signUpEmail({
            body: { email, password, name },
            asResponse: false
        });

        if (!signUpResponse) return c.json({ error: "Registration failed" }, 400);

        const { user, token } = signUpResponse as any;
        if (!user) return c.json({ error: "No user returned" }, 500);

        let organization = null;
        if (token) {
            try {
                organization = await auth.api.createOrganization({
                    body: {
                        name: "Personal Workspace",
                        slug: `personal-${user.id.slice(0, 8)}`,
                    },
                    headers: {
                        "authorization": `Bearer ${token}`
                    }
                });
            } catch (orgError: any) {
                // Organization creation failed, but user is created
            }
        }

        return c.json({ user, token, organization }, 200);

    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

app.post("/api/auth/login", async (c) => {
    const { email, password } = await c.req.json();
    const res = await auth.api.signInEmail({
        body: { email, password },
        asResponse: true,
    });
    res.headers.forEach((value, key) => {
        c.header(key, value);
    });
    const data = await res.json();
    return c.json(data, res.status as any);
});

app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/api/transactions", authMiddleware, async (c) => {
    const user = c.get("user") as any;
    const take = Number(c.req.query("take")) || 10;
    const cursor = c.req.query("cursor");

    const where: any = { userId: user.id };
    const orgId = c.req.header("x-organization-id");
    if (orgId) where.organizationId = orgId;

    const transactions = await prisma.transaction.findMany({
        take,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } as any : undefined,
        where,
        orderBy: { date: 'desc' },
    });

    const nextCursor = transactions.length === take ? transactions[transactions.length - 1]?.id ?? null : null;

    return c.json({
        data: transactions,
        nextCursor
    });
});

app.get("/api/transactions/balance", authMiddleware, async (c) => {
    const user = c.get("user") as any;
    const where: any = { userId: user.id };
    const orgId = c.req.header("x-organization-id");
    if (orgId) where.organizationId = orgId;

    const result = await prisma.transaction.aggregate({
        where,
        _sum: { amount: true }
    });

    return c.json({
        balance: result._sum.amount ?? 0
    });
});

app.post("/api/transactions/extract", authMiddleware, async (c) => {
    const user = c.get("user") as any;
    const { text, organizationId } = await c.req.json();

    const targetOrgId = organizationId || c.req.header("x-organization-id");

    if (!targetOrgId) {
        const member = await prisma.member.findFirst({
            where: { userId: user.id }
        });
        if (!member) return c.json({ error: "No organization found for user" }, 400);
    }

    const orgIdToUse = targetOrgId || (await prisma.member.findFirst({ where: { userId: user.id } }))?.organizationId;
    if (!orgIdToUse) return c.json({ error: "User has no organization" }, 400);

    const extracted = parseTransaction(text);
    if (!extracted) {
        return c.json({ error: "Could not extract transaction data", confidenceScore: 0.0 }, 422);
    }

    const transaction = await prisma.transaction.create({
        data: {
            ...extracted,
            userId: user.id,
            organizationId: orgIdToUse
        }
    });

    return c.json({
        success: true,
        transaction,
        confidenceScore: extracted.confidenceScore
    });
});

app.get("/", (c) => {
    return c.text("Vessify Backend is Running");
});

export { app };
export default app;

if (process.env.NODE_ENV !== 'test') {
    const port = 3001;
    console.log(`Server is running on port ${port}`);

    serve({
        fetch: app.fetch,
        port,
    });
}
