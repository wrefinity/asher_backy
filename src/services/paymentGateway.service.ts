import { PaymentGateway } from '@prisma/client';
import { resolvePaymentGatewayForCurrency } from '../utils/paymentGateway.util';

type CountryCode = string;

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  NG: 'NGN',
  GB: 'GBP',
  UK: 'GBP',
};

class PaymentGatewaySelector {
  /** Prefer currency when known; NGN → Paystack, GBP/UK → Stripe. */
  selectGateway(countryCode: CountryCode): PaymentGateway {
    const currency = CURRENCY_BY_COUNTRY[countryCode?.toUpperCase()];
    if (currency) {
      return resolvePaymentGatewayForCurrency(currency);
    }
    return PaymentGateway.STRIPE;
  }

  selectGatewayByCurrency(currency: string): PaymentGateway {
    return resolvePaymentGatewayForCurrency(currency);
  }
}

export default new PaymentGatewaySelector();
