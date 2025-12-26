
export interface TransactionData {
    date: Date;
    amount: number;
    description: string;
    originalText: string;
    confidenceScore: number;
}

export function parseTransaction(text: string): TransactionData | null {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return null;

    // Sample 1: Date, Description, Amount, key strings
    // Date: 11 Dec 2025
    // Description: STARBUCKS COFFEE MUMBAI
    // Amount: -420.00
    // Balance after transaction: 18,420.50
    if (text.includes("Description:") && text.includes("Amount:")) {
        return parseFormat1(text);
    }

    // Sample 2: Plaintext
    // Uber Ride Airport Drop
    // 12/11/2025 ₹1,250.00 debited
    // Available Balance
    // Check for lines with "debited" or "credited" or currency symbols
    const debitedLine = lines.find(l => l.includes("debited") || l.includes("credit"));
    if (debitedLine) {
        return parseFormat2(lines);
    }

    // Sample 3 (Messy):
    // 17.170.50
    // txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping
    // One long line with Date, text, amount, Dr/Cr.
    const complexLine = lines.find(l => /\d{4}-\d{2}-\d{2}/.test(l) && (l.includes("Dr") || l.includes("Cr") || l.includes("₹")));
    if (complexLine) {
        return parseFormat3(complexLine, text);
    }

    return null;
}

function parseFormat1(text: string): TransactionData | null {
    const dateMatch = text.match(/Date:\s*(.+)/);
    const descMatch = text.match(/Description:\s*(.+)/);
    const amountMatch = text.match(/Amount:\s*(-?[\d,.]+)/);

    if (!dateMatch || !dateMatch[1] || !descMatch || !descMatch[1] || !amountMatch || !amountMatch[1]) return null;

    const dateStr = dateMatch[1].trim();
    const desc = descMatch[1].trim();
    const amountStr = amountMatch[1].trim().replace(/,/g, '');
    let amount = parseFloat(amountStr);

    return {
        date: new Date(dateStr),
        amount: amount,
        description: desc,
        originalText: text,
        confidenceScore: 0.95
    };
}

function parseFormat2(lines: string[]): TransactionData | null {
    // Uber Ride Airport Drop
    // 12/11/2025 ₹1,250.00 debited
    // Available Balance

    // Description is likely first line?
    const description = lines[0]; // Heuristic

    // Line 2 has Date and Amount
    const detailsLine = lines.find(l => /\d{1,2}\/\d{1,2}\/\d{4}/.test(l));
    if (!detailsLine) return null;

    // "12/11/2025 ₹1,250.00 debited"
    const dateMatch = detailsLine.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    const amountMatch = detailsLine.match(/[₹$]((?:[\d,]+)(?:\.\d+)?)/);

    if (!dateMatch || !dateMatch[1] || !amountMatch || !amountMatch[1]) return null;

    const [d, m, y] = dateMatch[1].split('/');
    const date = new Date(`${y}-${m}-${d}`); // YYYY-MM-DD

    const amountStr = amountMatch[1].replace(/,/g, '');
    let amount = parseFloat(amountStr);
    if (detailsLine.toLowerCase().includes("debited")) {
        amount = -amount; // Expense
    }

    return {
        date,
        amount,
        description: description || "Unknown description",
        originalText: lines.join('\n'),
        confidenceScore: 0.85
    };
}

function parseFormat3(line: string, fullText: string): TransactionData | null {
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
    const amountMatch = line.match(/[₹$]((?:[\d,]+)(?:\.\d+)?)/);

    // Check existence
    if (!dateMatch || !dateMatch[1] || !amountMatch || !amountMatch[0] || !amountMatch[1]) return null;

    // Use ! assertion since we checked above
    const dateStr = dateMatch[1]!;
    const amountSymbol = amountMatch[0]!;
    const amountValStr = amountMatch[1]!;

    const date = new Date(dateStr);
    const amountStr = amountValStr.replace(/,/g, '');
    let amount = parseFloat(amountStr);

    if (line.includes(" Dr")) {
        amount = -amount;
    }

    const dateIndex = line.indexOf(dateStr);
    const amountIndex = line.indexOf(amountSymbol);

    let desc = "";
    if (dateIndex !== -1 && amountIndex !== -1 && amountIndex > dateIndex) {
        desc = line.substring(dateIndex + dateStr.length, amountIndex).trim();
    } else {
        desc = fullText.slice(0, 50); // Fallback
    }

    return {
        date,
        amount,
        description: desc,
        originalText: fullText,
        confidenceScore: 0.80
    };
}
