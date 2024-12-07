"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const STRIPE_SUPPORTED_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'IE', 'IT', 'ES', 'CH', 'AT', 'BE', 'DK', 'FI', 'NO', 'SE', 'NZ', 'SG', 'HK', 'JP'];
const FLUTTERWAVE_SUPPORTED_COUNTRIES = ['NG', 'GH', 'KE', 'UG', 'ZA', 'TZ', 'RW'];
const PAYSTACK_SUPPORTED_COUNTRIES = ['NG', 'GH', 'ZA'];
class PaymentGatewaySelector {
    selectGateway(countryCode) {
        if (STRIPE_SUPPORTED_COUNTRIES.includes(countryCode)) {
            return client_1.PaymentGateway.STRIPE;
        }
        else if (FLUTTERWAVE_SUPPORTED_COUNTRIES.includes(countryCode)) {
            return client_1.PaymentGateway.FLUTTERWAVE;
        }
        else if (PAYSTACK_SUPPORTED_COUNTRIES.includes(countryCode)) {
            return client_1.PaymentGateway.PAYSTACK;
        }
        else {
            // Default to Flutterwave
            return client_1.PaymentGateway.FLUTTERWAVE;
        }
    }
}
exports.default = new PaymentGatewaySelector();
