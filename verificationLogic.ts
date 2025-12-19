import { ApplicationForm, ExtractedData, ValidationResult, DocumentType } from "../types";

// Helper for fuzzy string matching
const isNameMatch = (name1: string, name2: string): boolean => {
    if (!name1 || !name2) return false;
    // Remove special chars, extra spaces, and convert to lower case
    const n1 = name1.toLowerCase().replace(/[^a-z ]/g, "").trim().split(/\s+/);
    const n2 = name2.toLowerCase().replace(/[^a-z ]/g, "").trim().split(/\s+/);
    
    // Check intersection of name parts
    const overlap = n1.filter(part => n2.includes(part));
    
    // Pass if at least 2 parts match (First + Last), or if both only have 1 part and it matches
    const requiredMatches = (n1.length === 1 || n2.length === 1) ? 1 : 2;
    return overlap.length >= requiredMatches;
};

const normalizeDate = (dateStr: string) => {
    return new Date(dateStr).toISOString().split('T')[0];
}

export const validateIdAgainstForm = (
    idData: ExtractedData, 
    form: ApplicationForm
): ValidationResult => {
    const idName = idData.fields.fullName;
    const idDob = idData.fields.dateOfBirth;
    const expiryDateStr = idData.fields.expiryDate;

    let details = "";
    let passed = true;

    // 1. Expiry Check
    if (expiryDateStr) {
        const expiry = new Date(expiryDateStr);
        const now = new Date();
        // Reset time part for accurate date comparison
        now.setHours(0,0,0,0);
        
        if (isNaN(expiry.getTime())) {
             details += `Invalid expiry date format (${expiryDateStr}). `;
        } else if (expiry < now) {
            passed = false;
            details += `ID Document is expired (Expiry: ${expiryDateStr}). `;
        }
    } else {
        // Warning but maybe not failure if AI just missed it, but strictly should be present
        details += "Expiry date not detected. ";
    }

    // 2. Name Matching
    const formName = `${form.firstName} ${form.lastName}`;
    if (!isNameMatch(idName, formName)) {
        passed = false;
        details += `Name mismatch (ID: "${idName}" vs Form: "${formName}"). `;
    }

    // 3. DOB Matching
    // We expect YYYY-MM-DD from the AI.
    if (idDob !== form.dateOfBirth) {
         passed = false;
         details += `DOB mismatch (ID: ${idDob} vs Form: ${form.dateOfBirth}). `;
    }

    if (passed) {
        return { passed: true, details: "ID is valid, unexpired, and matches application details." };
    }
    
    return { passed: false, details: details.trim() };
};

export const validateIncome = (
    payslips: ExtractedData[],
    bankStatement: ExtractedData
): ValidationResult => {
    const bankName = bankStatement.fields.accountHolderName;
    const transactions = bankStatement.fields.transactions || [];
    
    // 1. Check Name consistency on Bank Statement (vs first payslip for reference)
    if (payslips.length > 0) {
        const payslipName = payslips[0].fields.employeeName;
        if (payslipName && bankName && !isNameMatch(payslipName, bankName)) {
            return { passed: false, details: `Name mismatch between Payslip (${payslipName}) and Bank Statement (${bankName}).` };
        }
    }

    // 2. Check Net Income transactions
    const mismatches: string[] = [];
    let matchesFound = 0;

    for (const payslip of payslips) {
        const netPay = parseFloat(payslip.fields.netIncome);
        const payDate = new Date(payslip.fields.payDate);
        
        if (isNaN(netPay)) {
            mismatches.push(`Could not parse net income from payslip dated ${payslip.fields.payDate}.`);
            continue;
        }

        // Look for a credit transaction within -3 to +5 days of payDate matching amount
        const found = transactions.find((t: any) => {
            if (!t.date) return false;
            const tDate = new Date(t.date);
            const dateDiff = (tDate.getTime() - payDate.getTime()) / (1000 * 3600 * 24);
            const amountDiff = Math.abs(t.amount - netPay);
            
            // Allow 1.00 currency unit difference and wider date range for bank processing
            return t.type === 'CREDIT' && amountDiff < 1.5 && dateDiff >= -3 && dateDiff <= 5;
        });

        if (found) {
            matchesFound++;
        } else {
            mismatches.push(`No matching deposit of ${netPay} found around ${payslip.fields.payDate}.`);
        }
    }

    if (mismatches.length > 0) {
        return { passed: false, details: `Income verification issues: ${mismatches.join(" ")}` };
    }

    return { passed: true, details: `Successfully verified ${matchesFound} payslip payments against bank statement transactions.` };
};

export const validateAddress = (
    proofDoc: ExtractedData,
    form: ApplicationForm
): ValidationResult => {
    const docAddress = proofDoc.fields.address || "";
    // Normalize logic
    const nDoc = docAddress.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const zipCode = form.zipCode.toLowerCase().replace(/[^a-z0-9]/g, "");
    const street = form.addressLine1.toLowerCase().split(" ")[0].replace(/[^a-z0-9]/g, ""); // Check first part of street usually

    // Check if zip code is present
    const zipMatch = nDoc.includes(zipCode);
    
    // Check street overlap (simplistic)
    const streetMatch = nDoc.includes(street);

    if (zipMatch && streetMatch) {
        return { passed: true, details: "Address document matches application details." };
    }

    return { passed: false, details: `Address mismatch. Document address "${docAddress}" does not sufficiently match form details.` };
};