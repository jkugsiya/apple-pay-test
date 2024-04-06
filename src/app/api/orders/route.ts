async function generateAccessToken() {
  const clientId =
    'AVJn6pJEIFjs2StqKNSN3nzzniDaXDZVewkR60Dy3GfgvlNtpqJwfOdRwPyz7_EEbZybPJ-tiAvVHu8M';
  const clientSecret =
    'EJ8Txre-4Kd3Akx0JuG6doFtcMDqbvWdIDQXNLikd9NB3cX3Plb29uQAIJXC9sxCmhuLfk0ds_ph_XhY';

  const path = 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
  const now = Date.now();
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });

  const json = await res.json();
  let accessToken = '';
  if (json.access_token && json.expires_in) {
    accessToken = json.access_token;
    console.log(json.access_token, json.expires_in);
  } else {
    const e = new Error();
    e.name = 'Invalid Paypal Response';
    e.message = 'No access_token or expires_in in response';
    throw e;
  }

  return accessToken;
}

export async function POST(request: Request) {
  try {
    const path = 'https://api-m.sandbox.paypal.com/v2/checkout/orders';
    const accessToken = await generateAccessToken();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + accessToken
    };
    const requestObject = {
      method: 'POST',
      url: path,
      headers: headers,
      body: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '10'
            }
          }
        ]
        // payment_source: {
        //   apple_pay: {
        //     experience_context: {
        //       return_url: 'https://apple-pay-test-ten.vercel.app/',
        //       cancel_url: 'https://apple-pay-test-ten.vercel.app/'
        //     }
        //   }
        // }
      }
    };

    const res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestObject.body)
    });
    const json = await res.json();

    return Response.json({
      id: json.id as string,
      paymentLink: json.links?.find((l: any) => l.rel === 'payer-action')?.href
    });
  } catch (e) {
    throw e;
  }
}
