"use strict";

var AuthSocket = function() {

  // TLS socket
  let _socket = new Socket();

  // J-PAKE module
  let _jpake = new JPAKE();

  // The signerID for J-PAKE
  let _signerID = 'client';

  // An extra information for authentication at the final step of J-PAKE
  // This string must be same as the server side(FxOS TV)
  let _kHkdfInfo = 'AES_256_CBC-HMAC256';

  // The computed AES and HMAC key from J-PAKE
  let _AESKey;
  let _HMACKey;

  // TV will give an assigned id for the device after first connection.
  // If we connect to TV before, then this should be set.
  let _assignedID;

  // The PIN code will show on TV after TV receives round 1 data of J-PAKE
  // if we are in the first connection. On the other hand,
  // if we connect to TV before, then second time used PIN will set to AES,
  // so there is no need for user to enter PIN code again.
  let _PIN;

  // If we have both _assignedID and _PIN, then it's not the first time.
  // Otherwise, it's the first time. Thus,
  // _isFirstConnection = !(_assignedID && _PIN) = !_assignedID || !_PIN
  let _isFirstConnection = true;

  // Save those data temporarily from server at JPAKE-round1
  // before we get the pin code
  let _serverRound1Data = {};

  // A callback that will be fired if we need to wait for the PIN code
  // entered by users
  let _needPINNotifier;

  // window here is used to get |window.crypto|
  let _window = GetRecentWindow();

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

  // Handler that will be fired after receiving ack message.
  // This will be reset everytime when validateConnection is called.
  let _ackHandler;
  const kWaitForAck = 2000; // ms

  // the tab's id paired with this authSocket
  let _tabId;

  function _debug(aMsg) {
    console.log('# [AuthSocket] ' + aMsg);
  }

  function _reset() {
    _debug('_reset');
    _jpake = new JPAKE();
    _AESKey = null;
    _HMACKey = null;
    _assignedID = null;
    _PIN = null;
    _isFirstConnection = true;
    _serverRound1Data = {};
    _needPINNotifier = null;
    _authState = AUTH_STATE.IDLE;
    _afterAuthenticatingCallback = null;
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

  // Use the last 25 characters of server's fingerprint as server's id
  function _getServerIDFromFingerprint(aFingerprint) {
    return aFingerprint.slice(-26);
  }

  // Synthesize PIN code from original one
  function _synthesizePIN(aPIN) {
    // Mix with the first twelve characters of the server's fingerprint
    let fingerprint = _socket.serverCert.sha256Fingerprint;
    let synthesizedPIN = aPIN + fingerprint.slice(0, 12);
    return synthesizedPIN;
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
    } else if (aMsg.type == 'ack') {
      _ackHandler && (typeof _ackHandler === 'function') && _ackHandler(aMsg);
    }
  }

  function _saveDataBeforeEnteringPIN(aPeerID, aGx3, aZkp_x3, aGx4, aZkp_x4) {
    _serverRound1Data.peerID = aPeerID;

    _serverRound1Data.gx3 = aGx3;
    _serverRound1Data.zkp_x3 = aZkp_x3;

    _serverRound1Data.gx4 = aGx4;
    _serverRound1Data.zkp_x4 = aZkp_x4;
  }

  function _authenticate(aMsg) {
    _debug('_authenticate');

    if (aMsg.type != 'auth') {
      _debug(' it is not auth message');
      return;
    }

    // Error handling
    if (aMsg.error && aMsg.error == 'PIN expire') {
      _debug('!!!! Error: ' + aMsg.error);
      _afterAuthenticatingCallback(false, null, 'pin-expired');
      return;
    }

    // Action
    switch(aMsg.action) {
      case 'response_handshake':
        // Check the authentication state
        if (_authState != AUTH_STATE.REQEST_HANDSHAKE) {
          _debug('the authentication state should be: REQEST_HANDSHAKE');
          return;
        }

        _debug((aMsg.detail == 1) ?
                 'TV think this is the first time' :
                 'TV think this is not the first time');
        _debug((_isFirstConnection) ?
                'Device think this is the first time' :
                'Device think this is not the first time');

        // Check whether or not the connection is first
        if (aMsg.detail == 1 && !_isFirstConnection) {
          // TV may clear the client's data so TV can't recognize this device.
          _debug('TV can NOT recognize this device!');
          _debug('Clear the stored data and keep going next state');
          // Clear the stored assigned data by TV
          _assignedID = null;
          _PIN = null;
          // Label it as the first-time connection
          _isFirstConnection = true;
        } else if (aMsg.detail > 1 && _isFirstConnection) {
          _debug('TV mis-recognizes this device!');
          _debug('TV thinks it is not the first-time connection, but it does!');
          _debug('Drop the connection......');
          // Reset the state
          _authState = AUTH_STATE.IDLE;
          return;
        }

        // Compute the Round 1 data and send it to TV
        let round1Data = _jpake.round1(_signerID);

        // The current state should be ROUND1
        _authState = AUTH_STATE.ROUND1;

        // Send round 1 data to server
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

        // Temporarily save those data from server before we get PIN code
        let gx3 = aMsg.detail.gx1;
        let zkp_x3 = aMsg.detail.zkp_x1;

        let gx4 = aMsg.detail.gx2;
        let zkp_x4 = aMsg.detail.zkp_x2;

        let peerID = zkp_x3.id;

        _saveDataBeforeEnteringPIN(peerID, gx3, zkp_x3, gx4, zkp_x4);

        // Suspend authentication for waiting the pairing PIN code
        // entered by users when we are in first connection.
        if (_isFirstConnection) {
          _debug('==> Waiting for PIN code .....');

          // Fire the callback if it exists
          _needPINNotifier && _needPINNotifier();

          // When enterPIN is called, the pin code will be set and
          // we will resume the authentication and compute
          // the results of J-PAKE round 2 to send to TV.
          return;
        }

        // Compute the results of J-PAKE round 2 and send the results
        // to TV directly if we connect to this TV before when we already
        // have a PIN
        _debug('==> Enter the second-time PIN code: ' + _PIN);
        enterPIN(_PIN);

        break;

      case 'jpake_server_2':
        // Check the authentication state
        if (_authState != AUTH_STATE.ROUND2) {
          _debug('the authentication state should be: ROUND2');
          return;
        }

        // Compute the final data and send it to TV
        let B = aMsg.detail.A;
        let zkp_B = aMsg.detail.zkp_A;

        let finalData = _jpake.final(B, zkp_B.gr, zkp_B.b, _kHkdfInfo);

        // The current state should be FINAL
        _authState = AUTH_STATE.FINAL;

        // Save the AES key, it will be used to generate a client signature
        // and the second-time pairing pin code.
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
            _debug('-------------------------------');
            _debug('serverSignature is wrong :(');
            _debug('-------------------------------');

            // Reset the state
            _authState = AUTH_STATE.IDLE;

            // Fire the callback to notify that the authentication failed.
            // If the PIN is correct, the server's signature should be valid.
            // => if server's signature is invalid, then the PIN is wrong.
            _afterAuthenticatingCallback(false, null, 'wrong-pin');
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

        _debug('-------------------------------');
        _debug('Pass the authentication :)');
        _debug('-------------------------------');

        // If it's not the first time, then just resolve without returning
        // any server-client pair information
        if (!_isFirstConnection) {
          _afterAuthenticatingCallback(true);
          return;
        }

        // Otherwise, if it's first time, then resolve with returning
        // the server-client pair information

        // Get the assigned client ID by server
        _debug('assigned client ID: ' + aMsg.detail.id);

        // Fire the callback to notify that the authentication is passed
        _afterAuthenticatingCallback(true, aMsg.detail.id);

        break;

      default:
        break;
    }
  }

  function connect(aSettings, aServerClientPairs, aTabId, aReconnect) {
    _debug('connect');

    if (aReconnect) {
      _reset();
    }

    _socket.connect(aSettings)
    // Request handshake
    .then(function(aTransport) {
      _debug('Finish connection! Start authentication!');

      // Check whether or not we have an assigned client id for this server
      let fingerprint = _socket.serverCert.sha256Fingerprint;
      let serverId = _getServerIDFromFingerprint(fingerprint);

      if (aServerClientPairs && aServerClientPairs[serverId]) {
        _assignedID = aServerClientPairs[serverId].client;
        _debug('assigned id: ' + _assignedID);
        _PIN = aServerClientPairs[serverId].pin;
        _debug('paired PIN: ' + _PIN);
        _assignedID && _PIN && (_isFirstConnection = false);
        _debug('first time connection? ' + _isFirstConnection)
      }

      _tabId = aTabId;

      // Set a listener to continuously receive the messages
      _socket.setMessageReceiver(_messageReceiver);

      // The current state should be REQEST_HANDSHAKE
      _authState = AUTH_STATE.REQEST_HANDSHAKE;

      // Send HANDSHAKE request to TV
      (_isFirstConnection) ?
        _sendAuthentication('request_handshake') :
        _sendAuthentication('request_handshake', { id : _assignedID });
    })
    .catch(function(aError) {
      _debug(aError);
    });

    return new Promise(function(aResolve, aReject) {
      function afterAuthentication(aResult, aServerAssignedID, aError) {
        _debug('afterAuthentication: ' + aResult);

        // Get the server id from its fingerprint
        let fingerprint = _socket.serverCert.sha256Fingerprint;

        let pair = {
          server: _getServerIDFromFingerprint(fingerprint),
          tabId: _tabId,
        };

        // Return error if the authentication is failed
        if (!aResult) {
          _debug('  error: ' + aError);
          pair.error = aError;
          aReject(pair);
          return;
        }

        // Return error if we don't have a server assigned id in
        // first time connection.
        if (_isFirstConnection && !aServerAssignedID) {
          let errMsg = 'no server assigned id'
          _debug('  error: ' + errMsg);
          pair.error = errMsg;
          aReject(pair);
          return;
        }

        // Use the latest AES key as the next-time PIN code
        // if the connection is built successfully.
        pair.pin = _AESKey.slice(0, 4);

        // Update a server assigned client id if it needs
        if (aServerAssignedID) {
          pair.client = aServerAssignedID;
        }

        aResolve(pair);
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

  function enterPIN(aPIN) {
    _debug('enterPIN: ' + aPIN);

    // Check the authentication state
    if (_authState != AUTH_STATE.ROUND1) {
      _debug('Call at wrong state! the authentication state should be: ROUND1');
      return;
    }

    // The current state should be ROUND2
    _authState = AUTH_STATE.ROUND2;

    // Save the pairing PIN code
    _PIN = aPIN;

    let synthesizedPIN = _synthesizePIN(aPIN);

    // Compute the Round 2 data and send it to TV
    let peerID = _serverRound1Data.peerID;

    let gx3 = _serverRound1Data.gx3;
    let zkp_x3 = _serverRound1Data.zkp_x3;

    let gx4 = _serverRound1Data.gx4;
    let zkp_x4 = _serverRound1Data.zkp_x4;

    let round2Data = _jpake.round2(peerID, synthesizedPIN,
                                   gx3, zkp_x3.gr, zkp_x3.b,
                                   gx4, zkp_x4.gr, zkp_x4.b);

    return _sendAuthentication('jpake_client_2', {
      A: round2Data.A.value,
      zkp_A: { gr: round2Data.zkp_A.v.value,
                b: round2Data.zkp_A.r.value,
               id: _signerID },
    });
  }

  function validateConnection() {
    _debug('validateConnection');

    return new Promise(function(aResolve, aReject) {
      if (_authState != AUTH_STATE.FINISH) {
        _debug('The authentication is still processing/waiting for processing.');
        aReject('state-error');
        return;
      }

      let timeoutId;
      let window = GetRecentWindow();

      let isAckReceived = false;

      function handler(aMsg) {
        if (aMsg && aMsg.detail == 'pong') {
          isAckReceived = true;

          timeoutId && window.clearTimeout(timeoutId);

          aResolve();
        }
      }

      function waitForResponse() {
        if (!isAckReceived) {
          _debug('no response received');
          aReject('no-response');
        }
      }

      _ackHandler = handler;

      timeoutId = window.setTimeout(waitForResponse, kWaitForAck);

      _socket.sendMessage('ack', null, 'ping');
    });
  }

  return {
    connect: connect,
    disconnect: disconnect,
    sendCommand: sendCommand,
    enterPIN: enterPIN,
    set needPINNotifier(aNotifier) {
      (typeof aNotifier === 'function') && (_needPINNotifier = aNotifier);
    },
    set serverCloseNotifier(aNotifier) {
      _debug('serverCloseNotifier');

      if (typeof aNotifier !== 'function') {
        _debug(aNotifier + ' is not a function!');
        return;
      }

      function notifierProxy() {
        aNotifier(_tabId);
      }

      _socket.serverCloseNotifier = notifierProxy;
    },
    validateConnection: validateConnection,
  };
};
