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

// Helper to check if a transaction description contains the employer name (fuzzy)
const isEmployerInDescription = (employerName: string, description: string): boolean => {
    if (!employerName || !description) return false;
    
    const empParts = employerName.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter(w => w.length > 2);
    const desc = description.toLowerCase();

    // If any significant word from employer name is in description, we consider it a potential match
    // e.g. "Acme Corp" matches "ACH DEPOSIT ACME INC"
    return empParts.some(part => desc.includes(part));
};

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
        now.setHours(0,0,0,0);
        
        if (isNaN(expiry.getTime())) {
             details += `Invalid expiry date format (${expiryDateStr}). `;
        } else if (expiry < now) {
            passed = false;
            details += `ID Document is expired (Expiry: ${expiryDateStr}). `;
        }
    } else {
        details += "Expiry date not detected. ";
    }

    // 2. Name Matching
    const formName = `${form.firstName} ${form.lastName}`;
    if (!isNameMatch(idName, formName)) {
        passed = false;
        details += `Name mismatch (ID: "${idName}" vs Form: "${formName}"). `;
    }

    // 3. DOB Matching
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
            // We warn but don't fail immediately, as bank statements sometimes have joint names or different formats
            console.warn(`Name warning: Payslip (${payslipName}) vs Bank (${bankName})`);
        }
    }

    // 2. Iterate through EVERY submitted payslip to find a matching transaction
    const results = [];
    let allPassed = true;

    for (const [index, payslip] of payslips.entries()) {
        const netPay = parseFloat(payslip.fields.netIncome);
        const payDateStr = payslip.fields.payDate;
        const employer = payslip.fields.employerName || "";
        
        const payDate = new Date(payDateStr);
        
        if (isNaN(netPay)) {
            results.push(`Payslip #${index + 1}: Could not extract Net Income.`);
            allPassed = false;
            continue;
        }

        // Search criteria:
        // 1. Transaction Type is CREDIT
        // 2. Amount matches (within 1.5 currency units)
        // 3. Date matches (within -3 to +5 days buffer for bank processing)
        // 4. Description contains Employer Name (optional but recommended check)

        const foundTransaction = transactions.find((t: any) => {
            if (!t.date || !t.amount) return false;
            
            const tDate = new Date(t.date);
            const dateDiff = (tDate.getTime() - payDate.getTime()) / (1000 * 3600 * 24);
            
            const amountDiff = Math.abs(t.amount - netPay);
            const isCredit = t.type === 'CREDIT' || t.amount > 0; // Fallback if type not detected

            // Logic:
            const amountMatches = amountDiff < 1.5;
            const dateMatches = dateDiff >= -3 && dateDiff <= 7; // Generous 7 day window for delayed transfers
            
            if (amountMatches && dateMatches && isCredit) {
                // If we have an employer name, check if it matches description
                if (employer && t.description) {
                    return isEmployerInDescription(employer, t.description);
                }
                return true; // If no employer name extracted or no description, accept based on amount/date
            }
            return false;
        });

        if (foundTransaction) {
            results.push(`Payslip #${index + 1} (${payDateStr}): Verified deposit of ${netPay} from "${employer}".`);
        } else {
            results.push(`Payslip #${index + 1} (${payDateStr}): FAILED. No deposit found for ${netPay} from "${employer}" within range.`);
            allPassed = false;
        }
    }

    if (!allPassed) {
        return { 
            passed: false, 
            details: `Verification Failed. ${results.join(" ")}` 
        };
    }

    return { 
        passed: true, 
        details: `Success: All ${payslips.length} payslips matched to bank transactions. ${results.join(" ")}` 
    };
};

export const validateAddress = (
    proofDoc: ExtractedData,
    form: ApplicationForm
): ValidationResult => {
    const docAddress = proofDoc.fields.address || "";
    // Normalize logic
    const nDoc = docAddress.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const zipCode = form.zipCode.toLowerCase().replace(/[^a-z0-9]/g, "");
    const street = form.addressLine1.toLowerCase().split(" ")[0].replace(/[^a-z0-9]/g, ""); 

    const zipMatch = nDoc.includes(zipCode);
    const streetMatch = nDoc.includes(street);

    if (zipMatch && streetMatch) {
        return { passed: true, details: "Address document matches application details." };
    }

    return { passed: false, details: `Address mismatch. Document address "${docAddress}" does not sufficiently match form details.` };
};