"use strict";

/*
 * Images
 * ==================================
 */
 const ICON_HDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAWCAYAAAAxSueLAAAAAXNSR0IArs4c6QAAAOdJREFUSA3tlj0KwkAQhd8LqUQLD6EnsPMI4hkSiEX8KS30BNrYiiBBPYN4BUt7vYSgtjpOlHQjGHCtss2ws7PvzX7NLINOtw9gCpGyRjeLvKnwyKfIRAB3Rmn7+hACE1+NKul+kyx072YFUSypj+dG3lYtzGwuObMFxpzA7PICo80lZ7bAmBOYXf5XjAyj+JKNGbuf32R1fl09Icd4T9LfqFoqqv/ysc5c5T5O5zDqtYHHTBHXvjYnTxQO18l8a935aJYVB9GgCe/e0r9KA8K6mldBlChQNDirwFFrDyR3q+V8n92z4hNcNDP6qelDfAAAAABJRU5ErkJggg==";
 const ICON_XHDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAeCAYAAABE4bxTAAAAAXNSR0IArs4c6QAAAUtJREFUWAntl7tKxEAUhs85SWFjsz6Bha0KYuEFLCx8g1ia9QKSp8gj2CyKi5dtfQ8RFcQV7CwstPNSWiXHfxZcdiHkCMKOCzMQksxP5nz5MgMTTveyeSrLcyWaJSLG4aMpCj+QSCqkegaYOVD4gnECuMcAFlFVB/MvmmOJQdI30zk56l+PknBrZx+Ceo1llIV/UysAWZaCoWDIMmDlYQ4FQ5YBKw9zKBiyDFh5mENjZ4ixfSxB7WXrWmFLhZm7FYGXLsciUazb0OOgfjbaPmDcf1mXmJs+io9XTXMyN3ezzVK1hS869bdX4/dIJDttty7qxonqQpfd390+Li6sdJT1C/Qz6Jq0nhnKmV5F+GAi1rR9fHgzlFXcmIYGn8nzPH5+eVslKpaxApaQTcNcg4kbOBfo+8CAnzg/YcVcw8jVxvraZZIkxeA4ddff5klO7Te5Hm4AAAAASUVORK5CYII=";
 const ICON_XXHDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAtCAYAAADlVJiFAAAAAXNSR0IArs4c6QAAAf1JREFUaAXtms1KQkEUx88ZfYCgwha1CVr0AbWolvkEPUGFiB+oiyCC3Lp1FYSUaCYSPUPr3AUREaQEtWrjQl8guvd0pkVIKc29QpxbMyDemXvmzP+c34wDziBwiaVyW0hunggWuBrSbQEsDiK0CFWxUT2+wHgyu+0SnQcwkKGSFeKOcgnyQy0C+oKADhQAzQdU/1DZeklxYIFdU0MD0zGFB71t1Mo4qF1qWyyRoa/aNLE/WWxgQcNqiVliQjJgp6IQEMYyLDHjVAkxtMSEgDCWYYkZp0qIoSUmBISxDEvMOFVCDC0xISCMZVhixqkSYmiJCQFhLMMSM06VEEMc9PewEG0jydBT0RnJg8zODgeGbZna/KvSJ5tKIRT9u5DZUx/Xhu5ub+5XVtefEGiOZU7wJ6i/lPoM+gGU2tdn0DJTblX9wwx4PpKNJTO7CHhIRL+yFhGRLzbQXuO0fOSFj+fAtPN4KhslF854wFkvg3m2RXjmOxuJevXkymtfX1n/GGgmsqhAZZjeo9dBf7RHbKNSaZyeWvITlPbvi1i/MJ6SmEjnNh0XEuxsgymO9b83fkbocpKavNvU6tXSJU/BbzcBjH2x4ciB9Q9WKBTUS6ez7LxhlNvXgCjC37w34iSPNM71V673WHGXhff4ucP753UYQ81KpdQaNRj291neAeiAdCFRHoGDAAAAAElFTkSuQmCC";

/*
 * XPCOM modules
 * ==================================
 */
 const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/PageActions.jsm");
