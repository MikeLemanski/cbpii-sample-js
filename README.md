# cbpii-sample-js

Simple CBPII app that illustrates Token's Confirmation of Funds flow. It shows how to request a CAF access token, which is used to confirm if a given account has sufficient funds for a payment.

### Setup

To install, `npm install`

To run, `node server.js`

This starts up a server.

The server operates against Token's Sandbox environment by default.
This testing environment lets you try out UI and account flows without
exposing real bank accounts.

The server shows a web page at `localhost:3000`. The page has a Link with Token button.
Clicking the button displays Token UI that requests an Access Token.
_When the app has an Access Token, it uses that Access Token to get account balances._

### Troubleshooting

If anything goes wrong, try to update the token SDK dependency:

`npm update @token-io/tpp`

Otherwise, email Token support: support@token.io, or one of the Token engineers.
