"use strict";

/*
 * The high-level overview of architecture:
 *
 *
 *                                 ┌ PresentationConnectionManager
 *           ┌ PresentationManager ┤
 *           │                     └ PresentationDeviceManager
 *   Window ─┤                                │
 *           │                                │
 *           └ UIActionManager                │
 *                 │                          │ Call
 *                 │ Call                     │
 *                 ↓                          ↓
 *     RemoteControlManager          PresentationDevices
 *            │                               │
 *            └────┬──────────────────────────┘
 *               Global
 *
 *  PresentationDevices:
 *    Store all the information of the discovered presentaion-api devices
 *  PresentationDeviceManager:
 *    Use |window.navigator.mozPresentationDeviceInfo| to add, update, remove
 *    presentation devices
 *  PresentationConnectionManager:
 *    Use |window.PresentationRequest| to connect, disconnect, send commands
 *    to presentation devices
 *  PresentationManager:
 *    A interface to operate PresentationDeviceManager and
 *    PresentationConnectionManager. (This might be removed.)
 *  RemoteControlManager:
 *    Connect, disconnect, send and receive messages to/from Firefox OS TV
 *    via our secure channel. The remote-control secure channel is built on
 *    TLS. We use TLS to build a confidential channel, and then run J-PAKE
 *    for authentication.
 *  UIActionManager:
 *    Show/hide the pageAction and prompt UI depending on conditions.
 *    User can choose many ways to interact with FxOS TV by
 *    clicking different options on prompt UI.
 */

 /*
 * XPCOM modules
 * ==================================
 */
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/PageActions.jsm");
Cu.import("resource://gre/modules/Prompt.jsm");
Cu.import("resource://gre/modules/Snackbars.jsm");

/*
 * LazyGetter:
 *   You should NOT call the object defined in LazyGetter too early,
 *   e.g. in the global scope, or you will get nothing because it's not
 *   loaded!
 */

// An string bundle for localization.
XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://fxostv/locale/fxostv.properties");
});

/*
 * Debugging
 * ==================================
 */
// logging
// -----------------------------
function debug(msg) {
  console.log(msg);
}

// Searching devices manually
// -----------------------------
var gDiscoveryMenuId = null;
function discoveryDevices(win) {
  debug("### discoveryDevices ###");
  win.navigator.mozPresentationDeviceInfo.getAll()
  .then(function(devices) {

    if (devices === undefined || !devices.length) {
      return;
    }

    PresentationDevices.setList(devices);
    debug(PresentationDevices.getList());
  }, function(error) {
    debug(error);
  });

  ShowMessage('Discovery presentaion devices', true);
}

// For window.PresentationRequest(URL).start()
// -----------------------------
var gStartRequestMenuId = null;
function startRequest(win) {
  let url = 'app://notification-receiver.gaiamobile.org/index.html'
  let request = new win.PresentationRequest(url);
  request.start().then(function(result){
    console.log('successfully!');
  }).catch(function(error){
    console.log('damn it!');
  });
}

/*
 * Utils
 * ==================================
 */
// To get window object
function GetRecentWindow() {
	let window = Services.wm.getMostRecentWindow("navigator:browser");
	return window;
}

// To simulate enum
function CreateEnum(obj) {
  for (let key in obj) {
    obj[key] = key;
  }
  return obj;
}

// To show message below the view
function ShowMessage(aMsg, aLong) {
  Snackbars.show(aMsg, ((aLong)? Snackbars.LENGTH_LONG : Snackbars.LENGTH_LONG));
}

/*
 * Remote Control: J-PAKE over TLS
 * ==================================
 */
// Certificate module
// -----------------------------
// To get client's certificate for building TLS channel.
// However, in our case, the server side(FxOS TV) doesn't use this.
// Dependence:
//   Components // for using Cc
XPCOMUtils.defineLazyGetter(this, "Certificate", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/cert.js", sandbox);
  return sandbox["Cert"];
});

// TLS Socket module
// -----------------------------
// To build a confidential TLS channel without authentication
// Dependence:
//   Components // for using Cc, Ci, Cu
//   XPCOMUtils.jsm (Use: Services.tm.currentThread)
//   auth.js (Authentication module)
//   cert.js (Certificate module)
XPCOMUtils.defineLazyGetter(this, "Socket", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/socket.js", sandbox);
  return sandbox["Socket"];
});

// J-PAKE module
// -----------------------------
// To authenticate the confidential TLS channel
// Dependence:
//   Components // for using Cc, Ci
XPCOMUtils.defineLazyGetter(this, "JPAKE", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/jpake.js", sandbox);
  return sandbox["JPAKE"];
});

// Authenticated TLS Socket module
// -----------------------------
// Run J-PAKE to authenticate the TLS channel to the servers
// Dependence:
//   socket.js        // for TLS socket module
//   jpake.js         // for J-PAKE module
//   GetRecentWindow  // for getting window
XPCOMUtils.defineLazyGetter(this, "AuthSocket", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/authSocket.js", sandbox);
  return sandbox["AuthSocket"];
});

// Pairing Data module
// -----------------------------
// Store and retrieve the pairing data between TV and this add-on
// Dependence:
//   Services.jsm     // for Services.prefs.xxx
// XPCOMUtils.defineLazyGetter(this, "PairingData", function() {
//   let sandbox = {};
//   Services.scriptloader.loadSubScript("chrome://fxostv/content/pairingData.js", sandbox);
//   return sandbox["PairingData"];
// });
//
// This will be called in RemoteControlManager.
// If we put this into LazyGetter, the immediately executed RemoteControlManager
// can NOT get it!
const kServerClientPairsPref = 'fxos.tv.server_client_pairs';

