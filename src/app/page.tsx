'use client';
import {
  PayPalButtons,
  PayPalHostedField,
  PayPalHostedFieldsProvider,
  PayPalScriptProvider,
  usePayPalHostedFields
} from '@paypal/react-paypal-js';
import { FC, useEffect, useRef, useState } from 'react';

const SubmitPayment: FC = () => {
  const [paying, setPaying] = useState(false);
  const cardHolderName = useRef(null);
  const hostedField = usePayPalHostedFields();

  const handleClick = () => {
    if (!hostedField?.cardFields) {
      const childErrorMessage =
        'Unable to find any child components in the <PayPalHostedFieldsProvider />';

      throw new Error(childErrorMessage);
    }

    setPaying(true);

    hostedField.cardFields
      .submit({
        cardholderName: (cardHolderName?.current as any)?.value
      })
      .then(data => {
        console.log(data);
      })
      .catch(err => {
        console.error(err);
        setPaying(false);
      });
  };

  return (
    <>
      <div id="card-holder-container">
        <label
          title="This represents the full name as shown in the card"
          htmlFor="card-holder"
          className="mt-4 block pb-2 text-lg font-medium leading-none text-gray-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Card Holder Name
          <span className="text-red-600">*</span>
        </label>
        <input
          id="card-holder"
          ref={cardHolderName}
          className="card-field h-12 border px-2 "
          style={{ outline: 'none' }}
          type="text"
          placeholder="Full name"
        />
      </div>
      <div className="my-2 flex flex-row space-x-2" id="saveCardCheckContainer">
        <input
          className="cursor-pointer"
          id="saveCardCheck"
          type="checkbox"
          title="Save This Card"
        />
        <label
          htmlFor="saveCardCheck"
          className="cursor-pointer text-sm text-gray-800"
        >
          Save This Payment Method for Future Use
        </label>
      </div>
      <button
        aria-label="pay"
        className={`${
          paying ? '' : ' btn-primary'
        } bg-secondary mt-4 block w-full rounded-md px-8 py-2 text-white`}
        onClick={handleClick}
      >
        {paying ? (
          <div className="loader h-6 w-6 rounded-full border-4 border-t-4 border-gray-200 ease-linear"></div>
        ) : (
          'Pay'
        )}
      </button>
    </>
  );
};

