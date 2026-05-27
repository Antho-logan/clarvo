import { describe, expect, it, vi } from "vitest";

import {
  createCustomer,
  type CustomerDb,
  isOwnerEmail,
  listCustomers,
  validateCustomerInput,
} from "@/lib/admin-customers";

function createDb(existingRows: Array<Record<string, unknown>> = []) {
  const insertedRows: Array<Record<string, unknown>> = [];
  const query = vi.fn(async (sql: string, values?: unknown[]) => {
    if (sql.includes("SELECT id FROM users")) {
      const email = String(values?.[0] || "").toLowerCase();
      const row = existingRows.find(
        (item) => String(item.email).toLowerCase() === email,
      );
      return { rowCount: row ? 1 : 0, rows: row ? [row] : [] };
    }
    if (sql.includes("INSERT INTO users")) {
      insertedRows.push({
        name: values?.[0],
        email: values?.[1],
        password_hash: values?.[2],
      });
      return { rowCount: 1, rows: [{ id: "user-new" }] };
    }
    if (sql.includes("FROM users")) {
      return { rowCount: existingRows.length, rows: existingRows };
    }
    return { rowCount: 0, rows: [] };
  });
  return { db: { query } as unknown as CustomerDb, insertedRows, query };
}

describe("admin customer management", () => {
  it("recognizes only configured owner emails", () => {
    expect(isOwnerEmail("AnthonyLogan1995@gmail.com")).toBe(true);
    expect(isOwnerEmail("customer@example.com")).toBe(false);
  });

  it("rejects invalid customer emails before writing", () => {
    expect(() =>
      validateCustomerInput({ email: "not-an-email", name: "Customer" }),
    ).toThrow(/valid email/i);
  });

  it("rejects duplicate customer emails", async () => {
    const { db } = createDb([{ id: "user-1", email: "demo@example.com" }]);

    await expect(
      createCustomer(
        { email: "DEMO@example.com", name: "Demo" },
        { db, temporaryPassword: "TempPassword12!" },
      ),
    ).rejects.toThrow(/already exists/i);
  });

  it("creates a customer with a hashed temporary password", async () => {
    const { db, insertedRows } = createDb();

    const result = await createCustomer(
      { email: " New.Customer@Example.com ", name: "New Customer" },
      { db, temporaryPassword: "TempPassword12!" },
    );

    expect(result.email).toBe("new.customer@example.com");
    expect(result.temporaryPassword).toBe("TempPassword12!");
    expect(insertedRows[0].email).toBe("new.customer@example.com");
    expect(String(insertedRows[0].password_hash)).not.toBe("TempPassword12!");
    expect(String(insertedRows[0].password_hash)).toMatch(/^\$argon2/);
  });

  it("lists customers with derived owner/customer roles", async () => {
    const { db } = createDb([
      {
        id: "owner",
        email: "anthonylogan1995@gmail.com",
        name: "Anthony Logan",
        created_at: "2026-05-01T10:00:00Z",
      },
      {
        id: "customer",
        email: "customer@example.com",
        name: "Customer",
        created_at: "2026-05-02T10:00:00Z",
      },
    ]);

    const customers = await listCustomers(db);

    expect(customers).toEqual([
      expect.objectContaining({ email: "anthonylogan1995@gmail.com", role: "Owner" }),
      expect.objectContaining({ email: "customer@example.com", role: "Customer" }),
    ]);
  });
});