var PairingData = (function () {

  function PairingInfo(aServerId, aClientId, aPIN) {
    this.server = aServerId;
    this.client = aClientId;
    this.pin = aPIN;
    return this;
  }

  // The Pairing Data structure is:
  // {
  //   server1 id: {
  //     client id: server1 assigned client id,
  //     pin: the AES base 64 signature from last time for next PIN code,
  //   }
  //   server2 id: {
  //     client id: server2 assigned client id,
  //     pin: the AES base 64 signature from last time for next PIN code,
  //   }
  //   ...
  // }

  function _debug(aMsg) {
    console.log('# [PairingData] ' + aMsg);
  }

  function _getTimestamp() {
    return new Date().getTime();
  }

  // Return the stored server-client pairing information.
  // If nothing exist, then return a empty object
  function getPairs() {
    _debug('getPairs');
    return (Services.prefs.getPrefType(kServerClientPairsPref)) ?
      JSON.parse(Services.prefs.getCharPref(kServerClientPairsPref)) : {};
  }

  // Save the pairing data
  function setPairs(aPairs) {
    _debug('setPairs');
    let pairsData = JSON.stringify(aPairs);
    Services.prefs.setCharPref(kServerClientPairsPref, pairsData);
    // This preference is consulted during startup.
    Services.prefs.savePrefFile(null);
  }

  function add(aServerId, aClientId, aPIN) {
    _debug('add');

    // Retrieve the stored pairing data
    let pairs = getPairs();

    let pairingInfo = new PairingInfo(aServerId, aClientId, aPIN);

    // If it exist, then do nothing!
    if (pairs[pairingInfo.server]) {
      _debug('The ' + aServerId + ' is already added!');
      return false;
    }

    // Append the new server-client pair into pairs
    pairs[pairingInfo.server] = {
      client: pairingInfo.client,
      pin: pairingInfo.pin,
    };

    // Save it
    setPairs(pairs);

    return true;
  }

  function update(aServerId, aClientId, aPIN) {
    _debug('update');

    // Retrieve the stored pairing data
    let pairs = getPairs();

    // If it doesn't exist, then do nothing!
    if (!pairs[aServerId]) {
      _debug('The ' + aServerId + ' does NOT exist!');
      return false;
    }

    if (aClientId) {
      pairs[aServerId].client = aClientId;
    }

    if (aPIN) {
      pairs[aServerId].pin = aPIN;
    }

    // Save it
    setPairs(pairs);

    return true;
  }

  function save(aServerId, aClientId, aPIN) {
    _debug('save');

    // Retrieve the stored pairing data
    let pairs = getPairs();

    // If it doesn't exist, then do nothing!
    if (!pairs[aServerId]) {
      pairs[aServerId] = {};
    }

    if (aClientId) {
      pairs[aServerId].client = aClientId;
    }

    if (aPIN) {
      pairs[aServerId].pin = aPIN;
    }

    // Save it
    setPairs(pairs);

    return true;
  }

  function remove(aServerId) {
    _debug('remove');

    // Retrieve the stored pairing data
    let pairs = getPairs();

    // If it doesn't exist, then do nothing!
    if (!pairs[pairingInfo.server]) {
      _debug('The ' + aServerId + ' does NOT exist!');
      return false;
    }

    delete pairs[pairingInfo.server];

    setPairs(pairs);

    return true;
  }

  function deleteAll() {
    _debug('deleteAll');

    Services.prefs.deleteBranch(kServerClientPairsPref);
  }

  return {
    getPairs: getPairs,
    setPairs: setPairs,
    add: add,
    update: update,
    save: save,
    remove: remove,
    deleteAll: deleteAll,
  };
})();

// Remote-control user interface
// -----------------------------
// The remote-control client ported from Gaia
// is located under 'content/remote-control-client/'.
// Dependence:
//   GetRecentWindow
// The remote-control client PIN page
const kRemoteControlPairingPINURL = 'chrome://fxostv/content/remote-control-client/pairing.html';
// The remote-control client page
const kRemoteControlUIURL = 'chrome://fxostv/content/remote-control-client/client.html';
// The loading page to wait for re-directing to other URL
const kLoadingPageURL = 'chrome://fxostv/content/remote-control-client/loading.html';
// The waiting time for watchdog
const kWatchdogTimer = 20; // seconds

// Remote Control Manager module
// -----------------------------
// The description is in the beginning of bootstrap.js.
var gSocketMenuId = null;