const PaypalPaymentForm: FC = () => {
  const [clientIdToken, _] = useState<{
    clientId: string;
    clientToken: string;
  }>({
    clientId:
      'AVJn6pJEIFjs2StqKNSN3nzzniDaXDZVewkR60Dy3GfgvlNtpqJwfOdRwPyz7_EEbZybPJ-tiAvVHu8M',
    clientToken:
      'eyJicmFpbnRyZWUiOnsiYXV0aG9yaXphdGlvbkZpbmdlcnByaW50IjoiOWQyYWIxMTIwNWU3MTE2YjVhZjBkOTU1NzdhMDE3MzJiZWQ3MTJlODg1OWIzZmYxNjM4Y2E2MWZmNzVhNWUzMXxtZXJjaGFudF9pZD1yd3dua3FnMnhnNTZobTJuJnB1YmxpY19rZXk9NjNrdm4zN3Z0MjlxYjRkZiZjcmVhdGVkX2F0PTIwMjQtMDMtMTVUMTE6MDc6MDcuODU2WiIsInZlcnNpb24iOiIzLXBheXBhbCJ9LCJwYXlwYWwiOnsiaWRUb2tlbiI6bnVsbCwiYWNjZXNzVG9rZW4iOiJBMjFBQUtQYWNtdXM4bWtwYVJiSkdnSWdhNW5zUjk1V0pHaThFVk95WE41MHh0TG92cFZ1c1ZWd2wxQ0xkaTVDR2hJNWxnVVBnVzhoNnVPLV9Odnh4SjdFTVg5bHo3MGNBIn19'
  });

  useEffect(() => {
    const fn = async () => {
      const w = window as any;
      if (
        !(
          w.ApplePaySession &&
          w.ApplePaySession.supportsVersion(4) &&
          w.ApplePaySession.canMakePayments()
        )
      )
        return;

      console.log('setup applepay');
      const applepay = w.paypal.Applepay();
      const {
        isEligible,
        countryCode,
        currencyCode,
        merchantCapabilities,
        supportedNetworks
      } = await applepay.config();

      console.log({
        isEligible,
        countryCode,
        currencyCode,
        merchantCapabilities,
        supportedNetworks
      });

      if (!isEligible) {
        throw new Error('applepay is not eligible');
      }

      document.getElementById('applepay-container')!.innerHTML =
        '<apple-pay-button id="applepay-btn" buttonstyle="black" type="buy" locale="en">';

      document.getElementById('applepay-btn')!.addEventListener('click', () => {
        const paymentRequest = {
          countryCode,
          currencyCode: 'USD',
          merchantCapabilities,
          supportedNetworks,
          requiredBillingContactFields: ['postalAddress'],
          requiredShippingContactFields: [],
          total: {
            label: 'Demo (Card is not charged)',
            amount: '10.00',
            type: 'final'
          }
        };

        const session = new w.ApplePaySession(14, paymentRequest);

        session.onvalidatemerchant = (event: any) => {
          applepay
            .validateMerchant({
              validationUrl: event.validationURL
            })
            .then((payload: any) => {
              session.completeMerchantValidation(payload.merchantSession);
            })
            .catch((err: any) => {
              console.error(err);
              session.abort();
            });
        };

        session.onpaymentmethodselected = () => {
          session.completePaymentMethodSelection({
            newTotal: paymentRequest.total
          });
        };

        session.oncancel = () => {
          console.log('Apple Pay Cancelled!!');
        };

        session.onpaymentauthorized = async (event: any) => {
          console.log(event);
          console.log('Done Apple Pay!');
          try {
            /* Create Order on the Server Side */
            const orderResponse = await fetch(`/api/orders`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            if (!orderResponse.ok) {
              throw new Error('error creating order');
            }

            const { id } = await orderResponse.json();
            /**
             * Confirm Payment
             */
            console.log({
              orderId: id,
              token: event.payment.token,
              billingContact: event.payment.billingContact
            });
            const confirmOrderResponse = await applepay.confirmOrder({
              orderId: id,
              token: event.payment.token,
              billingContact: event.payment.billingContact
            });
            console.log(confirmOrderResponse);
            /*
             * Capture order (must currently be made on server)
             */
            console.log('Done Confirm order');
            // await fetch(`/api/orders/${id}/capture`, {
            //   method: 'POST'
            // });

            session.completePayment({
              status: (window as any).ApplePaySession.STATUS_SUCCESS
            });
          } catch (err) {
            console.error(err);
            session.completePayment({
              status: (window as any).ApplePaySession.STATUS_FAILURE
            });
          }
        };

        session.begin();
      });
    };

    const timeout = setTimeout(() => {
      fn();
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return clientIdToken?.clientId && clientIdToken.clientToken ? (
    <PayPalScriptProvider
      options={{
        clientId: clientIdToken.clientId,
        dataClientToken: clientIdToken.clientToken,
        intent: 'capture',
        vault: true,
        components: 'buttons,hosted-fields,applepay',
        merchantId: '6NXFRUDV562CQ'
      }}
    >
      <div className="text-2xl font-semibold">Payment Method</div>
      <div className="mb-3 grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div id="applepay-container"></div>

        <div className="">
          <PayPalHostedFieldsProvider
            styles={{
              '.valid': { color: '#28a745' },
              '.invalid': { color: '#dc3545' },
              input: { 'font-family': 'monospace', 'font-size': '16px' }
            }}
            createOrder={async () =>
              // checkoutFunction(
              //   "card",
              //   (document.getElementById("saveCardCheck") as any).checked,
              //   savedPayment
              // )
              //   .then((orderId) => {
              //     if (orderId) return orderId;
              //     else throw new Error("Unable to create order");
              //   })
              //   .catch((err) => {
              //     toast.error(err.message);
              //     console.error(err);
              //     throw err;
              //   })
              {
                return '';
              }
            }
          >
            <div id="paypal-divs-tohide">
              <label
                htmlFor="card-number"
                className="mt-4 block pb-2 text-lg font-medium leading-none text-gray-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Card Number
                <span className="text-red-600">*</span>
              </label>
              <PayPalHostedField
                id="card-number"
                className="card-field"
                hostedFieldType="number"
                options={{
                  selector: '#card-number',
                  placeholder: '4111 1111 1111 1111'
                }}
              />
              <div className="flex gap-3">
                <div>
                  <label
                    htmlFor="expiration-date"
                    className="mt-4 block pb-2 text-lg font-medium leading-none text-gray-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Expiration Date
                    <span className="text-red-600">*</span>
                  </label>
                  <PayPalHostedField
                    id="expiration-date"
                    className="card-field"
                    hostedFieldType="expirationDate"
                    options={{
                      selector: '#expiration-date',
                      placeholder: 'MM/YYYY'
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cvv"
                    className="mt-4 block pb-2 text-lg font-medium leading-none text-gray-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    CVV
                    <span className="text-red-600">*</span>
                  </label>
                  <PayPalHostedField
                    id="cvv"
                    className="card-field"
                    hostedFieldType="cvv"
                    options={{
                      selector: '#cvv',
                      placeholder: '123',
                      maskInput: true
                    }}
                  />
                </div>
              </div>
            </div>
            <SubmitPayment />
          </PayPalHostedFieldsProvider>
        </div>
        <div className="flex w-full flex-col items-center justify-center rounded-md bg-gray-100 p-3 shadow-md">
          <div className="mx-2 mt-2 text-xl">or pay with</div>
          <div className="w-full px-4 pt-4">
            <PayPalButtons
              createOrder={async () => {
                return '';
              }}
              onApprove={async data => {
                console.log(data);
              }}
            />
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  ) : (
    <span>Loading...</span>
  );
};

export default PaypalPaymentForm;