Cu.import("resource://gre/modules/Prompt.jsm");
Cu.import('resource://gre/modules/PresentationDeviceInfoManager.jsm');
Cu.import("resource://gre/modules/MulticastDNS.jsm");


// Create a string bundle for localization.
XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://fxostv/locale/fxostv.properties");
});

// Import a helper module.
XPCOMUtils.defineLazyGetter(this, "Helper", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/helper.js", sandbox);
  return sandbox["Helper"];
});


/*
 * Utils
 * ==================================
 */
function DEBUG_LOG(msg) {
  console.log(msg);
}

function GetRecentWindow() {
	let window = Services.wm.getMostRecentWindow("navigator:browser");
	return window;
}

// For Debug
// ----------------------
var gDiscoveryMenuId = null;

function discoveryDevices(win) {
  DEBUG_LOG("### discoveryDevices ###");
  win.navigator.mozPresentationDeviceInfo.getAll()
  .then(function(devices) {

    if (devices === undefined || !devices.length) {
      return;
    }

    PresentationDevices.setList(devices);
    DEBUG_LOG(PresentationDevices.getList());

  }, function(error) {
    DEBUG_LOG(error);
  });

  win.NativeWindow.toast.show('Discovery presentaion devices', "short");
}



/*
 * Core Functions
 * ==================================
 */
// PresentationDevices
// ----------------------
const PresentationDevices = (function () {
  // Containing presentation device's infomation
  function DeviceInfo(device) {
    this.id = device.id || 'unidentified';
    this.name = device.name || 'unidentified';
    this.type = device.type || 'unidentified';
    // Assuming all functions are enabled on presentation devices
    this.castVideoEnabled = false;
    this.castPageEnabled = true;
    this.pinPageEnabled = true;
    this.remoteControlPortAndPath = false;
  }

  // To save all information of the presentation devices discovered
  var _list = [];

  function setList(devices) {
    _list = devices.map(function(dev) {
      var info = new DeviceInfo(dev);
      return info;
    });
  }

  function getList() {
    return _list;
  }

  function addDevice(device) {
    DEBUG_LOG('# [PresentationDevices] addDevice');
    var found = _list.find(function(dev) {
      return dev.id == device.id;
    });

    if (!found) {
      _list.push(new DeviceInfo(device));
    }
    // For Debug
    else {
      DEBUG_LOG('  >> device alreadt exist!');
    }
  }

  function updateDevice(device) {
    DEBUG_LOG('# [PresentationDevices] updateDevice');
    var index = _list.findIndex(function(dev) {
      return dev.id == device.id;
    });

    if (index > -1) {
      _list[index] = new DeviceInfo(device);
    }
    // For Debug
    else {
       DEBUG_LOG('  >> device doesn\'t exist!');
    }
  }

  function removeDevice(device) {
    DEBUG_LOG('# [PresentationDevices] removeDevice');
    var index = _list.findIndex(function(dev) {
      return dev.id == device.id;
    });

    if (index > -1) {
      _list.splice(index, 1);
    }
    // For Debug
    else {
       DEBUG_LOG('  >> device doesn\'t exist!');
    }
  }

  function updateServices(dnsServiceInfo) {
    DEBUG_LOG('# [PresentationDevices] updateService');

    var index = _list.findIndex(function(dev) {
      return dev.name == dnsServiceInfo.serviceName;
    });

    if (index > -1) {
      DEBUG_LOG("Updating " + _list[index].name + "'s service.....");
      // TODO: Detecting which services will be updated
      DEBUG_LOG("  >> port: " + dnsServiceInfo.port);
      // DEBUG_LOG("  >> path: " + dnsServiceInfo.attributes.getPropertyAsAString("path"));
      _list[index].remoteControlPortAndPath = ":" + dnsServiceInfo.port + "/";
    }
    // For Debug
    else {
       DEBUG_LOG('  >> device doesn\'t exist!');
    }
  }

  return {
    setList: setList,
    getList: getList,
    add: addDevice,
    update: updateDevice,
    remove: removeDevice,
    updateServices: updateServices
  };

})();



