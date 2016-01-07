"use strict";

var PageActionManager = (function() {

  var _icon = null,
      _title = null,
      _actionId = null;

  function _setPageActionIcon(icon, title) {
    Debugger.log('# PageActionManager._setPageActionIcon');
    if (!icon) {
      Debugger.log('  >> no icon passed!');
      return;
    }

    // pageActionIncon has already been set
    if (_icon) {
      Debugger.log('  >> icon alreay exist!');
      return;
    }

    _icon = icon;

    _title = title || 'unidentified';
  }

  function removePageAction() {
    Debugger.log('# PageActionManager._removePageAction');
    if (_actionId) {
      Debugger.log('  >> Remove existing PageAction!');
      PageActions.remove(_actionId);
      _actionId = null;
    }
  }

  function addPageAction(callback) {
    Debugger.log('# PageActionManager._addPageAction');

    if (!callback) {
      Debugger.log('  >> no callback passed!');
      return;
    }

    if (_actionId) {
      Debugger.log('  >> PageAction already exist!');
      return;
    }

    if (!_icon) {
      Debugger.log('  >> icon doesn\'t be set yet!');
      return;
    }

    _actionId = PageActions.add({
      icon: _icon,
      title: _title,
      clickCallback: callback
    });

    Debugger.log('##### finish adding PageAction!');
  }

  function init(icon, title) {
    Debugger.log('# PageActionManager.init');
    _setPageActionIcon(icon, title);
  }

  function uninit() {
    Debugger.log('# PageActionManager.uninit');
  }

  return {
    init: init,
    uninit: uninit,
    add: addPageAction,
    remove: removePageAction
  };
})();
