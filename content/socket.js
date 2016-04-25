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

  // let _host,
  //     _port,
  //     _encryption,
  //     _authenticator,
  //     _cert;

  let _input,
      _output;

  function _debug(aMsg) {
    console.log('# [Socket] ' + aMsg);
  }

  function _storeCertOverride(aSettings) {
    _debug('_storeCertOverride');
    let { host, port, cert } = aSettings;
    let overrideBits = Ci.nsICertOverrideService.ERROR_UNTRUSTED |
                       Ci.nsICertOverrideService.ERROR_MISMATCH;
    certOverrideService.rememberValidityOverride(host, port, cert,
                                                 overrideBits, true);
  }

  function _startClient(aSettings) {
    _debug('_startClient');
    let { host, port, authenticator, cert } = aSettings;

    let transport = socketTransportService.createTransport(["ssl"], 1, host, port, null);

    // By default the CONNECT socket timeout is very long, 65535 seconds,
    // so that if we race to be in CONNECT state while the server socket is still
    // initializing, the connection is stuck in connecting state for 18.20 hours!
    transport.setTimeout(Ci.nsISocketTransport.TIMEOUT_CONNECT, 2);

    let handler = {
      // onTransportStatus: function(transport, status) {
      //   _debug('_startClient >> onTransportStatus');
      //   if (status === Ci.nsISocketTransport.STATUS_CONNECTED_TO) {
      //     _output.asyncWait(handler, 0, 0, Services.tm.currentThread);
      //   }
      // },

      onTransportStatus: function(transport, status) {
        _debug('_startClient >> onTransportStatus');
        if (status != Ci.nsISocketTransport.STATUS_CONNECTING_TO) {
          return;
        }

        // Set the client certificate as appropriate.
        // if (cert) {
        //   let clientSecInfo = transport.securityInfo;
        //   let tlsControl = clientSecInfo.QueryInterface(Ci.nsISSLSocketControl);
        //   tlsControl.clientCert = cert;
        // }

        // _input = transport.openInputStream(0, 0, 0);
        // _input.asyncWait(handler, 0, 0, Services.tm.currentThread);
        _output.asyncWait(handler, 0, 0, Services.tm.currentThread);
      },

      onInputStreamReady: function(inputStream) {
        _debug('_startClient >> onInputStreamReady');
        try {
          let data = NetUtil.readInputStreamToString(inputStream, inputStream.available());

          if (!authenticator.validateConnection({
            host: host,
            port: port,
            encryption: true,
            cert: cert,
            socket: transport})) {
            _debug('Invalid connection!');
            throw new Error("Invalid connection");
            return;
          }

          _debug('Receive: ' + data);
          inputStream.close();
          _output.close();
        } catch (e) {
          _debug(e);
          let errorClass = nssErrorsService.getErrorClass(e.result);
          if (errorClass === Ci.nsINSSErrorsService.ERROR_CLASS_BAD_CERT) {
            _debug('Bad Certificate');
          }
        }
      },

      onOutputStreamReady: function(outputStream) {
        _debug('_startClient >> onOutputStreamReady');
        try {
          // Set the client certificate as appropriate.
          if (cert) {
            let clientSecInfo = transport.securityInfo;
            let tlsControl = clientSecInfo.QueryInterface(Ci.nsISSLSocketControl);
            tlsControl.clientCert = cert;
          }

          outputStream.write("HELLO", 5);
          _debug("Output to server written");
          _input = transport.openInputStream(0, 0, 0);
          _input.asyncWait(handler, 0, 0, Services.tm.currentThread);
        } catch (e) {
          _debug(e);
          let errorClass = nssErrorsService.getErrorClass(e.result);
          _debug(errorClass);
        }
      },
    };

    transport.setEventSink(handler, Services.tm.currentThread);
    _output = transport.openOutputStream(0, 0, 0);
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

    _storeCertOverride(aSettings);
    _startClient(aSettings);
  }

  function disconnect() {
    if (_input) {
      _input.close();
    }
    if (_output) {
      _output.close();
    }
  }

  return {
    connect: connect,
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
