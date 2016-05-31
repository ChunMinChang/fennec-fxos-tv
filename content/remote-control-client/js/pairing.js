'use strict';

(function(exports) {
  // The .sjs file is located in the Gecko since it needs chrome privilege.
  var AJAX_URL = 'pairing.sjs';

  function init() {
    var btnSubmit = document.getElementById('connect');
    var btnRestartPairing = document.getElementById('restart-pairing');
    var pinCodeInput = new PinCodeInput(
      document.getElementById('input-mask'),
      [].slice.call(document.querySelectorAll('.code')),
      btnSubmit
    );

    btnRestartPairing.addEventListener('click', function() {
      window.location.reload();
    });

    btnSubmit.disabled = false;

    // This will be fired if the PIN code authentication is failed
    var onerror = function(reason) {

      function errorHandling(message) {
        pinCodeInput.empty();
        btnSubmit.disabled = false;
        showMessage(message, true);

        // reconnect and reload the pin code page
        setTimeout(function() {
          window.location.reload();
          exports.reconnect();
        }, 3000);
      }

      let type;

      switch(reason) {
        case 'wrong-pin':
          type = 'wrong-pin';
          break;
        case 'pin-expired':
          type = 'pin-code-expired-message';
          break;
        default:
          document.l10n.formatValue('connect-error', { status: String(reason) })
                       .then(errorHandling);
          return;
      }

      document.l10n.formatValue(type).then(errorHandling);
    }

    // This will be fired after the PIN code is authenticated
    var onsuccess = function() {
      document.l10n.formatValue('connect-success').then(function(value) {
        // Show successful message to users
        showMessage(value);
        // re-direct url to remote-controller page
        setTimeout(function() {
          window.location = 'client.html'
        }, 1000);
      });
    }

    addObserverForPINResults(onsuccess, onerror);

    btnSubmit.addEventListener('click', function(evt) {
      var pincode = pinCodeInput.getCodes();
      if (pincode === '') {
        pinCodeInput.highlightEmptyCode();
        return;
      }

      btnSubmit.disabled = true;

      // Send PIN code to boostrap.js and wait for the results
      exports.sendPINCode(pincode);
    });
  }

  function addObserverForPINResults(onsuccess, onerror) {
    // Observer for waiting the PIN code results
    let _messageObserver = {
      observe: function (aSubject, aTopic, aData) {
        if (aTopic != 'pin-result') {
            return;
        }

        // Remove the observer itself
        Services.obs.removeObserver(_messageObserver, 'pin-result');

        // Parse the results message
        let msg = JSON.parse(aData);

        // Notify that the pin code entered is successful
        if (msg.valid) {
          onsuccess();
          return;
        }

        // Notify that the pin code entered have problems
        onerror(msg.reason);
      }
    };

    // Add an observer for receiving the results of entering pin code
    Services.obs.addObserver(_messageObserver, 'pin-result', false);
  }

  function showMessage(message, isError) {
    var divMessage = document.getElementById('pairing-message');
    divMessage.textContent = message;
    divMessage.classList[isError ? 'add' : 'remove']('error');
  }

  function PinCodeInput(mask, codes, submitButton) {
    var self = this;

    self._mask = mask;
    self._codes = codes;
    self._submitButton = submitButton;
    self._index = -1;

    var createHandler = function(index) {
      return function(evt) {
        self.showMask(index);
        evt.preventDefault();
      };
    };

    for(var i = 0; i < codes.length; i++) {
      var handler = createHandler(i);
      codes[i].addEventListener('focus', handler);
      codes[i].addEventListener('click', handler);
    }

    mask.addEventListener('blur', function() {
      self.hideMask();
    });

    mask.addEventListener('keydown', function(evt) {
      self.onKeyDown(evt);
    });
  }

  PinCodeInput.prototype = {
    showMask: function(index) {
      this._mask.blur();
      this._mask.classList.add('visible');
      this.moveMask(index);
      this._mask.focus();
    },

    hideMask: function() {
      this.writeBack();
      this._mask.blur();
      this._mask.classList.remove('visible');
    },

    moveMask: function(index) {
      this._index = index;
      this._mask.style.left = this._codes[index].offsetLeft + 'px';
      this._mask.value = this._codes[index].textContent;
      this._mask.select();
    },

    moveNext: function() {
      if (this._index < this._codes.length - 1) {
        this.moveMask(this._index + 1);
        return true;
      }
      return false;
    },

    movePrev: function() {
      if (this._index > 0) {
        this.moveMask(this._index - 1);
        return true;
      }
      return false;
    },

    empty: function() {
      for (var i = 0; i < this._codes.length; i++) {
        this.setCode(i, '');
      }
    },

    writeBack: function() {
      this.setCode(this._index, this._mask.value);
    },

    setCode: function(index, value) {
      if (value.length) {
        this._codes[index].classList.remove('placeholder');
        this._codes[index].textContent = value.charAt(0);
      } else {
        this._codes[index].classList.add('placeholder');
        this._codes[index].textContent = '';
      }
    },

    getCodes: function() {
      var code = '';
      for (var i = 0; i < this._codes.length; i++) {
        if (this._codes[i].textContent !== '') {
          code += this._codes[i].textContent;
        } else {
          return '';
        }
      }
      return code;
    },

    highlightEmptyCode: function() {
      for (var i = 0; i < this._codes.length; i++) {
        if (this._codes[i].textContent === '') {
          this.showMask(i);
          return true;
        }
      }
      return false;
    },

    onKeyDown: function(evt) {
      var c = evt.keyCode;

      if (evt.ctrlKey || evt.altKey || evt.metaKey) {
        return;
      }

      // backspace to delete the previous field if current one is empty.
      if (c == 8 && this._mask.value === '') {
        if (this._index > 0) {
          this.writeBack();
          this.setCode(this._index - 1, '');
          this.movePrev();
        } else {
          this.hideMask();
        }
        evt.preventDefault();
        return;
      }

      // numbers
      if (!evt.shiftKey && ((c >= 48 && c <= 57) || (c >= 96 && c <= 105))) {
        showMessage('');

        var num = String.fromCharCode(c >= 96 ? c - 96 + 48 : c);
        this._mask.value = num;
        this.writeBack();
        if (!this.moveNext()) {
          this._submitButton.focus();
        }
        evt.preventDefault();
        return;
      }

      // tab
      if (c == 9) {
        this.writeBack();
        if (evt.shiftKey) {
          if (!this.movePrev()) {
            this.hideMask();
          }
        } else {
          if (!this.moveNext()) {
            this._submitButton.focus();
          }
        }
        evt.preventDefault();
        return;
      }

      // allowed function keys: backspace, shift, del and F5.
      if ([8, 16, 46, 116].indexOf(c) < 0) {
        evt.preventDefault();
        return;
      }
    }
  };

  exports.ready(init);
}(window));
