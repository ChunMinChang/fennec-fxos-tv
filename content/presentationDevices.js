"use strict";

var PresentationDevices = (function () {
  // Containing presentation device's infomation
  function DeviceInfo(device) {
    this.id = device.id || 'unidentified';
    this.name = device.name || 'unidentified';
    this.type = device.type || 'unidentified';
    // Set initial function for searched presentation devices
    this.castVideoEnabled = false;
    this.castPageEnabled = true;
    this.pinPageEnabled = false;
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
    Debugger.log('# [PresentationDevices] addDevice');
    var found = _list.find(function(dev) {
      return dev.id == device.id;
    });

    if (!found) {
      _list.push(new DeviceInfo(device));
    }
    // For Debug
    else {
      Debugger.log('  >> device alreadt exist!');
    }
  }

  function updateDevice(device) {
    Debugger.log('# [PresentationDevices] updateDevice');
    var index = _list.findIndex(function(dev) {
      return dev.id == device.id;
    });

    if (index > -1) {
      _list[index] = new DeviceInfo(device);
    }
    // For Debug
    else {
       Debugger.log('  >> device doesn\'t exist!');
    }
  }

  function removeDevice(device) {
    Debugger.log('# [PresentationDevices] removeDevice');
    var index = _list.findIndex(function(dev) {
      return dev.id == device.id;
    });

    if (index > -1) {
      _list.splice(index, 1);
    }
    // For Debug
    else {
       Debugger.log('  >> device doesn\'t exist!');
    }
  }

  function updateServices(dnsServiceInfo) {
    Debugger.log('# [PresentationDevices] updateService');

    var index = _list.findIndex(function(dev) {
      return dev.name == dnsServiceInfo.serviceName;
    });

    if (index > -1) {
      Debugger.log("Updating " + _list[index].name + "'s service.....");
      // TODO: Detecting which services will be updated
      Debugger.log("  >> port: " + dnsServiceInfo.port);
      // Debugger.log("  >> path: " + dnsServiceInfo.attributes.getPropertyAsAString("path"));
      _list[index].remoteControlPortAndPath = ":" + dnsServiceInfo.port + "/";
    }
    // For Debug
    else {
       Debugger.log('  >> device doesn\'t exist!');
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