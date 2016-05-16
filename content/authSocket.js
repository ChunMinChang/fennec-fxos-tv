"use strict";

var AuthSocket = function() {

  // TLS socket
  let _socket = new Socket();

  // J-PAKE module
  let _jpake = new JPAKE();

  // The signerID for J-PAKE
  let _signerID = 'client';

  // After first authenticating, server will give us a ID.
  // This will help us to do further noninitial authentications.
  let _serverAssignedID;

  // An extra information for authentication at the final step of J-PAKE
  // This string must be same as the server side(FxOS TV)
  let _kHkdfInfo = 'AES_256_CBC-HMAC256';

  // window here is used to get |window.crypto|
  let _window = GetRecentWindow();

  // The computed AES and HMAC key from J-PAKE
  let _AESKey;
  let _HMACKey;

  // Label the state for authentication
  let AUTH_STATE = CreateEnum({
    IDLE: 0,
    REQEST_HANDSHAKE: 1,
    ROUND1: 2,
    ROUND2: 3,
    FINAL: 4,
    FINAL_HANDSHAKE: 5,
    FINISH: 6,
  });
  let _authState = AUTH_STATE.IDLE;

  // Callback that will be fired after finishing authentication
  // function callback(auth) {}:
  //   auth is true if authnication is passed. Otherwise, it's false.
  let _afterAuthenticatingCallback;

  function _debug(aMsg) {
    console.log('# [AuthSocket] ' + aMsg);
  }

  function _base64FromArrayBuffer(aArrayBuffer) {
    let binary = '';
    let bytes = new Uint8Array(aArrayBuffer);
    let len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return _window.btoa(binary);
  }

  function _base64ToArrayBuffer(aBase64) {
    let binary_string = _window.atob(aBase64);
    let len = binary_string.length;
    let bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function _sendAuthentication(aAction, aDetail) {
    _debug('_sendAuthentication');
    return _socket.sendMessage('auth', aAction, aDetail);
  }

  function _messageReceiver(aMsg) {
    _debug('_messageReceiver');
    console.log(aMsg);
    if (aMsg.type == 'auth') {
      _authenticate(aMsg);
    }
  }

  function _authenticate(aMsg) {
    _debug('_authenticate');

    if (aMsg.type != 'auth') {
      _debug(' it is not auth message');
      return;
    }

    switch(aMsg.action) {
      case 'response_handshake':
        // Check the authentication state
        if (_authState != AUTH_STATE.REQEST_HANDSHAKE) {
          _debug('the authentication state should be: REQEST_HANDSHAKE');
          return;
        }

        if (aMsg.detail > 1 && !_serverAssignedID) {
          _debug('No assigned ID from server after first authentication!');
          return;
        }

        // The current state should be ROUND1
        _authState = AUTH_STATE.ROUND1;

        _debug((aMsg.detail == 1) ?
                 'this is the first time' : 'this is not the first time' );

        // Compute the Round 1 data and send it to TV
        let round1Data = _jpake.round1(_signerID);
        return _sendAuthentication('jpake_client_1', {
          gx1: round1Data.gx1.value,
          zkp_x1: { gr: round1Data.zkp_x1.v.value,
                     b: round1Data.zkp_x1.r.value,
                    id: _signerID },
          gx2: round1Data.gx2.value,
          zkp_x2: { gr: round1Data.zkp_x2.v.value,
                     b: round1Data.zkp_x2.r.value,
                    id: _signerID },
        });

        break;

      case 'jpake_server_1':

        // Check the authentication state
        if (_authState != AUTH_STATE.ROUND1) {
          _debug('the authentication state should be: ROUND1');
          return;
        }

        // The current state should be ROUND2
        _authState = AUTH_STATE.ROUND2;

        // Compute the Round 2 data and send it to TV
        let gx3 = aMsg.detail.gx1;
        let zkp_x3 = aMsg.detail.zkp_x1;

        let gx4 = aMsg.detail.gx2;
        let zkp_x4 = aMsg.detail.zkp_x2;

        let peerID = zkp_x3.id;

        let round2Data = _jpake.round2(peerID,
                                       gx3, zkp_x3.gr, zkp_x3.b,
                                       gx4, zkp_x4.gr, zkp_x4.b);

        return _sendAuthentication('jpake_client_2', {
          A: round2Data.A.value,
          zkp_A: { gr: round2Data.zkp_A.v.value,
                    b: round2Data.zkp_A.r.value,
                   id: _signerID },
        });

        break;

      case 'jpake_server_2':

        // Check the authentication state
        if (_authState != AUTH_STATE.ROUND2) {
          _debug('the authentication state should be: ROUND2');
          return;
        }

        // The current state should be FINAL
        _authState = AUTH_STATE.FINAL;

        // Compute the final data and send it to TV
        let B = aMsg.detail.A;
        let zkp_B = aMsg.detail.zkp_A;

        let finalData = _jpake.final(B, zkp_B.gr, zkp_B.b, _kHkdfInfo);

        _AESKey = finalData.AES.value;

        // Import the HMAC key
        let HMACKeyArrayBuffer = _base64ToArrayBuffer(finalData.HMAC.value);

        _window.crypto.subtle.importKey('raw', HMACKeyArrayBuffer, {
          name: 'HMAC',
          hash: { name: 'SHA-256' },
        }, true, ['sign', 'verify'])
        .then(function(aKey) { // returns the HMAC Key
          _HMACKey = aKey;
        })
        .catch(function(aError) {
          _debug(aError);
        });

        break;

      case 'server_key_confirm':
        // Check the authentication state
        if (_authState != AUTH_STATE.FINAL) {
          _debug('the authentication state should be: FINAL');
          return;
        }

        // The current state should be FINAL_HANDSHAKE
        _authState = AUTH_STATE.FINAL_HANDSHAKE;

        // TV will give us a twice-hashed AES key,
        // so we need to hash our AES twice and compare them
        let serverSignature = aMsg.detail.signature;

        // Our signature will be computed after using HMAC to hash AES key
        let clientSignature;

        // Compute the first hashed signature
        let AESKeyArrayBuffer = _base64ToArrayBuffer(_AESKey);
        _window.crypto.subtle.sign({ name: 'HMAC' }, _HMACKey, AESKeyArrayBuffer)
        .then(function(aSignature){ // returns a ArrayBuffer, byte length = 32
          // Convert to signature from ArrayBuffer
          clientSignature = _base64FromArrayBuffer(aSignature);
          // Compute the second hashed signature
          return _window.crypto.subtle.sign({ name: 'HMAC' }, _HMACKey, aSignature);
        })
        .then(function(aTwiceHashedSignature) {
          // Convert to signature from ArrayBuffer
          let twiceHashAESKey = _base64FromArrayBuffer(aTwiceHashedSignature);

          // The twice-hashed AES key is supposed to be same
          // as the server's signature
          if (twiceHashAESKey != serverSignature) {
            _debug('serverSignature is wrong :(');

            // Fire the callback to notify that the authentication failed
            _afterAuthenticatingCallback(false);
            return;
          }

          _debug('serverSignature is correct!');

          // Send the first-hashed AES Key as client signature to TV
          // after authenticating the server
          return _sendAuthentication('client_key_confirmation', {
            signature: clientSignature,
          });
        })
        .catch(function(aError) {
          _debug(aError);
        });

        break;

      case 'finish_handshake':
        // Check the authentication state
        if (_authState != AUTH_STATE.FINAL_HANDSHAKE) {
          _debug('the authentication state should be: FINAL_HANDSHAKE');
          return;
        }

        // The current state should be FINISH
        _authState = AUTH_STATE.FINISH;

        // Get the assigned client ID by server
        _serverAssignedID = aMsg.detail.id;

        _debug('Pass the authentication :)');

        // Fire the callback to notify that the authentication is passed
        _afterAuthenticatingCallback(true);

        break;

      default:
        break;
    }
  }

  // function connect(aSettings) {
  //   _debug('connect');
  //
  //   // Set PIN code to J-PAKE module
  //   _jpake.PIN = aSettings.PIN;
  //
  //   _socket.connect(aSettings)
  //   // Request handshake
  //   .then(function() {
  //     // Set a listener to continuously receive the messages
  //     _socket.setMessageReceiver(_messageReceiver);
  //
  //     // The current state should be REQEST_HANDSHAKE
  //     _authState = AUTH_STATE.REQEST_HANDSHAKE;
  //
  //     // Send HANDSHAKE request to TV
  //     _sendAuthentication('request_handshake',
  //                         (_serverAssignedID) ? { id: _serverAssignedID } : null);
  //   });
  // }

  function connect(aSettings) {
    _debug('connect');

    // Set PIN code to J-PAKE module
    _jpake.PIN = aSettings.PIN;

    _socket.connect(aSettings)
    // Request handshake
    .then(function(aTransport) {
      // Set a listener to continuously receive the messages
      _socket.setMessageReceiver(_messageReceiver);

      // The current state should be REQEST_HANDSHAKE
      _authState = AUTH_STATE.REQEST_HANDSHAKE;

      // Send HANDSHAKE request to TV
      _sendAuthentication('request_handshake',
                          (_serverAssignedID) ? { id: _serverAssignedID } : null);
    });

    return new Promise(function(aResolve, aReject) {
      function afterAuthentication(aResult) {
        _debug('afterAuthentication: ' + aResult);
        (aResult) ? aResolve() : aReject();
      }

      _afterAuthenticatingCallback = afterAuthentication;
    });
  }

  function disconnect() {
    _debug('disconnect');
    _socket.disconnect();
  }

  function sendCommand(aAction, aDetail) {
    _debug('sendCommand');
    _socket.sendMessage('command', aAction, aDetail);
  }

  return {
    connect: connect,
    disconnect: disconnect,
    sendCommand: sendCommand,
  };
};