// PresentationDeviceManager
// ----------------------
var PresentationDeviceManager = function() {

  // Flow to use nsdManager on Android:
  // http://developer.android.com/reference/android/net/nsd/NsdManager.html#jd-content
  let _listener = {
    onDiscoveryStarted: function(servType) {
    },
    onStartDiscoveryFailed: function(servType, errorCode) {
    },
    onDiscoveryStopped: function(servType) {
    },
    onStopDiscoveryFailed: function(servType, errorCode) {
    },

    // The serviceInfo is a nsIDNSServiceInfo XPCOM object
    // see more: https://dxr.mozilla.org/mozilla-central/source/netwerk/dns/mdns/nsIDNSServiceDiscovery.idl
    onServiceRegistered: function(serviceInfo) {
    },
    onRegistrationFailed: function(serviceInfo, errorCode) {
    },
    onServiceUnregistered: function(serviceInfo) {
    },
    onUnregistrationFailed: function(serviceInfo, errorCode) {
    },
    onServiceFound: function(serviceInfo) {
    },
    onServiceLost: function(serviceInfo) {
    },
    onServiceResolved: function(serviceInfo) {
      DEBUG_LOG("# PresentationDeviceManager._listener >> onServiceResolved: " + serviceInfo.serviceName);
      PresentationDevices.updateServices(serviceInfo);
    },
    onResolveFailed: function(serviceInfo, errorCode) {
      DEBUG_LOG("# PresentationDeviceManager._listener >> onResolveFailed: " + serviceInfo.serviceName);
      // The errorcode is copy from:
      // https://github.com/android/platform_frameworks_base/blob/master/core/java/android/net/nsd/NsdManager.java#L239
      let error = {
        0: "FAILURE_INTERNAL_ERROR",
        3: "FAILURE_ALREADY_ACTIVE",
        4: "FAILURE_MAX_LIMIT",
      };
      DEBUG_LOG("errorCode " + errorCode + ": " + error[errorCode]);
    },
  };

  // Return true if one of services of discovered devices is enabled
  function _deviceAvailable() {
    var devs = PresentationDevices.getList();
    for (var i = 0 ; i < devs.length ; i ++) {
      if (devs[i].castVideoEnabled ||
          devs[i].castPageEnabled ||
          devs[i].pinPageEnabled ||
          devs[i].remoteControlPortAndPath) {
        return true;
      }
    }
    return false;
  }

  function _handleEvent(evt) {
    DEBUG_LOG('# PresentationDeviceManager._handleEvent: ' + evt.detail.type);
    DEBUG_LOG(evt);
    switch (evt.detail.type) {
      case 'add':
        PresentationDevices.add(evt.detail.deviceInfo);
        // If this is the first device, then we need to
        // initialize CastingManager for this window
        if (PresentationDevices.getList().length == 1) {
          // evt.currentTarget is window.PresentationDeviceInfoManager itself,
          // (loaded by PresentationDeviceInfoManager.jsm)
          // but we can get window by 'evt.currentTarget.ownerGlobal'
          initCastingManagerForWindow(evt.currentTarget.ownerGlobal);
        }

        // update device's services
        _updateServices(evt.detail.deviceInfo.id, evt.detail.deviceInfo.name);
        break;

      case 'update':
        PresentationDevices.update(evt.detail.deviceInfo);

        // update device's services
        _updateServices(evt.detail.deviceInfo.id, evt.detail.deviceInfo.name);
        break;

      case 'remove':
        PresentationDevices.remove(evt.detail.deviceInfo);
        // If the device list is empty now, then CastingManager is no longer
        // needed for this window
        if (!PresentationDevices.getList().length) {
          uninitCastingManagerForWindow(evt.currentTarget.ownerGlobal);
        }
        break;

      default:
        DEBUG_LOG('No event handler for this type');
        break;
    }
  }

  function _mdnsResolveService(host, serviceName, serviceType) {
    DEBUG_LOG('# PresentationDeviceManager._mdnsResolveService');
    serviceType = serviceType || "_http._tcp.";
    let serviceInfo = Cc["@mozilla.org/toolkit/components/mdnsresponder/dns-info;1"].
                      createInstance(Ci.nsIDNSServiceInfo);
    serviceInfo.host = host;
    serviceInfo.address = host;
    serviceInfo.serviceType = serviceType;
    serviceInfo.serviceName = serviceName;
    serviceInfo.domainName = "local";

    let mdns = Cc["@mozilla.org/toolkit/components/mdnsresponder/dns-sd;1"].
               getService(Ci.nsIDNSServiceDiscovery);
    mdns.resolveService(serviceInfo, _listener);
  }

  function _updateServices(id, name, type) {
    DEBUG_LOG('# PresentationDeviceManager._updateServices >> id: ' + id + ', name: ' + name);
    // The id of a presentation deviceis its ip, so we use it as host value.
    // The name of a presentation device is same as the serviceName of mDNS.
    _mdnsResolveService(id, name, type);
  }

  function _loadDevices(window, callback) {
    DEBUG_LOG('# PresentationDeviceManager._loadDevices');
    // Load avaliable devices into list
    window.navigator.mozPresentationDeviceInfo.getAll()
    .then(function(devices) {

      if (devices === undefined || !devices.length) {
        return;
      }

      // Add these devices into list
      PresentationDevices.setList(devices);
      DEBUG_LOG(PresentationDevices.getList());

      // Update devices' services
      devices.forEach(function(dev, index, list){
        _updateServices(dev.id, dev.name);
      });

      if (callback) {
        callback();
      }

    }, function(error) {
      DEBUG_LOG(error);
    });
  }

  function init(window) {
    DEBUG_LOG('# PresentationDeviceManager.init');

    if (!window.navigator.mozPresentationDeviceInfo) {
      DEBUG_LOG('  >> mozPresentationDeviceInfo should be available');
      return;
    }

    // Add event listener for devicechange
    window.navigator.mozPresentationDeviceInfo.addEventListener('devicechange', _handleEvent);

    // Load existed presentation devices
    _loadDevices(window, function(){
      // Initialize CastingManager for this window if it doesn't exist
      initCastingManagerForWindow(window);
    });
  }

  function uninit(window) {
    DEBUG_LOG('# PresentationDeviceManager.uninit');
    window.navigator.mozPresentationDeviceInfo.removeEventListener('devicechange', _handleEvent);
  }

  return {
    init: init,
    uninit: uninit,
    get deviceAvailable() {
      return _deviceAvailable();
    },
  };
};


