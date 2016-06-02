"use strict";

var PresentationDeviceManager = function() {

  function _debug(aMsg) {
    console.log('# [PresentationDeviceManager] ' + aMsg);
  }

  // Device should provide what services they have,
  // e.g., remote-control, pin-to-homescreen, ..
  // ---------------------- Devices Services -----------------------
  // let _remoteControlServiceType = '_http._tcp';
  let _remoteControlServiceType = '_remotecontrol._tcp';
  // Flow to use nsdManager on Android:
  // http://developer.android.com/reference/android/net/nsd/NsdManager.html#jd-content
  let _listener = {
    onDiscoveryStarted: function(aServType) {
    },
    onStartDiscoveryFailed: function(aServType, aErrorCode) {
    },
    onDiscoveryStopped: function(aServType) {
    },
    onStopDiscoveryFailed: function(aServType, aErrorCode) {
    },

    // The serviceInfo is a nsIDNSServiceInfo XPCOM object
    // see more: https://dxr.mozilla.org/mozilla-central/source/netwerk/dns/mdns/nsIDNSServiceDiscovery.idl
    onServiceRegistered: function(aServiceInfo) {
    },
    onRegistrationFailed: function(aServiceInfo, aErrorCode) {
    },
    onServiceUnregistered: function(aServiceInfo) {
    },
    onUnregistrationFailed: function(aServiceInfo, aErrorCode) {
    },
    onServiceFound: function(aServiceInfo) {
      _debug('_listener >> onServiceFound: ' + aServiceInfo.serviceName);
      switch(aServiceInfo.serviceType) {
        case _remoteControlServiceType:
          _debug('Find remote control service! port: ' + aServiceInfo.port);
          PresentationDevices.updateServices(aServiceInfo, PresentationDevices.service.remoteControl);
          break;
        default:
          _debug('Can\'t find any service!');
          break;
      }
    },
    onServiceLost: function(aServiceInfo) {
    },
    onServiceResolved: function(aServiceInfo) {
    },
    onResolveFailed: function(aServiceInfo, aErrorCode) {
    },
  };

  function _mdnsStartDiscovery(aType) {
    _debug('_mdnsStartDiscovery: ' + aType);
    let mdns = Cc["@mozilla.org/toolkit/components/mdnsresponder/dns-sd;1"].
               getService(Ci.nsIDNSServiceDiscovery);
    mdns.startDiscovery(aType, _listener);
    // _listener.onServiceFound will be fired upon service |type| is found
  }

  function _searchRemoteControlService() {
    _debug('_searchRemoteControlService');
    _mdnsStartDiscovery(_remoteControlServiceType);
  }
  // ------------------ End of Devices Services --------------------

  let _onAddListeners = [],
      _onUpdateListeners = [],
      _onRemoveListeners = [];

  function _clearAllListeners() {
    _onAddListeners = [];
    _onUpdateListeners = [];
    _onRemoveListeners = [];
  }

  function _handleEvent(aEvent) {
    _debug('_handleEvent: ' + aEvent.detail.type);

    switch (aEvent.detail.type) {
      case 'add':
        PresentationDevices.add(aEvent.detail.deviceInfo);

        // update device's services
        updateServices();

        // Fire listeners
        for (let i in _onAddListeners) {
          _onAddListeners[i](aEvent);
        }

        break;

      case 'update':
        PresentationDevices.update(aEvent.detail.deviceInfo);

        // update device's services
        updateServices();

        // Fire listeners
        for (let i in _onUpdateListeners) {
          _onUpdateListeners[i](aEvent);
        }

        break;

      case 'remove':
        PresentationDevices.remove(aEvent.detail.deviceInfo);

        // Fire listeners
        for (let i in _onRemoveListeners) {
          _onRemoveListeners[i](aEvent);
        }

        break;

      default:
        _debug('No event handler for this type');
        break;
    }
  }

  // Return true if one of services of discovered devices is enabled
  function _deviceAvailable() {
    _debug('_deviceAvailable');
    let devs = PresentationDevices.getList();
    for (let i in devs) {
      if (devs[i].available) {
        return true;
      }
    }
    return false;
  }

  // aListener = {
  //   add: function(){},
  //   update: function(){},
  //   remove: function(){}
  // }
  function registerListener(aListener) {
    _debug('registerListeners');
    if (typeof aListener.add === 'function') {
      _debug('register a listener for |add|');
      _onAddListeners.push(aListener.add);
    }

    if (typeof aListener.update === 'function') {
      _debug('register a listener for |update|');
      _onUpdateListeners.push(aListener.update);
    }

    if (typeof aListener.remove === 'function') {
      _debug('register a listener for |remove|');
      _onRemoveListeners.push(aListener.remove);
    }
  }

  // aListener = {
  //   add: function(){},
  //   update: function(){},
  //   remove: function(){}
  // }
  function unregisterListener(aListener) {
    _debug('registerListeners');

    if (typeof aListener.add === 'function') {
      let index = _onAddListeners.indexOf(aListener.add);
      if (index > -1) {
        _debug('delete a listener for |add|');
        _onAddListeners.splice(index, 1);
      }
    }

    if (typeof aListener.update === 'function') {
      let index = _onUpdateListeners.indexOf(aListener.update);
      if (index > -1) {
        _debug('delete a listener for |update|');
        _onUpdateListeners.splice(index, 1);
      }
    }

    if (typeof aListener.remove === 'function') {
      let index = _onRemoveListeners.indexOf(aListener.remove);
      if (index > -1) {
        _debug('delete a listener for |remove|');
        _onRemoveListeners.splice(index, 1);
      }
    }
  }

  function updateServices() {
    _debug('updateServices');
    // remote control
    _searchRemoteControlService();
    // pin to homescreen
    // cast video
    // ....
  }

  function loadDevices(aWindow) {
    _debug('loadDevices');
    aWindow.navigator.mozPresentationDeviceInfo.getAll()
    .then(function(devices) {

      if (devices === undefined || !devices.length) {
        return;
      }

      PresentationDevices.setList(devices);
      console.log(PresentationDevices.getList());

    }, function(error) {
      _debug(error);
    });
  }

  function init(aWindow) {
    _debug('init');
    if (!aWindow.navigator.mozPresentationDeviceInfo) {
      _debug('mozPresentationDeviceInfo should be available');
      return;
    }

    // Add event listener for devicechange
    // window.navigator.mozPresentationDeviceInfo.addEventListener('devicechange', _handleEvent);
    aWindow.navigator.mozPresentationDeviceInfo.ondevicechange = _handleEvent;
  }

  function uninit(aWindow) {
    _debug('uninit');
    // window.navigator.mozPresentationDeviceInfo.removeEventListener('devicechange', _handleEvent);
    aWindow.navigator.mozPresentationDeviceInfo.ondevicechange = null;

    _clearAllListeners();
  }

  return {
    init: init,
    uninit: uninit,
    loadDevices: loadDevices,
    get deviceAvailable() {
      return _deviceAvailable();
    },
    updateServices: updateServices,
    registerListener: registerListener,
    unregisterListener: unregisterListener,
  };
};
