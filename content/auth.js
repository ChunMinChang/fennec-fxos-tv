"use strict";

// This is refered from
// https://dxr.mozilla.org/mozilla-central/source/devtools/shared/security/auth.js

function createEnum(obj) {
  for (let key in obj) {
    obj[key] = key;
  }
  return obj;
}

/**
 * |allowConnection| implementations can return various values as their |result|
 * field to indicate what action to take.  By specifying these, we can
 * centralize the common actions available, while still allowing embedders to
 * present their UI in whatever way they choose.
 */
var AuthenticationResult = createEnum({

  /**
   * Close all listening sockets, and disable them from opening again.
   */
  DISABLE_ALL: null,

  /**
   * Deny the current connection.
   */
  DENY: null,

  /**
   * Additional data needs to be exchanged before a result can be determined.
   */
  PENDING: null,

  /**
   * Allow the current connection.
   */
  ALLOW: null,

  /**
   * Allow the current connection, and persist this choice for future
   * connections from the same client.  This requires a trustable mechanism to
   * identify the client in the future, such as the cert used during OOB_CERT.
   */
  ALLOW_PERSIST: null

});

/**
 * An |Authenticator| implements an authentication mechanism via various hooks
 * in the client and server debugger socket connection path (see socket.js).
 *
 * |Authenticator|s are stateless objects.  Each hook method is passed the state
 * it needs by the client / server code in socket.js.
 *
 * Separate instances of the |Authenticator| are created for each use (client
 * connection, server listener) in case some methods are customized by the
 * embedder for a given use case.
 */
var Authenticators = {};

/**
 * The Prompt authenticator displays a server-side user prompt that includes
 * connection details, and asks the user to verify the connection.  There are
 * no cryptographic properties at work here, so it is up to the user to be sure
 * that the client can be trusted.
 */
var Prompt = Authenticators.Prompt = {};

Prompt.mode = "PROMPT";

Prompt.Client = function() {};

Prompt.Client.prototype = {

  mode: Prompt.mode,

  /**
   * When client has just made a new socket connection, validate the connection
   * to ensure it meets the authenticator's policies.
   *
   * @param host string
   *        The host name or IP address of the debugger server.
   * @param port number
   *        The port number of the debugger server.
   * @param encryption boolean (optional)
   *        Whether the server requires encryption.  Defaults to false.
   * @param cert object (optional)
   *        The server's cert details.
   * @param s nsISocketTransport
   *        Underlying socket transport, in case more details are needed.
   * @return boolean
   *         Whether the connection is valid.
   */
  validateConnection() {
    return true;
  },

  /**
   * Work with the server to complete any additional steps required by this
   * authenticator's policies.
   *
   * Debugging commences after this hook completes successfully.
   *
   * @param host string
   *        The host name or IP address of the debugger server.
   * @param port number
   *        The port number of the debugger server.
   * @param encryption boolean (optional)
   *        Whether the server requires encryption.  Defaults to false.
   * @param transport DebuggerTransport
   *        A transport that can be used to communicate with the server.
   * @return A promise can be used if there is async behavior.
   */
  authenticate() {},
};

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();;
}

Authenticators.get = function(mode) {
  if (!mode) {
    mode = Prompt.mode;
  }
  for (let key in Authenticators) {
    let auth = Authenticators[key];
    if (auth.mode === mode) {
      return auth;
    }
  }
  throw new Error("Unknown authenticator mode: " + mode);
};