// PresentationConnectionManager
// ----------------------
var PresentationConnectionManager = function() {

  var _presentation = {
    // hold the presentation's connection
    session: null,
    // keep track the message sequence
    seq: 0,
    // detect the
    sessionCloseExpected: false,
  };

  function _reset() {
    DEBUG_LOG('# PresentationConnectionManager._reset');
    _presentation.sessionCloseExpected = false;
    _presentation.session = null;
    _presentation.seq = 0;
  }

  function _presentationOnMessage(evt) {
    DEBUG_LOG('# PresentationConnectionManager._presentationOnMessage');
    DEBUG_LOG(evt);
  }

  function _presentationOnStatechange(evt) {
    DEBUG_LOG('# PresentationConnectionManager._presentationOnStatechange');
    DEBUG_LOG(evt);
    DEBUG_LOG('  >> state: ' + _presentation.session.state);

    if (_presentation.session && _presentation.session.state !== "connected") {
      if (!_presentation.sessionCloseExpected) {
        // The session is closed by server
        DEBUG_LOG('The session unexpectedly lose connection!' );
      }
      _reset();
    }
  }

  function _presentationPrompt(deviceId) {
    DEBUG_LOG('# PresentationConnectionManager._presentationPrompt');
    return new Promise(function(resolve, reject) {
      // Get presentation-device-prompt XPCOM object
      let prompt = Cc["@mozilla.org/presentation-device/prompt;1"].getService(Ci.nsIObserver);
      if (!prompt) {
        reject('No available presentationDevicePrompt XPCOM');
      }
      // Add listener for "presentation-select-device" signal to
      // the presentation-device-prompt XPCOM object everytime
      // before building a session because the
      // presentation-device-prompt XPCOM object will remove
      // "presentation-select-device" signal listener after receiving it.
      Services.obs.addObserver(prompt, "presentation-select-device", false);

      let _presObserver = {
        observe: function (subject, topic, data) {
          if (topic == "presentation-prompt-ready") {
            resolve();
          } else {
            reject('Receive unexpected notification');
          }
        }
      };

      // The presentation-device-prompt XPCOM will fire a
      // "presentation-prompt-ready" signal upon it receive
      // the "presentation-select-device" signal
      Services.obs.addObserver(_presObserver, "presentation-prompt-ready", false);
      Services.obs.notifyObservers(null, "presentation-select-device", deviceId);
    });
  }

  function _startSession(window, url) {
    DEBUG_LOG('# PresentationConnectionManager._startSession');
    return new Promise(function(resolve, reject) {
      let presentationRequest = new window.PresentationRequest(url);
      presentationRequest.start().then(function(session){
        if (session.id && session.state == "connected") {
          _presentation.session = session;
          _presentation.session.onmessage = _presentationOnMessage;
          _presentation.session.onstatechange = _presentationOnStatechange;
          resolve();
        } else {
          reject('session.id or session.state is wrong!');
        }
      }).catch(function(error) {
        reject(error);
      });
    });
  }

  function sendCommand(command, data) {
    DEBUG_LOG('# PresentationConnectionManager.sendCommand');
    var msg = {
      'type': command,
      'seq': ++_presentation.seq
    };

    for (var i in data) {
      msg[i] = data[i];
    }
    _presentation.session.send(JSON.stringify(msg));
  }

  function _disconnect(terminate) {
    DEBUG_LOG('# PresentationConnectionManager.disconnect');
    if (_presentation.session) {
      _presentation.sessionCloseExpected = true;
      (terminate)? _presentation.session.terminate() : _presentation.session.close();
      // _presentation.session will be set to null once
      // _presentation.session.state is changed to 'terminated' or 'closed'
      if (!_presentation.session.onmessage) {
        _presentation.session.onmessage = _presentationOnMessage;
      }
    }
  }

  // TODO: close semantics is not ready now(Bug 1210340).
  // Uncomment the line after close semantic is ready
  function close() {
    DEBUG_LOG('# PresentationConnectionManager.close');
    // _disconnect(false);
    return;
  }

  function terminate() {
    DEBUG_LOG('# PresentationConnectionManager.terminate');
    _disconnect(true);
  }

  function connect(window, url, target) {
    DEBUG_LOG('# PresentationConnectionManager.connect');
    return new Promise(function(resolve, reject) {
      _presentationPrompt(target.id).then(function(result) {
        return _startSession(window, url);
      }).then(function(result) {
        resolve(result);
      }).catch(function(error){
        reject(error);
      });
    });
  }

  function init(window) {
    DEBUG_LOG('# PresentationConnectionManager.init');

    // Check the preferences and permissions for presentation API
    if (!window.navigator.presentation ||
        !window.PresentationRequest) {
      DEBUG_LOG('  >> navigator.presentation or PresentationRequest should be available');
      return;
    }
  }

  function uninit() {
    DEBUG_LOG('# PresentationConnectionManager.uninit');
  }

  return {
    init: init,
    uninit: uninit,
    connect: connect,
    sendCommand: sendCommand,
    terminate: terminate,
    close: close
  };
};