var RemoteControlManager = (function() {

  function _debug(aMsg) {
    console.log('# [RemoteControlManager] ' + aMsg);
  }

  // let _bundle = null;
  function _getString(aName) {
    _debug('_getString');
    // if (!_bundle) {
    //     _bundle = Services.strings.createBundle("chrome://fxostv/locale/fxostv.properties");
    // }
    // return _bundle.GetStringFromName(aName);
    return Strings.GetStringFromName(aName);
  }

  // Store the TLS session information
  function Session(aHost, aPort, aAuthSocket) {
    this.host = aHost || false;
    this.port = aPort || -1;
    this.authSocket = aAuthSocket || false;
  }

  // _sessions = {
  //   tabId: Session(host, port, authSocket),
  //   ...
  // }
  let _sessions = {};

  function _getTabIdByHost(aHost) {
    for (let tabId in _sessions) {
      if (aHost == _sessions[tabId].host) {
        return tabId;
      }
    }
    return false;
  }

  // _serverClientPairs = {
  //   server1 id: {
  //     client id: server1 assigned client id,
  //     pin: the AES base 64 signature from last time,
  //   }
  //   server2 id: {
  //     client id: server2 assigned client id,
  //     pin: the AES base 64 signature from last time,
  //   }
  //   ...
  // }
  let _serverClientPairs = PairingData.getPairs();
  console.log(_serverClientPairs);

  function _clearSession(aTabId) {
    _debug('_clearSession: ' + aTabId);

    if (!_sessions[aTabId]) {
      _debug('  no session for this tab');
      return;
    }

    // // Disconnect
    // _sessions[aTabId].authSocket.disconnect();
    //
    // // Delete the session
    // delete _sessions[aTabId];

    // Close the tab:
    //   _onTabClose will help us to disconnect and delete the session.
    let window = GetRecentWindow();
    let tab = window.BrowserApp.getTabForId(aTabId);
    window.BrowserApp.closeTab(tab);
  }

  function _notifyPINPage(aMsg) {
    // Message to notify RemoteControlManager in bootstrap.js
    _debug('_notifyPINPage');
    let msg = JSON.stringify(aMsg);
    Services.obs.notifyObservers(null, 'pin-result', msg);
  }

  // Observer to receive remote-control messages/commands
  // from remote-control client page
  let _messageObserver = {
    observe: function (aSubject, aTopic, aData) {
      _debug('_remoteControlObserver >> obsere: ' + aTopic);

      switch(aTopic) {
        case 'remote-control-message': {
          let msg = JSON.parse(aData);

          if (!_sessions[msg.tabId] || !_sessions[msg.tabId].authSocket) {
            _debug('  There is no existing authSocket for this client');
            return;
          }

          let authSocket = _sessions[msg.tabId].authSocket;
          authSocket.sendCommand(msg.action, msg.detail);
          break;
        }

        case 'pairing-pincode': {
          let msg = JSON.parse(aData);

          if (!_sessions[msg.tabId] || !_sessions[msg.tabId].authSocket) {
            _debug('  There is no existing authSocket for this client');
            return;
          }

          let authSocket = _sessions[msg.tabId].authSocket;

          authSocket.enterPIN(msg.pincode);
          break;
        }

        case 'reconnect': {
          let msg = JSON.parse(aData);

          if (!_sessions[msg.tabId] || !_sessions[msg.tabId].authSocket) {
            _debug('  There is no existing authSocket for this client');
            return;
          }

          let authSocket = _sessions[msg.tabId].authSocket;

          // If the current url is PIN code page,
          // then we don't need to re-direct url to itself again.
          let window = GetRecentWindow();
          let tab = window.BrowserApp.getTabForId(msg.tabId);
          if (tab.window.location == kRemoteControlPairingPINURL) {
            _debug('  no need to redirect to PIN code page again');
            authSocket.needPINNotifier = null;
          }

          // Get a client certificate first(server might need it)
          Certificate.getOrCreate()
          // then connect to server
          .then(function(aCert) {

            // Reset the watchdog
            _removeWatchdog(msg.tabId);
            _setWatchdog(msg.tabId, 4 * kWatchdogTimer);

            // Show message to user for reconnecting
            // ShowMessage(_getString('service.request.reconnect'), true);

            authSocket.connect({
              host: _sessions[msg.tabId].host,
              port: _sessions[msg.tabId].port,
              cert: aCert,
            }, _serverClientPairs, msg.tabId, true)
            .then(_onSuccess, _onFailure);
          });

          break;
        }

        default:
          break;
      }
    }
  };

  function _setWatchdog(aTabId, aTime) {
    _debug('_setWatchdog: ' + aTabId);

    if (!_sessions[aTabId]) {
      _debug('  there is no session for this tab!');
    }


    let window = GetRecentWindow();

    // if there is a used watchdog, clear it.
    if (_sessions[aTabId].watchdog) {
      window.clearTimeout(_sessions[aTabId].watchdog);
    }

    // Wait some time before releasing the watchdog.
    // The watchdog will clear the session and close this tab
    // if there is no server's response received in time.
    function releaseDog() {
      _debug('!!! Release the watchdog: ' + aTabId);

      // Show message to user that we don't receive any response from server
      ShowMessage(_getString('service.request.noresponse'), true);

      _clearSession(aTabId);
    }

    _sessions[aTabId].watchdog = window.setTimeout(releaseDog,
      ((aTime)? (aTime * 1000) : (kWatchdogTimer * 1000)));
  }

  function _removeWatchdog(aTabId) {
    _debug('_removeWatchdog: ' + aTabId);

    if (!_sessions[aTabId] || !_sessions[aTabId].watchdog) {
      _debug('  there is no watchdog for this tab!');
    }

    // The watchdog will be removed when we get the responses from server.
    let window = GetRecentWindow();
    window.clearTimeout(_sessions[aTabId].watchdog);
  }

  // A listener that will be fired when tab is closed
  function _onTabClose(aEvent) {
    _debug('_onTabClose');

    // the target is a XUL browser element
    let browser = aEvent.target;

    // Disconnect to server if remote-control client page is closed
    let window = GetRecentWindow();
    let closedTab = window.BrowserApp.getTabForBrowser(browser);

    if (!_sessions[closedTab.id]) {
      _debug('  The closed tab is not for the remote-control service');
      return;
    }

    // Remove the watchdog for this tab
    _removeWatchdog(closedTab.id);

    // Disconnect to TV if the connection is still inuse.
    let authSocket = _sessions[closedTab.id].authSocket;

    if (authSocket) {
      _debug('  Disconnect for this socket');
      authSocket.disconnect();
    }

    // Remove this session from _sessions
    delete _sessions[closedTab.id];

    // Remove observer and listener to receive remote-control messages and
    // TabClose event when all sessions are removed
    if (Object.keys(_sessions).length === 0 &&
        JSON.stringify(_sessions) === JSON.stringify({})) {
      _debug('  Remove observer to receive remote-control and pairing-pincode messages');
      Services.obs.removeObserver(_messageObserver, 'remote-control-message');
      Services.obs.removeObserver(_messageObserver, 'pairing-pincode');
      Services.obs.removeObserver(_messageObserver, 'reconnect');

      _debug('  Remove listener to receive TabClose');
      window.BrowserApp.deck.removeEventListener("TabClose", _onTabClose, false);
    }
  }

  // This will be fired upon server close the connection
  function _onServerClose(aTabId) {
    _debug('_onServerClose: ' + aTabId);

    // Show message to user that server close the connection
    ShowMessage(_getString('service.server.close'), true);

    _clearSession(aTabId);
  }

  // This will be fired after the authentication is successful
  function _onSuccess(aPairInfo) {
    _debug('_onSuccess: ' + aPairInfo.tabId);

    // Remove the watchdog after we get the responses from server
    _removeWatchdog(aPairInfo.tabId);

    // If the page is still pin code page, then it means that
    // the authentication is successful after PIN code is entered.
    // This means that it is the first time connection.
    // In this case, let PIN code page redirect to remote-controller page
    // because it will also show some messages like 'connected successfully'.
    let window = GetRecentWindow();
    let tab = window.BrowserApp.getTabForId(aPairInfo.tabId);
    if (tab.window.location == kRemoteControlPairingPINURL) {
      _notifyPINPage({ valid : true });
    // otherwise, we need to re-direct URL
    // to remote-controller page by ourselves
    } else {
      tab.window.location = kRemoteControlUIURL;
    }

    // Save the server-client id pair if it doesn't exist
    if (!_serverClientPairs[aPairInfo.server]) {
      _serverClientPairs[aPairInfo.server] = {};
    }

    // Update the PIN code for the next-time usage
    if (aPairInfo.pin) {
      _serverClientPairs[aPairInfo.server].pin = aPairInfo.pin;
    }

    // Update the server assigned client id if it needs
    if (aPairInfo.client) {
      _serverClientPairs[aPairInfo.server].client = aPairInfo.client;
    }

    // Update the server-client info pairs
    if (Object.keys(_serverClientPairs[aPairInfo.server]).length) {
      PairingData.save(aPairInfo.server, aPairInfo.client, aPairInfo.pin);
    } else {
      // If there is no property in server-client id pair,
      // then it must have something wrong!
      _debug('!!!!!!! No key in this server-client pair !!!!!!!!');
    }

    // Set callback that will be fired when TV closes the connection
    _sessions[aPairInfo.tabId].authSocket.serverCloseNotifier = _onServerClose;
  }

  // This will be fired after the authentication is failed
  function _onFailure(aResult) {
    _debug('_onFailure: ' + aResult.tabId + ', error: ' + aResult.error);

    // Remove the watchdog after we get the responses from server
    _removeWatchdog(aResult.tabId);

    // Show error message on PIN code page if aReason is:
    //   pin-expired  : PIN code is expired
    //   wrong-pin    : PIN entered is wrong
    if (aResult.error == 'pin-expired' || aResult.error == 'wrong-pin') {
      _notifyPINPage({ valid : false, reason: aResult.error });
    }
  }

  // Start connecting to TV:
  // After connection to TV via TLS channel, we will run J-PAKE to authenticate.
  // We will open a page for users to enter the PIN code first.
  // server will show PIN code after it receives our round 1 data of J-PAKE.
  // Users should enter the PIN code shown on TV, and we will use it to
  // compute the round 2 data of J-PAKE.
  //
  // If the authentication is passed, then the page will be re-directed to
  // the remote-control client page. Otherwise, we will close the pin-code page
  // and show the error messages.
  function start(aHost, aPort) {
    _debug('start: ' + aHost + ':' + aPort);

    // If the host is already connected, then just jump to its controlling tab
    let pairedTabId = _getTabIdByHost(aHost);
    if (pairedTabId) {
      _debug('already connected to ' + aHost +
             ' with remote-control tab: ' + pairedTabId);
      let window = GetRecentWindow();
      let controlPageTab = window.BrowserApp.getTabForId(pairedTabId);
      window.BrowserApp.selectTab(controlPageTab);
      return;
    }
    // Otherwise, build a connection between Fennec and TV

    let tab;

    // Get a client certificate first(server might need it)
    Certificate.getOrCreate()
    // then connect to server
    .then(function(aCert) {
      // Create a AuthSocket
      let authSocket = new AuthSocket();

      // Set the callback that will be fired if it needs PIN code
      function onNeedPIN() {
        _debug('onNeedPIN');

        // Remove the watchdog after we get the responses from server
        _removeWatchdog(tab.id);
        // Reset a watchdog to wait for the responses again
        // _setWatchdog(tab.id, 5 * kWatchdogTimer);

        // Re-direct the URL to the PIN code entering page
        _debug('Re-directing URL of tab ' + tab.id + ' to pincode-entering page......');
        let window = GetRecentWindow();
        window.BrowserApp.loadURI(kRemoteControlPairingPINURL, tab.browser);
      }
      authSocket.needPINNotifier = onNeedPIN;

      // Open a loading page first because we don't know whether or not
      // we need to enter the pairing pin code.
      // If it's the first-time connection, then we need to enter the pin
      // to finish the first-time authentication, so we will re-direct the
      // URL to the pincode-entering page.
      // Ohterwise, the authentication can be finished automatically, so we can
      // re-direct URL to remote-control client page directly.
      let window = GetRecentWindow();
      tab = window.BrowserApp.addTab(kLoadingPageURL);
      _debug('  Open tab: ' + tab.id);

      // Store all the session information
      _sessions[tab.id] = new Session(aHost, aPort, authSocket);

      // Add observer and listener to receive pairing-pincode,
      // remote-control messages and TabClose event
      // when the first session is built
      if (Object.keys(_sessions).length == 1) {
        _debug('  Add observer to receive remote-control and pairing-pincode messages');
        Services.obs.addObserver(_messageObserver, 'remote-control-message', false);
        Services.obs.addObserver(_messageObserver, 'pairing-pincode', false);
        Services.obs.addObserver(_messageObserver, 'reconnect', false);

        _debug('  Add listener to receive TabClose');
        window.BrowserApp.deck.addEventListener("TabClose", _onTabClose, false);
      }

      // // Show message: request sent
      // ShowMessage(_getString('service.request.send'), true);

      // Set a watchdog to wait for the server's response
      _setWatchdog(tab.id);

      // Try to connect TV
      return authSocket.connect({
        host: aHost,
        port: aPort,
        cert: aCert,
      }, _serverClientPairs, tab.id);
    })
    .then(_onSuccess, _onFailure)
    .catch(function(aError) {
      // Log the error message
      _debug(aError);
      // Show error message to user
      ShowMessage(_getString('service.request.fail'), true);
      // Clear this failed session
      _clearSession(tab.id);
    });
  }

  return {
    start: start,
  };
})();

