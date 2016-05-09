"use strict";

// This is refered from
// https://dxr.mozilla.org/mozilla-central/source/devtools/shared/security/socket.js
// and https://dxr.mozilla.org/mozilla-central/source/netwerk/test/unit/test_tls_server.js

const socketTransportService = Cc["@mozilla.org/network/socket-transport-service;1"]
                                 .getService(Ci.nsISocketTransportService);

const nssErrorsService = Cc["@mozilla.org/nss_errors_service;1"]
                           .getService(Ci.nsINSSErrorsService);

const certOverrideService = Cc["@mozilla.org/security/certoverride;1"]
                            .getService(Ci.nsICertOverrideService);

const { NetUtil } = Cu.import("resource://gre/modules/NetUtil.jsm", {});

const kWaitForDisconnection = 750;
const kWaitForServerCert = 750;

var Socket = function() {

  let _host,
      _port,
      _authenticator,
      _cert;

  let _input,
      _output;

  function _debug(aMsg) {
    console.log('# [Socket] ' + aMsg);
  }

  function _setOptions(aSettings) {
    _debug('_setOptions');
    let { host, port, authenticator, cert } = aSettings;
    _host = host;
    _port = port;
    _authenticator = authenticator;
    _cert = cert;
  }

  function _storeCertOverride(aCert, aHost, aPort) {
    _debug('_storeCertOverride: ' + aHost + ',' + aPort);
    let overrideBits = Ci.nsICertOverrideService.ERROR_UNTRUSTED |
                       Ci.nsICertOverrideService.ERROR_MISMATCH;
    certOverrideService.rememberValidityOverride(aHost, aPort, aCert,
                                                 overrideBits, true);
  }

  let _handler = {
    onTransportStatus: function(aTransport, aStatus) {
      _debug('_handler >> onTransportStatus');
      switch(aStatus) {
        case Ci.nsISocketTransport.TIMEOUT_CONNECT: {
          _debug('  TIMEOUT_CONNECT');
        }
        case Ci.nsISocketTransport.TIMEOUT_READ_WRITE: {
          _debug('  TIMEOUT_READ_WRITE');
        }
        case Ci.nsISocketTransport.STATUS_RESOLVING: {
          _debug('  STATUS_RESOLVING');
        }
        case Ci.nsISocketTransport.STATUS_RESOLVED: {
          _debug('  STATUS_RESOLVED');
        }
        case Ci.nsISocketTransport.STATUS_CONNECTING_TO: {
          _debug('  STATUS_CONNECTING_TO');
        }
        case Ci.nsISocketTransport.STATUS_CONNECTED_TO: {
          _debug('  STATUS_CONNECTED_TO');
        }
        case Ci.nsISocketTransport.STATUS_SENDING_TO: {
          _debug('  STATUS_SENDING_TO');
        }
        case Ci.nsISocketTransport.STATUS_WAITING_FOR: {
          _debug('  STATUS_WAITING_FOR');
        }
        case Ci.nsISocketTransport.STATUS_RECEIVING_FROM: {
          _debug('  STATUS_RECEIVING_FROM');
        }
        default:
          break;
      }

      _handlerCallback[aStatus] &&
      typeof _handlerCallback[aStatus] === 'function' &&
      _handlerCallback[aStatus](aTransport);
    },

    onInputStreamReady: function(aInputStream) {
      _debug('_handler >> onInputStreamReady');

      _handlerCallback.onInput &&
      typeof _handlerCallback.onInput === 'function' &&
      _handlerCallback.onInput(aInputStream);
    },

    onOutputStreamReady: function(aOutputStream) {
      _debug('_handler >> onOutputStreamReady');

      _handlerCallback.onOutput &&
      typeof _handlerCallback.onOutput === 'function' &&
      _handlerCallback.onOutput(aOutputStream);
    },
  };

  // _handlerCallback.onInput:
  //   Call upon receiving data
  // _handlerCallback.onOutput:
  //   Call upon sending data
  // _handlerCallback[Ci.nsISocketTransport.XXX]:
  //   Call upon status is changed to XXX
  let _handlerCallback = {};

  // This method is used to set the callback for TLS transport
  function _registerCallback(aKey, aCallback) {
    _debug('_registerCallback');
    if (_handlerCallback[aKey]) {
      _debug('  already has a callback for ' + aKey);
      return;
    }

    if (typeof aCallback !== 'function') {
      _debug('  passed callback is not a function');
      return;
    }

    _handlerCallback[aKey] = aCallback;
  }

  // This method is used to delete the callback for TLS transport
  function _unregisterCallback(aKey) {
    _debug('_unregisterCallback');
    if (!_handlerCallback[aKey]) {
      _debug('  there is no callback for ' + aKey);
      return;
    }

    delete _handlerCallback[aKey];
  }

  // This method will set the client certificate for TLS and
  // bind TLS inputStream to _input, TLS outputStream to _output.
  function _startClient() {
    _debug('_startClient');

    let transport = socketTransportService.createTransport(["ssl"], 1, _host, _port, null);

    // By default the CONNECT socket timeout is very long, 65535 seconds,
    // so that if we race to be in CONNECT state while the server socket is still
    // initializing, the connection is stuck in connecting state for 18.20 hours!
    transport.setTimeout(Ci.nsISocketTransport.TIMEOUT_CONNECT, 2);

    transport.setEventSink(_handler, Services.tm.currentThread);

    return new Promise(function(aResolve, aReject) {

      function connectingToServer() {
        _unregisterCallback(Ci.nsISocketTransport.STATUS_CONNECTING_TO);

        // Set the client certificate as appropriate.
        if (_cert) {
          let clientSecInfo = transport.securityInfo;
          let tlsControl = clientSecInfo.QueryInterface(Ci.nsISSLSocketControl);
          tlsControl.clientCert = _cert;
        }

        _input = transport.openInputStream(0, 0, 0);
        aResolve(transport);
      }

      _registerCallback(Ci.nsISocketTransport.STATUS_CONNECTING_TO, connectingToServer);

      try {
        _output = transport.openOutputStream(0, 0, 0);
      } catch(e) {
        aReject(e);
      }
    });
  }

  function _overwriteServerCertificate(aTransport) {
    _debug('_overwriteServerCertificate');
    return new Promise(function(aResolve, aReject) {
      _output.asyncWait({
        onOutputStreamReady: function(stream) {
          let msg = 'TEST';
          try {
            stream.write(msg, msg.length);

            let ssl = aTransport.securityInfo.QueryInterface(Ci.nsISSLStatusProvider).SSLStatus;
            // console.log(ssl);

            if (ssl && ssl.serverCert) {
              _debug('Overwrite server certificate!');
              overwrite();
            } else {
              _debug('Wait for loading server certificate!');

              // Wait for the ssl.serverCert
              let window = GetRecentWindow();
              window.setTimeout(overwrite, kWaitForServerCert);
            }

            function overwrite() {
              _debug('_overwriteServerCertificate >> overwrite');
              let serverCert = aTransport.securityInfo.QueryInterface(Ci.nsISSLStatusProvider).SSLStatus.serverCert;
              // console.log(serverCert);

              // Overwrite server's certificate if the certificate is wrong.
              // This will always happens in first connection.
              _storeCertOverride(serverCert, _host, _port);

              // Close the invalid connection
              disconnect();

              // Connect to the server again
              _startClient().then(function(aResult) {
                aResolve(aResult); // The aResult here is the transport!
              }).catch(function(aError) {
                aReject(aError);
              });
            }

          } catch(e) {
            aReject(e);
          }
        }
      }, 0, 0, Services.tm.currentThread);
    });
  }

  // function _isConnectionAlive(aTransport) {
  //   _debug('_isConnectionAlive');
  //   return new Promise(function(aResolve, aReject) {
  //     function isStreamAvailable(stream) {
  //       _unregisterCallback('onInput');
  //       try {
  //         stream.available();
  //         aResolve({ transport: aTransport, alive: true });
  //       } catch(e) {
  //         try {
  //           // getErrorClass may throw if you pass a non-NSS error
  //           // console.log(e);
  //           let errorClass = nssErrorsService.getErrorClass(e.result);
  //           if (errorClass === Ci.nsINSSErrorsService.ERROR_CLASS_BAD_CERT) {
  //             aResolve({ transport: aTransport, certError: true });
  //           } else {
  //             aReject(e);
  //           }
  //         } catch(nssErr) {
  //           aReject(nssErr);
  //         }
  //       }
  //     }
  //
  //     _registerCallback('onInput', isStreamAvailable);
  //
  //     _input.asyncWait(_handler, 0, 0, Services.tm.currentThread);
  //   });
  // }

  // // The first input.asyncWait or ourput.asyncWait will fail
  // // because server's certificate is self-signed and it's not for local address.
  // // We must overwrite the server's certificate from the first connection.
  // // After the certificate is overwritten, the following connection won't
  // // have the error certificate issue.
  // function _maybeOverwriteServerCertificate({ transport, alive, certError }) {
  //   _debug('_maybeOverwriteServerCertificate');
  //
  //   return new Promise(function(aResolve, aReject) {
  //
  //     // Do nothing if the connection is valid
  //     if (alive) {
  //       _debug('  connection is valid!');
  //       aResolve(transport);
  //       return;
  //     }
  //
  //     // Overwrite server's certificate if the certificate is wrong.
  //     // This will always happens in first connection.
  //     if (certError) {
  //       _debug('  server\'s certificate is wrong! overwrite it!');
  //       let serverCert = transport.securityInfo.QueryInterface(Ci.nsISSLStatusProvider)
  //                                 .SSLStatus.serverCert;
  //       _storeCertOverride(serverCert, _host, _port);
  //
  //       // Close the invalid connection
  //       disconnect();
  //
  //       // Connect to the server again
  //       _startClient().then(function(aResult) {
  //         aResolve(aResult); // The aResult here is the transport!
  //       }).catch(function(aError) {
  //         aReject(aError);
  //       });
  //     }
  //
  //     // Unknown situation here...
  //     _debug('  Undefined situation!');
  //   });
  // }

  function _sendData(aMsg) {
    _debug('_sendData: ' + aMsg);

    // return new Promise(function(aResolve, aReject) {
    //   function writeData(stream) {
    //     _unregisterCallback('onOutput');
    //     try {
    //       stream.write(aMsg, aMsg.length);
    //       aResolve();
    //     } catch(e) {
    //       aReject(e);
    //     }
    //   }
    //
    //   _registerCallback('onOutput', writeData);
    //
    //   _output.asyncWait(_handler, 0, 0, Services.tm.currentThread);
    // });

    return new Promise(function(aResolve, aReject) {
      _output.asyncWait({
        onOutputStreamReady: function(stream) {
          try {
            stream.write(aMsg, aMsg.length);
            aResolve();
          } catch(e) {
            aReject(e);
          }
        }
      }, 0, 0, Services.tm.currentThread);
    });
  }

  function sendMessage(type, action, detail) {
    _debug('sendMessage');
    let msg = {
      type: type,
      action: action,
      detail: detail,
    }
    let data = JSON.stringify(msg);
    _sendData(data);
  }

  function waitForMessage() {
    _debug('waitForMessage');

    return new Promise(function(aResolve, aReject) {
      function readData(stream) {
        _unregisterCallback('onInput');

        try {
          let data = NetUtil.readInputStreamToString(_input, _input.available());
          _debug('Receive: ' + data);
          aResolve();
        } catch(e) {
          aReject(e);
        }
      }

      _registerCallback('onInput', readData);

      _input.asyncWait(_handler, 0, 0, Services.tm.currentThread);
    });
  }

  function connect(aSettings) {
    _debug('connect');

    return new Promise(function(aResolve, aReject) {
      if (!aSettings.cert) {
        aReject('No certificate');
        return;
      }

      let { host, port, cert } = aSettings;
      _setOptions(aSettings);

      _startClient()
      // .then(_isConnectionAlive)
      // .then(_maybeOverwriteServerCertificate)
      .then(_overwriteServerCertificate)
      .then(function(aTransport) {
        aResolve(aTransport)
      }).catch(function(aError) {
        aReject(aError);
      });
    });
  }

  function disconnect() {
    _debug('disconnect');

    if (_input) {
      _input.close();
    }
    if (_output) {
      _output.close();
    }
  }

  return {
    connect: connect,
    disconnect: disconnect,
    sendMessage: sendMessage,
  };
};