// PresentationManager
// ----------------------
function PresentationManager() {}

PresentationManager.prototype = {
  connectionManager: null,
  deviceManager: null,

  init: function(window) {
    DEBUG_LOG('# PresentationManager.init');

    if (!this.deviceManager) {
      DEBUG_LOG('  >> Create a PresentationDeviceManager');
      this.deviceManager = new PresentationDeviceManager();
      this.deviceManager.init(window);
    }

    if (!this.connectionManager) {
      DEBUG_LOG('  >> Create a PresentationConnectionManager');
      this.connectionManager = new PresentationConnectionManager();
      this.connectionManager.init(window);
    }
  },

  uninit:function(window) {
    DEBUG_LOG('# PresentationManager.uninit');

    if (this.deviceManager) {
      this.deviceManager.uninit(window);
      this.deviceManager = null;
    }

    if (this.connectionManager) {
      this.connectionManager.uninit();
      this.connectionManager = null;
    }
  },
};

function initPresentationManagerForWindow(window) {
  DEBUG_LOG('$$$ initPresentationManagerForWindow');

  if (!window.hasOwnProperty('presentationManager')) {
    DEBUG_LOG('  >> Create PresentationManager for this window');
    window.presentationManager = new PresentationManager();
    window.presentationManager.init(window);
  }
}