/*
 * Presentation API
 * ==================================
 */
// PresentationDevices module
// -----------------------------
// The description is in the beginning of bootstrap.js.
XPCOMUtils.defineLazyGetter(this, "PresentationDevices", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationDevices.js", sandbox);
  return sandbox["PresentationDevices"];
});

// PresentationDeviceManager module
// -----------------------------
// The description is in the beginning of bootstrap.js.
// Dependence:
//   Components // for using Cc, Ci
//   presentationDevices.js
XPCOMUtils.defineLazyGetter(this, "PresentationDeviceManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationDeviceManager.js", sandbox);
  return sandbox["PresentationDeviceManager"];
});

// PresentationConnectionManager module
// -----------------------------
// The description is in the beginning of bootstrap.js.
XPCOMUtils.defineLazyGetter(this, "PresentationConnectionManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationConnectionManager.js", sandbox);
  return sandbox["PresentationConnectionManager"];
});

// PresentationManager module
// -----------------------------
// The description is in the beginning of bootstrap.js.
// Dependence:
//   presentationConnectionManager.js
//   presentationDeviceManager.js
function PresentationManager() {}

PresentationManager.prototype = {
  connectionManager: null,
  deviceManager: null,

  init: function(aWindow) {
    if (!this.deviceManager) {
      this.deviceManager = new PresentationDeviceManager();
      this.deviceManager.init(aWindow);
    }

    if (!this.connectionManager) {
      this.connectionManager = new PresentationConnectionManager();
      this.connectionManager.init(aWindow);
    }
  },

  uninit:function(aWindow) {
    if (this.deviceManager) {
      this.deviceManager.uninit(aWindow);
      this.deviceManager = null;
    }

    if (this.connectionManager) {
      this.connectionManager.uninit();
      this.connectionManager = null;
    }
  },
};

