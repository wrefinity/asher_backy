import { PaymentGateway } from '@prisma/client';


type CountryCode = string;

const STRIPE_SUPPORTED_COUNTRIES: CountryCode[] = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'NL', 'IE', 'IT', 'ES', 'CH', 'AT', 'BE', 'DK', 'FI', 'NO', 'SE', 'NZ', 'SG', 'HK', 'JP'];
const FLUTTERWAVE_SUPPORTED_COUNTRIES: CountryCode[] = ['NG', 'GH', 'KE', 'UG', 'ZA', 'TZ', 'RW'];
const PAYSTACK_SUPPORTED_COUNTRIES: CountryCode[] = ['NG', 'GH', 'ZA'];

class PaymentGatewaySelector {
    selectGateway(countryCode: CountryCode): PaymentGateway {
        if (STRIPE_SUPPORTED_COUNTRIES.includes(countryCode)) {
            return PaymentGateway.STRIPE;
        } else if (FLUTTERWAVE_SUPPORTED_COUNTRIES.includes(countryCode)) {
            return PaymentGateway.FLUTTERWAVE;
        } else if (PAYSTACK_SUPPORTED_COUNTRIES.includes(countryCode)) {
            return PaymentGateway.PAYSTACK;
        } else {
            // Default to Flutterwave
            return PaymentGateway.FLUTTERWAVE;
        }
    }
}

export default new PaymentGatewaySelector();