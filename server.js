'use strict';

var express = require('express');
var fs = require('fs');
var cookieSession = require('cookie-session');
var app = express();
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.json({ extended: false });

var {TokenClient} = require('@token-io/tpp'); // main Token SDK entry object

// 'sandbox': Connect to Sandbox testing environment
// '4qY7...': Developer key
var Token = new TokenClient({env: 'dev', developerKey: '4qY7lqQw8NOl9gng0ZHgT4xdiDqxqoGVutuZwrUYQsI', keyDir: './keys'});

var bankAccount = {
    domestic: {
        accountNumber: '12345678',
        bankCode: '123456',
        country: 'US',
    }
};
var amount = 10.0;
var currency = 'USD';

async function init() {
    var alias; // cbpii alias
    var member; // cbpii member
    // If we know of a previously-created aisp member, load it; else create a new one.

    // Token SDK stores member keys in files in ./keys.
    // If aisp member's ID is "m:1234:567", its key file is "m_1234_567".
    var keyPaths;
    try {
        keyPaths = fs.readdirSync('./keys');
    } catch (x) {
        keyPaths = [];
    }
    if (keyPaths && keyPaths.length) {
        var keyPath = keyPaths[0];
        var mid = keyPath.replace(/_/g, ":");
        member = Token.getMember(Token.UnsecuredFileCryptoEngine, mid);
    }

    // If member is defined, that means we found keys and loaded them.
    if (member) {
        // We're using an existing cbpii member. Fetch its alias (email address)
        try {
            alias = await member.firstAlias();
        } catch (e) {
            console.log("Something went wrong: " + err);
            console.log("If member ID not found or firstAlias fails, `rm -r ./keys` and try again.");
            throw e;
        }
    } else {
        // An alias is a human-readable way to identify a member, e.g., an email address or domain.
        // When we tell Token UI to request an Access Token, we use this address.
        // If a domain alias is used instead of an email, please contact Token
        // with the domain and member ID for verification.
        // See https://developer.token.io/sdk/#aliases for more information.
        alias = {
            type: 'EMAIL',
            value: "asjs-" + Math.random().toString(36).substring(2, 10) + "+noverify@example.com"
        };
        member = await Token.createMember(alias, Token.UnsecuredFileCryptoEngine);
        // A member's profile has a display name and picture.
        // The Token UI shows this (and the alias) to the user when requesting access.
        await member.setProfile({
            // A member's profile has a display name and picture.
            // The Token UI shows this (and the alias) to the user when requesting access.
            displayNameFirst: 'CBPII Demo',
        });

        await member.setProfilePicture('image/png', fs.readFileSync('finvertex.png'))
    }

    // launch server
    return initServer(member, alias);
}

async function initServer(member, alias) {
    app.use(cookieSession({
        name: 'session',
        keys: ['cookieSessionKey'],
        // Cookie Options
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }));

    // Returns HTML file
    app.get('/', function (req, res) {
        fs.readFile('index.html', 'utf8', function (err, contents) {
            res.set('Content-Type', 'text/html');
            res.send(contents);
        })
    });

    app.get('/request-funds-confirmation', async function (req, res) {
        var nonce = Token.Util.generateNonce();
        req.session.nonce = nonce;
        var redirectUrl = req.protocol + '://' + req.get('host') + '/confirm-funds';
        // set up the TokenRequest
        var tokenRequest = Token.createFundsConfirmationRequest('iron', bankAccount)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(nonce);

        // store the token request
        var request = await member.storeTokenRequest(tokenRequest);
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
        res.redirect(302, tokenRequestUrl);
    });

    app.post('/request-funds-confirmation-popup', urlencodedParser, async function (req, res) {
        var nonce = Token.Util.generateNonce();
        req.session.nonce = nonce;
        var redirectUrl = req.protocol + '://' + req.get('host') + '/confirm-funds-popup';

        // set up the TokenRequest
        var tokenRequest = Token.createFundsConfirmationRequest('iron', bankAccount)
            .setToAlias(alias)
            .setToMemberId(member.memberId())
            .setRedirectUrl(redirectUrl)
            .setCSRFToken(nonce);

        // store the token request
        var request = await member.storeTokenRequest(tokenRequest);
        var requestId = request.id;
        var tokenRequestUrl = Token.generateTokenRequestUrl(requestId);
        res.status(200).send(tokenRequestUrl);
    });

    // for redirect flow, use Token.parseTokenRequestCallbackUrl()
    app.get('/confirm-funds', async function (req, res) {
        var callbackUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        // verifies signature and CSRF token
        var result = await Token.parseTokenRequestCallbackUrl(callbackUrl, req.session.nonce);
        // "log in" as service member.
        // get a Representable member object to use the access token
        var rep = member.forAccessToken(result.tokenId);
        var token = await member.getToken(result.tokenId);
        var accountId = token.payload.access.resources[0].fundsConfirmation.accountId;

        var output = await rep.confirmFunds(accountId, amount, currency);

        res.send(`Funds sufficient to cover a charge of ${amount} ${currency}: <b>${JSON.stringify(output)}</b>`); // respond to script.js with balances
    });

    // for popup flow, use Token.parseTokenRequestCallbackParams()
    app.get('/confirm-funds-popup', async function (req, res) {
        // verifies signature and CSRF token
        var result = await Token.parseTokenRequestCallbackParams(JSON.parse(req.query.data), req.session.nonce);
        // "log in" as service member.
        // get a Representable member object to use the access token
        var rep = member.forAccessToken(result.tokenId);
        var token = await member.getToken(result.tokenId);
        var accountId = token.payload.access.resources[0].fundsConfirmation.accountId;

        var output = await rep.confirmFunds(accountId, amount, currency);

        res.send(`Funds sufficient to cover a charge of ${amount} ${currency}: <b>${JSON.stringify(output)}</b>`); // respond to script.js with balances
    });

    app.use(express.static(__dirname));
    app.listen(3000, function () {
        console.log('Example app listening on port 3000!')
    });
}

init();