function initPresentationManager(aWindow) {
  if (!aWindow.hasOwnProperty('presentationManager')) {
    aWindow.presentationManager = new PresentationManager();
    aWindow.presentationManager.init(aWindow);
  }
}

function uninitPresentationManager(aWindow) {
  if (aWindow.hasOwnProperty('presentationManager')) {
    aWindow.presentationManager.uninit(aWindow);
    delete aWindow.presentationManager;
  }
}



/*
 * UI Action Manager
 * ==================================
 */
// PageActionManager module
// -----------------------------
// An interface to operate PageAction.jsm
// Dependence:
//   PageAction.jsm
XPCOMUtils.defineLazyGetter(this, "PageActionManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/pageActionManager.js", sandbox);
  return sandbox["PageActionManager"];
});

// UIActionManager module
// -----------------------------
// The description is in the beginning of bootstrap.js.
// Dependence:
//   PageActionManager.js
//   PresentationManager
//     - PresentationDeviceManager.js
//     - PresentationConnectionManager.js
var UIActionManager = function() {

  // Utils
  // -------------------------------
  function _debug(aMsg) {
    console.log('# [UIActionManager] ' + aMsg);
  }

  function _isCastable() {
    _debug('_isCastable');
    return Services.prefs.getBoolPref("browser.casting.enabled");
  }

  function _getCurrentURL(aWindow) {
    _debug('_getCurrentURL');
    return aWindow.BrowserApp.selectedBrowser.currentURI.spec;
  }

  function _shouldCast(aWindow) {
    _debug('_shouldCast');
    var currentURL = _getCurrentURL(aWindow);
    var validURL = currentURL.includes('http://') || currentURL.includes('https://');
    return validURL && aWindow.presentationManager.deviceManager.deviceAvailable;
  }

  // TODO: Define conditions to cast video
  // For send-video service
  // reference: using 'mozAllowCasting' for video tag
  // https://dxr.mozilla.org/mozilla-central/source/mobile/android/chrome/content/browser.js
  function _findCastableVideo() {
    return false;
  }

  // let _bundle = null;
  function _getString(aName) {
    _debug('_getString');
    // if (!_bundle) {
    //     _bundle = Services.strings.createBundle("chrome://fxostv/locale/fxostv.properties");
    // }
    // return _bundle.GetStringFromName(aName);
    return Strings.GetStringFromName(aName);
  }

  // Prompt UI
  // -------------------------------
  function _getPrompt(aTitle, aMenu) {
    _debug('_getPrompt');
    let p = new Prompt({
      title: aTitle,
    });

    p.setSingleChoiceItems(aMenu);

    return p;
  }

  function _getPromptInfo() {
    _debug('_getPromptInfo');
    // Prompt menu
    let menu = [];

    // Callbacks for clicking menu
    let callbacks = {};

    // target device for callbacks
    let targetDevices = {};

    // Load devices information into prompt munu and set its callbacks
    let devices = PresentationDevices.getList();

    // Find whether or not there is video in content that can be casted
    // let videoCastable = _findCastableVideo(window.BrowserApp.selectedBrowser);
    let videoCastable = _findCastableVideo();

    let buttonIndex = 0;
    for (let i in devices) {

      // Ignore the devices that doesn't provide any service
      if (!devices[i].available) {
        continue;
      }

      // Assume every device has a valid name
      menu.push({ label: devices[i].name, header: true });
      ++buttonIndex;

      // Add send page service
      addServiceToMenu(devices[i].sendPage,
                       _getString('service.sendPage'),
                       _sendPage,
                       devices[i]);

      // Add remote-control service
      addServiceToMenu(!!devices[i].remoteControlInfo,
                       _getString('service.remoteControl'),
                       _remoteControl,
                       devices[i]);

      // Add video casting service
      addServiceToMenu(videoCastable && devices[i].sendVideo,
                       _getString('service.sendVideo'),
                       _castVideo,
                       devices[i]);

      // Add pin-page-to-homescreen service
      addServiceToMenu(devices[i].pinPage,
                       _getString('service.pinPage'),
                       _pinPageToHomescreen,
                       devices[i]);
    }

    function addServiceToMenu(aCondition, aLabel, aCallback, aTarget) {
      if (aCondition) {
        menu.push({ label: aLabel });
        callbacks[buttonIndex] = aCallback;
        targetDevices[buttonIndex] = aTarget;
        ++buttonIndex;
      }
    }

    return { menu: menu, callbacks: callbacks, targets: targetDevices };
  }

  function _showPrompt(aPrompt) {
    _debug('_showPrompt');

    let response = null;
    aPrompt.show(function(data) {
      response = data;
    });

    // Spin this thread while we wait for a result
    let thread = Services.tm.currentThread;
    while (response === null)
      thread.processNextEvent(true);

    return response;
  }

  // PageAction
  // -------------------------------
  function _chooseAction(aWindow) {
    _debug('_chooseAction');
    let promptInfo = _getPromptInfo();
    let prompt = _getPrompt(_getString('service.title'), promptInfo.menu);
    let response = _showPrompt(prompt);
    let index = response.button; // -1: outside of prompt menu, 0: header
    if (index > 0 && promptInfo.callbacks[index] && promptInfo.targets[index]) {
      let service = promptInfo.callbacks[index];
      let target = promptInfo.targets[index];
      service(aWindow, target);
    }
  }

  function _getPageActionIcon(aWindow) {
    _debug('_getPageActionIcon');
    const HDPI = "chrome://fxostv/content/cast-link-icons/cast-link-icon_22.png";
    const XHDPI = "chrome://fxostv/content/cast-link-icons/cast-link-icon_30.png";
    const XXHDPI = "chrome://fxostv/content/cast-link-icons/cast-link-icon_45.png";
    return (aWindow.devicePixelRatio <= 1.5)?
              HDPI : (aWindow.devicePixelRatio <= 2)?
                XHDPI : XXHDPI;
  }

  function _updatePageAction(aWindow) {
    _debug('_updatePageAction');
    if (!_shouldCast(aWindow)) {
      _debug('  >> no need to cast');
      PageActionManager.remove();
      return;
    }

    PageActionManager.add(() => _chooseAction(aWindow));
  }

  function _updatePageActionForTab(aWindow, aTab) {
    _debug('_updatePageActionForTab');

    if (!aWindow.BrowserApp || !aWindow.BrowserApp.selectedTab) {
      _debug('  >> there is no aWindow.BrowserApp.selectedTab!');
      return;
    }

    // We only care about events on the selected tab
    if (aTab != aWindow.BrowserApp.selectedTab) {
      return;
    }

    _updatePageAction(aWindow);
  }

  // Services
  // -------------------------------
  // function _sendPage(aWindow, aTarget) {
  //   _debug('_sendPage');
  //   if (!aWindow.presentationManager ||
  //       !aWindow.presentationManager.connectionManager) {
  //     _debug('  >> there is no available PresentationConnectionManager');
  //     return;
  //   }
  //
  //   // Start connecting to TV
  //   let currentURL = _getCurrentURL(aWindow);
  //   aWindow.presentationManager.connectionManager.start(aWindow, currentURL, aTarget)
  //   .catch(function(aError) {
  //     // Show message: request fail
  //     ShowMessage(_getString('service.request.fail'), true);
  //   });
  // }
  function _sendPage(aWindow, aTarget) {
    _debug('_sendPage');
    if (!aWindow.presentationManager ||
        !aWindow.presentationManager.connectionManager) {
      _debug('  >> there is no available PresentationConnectionManager');
      return;
    }

    // Close the presentation session after receiving 'ack'
    let listener = {
      ack: function(aMessage, aEvent) {
        _debug('terminate after receiving ack!');
        let win = GetRecentWindow();
        win.presentationManager.connectionManager.unregisterListener(this);
        win.presentationManager.connectionManager.terminate();
      },
    }
    aWindow.presentationManager.connectionManager.registerListener(listener);

    // Start connecting to TV
    let currentURL = _getCurrentURL(aWindow);
    let appURL = 'app://notification-receiver.gaiamobile.org/index.html';
    aWindow.presentationManager.connectionManager.start(aWindow, appURL, aTarget)
    .then(function(aResult) {
      // Show message: request sent
      ShowMessage(_getString('service.request.send'), true);
      // Request TV to show the page
      aWindow.presentationManager.connectionManager
      .sendCommand('view', {
        'url': currentURL,
        'timestamp': Date.now(),
      });
    }).catch(function(aError) {
      // Show message: request fail
      ShowMessage(_getString('service.request.fail'), true);
    });
  }

  // function _remoteControl(aWindow, aTarget) {
  //   _debug('_remoteControl');
  //   if (!aWindow.presentationManager ||
  //       !aWindow.presentationManager.connectionManager) {
  //     _debug('  >> there is no available PresentationConnectionManager');
  //     return;
  //   }
  //
  //   _debug('Connect to ' + aTarget.remoteControlInfo.address +
  //          ':' + aTarget.remoteControlInfo.port);
  //
  //   // Connect to TV and remotely operate it on fennec
  //   RemoteControlManager.start(aTarget.remoteControlInfo.address,
  //                              aTarget.remoteControlInfo.port);
  // }

  function _remoteControl(aWindow, aTarget) {
    _debug('_remoteControl');
    if (!aWindow.presentationManager ||
        !aWindow.presentationManager.connectionManager) {
      _debug('  >> there is no available PresentationConnectionManager');
      return;
    }

    function _launchService() {
      _debug('_launchService');
      _debug('Connect to ' + aTarget.remoteControlInfo.address +
             ':' + aTarget.remoteControlInfo.port);

      // Connect to TV and remotely operate it on fennec
      RemoteControlManager.start(aTarget.remoteControlInfo.address,
                                 aTarget.remoteControlInfo.port);
    }

    // Close the presentation session after receiving 'ack'
    let listener = {
      ack: function(aMessage, aEvent) {
        _debug('terminate after receiving ack!');
        let win = GetRecentWindow();
        win.presentationManager.connectionManager.unregisterListener(this);
        win.presentationManager.connectionManager.terminate();
        // Launch remote control service
        _launchService();
      },
    }
    aWindow.presentationManager.connectionManager.registerListener(listener);

    // Start connecting to TV
    let currentURL = _getCurrentURL(aWindow);
    let appURL = 'app://notification-receiver.gaiamobile.org/index.html';
    aWindow.presentationManager.connectionManager.start(aWindow, appURL, aTarget)
    .then(function(aResult) {
      // Show message: request sent
      ShowMessage(_getString('service.request.send'), true);
      // Request TV to show the page
      aWindow.presentationManager.connectionManager
      .sendCommand('view', {
        'url': currentURL,
        'timestamp': Date.now(),
      });
    }).catch(function(aError) {
      // Show message: request fail
      ShowMessage(_getString('service.request.fail'), true);
    });
  }

  function _castVideo(aWindow, aTarget) {
    _debug('_castVideo');
  }

  function _pinPageToHomescreen(aWindow, aTarget) {
    _debug('_pinPageToHomescreen');
  }

  // Event Listeners
  // -------------------------------
  function _handleEvent(aEvent) {
    _debug('_handleEvent: ' + aEvent.type);
    switch (aEvent.type) {
      case 'pageshow': {
        // aEvent.currentTarget is ChromeWindow!
        let domWindow = aEvent.currentTarget;
        // domWindow.BrowserApp might be null if window is Ci.nsIDOMWindow
        // instead of Ci.nsIDOMWindowInternal
        if (!domWindow.BrowserApp) {
          _debug('>> ther is no domWindow.BrowserApp!');
          domWindow = GetRecentWindow();
        }
        let tab = domWindow.BrowserApp.getTabForWindow(aEvent.originalTarget.defaultView);
        _updatePageActionForTab(domWindow, tab);
        break;
      }

      case 'TabSelect': {
        // aEvent.view and aEvent.currentTarget.ownerGlobal are ChromeWindow!
        let domWindow = aEvent.view;
        // domWindow.BrowserApp might be null if window is Ci.nsIDOMWindow
        // instead of Ci.nsIDOMWindowInternal
        if (!domWindow.BrowserApp) {
          _debug('>> ther is no domWindow.BrowserApp!');
          domWindow = GetRecentWindow();
        }
        let tab = domWindow.BrowserApp.getTabForBrowser(aEvent.target);
        _updatePageActionForTab(domWindow, tab);
        break;
      }

      default: {
        _debug('  no handler for this type!');
        break;
      }
    }
  }

  let _listener = null;
  function _listenDeviceChange(aWindow) {
    _debug('_listenDeviceChange');
    if (!aWindow.presentationManager ||
        !aWindow.presentationManager.deviceManager) {
      _debug('  >> there is no available PresentationDeviceManager');
      return;
    }

    // callback for _listener.add/update/remove
    let updatePageAction = function(evt) {
      // evt.target is PresentationDeviceInfoManager
      // and evt.target.ownerGlobal is ChromeWindow;
      _updatePageAction(evt.target.ownerGlobal);
    };
    _listener = {
      add: updatePageAction,
      update: updatePageAction,
      remove: updatePageAction,
    };

    // _listener = {
    //   add: function() { let win = GetRecentWindow() ; _updatePageAction(win); },
    //   update: function() { let win = GetRecentWindow() ; _updatePageAction(win); },
    //   remove: function() { let win = GetRecentWindow() ; _updatePageAction(win); },
    // };

    aWindow.presentationManager.deviceManager.registerListener(_listener);
  }

  function _removeListenerOnDeviceChange(aWindow) {
    _debug('_removeListenerOnDeviceChange');
    if (!aWindow.presentationManager ||
        !aWindow.presentationManager.deviceManager) {
      _debug('  >> there is no available PresentationDeviceManager');
      return;
    }

    if (!_listener) {
      _debug('  >> there is used _listener!');
      return;
    }

    aWindow.presentationManager.deviceManager.unregisterListener(_listener);
  }

  // Initializer
  // -------------------------------
  function _initializer(aWindow) {
    _debug('_initializer');

    // Reload pageAction after page has been loaded
    aWindow.addEventListener('pageshow', _handleEvent, true);

    // Reload pageAction after tab has been switched
    aWindow.BrowserApp.deck.addEventListener('TabSelect', _handleEvent, true);

    // TODO: Remove pageAction when wifi is turned-off,
    // and reload it when wifi is turned-on.

    // Init PageAction
    PageActionManager.init(_getPageActionIcon(aWindow),
                           _getString('pageaction.title'));

    // // Add pageAction if it need
    // _updatePageAction(aWindow);

    // Reload pageAction when PresentationDeviceManager receives devicechange
    _listenDeviceChange(aWindow);
  }

  function init(aWindow) {
    _debug('init');

    if (!_isCastable()) {
      _debug('  >> disallow for casting!');
      return;
    }

    // Call initializer() immediately if UI is ready
    if (aWindow.BrowserApp && aWindow.BrowserApp.deck) {
      _debug('Call initializer() immediately');
      _initializer(aWindow);
    // Wait for BrowserApp to initialize.
    } else {
      _debug('Wait for BrowserApp to initialize');
      aWindow.addEventListener('UIReady', function onUIReady() {
        aWindow.removeEventListener('UIReady', onUIReady, false);
        let win = GetRecentWindow();
        _initializer(win);
      }, false);
    }
  }

  function uninit(aWindow) {
    _debug('uninit');

    // Remove listeners
    aWindow.remoteEventListener('pageshow', _handleEvent);
    aWindow.BrowserApp.deck.removeEventListener('TabSelect', _handleEvent);

    // Remove listeners for devicechange
    _removeListenerOnDeviceChange(aWindow);

    // Uninit PageAction
    PageActionManager.uninit();
  }

  return {
    init: init,
    uninit: uninit,
    update: function() {
      _debug('update');
      let win = GetRecentWindow();
      _updatePageAction(win);
    },
  };
};

