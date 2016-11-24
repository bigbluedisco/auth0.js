var expect = require('expect.js');

var stub = require('sinon').stub;

var RequestMock = require('../mock/request-mock');

var request = require('superagent');

var RequestBuilder = require('../../src/helper/request-builder')
var Authentication = require('../../src/authentication')

var telemetryInfo = (new RequestBuilder({})).getTelemetryData();

describe('auth0.authentication', function () {
  describe('initialization', function () {

    it('should check that options is passed', function() {
      expect(function() {
        var auth0 = new Authentication();
      }).to.throwException(function (e) {
        expect(e.message).to.be('options parameter is not valid');
      });
    })

    it('should check that domain is set', function() {
      expect(function() {
        var auth0 = new Authentication({clientID:'...'});
      }).to.throwException(function (e) {
        expect(e.message).to.be('domain option is required');
      });
    })

    it('should check that clientID is set', function() {
      expect(function() {
        var auth0 = new Authentication({domain: 'me.auth0.com'});
      }).to.throwException(function (e) {
        expect(e.message).to.be('clientID option is required');
      });
    })
  })

  context('buildAuthorizeUrl', function () {

    before(function() {
      this.auth0 = new Authentication({
        domain: 'me.auth0.com',
        clientID: '...',
        redirectUri: 'http://page.com/callback',
        responseType: 'code',
        _sendTelemetry: false
      });
    });

    it('should check that options is valid', function() {
      expect(() => {
        this.auth0.buildAuthorizeUrl('asdfasdfds');
      }).to.throwException(function (e) {
        expect(e.message).to.be('options parameter is not valid');
      });
    })

    it('should return a url using the default settings', function() {
      var url = this.auth0.buildAuthorizeUrl({state:'1234'});

      expect(url).to.be('https://me.auth0.com/authorize?client_id=...&response_type=code&redirect_uri=http%3A%2F%2Fpage.com%2Fcallback&state=1234');
    })

    it('should return a url using overriding the default settings', function() {
      var url = this.auth0.buildAuthorizeUrl({
        responseType: 'token',
        redirectUri: 'http://anotherpage.com/callback2',
        prompt: 'none',
        state: '1234'
      });

      expect(url).to.be('https://me.auth0.com/authorize?client_id=...&response_type=token&redirect_uri=http%3A%2F%2Fanotherpage.com%2Fcallback2&prompt=none&state=1234');
    })
  })

  context('buildAuthorizeUrl with Telemetry', function () {
    before(function() {
      this.auth0 = new Authentication({
        domain: 'me.auth0.com',
        clientID: '...',
        redirectUri: 'http://page.com/callback',
        responseType: 'code'
      });
    });

    it('should return a url using overriding the default settings', function() {
      var url = this.auth0.buildAuthorizeUrl({
        responseType: 'token',
        redirectUri: 'http://anotherpage.com/callback2',
        prompt: 'none',
        state: '1234'
      });

      expect(url).to.be('https://me.auth0.com/authorize?client_id=...&response_type=token&redirect_uri=http%3A%2F%2Fanotherpage.com%2Fcallback2&prompt=none&state=1234&auth0Client=' + telemetryInfo);
    })
  })

  context('buildLogoutUrl', function () {

    before(function() {
      this.auth0 = new Authentication({
        domain: 'me.auth0.com',
        clientID: '...',
        redirectUri: 'http://page.com/callback',
        responseType: 'code',
        _sendTelemetry: false
      });
    });

    it('should check that options is valid', function() {
      expect(() => {
        this.auth0.buildLogoutUrl('asdfasdfds');
      }).to.throwException(function (e) {
        expect(e.message).to.be('options parameter is not valid');
      });
    })

    it('should return a url using the default settings', function() {
      var url = this.auth0.buildLogoutUrl();

      expect(url).to.be('https://me.auth0.com/v2/logout?client_id=...');
    })

    it('should ignore the clientID', function() {
      var url = this.auth0.buildLogoutUrl({
        clientID: undefined,
      });

      expect(url).to.be('https://me.auth0.com/v2/logout?');
    })

    it('should return a url using overriding the default settings', function() {
      var url = this.auth0.buildLogoutUrl({
        clientID: '123',
        returnTo: 'http://page.com',
        federated: ''
      });

      expect(url).to.be('https://me.auth0.com/v2/logout?client_id=123&returnTo=http%3A%2F%2Fpage.com&federated=');
    })
  })

  context('buildLogoutUrl with Telemetry', function () {
    before(function() {
      this.auth0 = new Authentication({
        domain: 'me.auth0.com',
        clientID: '123',
        redirectUri: 'http://page.com/callback',
        responseType: 'code'
      });
    });

    it('should return a url using overriding the default settings', function() {
      var url = this.auth0.buildLogoutUrl({
        clientID: '123',
        returnTo: 'http://page.com',
        federated: ''
      });

      expect(url).to.be('https://me.auth0.com/v2/logout?client_id=123&returnTo=http%3A%2F%2Fpage.com&federated=&auth0Client=' + telemetryInfo);
    })
  })

  context('userInfo', function () {
    before(function() {
      this.auth0 = new Authentication({
        domain: 'me.auth0.com',
        clientID: '...',
        redirectUri: 'http://page.com/callback',
        responseType: 'code',
        _sendTelemetry: false
      });
    });

    afterEach(function(){
      request.get.restore();
    })

    it('should call userinfo with the access token', function(done) {
      stub(request, 'get', function(url) {
        expect(url).to.be('https://me.auth0.com/userinfo')
        return new RequestMock({
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer abcd1234'
          },
          cb: function(cb) {
            cb(null, {
              body: {
                user_id: '...',
                provider: 'auth0',
                connection: 'Username-Password-Authentication',
                isSocial: false
              }
            });
          }
        });
      });

      this.auth0.userInfo('abcd1234', function(err, data) {
        expect(err).to.be(null);
        expect(data).to.eql({
          user_id: '...',
          provider: 'auth0',
          connection: 'Username-Password-Authentication',
          isSocial: false
        });
        done();
      })
    });
  });

  context('delegation', function () {
    before(function() {
      this.auth0 = new Authentication({
        domain: 'me.auth0.com',
        clientID: '...',
        redirectUri: 'http://page.com/callback',
        responseType: 'code',
        _sendTelemetry: false
      });
    });

    afterEach(function(){
      request.post.restore();
    })

    it('should call delegation with all the options', function(done) {
      stub(request, 'post', function(url) {
        expect(url).to.be('https://me.auth0.com/delegation')
        return new RequestMock({
          body: {
            client_id: '...',
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            refresh_token: 'your_refresh_token',
            api_type: 'app'
          },
          headers: {
            'Content-Type': 'application/json'
          },
          cb: function(cb) {
            cb(null, {
              body: {
                'token_type': 'Bearer',
                'expires_in': 36000,
                'id_token': 'eyJ...'
              }
            });
          }
        });
      });

      this.auth0.delegation({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        refresh_token: 'your_refresh_token',
        api_type: 'app'
      }, function(err, data) {
        expect(err).to.be(null);
        expect(data).to.eql({
          'token_type': 'Bearer',
          'expires_in': 36000,
          'id_token': 'eyJ...'
        });
        done();
      })
    });
  });

})