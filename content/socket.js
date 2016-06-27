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
const kPeriodicalCheck = 1000;

var Socket = function() {

  let _host,
      _port,
      _cert;

  let _input,
      _output;

  let _serverCert;

  let _messageReceiver;

  let _serverCloseNotifier;

  let _secondTry = false;

  function _debug(aMsg) {
    console.log('# [Socket] ' + aMsg);
  }

  function _setOptions(aSettings) {
    _debug('_setOptions');
    let { host, port, cert } = aSettings;
    _host = host;
    _port = port;
    _cert = cert;
  }

  function _storeCertOverride(aCert, aHost, aPort) {
    _debug('_storeCertOverride: ' + aHost + ',' + aPort);

    // ERROR_UNTRUSTED is used to avoid:
    //   The certificate is not trusted because it is self-signed
    // ERROR_MISMATCH is used to avoid:
    //   The certificate is not valid for the name 192.168.1.xxx.
    // ERROR_TIME is used to avoid:
    //   The certificate expired on T1. The current time is T2.
    //   (where the T1 < T2)
    let overrideBits = Ci.nsICertOverrideService.ERROR_UNTRUSTED |
                       Ci.nsICertOverrideService.ERROR_MISMATCH |
                       Ci.nsICertOverrideService.ERROR_TIME;
    certOverrideService.rememberValidityOverride(aHost, aPort, aCert,
                                                 overrideBits, true);
  }

  let _handler = {
    onTransportStatus: function(aTransport, aStatus) {
      _debug('_handler >> onTransportStatus');
      switch(aStatus) {
        case Ci.nsISocketTransport.TIMEOUT_CONNECT: {
          _debug('  TIMEOUT_CONNECT');
          break;
        }
        case Ci.nsISocketTransport.TIMEOUT_READ_WRITE: {
          _debug('  TIMEOUT_READ_WRITE');
          break;
        }
        case Ci.nsISocketTransport.STATUS_RESOLVING: {
          _debug('  STATUS_RESOLVING');
          break;
        }
        case Ci.nsISocketTransport.STATUS_RESOLVED: {
          _debug('  STATUS_RESOLVED');
          break;
        }
        case Ci.nsISocketTransport.STATUS_CONNECTING_TO: {
          _debug('  STATUS_CONNECTING_TO');
          break;
        }
        case Ci.nsISocketTransport.STATUS_CONNECTED_TO: {
          _debug('  STATUS_CONNECTED_TO');
          break;
        }
        case Ci.nsISocketTransport.STATUS_SENDING_TO: {
          _debug('  STATUS_SENDING_TO');
          break;
        }
        case Ci.nsISocketTransport.STATUS_WAITING_FOR: {
          _debug('  STATUS_WAITING_FOR');
          break;
        }
        case Ci.nsISocketTransport.STATUS_RECEIVING_FROM: {
          _debug('  STATUS_RECEIVING_FROM');
          break;
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

      try {
        aInputStream.available();
      } catch(e) {
        _debug(e);
        disconnect();

        if (_serverCloseNotifier) {
          _serverCloseNotifier();
        }
      }

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

      let resolveStatus = (_secondTry) ?
        Ci.nsISocketTransport.STATUS_CONNECTED_TO :
        Ci.nsISocketTransport.STATUS_CONNECTING_TO;

      function connectingToServer() {
        _debug('connectingToServer');
        _unregisterCallback(resolveStatus);

        // Set the client certificate as appropriate.
        if (_cert) {
          let clientSecInfo = transport.securityInfo;
          let tlsControl = clientSecInfo.QueryInterface(Ci.nsISSLSocketControl);
          tlsControl.clientCert = _cert;
        }

        _input = transport.openInputStream(0, 0, 0);
        aResolve(transport);
      }

      _registerCallback(resolveStatus, connectingToServer);

      try {
        _output = transport.openOutputStream(0, 0, 0);
      } catch(e) {
        aReject(e);
      }
    });
  }

  function _waitUntilGettingServerCert(aTransport) {
    _debug('_waitUntilGettingServerCert');
    return new Promise(function(aResolve, aReject) {

      function checkCert(times) {
        _debug('checkCert: ' + times);
        let ssl = aTransport.securityInfo.QueryInterface(Ci.nsISSLStatusProvider).SSLStatus;
        if (ssl && ssl.serverCert) {
          _debug('Get certificate!');
          aResolve(aTransport);
        } else {
          _debug('It\'s the ' + times + ' times to wait for certificate....');
          // Wait for the ssl.serverCert. We can try 10 times.
          if (times > 10) {
            _debug('Wait for too many times!');
            aReject('Can not get certificate in time');
            return;
          }

          let window = GetRecentWindow();
          window.setTimeout(function() {
            checkCert(++times)
          }, kWaitForServerCert);
        }
      }

      checkCert(0);
    });
  }

  function _overwriteServerCertificate(aTransport) {
    _debug('_overwriteServerCertificate');
    return new Promise(function(aResolve, aReject) {
      _output.asyncWait({
        onOutputStreamReady: function(stream) {
          try {
            _waitUntilGettingServerCert(aTransport)
            .then(function(aTransport) {
              // console.log(aTransport.securityInfo.QueryInterface(Ci.nsISSLStatusProvider).SSLStatus); // log SSL status
              overwrite();
            }).catch(function(aError) {
              aReject(aError);
            })

            function overwrite() {
              _debug('_overwriteServerCertificate >> overwrite');
              _serverCert = aTransport.securityInfo.QueryInterface(Ci.nsISSLStatusProvider).SSLStatus.serverCert;
              //console.log(_serverCert.sha256Fingerprint); // log fingerprint
              // Overwrite server's certificate if the certificate is wrong.
              // This will always happens in first connection.
              _storeCertOverride(_serverCert, _host, _port);

              // Close the invalid connection
              disconnect();

              // Label this is the second try
              _secondTry = true;

              // Connect to the server again
              _startClient()
              .then(_waitUntilGettingServerCert)
              .then(function(aTransport) {
                aResolve(aTransport);
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

  function sendMessage(aType, aAction, aDetail) {
    _debug('sendMessage');
    let msg = {
      type: aType,
      action: aAction,
      // detail: aDetail,
    }

    if (aDetail) {
      msg.detail = aDetail;
    }

    let data = JSON.stringify(msg);
    return _sendData(data);
  }

  // function _receiveData() {
  //   _debug('_receiveData');
  //
  //   // return new Promise(function(aResolve, aReject) {
  //   //   function readData(stream) {
  //   //     _unregisterCallback('onInput');
  //   //
  //   //     try {
  //   //       let data = NetUtil.readInputStreamToString(_input, _input.available());
  //   //       _debug('Receive: ' + data);
  //   //       aResolve(data);
  //   //     } catch(e) {
  //   //       aReject(e);
  //   //     }
  //   //   }
  //   //
  //   //   _registerCallback('onInput', readData);
  //   //
  //   //   _input.asyncWait(_handler, 0, 0, Services.tm.currentThread);
  //   // });
  //
  //   return new Promise(function(aResolve, aReject) {
  //     _input.asyncWait({
  //       onInputStreamReady: function(stream) {
  //         try {
  //           let data = NetUtil.readInputStreamToString(_input, _input.available());
  //           _debug('Receive: ' + data);
  //           aResolve(data);
  //         } catch(e) {
  //           aReject(e);
  //         }
  //       }
  //     }, 0, 0, Services.tm.currentThread);
  //   });
  // }
  //
  // function receiveMessage() {
  //   _debug('receiveMessage');
  //   _receiveData()
  //   .then(function(aData) {
  //     let msg = JSON.parse(aData);
  //     return Promise.resolve(msg);
  //   })
  //   .catch(function(aError) {
  //     // return Promise.reject(aError);
  //     throw new Error(aError);
  //   });
  // }

  function setMessageReceiver(aMessageReceiver) {
    _debug('setMessageReceiver');

    _messageReceiver = aMessageReceiver;

    function handleReceivedData(stream) {
      let data = NetUtil.readInputStreamToString(_input, _input.available());
      _debug('Receive: ' + data);
      let msg = JSON.parse(data);
      _messageReceiver(msg);

      _input.asyncWait(_handler, 0, 0, Services.tm.currentThread);
    }

    _registerCallback('onInput', handleReceivedData);

    _input.asyncWait(_handler, 0, 0, Services.tm.currentThread);
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
        aResolve(aTransport);
        // periodicallyCheckStatus(aTransport);
      }).catch(function(aError) {
        aReject(aError);
        _debug('Error occurs: ' + aError);
        disconnect();
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

  function periodicallyCheckStatus(aTransport) {

    function check() {
      // console.log(aTransport);
      // console.log(aTransport.isAlive());

      if (aTransport.isAlive()) {
        let window = GetRecentWindow();
        window.setTimeout(check, kPeriodicalCheck);
      }
    }

    check();
  }

  return {
    connect: connect,
    disconnect: disconnect,
    sendMessage: sendMessage,
    // receiveMessage: receiveMessage,
    setMessageReceiver: setMessageReceiver,
    get serverCert() {
      return _serverCert;
    },
    set serverCloseNotifier(aNotifier) {
      (typeof aNotifier === 'function') && (_serverCloseNotifier = aNotifier);
    },
  };
};