function initUIActionManager(aWindow) {
  if (!aWindow.hasOwnProperty('UIActionManager')) {
    aWindow.UIActionManager = new UIActionManager();
    aWindow.UIActionManager.init(aWindow);
  }
}

function uninitUIActionManager(aWindow) {
  if (aWindow.hasOwnProperty('UIActionManager')) {
    aWindow.UIActionManager.uninit(aWindow);
    delete aWindow.UIActionManager;
  }
}



/*
 * Main
 * ==================================
 */
function loadIntoWindow(window) {
  console.log('Hello World!');
  // For Debug: Add a button in menu to do force-discovery
  gDiscoveryMenuId = window.NativeWindow.menu.add("Search Devices", null, function() { discoveryDevices(window); });
  // For Debug: Add a button in menu to do socket-connecting
  gSocketMenuId = window.NativeWindow.menu.add("Socket Connect", null, function() { RemoteControlManager.start("192.168.1.105", 4433); });
  // For Debug: Add a button in menu to do window.PresentationRequest(URL).start()
  gStartRequestMenuId = window.NativeWindow.menu.add("Start Request", null, function() { startRequest(window); });

  // Initialize PresentationManager for this window
  initPresentationManager(window);

  // Initialize UIActionManager for this window
  initUIActionManager(window);
}

