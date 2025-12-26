import { parseTransaction } from "../parsing.js";

describe("Transaction Parsing Logic", () => {
    test("Sample 1: Standard Format", () => {
        const text = `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`;
        
        const result = parseTransaction(text);
        expect(result).not.toBeNull();
        expect(result?.amount).toBe(-420.00);
        expect(result?.description).toBe("STARBUCKS COFFEE MUMBAI");
        
        // Check date components to avoid timezone issues with toISOString()
        expect(result?.date.getFullYear()).toBe(2025);
        expect(result?.date.getMonth()).toBe(11); // Dec is 11
        expect(result?.date.getDate()).toBe(11);
    });

    test("Sample 2: Plaintext Format", () => {
        const text = `Uber Ride Airport Drop
12/11/2025 ₹1,250.00 debited
Available Balance`;

        const result = parseTransaction(text);
        expect(result).not.toBeNull();
        expect(result?.amount).toBe(-1250.00); // Debited = negative
        expect(result?.description).toBe("Uber Ride Airport Drop");
        
        expect(result?.date.getFullYear()).toBe(2025);
        expect(result?.date.getMonth()).toBe(10); // Nov is 10
        expect(result?.date.getDate()).toBe(12);
    });

    test("Sample 3: Messy Format", () => {
        const text = `17.170.50
txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`;

        const result = parseTransaction(text);
        expect(result).not.toBeNull();
        expect(result?.amount).toBe(-2999.00); // Dr = negative
        expect(result?.description).toContain("Amazon.in Order");
        
        expect(result?.date.getFullYear()).toBe(2025);
        expect(result?.date.getMonth()).toBe(11); // Dec is 11
        expect(result?.date.getDate()).toBe(10);
    });
});
