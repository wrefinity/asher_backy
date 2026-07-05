import { PaymentGateway } from '@prisma/client';

/**
 * Currency-based payment routing:
 * - NGN → Paystack
 * - GBP (UK) and all other supported currencies → Stripe
 */
export function resolvePaymentGatewayForCurrency(currency: string): PaymentGateway {
  return currency.toUpperCase() === 'NGN'
    ? PaymentGateway.PAYSTACK
    : PaymentGateway.STRIPE;
}

export function assertPaymentGatewayForCurrency(
  currency: string,
  paymentGateway: PaymentGateway
): void {
  const expected = resolvePaymentGatewayForCurrency(currency);
  if (paymentGateway !== expected) {
    throw new Error(
      `Invalid payment gateway for ${currency.toUpperCase()}. Use ${expected}.`
    );
  }
}
