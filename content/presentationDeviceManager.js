"use strict";

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
      Debugger.log("# PresentationDeviceManager._listener >> onServiceResolved: " + serviceInfo.serviceName);
      PresentationDevices.updateServices(serviceInfo);
    },
    onResolveFailed: function(serviceInfo, errorCode) {
      Debugger.log("# PresentationDeviceManager._listener >> onResolveFailed: " + serviceInfo.serviceName);
      // The errorcode is copy from:
      // https://github.com/android/platform_frameworks_base/blob/master/core/java/android/net/nsd/NsdManager.java#L239
      let error = {
        0: "FAILURE_INTERNAL_ERROR",
        3: "FAILURE_ALREADY_ACTIVE",
        4: "FAILURE_MAX_LIMIT",
      };
      Debugger.log("errorCode " + errorCode + ": " + error[errorCode]);
    },
  };

  // Return true if one of services of discovered devices is enabled
  function _deviceAvailable() {
    Debugger.log('# PresentationDeviceManager._deviceAvailable: ');
    var devs = PresentationDevices.getList();
    Debugger.log(devs);
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
    Debugger.log('# PresentationDeviceManager._handleEvent: ' + evt.detail.type);
    Debugger.log(evt);

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
        Debugger.log('No event handler for this type');
        break;
    }
  }

  function _mdnsResolveService(host, serviceName, serviceType) {
    Debugger.log('# PresentationDeviceManager._mdnsResolveService');
    let serviceInfo = Cc["@mozilla.org/toolkit/components/mdnsresponder/dns-info;1"].
                      createInstance(Ci.nsIDNSServiceInfo);
    serviceInfo.host = host;
    serviceInfo.address = host;
    // remote control use '_http._tcp.' to provide the service
    serviceInfo.serviceType = serviceType || "_http._tcp.";
    serviceInfo.serviceName = serviceName;
    serviceInfo.domainName = "local";

    let mdns = Cc["@mozilla.org/toolkit/components/mdnsresponder/dns-sd;1"].
               getService(Ci.nsIDNSServiceDiscovery);
    mdns.resolveService(serviceInfo, _listener);
  }

  function _updateServices(id, name, type) {
    Debugger.log('# PresentationDeviceManager._updateServices >> id: ' + id + ', name: ' + name);
    // The id of a presentation deviceis its ip, so we use it as host value.
    // The name of a presentation device is same as the serviceName of mDNS.

    // This is for searching the remote control's service.
    // However, this feature is not available now, so we just commented it.
    _mdnsResolveService(id, name, type);
  }

  function _loadDevices(window, callback) {
    Debugger.log('# PresentationDeviceManager._loadDevices');
    // Load avaliable devices into list
    window.navigator.mozPresentationDeviceInfo.getAll()
    .then(function(devices) {

      if (devices === undefined || !devices.length) {
        return;
      }

      // Add these devices into list
      PresentationDevices.setList(devices);
      Debugger.log(PresentationDevices.getList());

      // Update devices' services
      devices.forEach(function(dev, index, list){
        _updateServices(dev.id, dev.name);
      });

      if (callback) {
        callback();
      }

    }, function(error) {
      Debugger.log(error);
    });
  }

  function init(window) {
    Debugger.log('# PresentationDeviceManager.init');

    if (!window.navigator.mozPresentationDeviceInfo) {
      Debugger.log('  >> mozPresentationDeviceInfo should be available');
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
    Debugger.log('# PresentationDeviceManager.uninit');
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
