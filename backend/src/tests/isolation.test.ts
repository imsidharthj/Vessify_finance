import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// Mock modules before importing app
jest.unstable_mockModule("../auth.js", () => ({
    prisma: {
        transaction: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
        member: {
            findFirst: jest.fn(),
        }
    },
    auth: {
        handler: jest.fn(),
        api: {
            getSession: jest.fn(),
        }
    }
}));

jest.unstable_mockModule("../middleware/auth.js", () => ({
    authMiddleware: async (c: any, next: any) => {
        const userId = c.req.header("x-mock-user-id");
        if (userId) {
            c.set("user", { id: userId });
            c.set("session", { token: "mock-token" });
            await next();
        } else {
            return c.json({ error: "Unauthorized" }, 401);
        }
    }
}));

const { app } = await import("../index.js");
const { prisma } = await import("../auth.js") as any;

describe("Data Isolation & API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("GET /api/transactions rejects requests without auth header", async () => {
        const res = await app.request("/api/transactions", {
            method: "GET",
            headers: {}
        });

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe("Unauthorized");
    });

    test("GET /api/transactions filters by authenticated user ID", async () => {
        const userId = "user-123";
        prisma.transaction.findMany.mockResolvedValue([]);

        const res = await app.request("/api/transactions", {
            method: "GET",
            headers: { "x-mock-user-id": userId }
        });

        expect(res.status).toBe(200);
        const call = prisma.transaction.findMany.mock.calls[0][0];
        expect(call.where.userId).toBe(userId);
    });

    test("GET /api/transactions respects Organization isolation", async () => {
        const userId = "user-123";
        const orgId = "org-abc";
        prisma.transaction.findMany.mockResolvedValue([]);

        await app.request("/api/transactions", {
            method: "GET",
            headers: { "x-mock-user-id": userId, "x-organization-id": orgId }
        });

        const call = prisma.transaction.findMany.mock.calls[0][0];
        expect(call.where.userId).toBe(userId);
        expect(call.where.organizationId).toBe(orgId);
    });

    test("POST /api/transactions/extract saves data to correct User and Organization", async () => {
        const userId = "user-456";
        const orgId = "org-789";
        const text = `Date: 11 Dec 2025
Description: TEST TRANSACTION
Amount: -100.00
Balance: 500.00`;

        prisma.member.findFirst.mockResolvedValue({ organizationId: orgId });
        prisma.transaction.create.mockResolvedValue({ id: "tx-1" });

        const res = await app.request("/api/transactions/extract", {
            method: "POST",
            headers: { "x-mock-user-id": userId, "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        expect(res.status).toBe(200);
        const call = prisma.transaction.create.mock.calls[0][0];
        expect(call.data.userId).toBe(userId);
        expect(call.data.organizationId).toBe(orgId);
        expect(call.data.amount).toBe(-100.00);
        expect(call.data.description).toBe("TEST TRANSACTION");
    });
});