function unloadFromWindow(window) {
  // For Debug: Remove the force-discovery from menu
  gDiscoveryMenuId && window.NativeWindow.menu.remove(gDiscoveryMenuId);
  // For Debug: Remove the socket-connecting from menu
  gSocketMenuId && window.NativeWindow.menu.remove(gSocketMenuId);
  // For Debug: Remove the start-request from menu
  gStartRequestMenuId && window.NativeWindow.menu.remove(gStartRequestMenuId);

  // Delete PresentationManager for this window
  uninitPresentationManager(window);

  // Delete UIActionManager for this window
  uninitUIActionManager(window);
}

/**
 * bootstrap.js API
 */
var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    function loadListener() {
      domWindow.removeEventListener("load", loadListener, false);
      loadIntoWindow(domWindow);
    };
    domWindow.addEventListener("load", loadListener, false);
  },

  onCloseWindow: function(aWindow) {
  },

  onWindowTitleChange: function(aWindow, aTitle) {
  }
};

function startup(aData, aReason) {
  // Load into any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }

  // Load into any new windows
  Services.wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN) {
    return;
  }

  // Stop listening for new windows
  Services.wm.removeListener(windowListener);

  // Unload from any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
  // Delete the stored pairing data
  if (PairingData) {
    PairingData.deleteAll();
  }
}
