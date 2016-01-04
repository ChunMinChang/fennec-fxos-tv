"use strict";

var Debugger = {
  enable: false,
  log: function(msg) {
    this.enable && console.log(msg);
  }
};
