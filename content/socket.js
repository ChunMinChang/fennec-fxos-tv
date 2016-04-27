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

  function _storeCertOverride(aSettings) {
    _debug('_storeCertOverride');
    let { host, port, cert } = aSettings;
    let overrideBits = Ci.nsICertOverrideService.ERROR_UNTRUSTED |
                       Ci.nsICertOverrideService.ERROR_MISMATCH;
    certOverrideService.rememberValidityOverride(host, port, cert,
                                                 overrideBits, true);
  }

  // function _startClient(aSettings) {
  //   _debug('_startClient');
  //   let { host, port, authenticator, cert } = aSettings;
  //
  //   let transport = socketTransportService.createTransport(["ssl"], 1, host, port, null);
  //
  //   // By default the CONNECT socket timeout is very long, 65535 seconds,
  //   // so that if we race to be in CONNECT state while the server socket is still
  //   // initializing, the connection is stuck in connecting state for 18.20 hours!
  //   transport.setTimeout(Ci.nsISocketTransport.TIMEOUT_CONNECT, 2);
  //
  //   let handler = {
  //     // onTransportStatus: function(transport, status) {
  //     //   _debug('_startClient >> onTransportStatus');
  //     //   if (status === Ci.nsISocketTransport.STATUS_CONNECTED_TO) {
  //     //     _output.asyncWait(handler, 0, 0, Services.tm.currentThread);
  //     //   }
  //     // },
  //
  //     onTransportStatus: function(transport, status) {
  //       _debug('_startClient >> onTransportStatus');
  //       if (status != Ci.nsISocketTransport.STATUS_CONNECTING_TO) {
  //         return;
  //       }
  //
  //       // Set the client certificate as appropriate.
  //       // if (cert) {
  //       //   let clientSecInfo = transport.securityInfo;
  //       //   let tlsControl = clientSecInfo.QueryInterface(Ci.nsISSLSocketControl);
  //       //   tlsControl.clientCert = cert;
  //       // }
  //
  //       // _input = transport.openInputStream(0, 0, 0);
  //       // _input.asyncWait(handler, 0, 0, Services.tm.currentThread);
  //       _output.asyncWait(handler, 0, 0, Services.tm.currentThread);
  //     },
  //
  //     onInputStreamReady: function(inputStream) {
  //       _debug('_startClient >> onInputStreamReady');
  //       try {
  //         let data = NetUtil.readInputStreamToString(inputStream, inputStream.available());
  //
  //         if (!authenticator.validateConnection({
  //           host: host,
  //           port: port,
  //           encryption: true,
  //           cert: cert,
  //           socket: transport})) {
  //           _debug('Invalid connection!');
  //           throw new Error("Invalid connection");
  //           return;
  //         }
  //
  //         _debug('Receive: ' + data);
  //         inputStream.close();
  //         _output.close();
  //       } catch (e) {
  //         _debug(e);
  //         let errorClass = nssErrorsService.getErrorClass(e.result);
  //         if (errorClass === Ci.nsINSSErrorsService.ERROR_CLASS_BAD_CERT) {
  //           _debug('Bad Certificate');
  //         }
  //       }
  //     },
  //
  //     onOutputStreamReady: function(outputStream) {
  //       _debug('_startClient >> onOutputStreamReady');
  //       try {
  //         // Set the client certificate as appropriate.
  //         if (cert) {
  //           let clientSecInfo = transport.securityInfo;
  //           let tlsControl = clientSecInfo.QueryInterface(Ci.nsISSLSocketControl);
  //           tlsControl.clientCert = cert;
  //         }
  //
  //         outputStream.write("HELLO", 5);
  //         _debug("Output to server written");
  //         _input = transport.openInputStream(0, 0, 0);
  //         _input.asyncWait(handler, 0, 0, Services.tm.currentThread);
  //       } catch (e) {
  //         _debug(e);
  //         let errorClass = nssErrorsService.getErrorClass(e.result);
  //         _debug(errorClass);
  //       }
  //     },
  //   };
  //
  //   transport.setEventSink(handler, Services.tm.currentThread);
  //   _output = transport.openOutputStream(0, 0, 0);
  // }

  let _handler = {
    onTransportStatus: function(transport, status) {
      _debug('_handler >> onTransportStatus');
      switch(status) {
        // case Ci.nsISocketTransport.TIMEOUT_CONNECT: {}
        // case Ci.nsISocketTransport.TIMEOUT_READ_WRITE: {}
        // case Ci.nsISocketTransport.STATUS_RESOLVING: {}
        // case Ci.nsISocketTransport.STATUS_RESOLVED: {}
        case Ci.nsISocketTransport.STATUS_CONNECTING_TO: {
          _debug('  STATUS_CONNECTING_TO');
          break;
        }
        // case Ci.nsISocketTransport.STATUS_CONNECTED_TO: {}
        // case Ci.nsISocketTransport.STATUS_SENDING_TO: {}
        // case Ci.nsISocketTransport.STATUS_WAITING_FOR: {}
        // case Ci.nsISocketTransport.STATUS_RECEIVING_FROM: {}
        default:
          break;
      }

      _handlerCallback[status] &&
      typeof _handlerCallback[status] === 'function' &&
      _handlerCallback[status]();
    },

    onInputStreamReady: function(inputStream) {
      _debug('_handler >> onInputStreamReady');

      _handlerCallback.onInput &&
      typeof _handlerCallback.onInput === 'function' &&
      _handlerCallback.onInput(inputStream);
    },

    onOutputStreamReady: function(outputStream) {
      _debug('_handler >> onOutputStreamReady');

      _handlerCallback.onOutput &&
      typeof _handlerCallback.onOutput === 'function' &&
      _handlerCallback.onOutput(outputStream);
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
  function _registerCallback(key, callback) {
    _debug('_registerCallback');
    if (_handlerCallback[key]) {
      _debug('  already has a callback for ' + key);
      return;
    }

    if (typeof callback !== 'function') {
      _debug('  passed callback is not a function');
      return;
    }

    _handlerCallback[key] = callback;
  }

  // This method is used to delete the callback for TLS transport
  function _unregisterCallback(key) {
    _debug('_unregisterCallback');
    if (!_handlerCallback[key]) {
      _debug('  there is no callback for ' + key);
      return;
    }

    delete _handlerCallback[key];
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

  function sendCommand(msg) {
    _debug('sendCommand');

    return new Promise(function(aResolve, aReject) {
      function writeData(stream) {
        _unregisterCallback('onOutput');
        try {
          stream.write(msg, msg.length);
          aResolve();
        } catch(e) {
          aReject(e);
        }
      }

      _registerCallback('onOutput', writeData);

      _output.asyncWait(_handler, 0, 0, Services.tm.currentThread);
    });
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

    if (!aSettings.cert) {
      _debug('  Need to provide certificate!');
      return;
    }

    // Default to PROMPT |Authenticator| instance if not supplied
    if (!aSettings.authenticator) {
      _debug('  Set a default client authenticator');
      // let defaultAuth = Authenticators.get();
      // aSettings.authenticator = new defaultAuth.Client();
      aSettings.authenticator = new (Authenticators.get().Client)();
    }

    // let { host, port, encryption, authenticator, cert } = aSettings;
    let { host, port, authenticator, cert } = aSettings;

    aSettings.port = startServer(cert, true, Ci.nsITLSServerSocket.REQUIRE_ALWAYS);

    _setOptions(aSettings);

    _storeCertOverride(aSettings);

    _startClient(aSettings)
    .then(function(aResult) {
      _debug('**** connection built ****');
      waitForMessage();
      sendCommand('HELLO');
    })
    .catch(function(error) {
      _debug('**** connection failed ****');
      _debug(error);
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
  };
};



// For simulating a TLS server
function startServer(cert, expectingPeerCert, clientCertificateConfig) {
  let tlsServer = Cc["@mozilla.org/network/tls-server-socket;1"]
                  .createInstance(Ci.nsITLSServerSocket);
  tlsServer.init(-1, true, -1);
  tlsServer.serverCert = cert;

  let input, output;

  let listener = {
    onSocketAccepted: function(socket, transport) {
      console.log("Accept TLS client connection");
      let connectionInfo = transport.securityInfo
                           .QueryInterface(Ci.nsITLSServerConnectionInfo);
      connectionInfo.setSecurityObserver(listener);
      input = transport.openInputStream(0, 0, 0);
      output = transport.openOutputStream(0, 0, 0);
    },
    onHandshakeDone: function(socket, status) {
      console.log("TLS handshake done");

      input.asyncWait({
        onInputStreamReady: function(input) {
          NetUtil.asyncCopy(input, output);
        }
      }, 0, 0, Services.tm.currentThread);
    },
    onStopListening: function() {}
  };

  tlsServer.setSessionCache(false);
  tlsServer.setSessionTickets(false);
  tlsServer.setRequestClientCertificate(clientCertificateConfig);

  tlsServer.asyncListen(listener);

  return tlsServer.port;
}