function uninitPresentationManagerForWindow(window) {
  DEBUG_LOG('$$$ uninitPresentationManagerForWindow');
  if (window.hasOwnProperty('presentationManager')) {
    DEBUG_LOG('  >> Delete PresentationManager for this window');
    window.presentationManager.uninit();
    delete window.presentationManager;
  }
}



var CastingManager = function() {

    var _pageActionIcon = null,
        _pageActionId = null;

    function _isCastingEnabled() {
      return Services.prefs.getBoolPref("browser.casting.enabled");
    }

    function _getCurrentURL(window) {
      return window.BrowserApp.selectedBrowser.currentURI.spec;
    }

    function _castVideo(window, target) {
      DEBUG_LOG('# CastingManager._castVideo');
      var currentURL = _getCurrentURL(window);
      // window.alert('TODO: Cast video from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // cast video here...
      }
    }

    function _castWebpage(window, target) {
      DEBUG_LOG('# CastingManager._castWebpage');
      var currentURL = _getCurrentURL(window);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // cast webpage here...
        var appURL = "app://notification-receiver.gaiamobile.org/index.html";
        window.presentationManager.connectionManager.connect(window, appURL, target).then(function(result) {
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.send"), "long");
          window.presentationManager.connectionManager.sendCommand("view", { "url": currentURL, "timestamp": Date.now() });
          window.presentationManager.connectionManager.close();
        }).catch(function(error){
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.fail"), "long");
          DEBUG_LOG(error);
          window.presentationManager.connectionManager.terminate();
        });
      }
    }

    function _pinWebpageToHomescreen(window, target) {
      DEBUG_LOG('# CastingManager._pinWebpageToHomescreen');
      var currentURL = _getCurrentURL(window);
      // window.alert('TODO: Pin webpage from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // pin webpage to home here...
      }
    }

    function _remoteControl(window, target) {
      DEBUG_LOG('# CastingManager._remoteControl');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // remote control to TV here...
        var appURL = "app://notification-receiver.gaiamobile.org/index.html";
        window.presentationManager.connectionManager.connect(window, appURL, target).then(function(result) {
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.send"), "long");
          // We need to cast a webpage first
          window.presentationManager.connectionManager.sendCommand("view", { "url": currentURL, "timestamp": Date.now() });
          // and open a remote control tab
          DEBUG_LOG(">> ip: " + target.id);
          DEBUG_LOG(">> port and path: " + target.remoteControlPortAndPath);
          window.BrowserApp.addTab(target.id + target.remoteControlPortAndPath);
          // close the session
          window.presentationManager.connectionManager.close();
        }).catch(function(error){
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.fail"), "long");
          DEBUG_LOG(error);
          window.presentationManager.connectionManager.terminate();
        });
      }
    }

    function _shouldCast(window) {
      var currentURL = _getCurrentURL(window);
      var validURL = currentURL.includes('http://') || currentURL.includes('https://');
      return validURL && window.presentationManager.deviceManager.deviceAvailable;
    }

    // TODO: Define conditions to cast video
    // reference: using 'mozAllowCasting' for video tag
    // https://dxr.mozilla.org/mozilla-central/source/mobile/android/chrome/content/browser.js#4341
    function _findCastableVideo(browser) {
      DEBUG_LOG('# CastingManager._findCastableVideo');
      if (!browser) {
        return null;
      }

      // Scan for a <video> being actively cast. Also look for a castable <video>
      // on the page.
      let castableVideo = null;
      let videos = browser.contentDocument.querySelectorAll("video");
      DEBUG_LOG(videos);
      for (let video of videos) {
        DEBUG_LOG(video);
        if (video.mozIsCasting) {
          // This <video> is cast-active. Break out of loop.
          return video;
        }

        DEBUG_LOG(video.paused);
        DEBUG_LOG(video.mozAllowCasting);
        if (!video.paused && video.mozAllowCasting) {
          // This <video> is cast-ready. Keep looking so cast-active could be found.
          castableVideo = video;
        }
      }

      // Could be null
      DEBUG_LOG(castableVideo);
      return castableVideo;
    }


    function _setPageActionIcon(window) {
      DEBUG_LOG('# CastingManager._setPageActionIcon');
      // pageActionIncon has already been set
      if (_pageActionIcon) {
        DEBUG_LOG('  >> pageActionIcon alreay exist!');
        return;
      }

      _pageActionIcon = (window.devicePixelRatio <= 1.5)?
                        ICON_HDPI : (window.devicePixelRatio <= 2)?
                                    ICON_XHDPI : ICON_XXHDPI;
    }

    function _addPageAction(window) {
      DEBUG_LOG('# CastingManager._addPageAction');
      if (_pageActionId) {
        DEBUG_LOG('  >> PageActionsIcon already exist!');
        return;
      }
      _pageActionId = PageActions.add({
        icon: _pageActionIcon,
        title: Strings.GetStringFromName("pageaction.title"),
        clickCallback: () => _chooseAction(window)
      });
    }

    function _chooseAction(window) {
      DEBUG_LOG('# CastingManager._chooseAction');
      var promptInfo = _promptInfoGenerator(window);

      var p = new Prompt({
        title: Strings.GetStringFromName("prompt.title")
      });

      p.setSingleChoiceItems(promptInfo.menu);

      p.show(function(data) {
        DEBUG_LOG('  >> press button: ' + data.button);
        // Fire callbacks with corresponding target device
        if (data.button > 0 && promptInfo.callbacks[data.button]) {
          promptInfo.callbacks[data.button](window, promptInfo.targets[data.button]);
        }
      });
    }

    function _promptInfoGenerator(window) {
      var videoCastable = _findCastableVideo(window.BrowserApp.selectedBrowser);

      // Prompt menu
      var menu = [];

      // Callbacks for clicking menu
      var callbacks = {};

      // target device for callbacks
      var targetDevices = {};

      // Load devices information into prompt munu and set its callbacks
      var devices = PresentationDevices.getList();

      var key = 0;
      for (var i in devices) {
        // Assume every device has valid name
        menu.push({ label: devices[i].name, header: true });
        ++key;

        if (videoCastable && devices[i].castVideoEnabled) {
          menu.push({ label: Strings.GetStringFromName("prompt.sendVideo") });
          callbacks[key] = _castVideo;
          targetDevices[key] = devices[i];
          ++key;
        }

        if (devices[i].castPageEnabled) {
          menu.push({ label: Strings.GetStringFromName("prompt.sendURL") });
          callbacks[key] = _castWebpage;
          targetDevices[key] = devices[i];
          ++key;
        }

        if (devices[i].pinPageEnabled) {
          menu.push({ label: Strings.GetStringFromName("prompt.addURL") });
          callbacks[key] = _pinWebpageToHomescreen;
          targetDevices[key] = devices[i];
          ++key;
        }

        if (devices[i].remoteControlPortAndPath) {
          menu.push({ label: Strings.GetStringFromName("prompt.remoteControl") });
          callbacks[key] = _remoteControl;
          targetDevices[key] = devices[i];
          ++key;
        }
      }

      return { menu: menu, callbacks: callbacks, targets:targetDevices };
    }

    function _handleEvent(evt) {
      DEBUG_LOG('# CastingManager._handleEvent: ' + evt.type);
      DEBUG_LOG(evt);
      switch (evt.type) {
        case 'pageshow': {
          let domWindow = evt.currentTarget;
          let tab = domWindow.BrowserApp.getTabForWindow(evt.originalTarget.defaultView);
          _updatePageActionForTab(domWindow, tab);
          break;
        }
        case 'TabSelect': {
          let domWindow = evt.view; //evt.view is ChromeWindow!
          let tab = domWindow.BrowserApp.getTabForBrowser(evt.target);
          _updatePageActionForTab(domWindow, tab);
          break;
        }
        default:
          DEBUG_LOG('No event handler for this type');
          break;
      }
    }

    function _removePageAction() {
      DEBUG_LOG('# CastingManager._removePageAction');
      if (_pageActionId) {
        DEBUG_LOG('  >> Remove existing PageActionIcon!');
        PageActions.remove(_pageActionId);
        _pageActionId = null;
      }
    }

    function _updatePageActionForTab(window, tab) {
      DEBUG_LOG('# CastingManager._updatePageActionForTab');
      // We only care about events on the selected tab
      if (tab != window.BrowserApp.selectedTab) {
        return;
      }

      _updatePageAction(window);
    }

    function _updatePageAction(window) {
      DEBUG_LOG('# CastingManager._updatePageAction');
      if (!_shouldCast(window)) {
        DEBUG_LOG('  >> no need to cast!');
        _removePageAction();
        return;
      }

      _addPageAction(window);
    }

    function init(window) {
      DEBUG_LOG('# CastingManager.init');

      if (!_isCastingEnabled()) {
        return;
      }

      _setPageActionIcon(window);

      // Reload pageActionIcon in URL bar after page has been loaded
      window.addEventListener("pageshow", _handleEvent, true);

      // Reload pageActionIcon after tab has been switched
      window.BrowserApp.deck.addEventListener("TabSelect", _handleEvent, true);

      // TODO: Remove pageAction when wifi is turned-off,
      // and reload it when wifi is turned-on.

      // Add pageActionIcon to URL bar if it need
      _updatePageAction(window);
    }

    function uninit(window) {
      DEBUG_LOG('# CastingManager.uninit');
      _removePageAction();
      window.removeEventListener('pageshow', _handleEvent);
      window.BrowserApp.deck.removeEventListener('TabSelect', _handleEvent);
    }

    return {
      init: init,
      uninit: uninit,
    };
};

function initCastingManagerForWindow(window) {
  DEBUG_LOG('$$$ initCastingManagerForWindow');

  if (!window.hasOwnProperty('castingManager')) {
    DEBUG_LOG('  >> Create CastingManager for this window');
    window.castingManager = new CastingManager();
    window.castingManager.init(window);
  }
}

function uninitCastingManagerForWindow(window) {
  DEBUG_LOG('$$$ uninitCastingManagerForWindow');
  if (window.hasOwnProperty('castingManager')) {
    DEBUG_LOG('  >> Delete CastingManager for this window');
    window.castingManager.uninit(window);
    delete window.castingManager;
  }
}

/*
 * Program Flow Control
 * ==================================
 */
function loadIntoWindow(window) {
  DEBUG_LOG('### loadIntoWindow: ');

  // Initialize PresentationManager for this window
  initPresentationManagerForWindow(window);

  // For Debug: Add a force-discovery into menu
  gDiscoveryMenuId = window.NativeWindow.menu.add("Discovery Devices", null, function() { discoveryDevices(window); });
}

function unloadFromWindow(window) {
  DEBUG_LOG('### unloadFromWindow');

  // Remove PresentationManager from this window
  uninitPresentationManagerForWindow(window);

  // Remove CastingManager from this window
  uninitCastingManagerForWindow(window);

  // For Debug: Remove the force-discovery from menu
  if (gDiscoveryMenuId) {
    window.NativeWindow.menu.remove(gDiscoveryMenuId);
  }
}



/**
 * bootstrap.js API
 */
var windowListener = {
  onOpenWindow: function(aWindow) {
    DEBUG_LOG('windowListener >> onOpenWindow');
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    function loadListener() {
      DEBUG_LOG('  >> loadListener()');
      domWindow.removeEventListener("load", loadListener, false);
      loadIntoWindow(domWindow);
    }
    domWindow.addEventListener("load", loadListener, false);
  },

  onCloseWindow: function(aWindow) {
    DEBUG_LOG('windowListener >> onCloseWindow');
  },

  onWindowTitleChange: function(aWindow, aTitle) {
    DEBUG_LOG('windowListener >> onWindowTitleChange');
  }
};

function startup(aData, aReason) {
  DEBUG_LOG('startup!');
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
  DEBUG_LOG('shutdown!');
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
  DEBUG_LOG('install!');
}

function uninstall(aData, aReason) {
  DEBUG_LOG('uninstall!');
}
