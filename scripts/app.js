
(function() {
  'use strict';

  var initialBoothList = initial_data["booths"];  // From jsonp!
  var initialPublicKey = initial_data["publicKey"];  // From jsonp!

  var app = {
    hasBoothRequestPending: false,
    hasPublicKeyRequestPending: false,
    isLoading: true,
    booths: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    unlockDialog: document.querySelector('.unlock-dialog'),
    notifiactionDialog: document.querySelector('.notification-dialog'),
    videoSelect: document.querySelector('select#videoSource'),
    unlockNote: document.getElementById('unlockNote'),
    gotVideoSourcesDone: false,
    videoWidth: 640,
    videoHeight: 480,
    videoSizeSaved: false,
    publicKey: initialPublicKey,  // From jsonp!
  };


  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butRefresh').addEventListener('click', function() {
    // Refresh all of the booths
    app.updateBooths();
  });

  navigator.getUserMedia  = navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia ||
                            navigator.msGetUserMedia;
  var dialogBody = document.getElementById('qrDialogBody');
  var cRect = dialogBody.getClientRects()[0];
  var videoElement = document.getElementById('qrVideo');
  videoElement.style.maxWidth = cRect.width + 'px';
  videoElement.style.maxHeight = cRect.height + 'px';

  app.startVideoStream = function() {
    if (window.stream && window.stream.getVideoTracks)
        window.stream.getVideoTracks()[0].stop();
    app.videoSizeSaved = false;
    // Initiate a QR Code snapshot process
    if (navigator.getUserMedia) {
      var selectedVideoSource = app.videoSelect.value;
      var videoOption = {video: true, audio: false};
      if (!!selectedVideoSource) {
        videoOption.video = {
          optional: [{
            sourceId: selectedVideoSource
          }]
        };
      }
      navigator.getUserMedia(videoOption,
        function(stream) {  // Success
          document.getElementById('qrVideo').addEventListener('playing', app.saveVideoSize, false);
          window.stream = stream;  // Making available to console
          videoElement.src = window.URL.createObjectURL(stream);
        },
        function(e) {   // Error
          app.unlockNote.textContent = 'Video Rejected.';
          document.getElementById('qrVideo').setAttribute('hidden', true);
          document.getElementById('uploadContainer').removeAttribute('hidden');
        }
      );
    } else {
      app.unlockNote.textContent = 'Try Chrome or use your native camera app, then upload the QR code photo here.';
      document.getElementById('qrVideo').setAttribute('hidden', true);
      document.getElementById('uploadContainer').removeAttribute('hidden');
    }
  }

  function handleFileSelect(evt) {
    var files = evt.target.files;
    for (var i = 0, f; f = files[i]; i++) {
      if (!f.type.match('image.*')) {
        continue;
      }
      var reader = new FileReader();
      reader.onload = (function(theFile) {
        return function(e) {
          var img = new Image();
          img.src = e.target.result;
          // img.complete?

          var canvas = document.getElementById('qr-canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          var canvas2dContext = canvas.getContext('2d');
          canvas2dContext.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);

          try {
            qrcode.decode();
          }
          catch (e) {
            console.log(e);
            app.unlockNote.textContent = 'Error while decoding. Try another image!';
          }
        };
      })(f);
      reader.readAsDataURL(f);
    }
  }

  document.getElementById('files').addEventListener('change', handleFileSelect, false);

  app.videoSelect.onchange = app.startVideoStream;

  app.gotVideoSources = function (sourceInfos) {
    for (var i = 0; i !== sourceInfos.length; ++i) {
      var sourceInfo = sourceInfos[i];
      var option = document.createElement('option');
      option.value = sourceInfo.id;
      if (sourceInfo.kind === 'video') {
        option.text = sourceInfo.label || 'camera ' + (app.videoSelect.length + 1);
        if (i === 0)
          option.setAttribute('selected', true);
        app.videoSelect.appendChild(option);
      }
    }
    app.gotVideoSourcesDone = true;
    app.startVideoStream();
  }

  app.qrScanClickHandler = function () {
    app.toggleUnlockDialog(true);
    app.videoSizeSaved = false;

    if (typeof MediaStreamTrack === 'undefined' || typeof MediaStreamTrack.getSources === 'undefined') {
      app.unlockNote.textContent = 'Try Chrome if you want to switch to the other camera.';
      app.startVideoStream();
    } else {
      app.unlockNote.textContent = 'Locate the QR code with the camera.';
      if (!app.gotVideoSourcesDone) {
        var videoSourceSelect = document.getElementById('videoSourceSelect');
        videoSourceSelect.removeAttribute('hidden');
        MediaStreamTrack.getSources(app.gotVideoSources);
      } else {
        app.startVideoStream();
      }
    }
  }

  app.container.addEventListener('click', app.qrScanClickHandler);
  document.getElementById('butScan').addEventListener('click', app.qrScanClickHandler);

  app.saveVideoSize = function() {
    setTimeout(function() { app.scanQRCode() }, 500);
    if (app.videoSizeSaved && app.videoWidth && app.videoHeight) {
      app.scanQRCode();
      return;
    }
    if (!this.videoWidth) {
      app.videoWidth = 640;
    } else {
      app.videoWidth = this.videoWidth;
    }
    if (!this.videoHeight) {
      app.videoHeight = 480;
    } else {
      app.videoHeight = this.videoHeight;
    }
    // Mozilla may call this callback repeatedly, so unregister it after successful data acquisition
    if (!!this.videoWidth && !!this.videoHeight) {
      document.getElementById('qrVideo').removeEventListener('playing', app.saveVideoSize, false);
      app.videoSizeSaved = true;
    }
    app.scanQRCode();
  }

  app.readQRCode = function(qrCode) {
    if (qrCode) {
      var rsa = new RSAKey();
      rsa.setPublic(app.publicKey.n, app.publicKey.e);
      var cleartext = rsa.decodeSign(qrCode);
      if (cleartext !== null) {
        var booth = app.indexBooth(cleartext);
        if (booth) {
          if (!booth.unlocked)
            booth.unlocked = true;
          booth.certificate = qrCode;
          app.updateBoothCard(booth);
          app.saveBooths();
          if (window.stream && window.stream.getVideoTracks)
            window.stream.getVideoTracks()[0].stop();
          app.toggleUnlockDialog(false);
          app.toggleNotificationDialog(true, 'Congratulations!', 'Successfully unlocked ' + booth.label + '!');
          return;
        } else {
          app.unlockNote.textContent = 'No booth found for this QR. Keep trying!';
        }
      } else {
        app.unlockNote.textContent = 'QR code decoding problem. Keep trying!';
      }
    } else {
      app.unlockNote.textContent = 'Could not decode QR code. Keep trying!';
    }
    setTimeout(function() { app.scanQRCode() }, 500);
  }

  qrcode.callback = app.readQRCode;

  app.scanQRCode = function() {
    if (!app.unlockDialog.classList.contains('dialog-container--visible'))
      return;

    var canvas = document.getElementById('qr-canvas');
    canvas.width = app.videoWidth;
    canvas.height = app.videoHeight;
    var videoElement = document.getElementById('qrVideo');
    var canvas2dContext = canvas.getContext('2d');
    canvas2dContext.drawImage(videoElement, 0, 0, app.videoWidth, app.videoHeight);

    try {
      qrcode.decode();
    }
    catch (e) {
      console.log(e);
      app.unlockNote.textContent = 'Error while decoding. Keep going!';
      setTimeout(function() { app.scanQRCode() }, 500);
    }
  }

  document.getElementById('butClose').addEventListener('click', function() {
    // Stop video stream
    if (window.stream && window.stream.getVideoTracks)
      window.stream.getVideoTracks()[0].stop();
    if (app.qrReadIntervalId > 0) {
      clearInterval(app.qrReadIntervalId);
      app.qrReadIntervalId = 0;
    }
    // Close the scan QR dialog
    app.toggleUnlockDialog(false);
  });

  document.getElementById('butCheck').addEventListener('click', function() {
    app.toggleNotificationDialog(true, 'Visited Booth Check', '');
    app.spinner.removeAttribute('hidden');
    // Check saved certificates and adjust unlocked states
    var unlockedCount = 0;
    var totalCount = 0;
    app.booths.forEach(function(booth) {
      if (!app.arrayHasOwnIndex(app.booths, booth) && booth.active) {
        totalCount++;
        var unlocked = false;
        if (booth.certificate) {
          var rsa = new RSAKey();
          rsa.setPublic(app.publicKey.n, app.publicKey.e);
          var cleartext = rsa.decodeSign(booth.certificate);
          if (cleartext !== null && cleartext === booth.key) {
            unlocked = true;
            unlockedCount++;
          }
        }
        booth.unlocked = unlocked;
        app.updateBoothCard(booth);
      }
    });
    app.saveBooths();
    app.spinner.setAttribute('hidden', true);
    document.getElementById('notification-summary').textContent = ('' + unlockedCount + ' out of ' + totalCount + ' is unlocked.');
  });

  document.getElementById('butOK').addEventListener('click', function() {
    app.toggleNotificationDialog(false);
  });

  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  app.toggleDialog = function(dialog, show) {
    if (show) {
      dialog.classList.add('dialog-container--visible');
    } else {
      dialog.classList.remove('dialog-container--visible');
    }
  };

  // Toggles the visibility of the QR scan dialog.
  app.toggleUnlockDialog = function(show) {
    app.toggleDialog(app.unlockDialog, show);
  };

  // Toggles the visibility of the QR scan dialog.
  app.toggleNotificationDialog = function(show, title, summary) {
    if (show) {
      document.getElementById('notification-title').textContent = (title ? title : 'Notification');
      document.getElementById('notification-summary').textContent = (summary ? summary : '');
    }
    app.toggleDialog(app.notifiactionDialog, show);
  };

  app.indexBooth = function(key) {
    for(var i = 0; i < app.booths.length; i++) {
      if (app.booths[i].key === key)
        return app.booths[i];
    }
    return null;
  }

  app.updatePublicKey = function() {
    var url = 'https://earthday.firebaseio.com/publicKey.json';
    if ('caches' in window) {
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function(json) {
            // Only update if the XHR is still pending, otherwise the XHR
            // has already returned and provided the latest data.
            if (app.hasPublicKeyRequestPending) {
              console.log('publicKey updated from cache');
              app.publicKey = json;
            }
          });
        }
      });
    }
    // Make the XHR to get the data, then update the card
    app.hasPublicKeyRequestPending = true;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          console.log('publicKey updated from FireBase');
          app.publicKey = response;
          app.hasPublicKeyRequestPending = false;
          app.savePublicKey();
        }
      }
    };
    request.open('GET', url);
    request.send();
  }

  // Updates a booth card with the latest booth information. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateBoothCard = function(data) {
    if (!data)
      return;
    var card = app.indexBooth(data.key);
    if (!card) {
      card = { 'key': data.key,
               'label': data.label,
               'description': data.description,
               'active': data.active,
               "certificate": null,
               "unlocked": false
              };
      app.booths.push(card);
    } else {
      card.label = data.label;
      card.description = data.description;
      card.active = data.active;
      if (data.certificate)
        card.certificate = data.certificate;
    }
    var cardNode = app.container.querySelector('.' + data.key);
    if (!cardNode) {
      cardNode = app.cardTemplate.cloneNode(true);
      cardNode.classList.add(data.key);
      cardNode.querySelector('.booth-key').textContent = data.key;
      cardNode.classList.remove('cardTemplate');
      cardNode.querySelector('.label').textContent = data.label;
      cardNode.querySelector('.description').textContent = data.description;
      cardNode.removeAttribute('hidden');
      if (!data.active)
        cardNode.setAttribute('hidden', true);
      app.container.appendChild(cardNode);
    }

    // Unlock check
    var unlocked = false;
    if (card.certificate) {
        var rsa = new RSAKey();
        rsa.setPublic(app.publicKey.n, app.publicKey.e);
        var cleartext = rsa.decodeSign(card.certificate);
        if (cleartext !== null && cleartext === card.key)
          unlocked = true;
    }
    card.unlocked = unlocked;

    cardNode.querySelector('.label').textContent = card.label;
    cardNode.querySelector('.description').textContent = card.description;
    cardNode.querySelector('.icon').classList.remove(card.unlocked ? 'locked': 'unlocked');
    cardNode.querySelector('.icon').classList.add(card.unlocked ? 'unlocked' : 'locked');
    cardNode.querySelector('.icon').classList.add('inflate');
    if (!card.active)
      cardNode.setAttribute('hidden', true);
    else
      cardNode.removeAttribute('hidden');
  };

  app.arrayHasOwnIndex = function(array, prop) {
    return array.hasOwnProperty(prop) && /^0$|^[1-9]\d*$/.test(prop) &&
        prop <= 4294967294; // 2^32 - 2 
  }


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  app.refreshBooths = function() {
    if (app.booths !== null) {
      app.booths.forEach(function(booth) {
        if (!app.arrayHasOwnIndex(app.booths, booth))
          app.updateBoothCard(booth);
      });
    }
  }

  app.updateBoothFromJSONArray = function(jsonArray) {
    if (jsonArray) {
      var boothsLen = jsonArray.length;
      for(var i = 0; i < boothsLen; i++) {
        app.updateBoothCard(jsonArray[i]);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.isLoading = false;
    }
  }

  // Gets a info for a specific booth and update the card with the data
  app.updateBooths = function() {
    var url = 'https://earthday.firebaseio.com/booths.json';
    if ('caches' in window) {
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function(json) {
            // Only update if the XHR is still pending, otherwise the XHR
            // has already returned and provided the latest data.
            if (app.hasBoothRequestPending) {
              console.log('booths updated from cache');
              app.updateBoothFromJSONArray(json);
            }
          });
        } else {
          app.refreshBooths();
        }
      });
    } else {
      app.refreshBooths();
    }
    // Make the XHR to get the data, then update the card
    app.hasBoothRequestPending = true;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          app.updateBoothFromJSONArray(response);
          console.log('booths updated from FireBase');
          app.hasBoothRequestPending = false;
          app.saveBooths();
        }
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Save list of cities to localStorage, see note below about localStorage.
  app.saveBooths = function() {
    var booths = JSON.stringify(app.booths);
    // IMPORTANT: See notes about use of localStorage.
    localStorage.booths = booths;
  };

  app.savePublicKey = function() {
    var publicKey = JSON.stringify(app.publicKey);
    // IMPORTANT: See notes about use of localStorage.
    localStorage.publicKey = publicKey;
  };

  /************************************************************************
   *
   * Code required to start the app
   *
   * NOTE: To simplify this codelab, we've used localStorage.
   *   localStorage is a synchronous API and has serious performance
   *   implications. It should not be used in production applications!
   *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
   *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
   ************************************************************************/

  var localStoredPublicKey = localStorage.publicKey;
  if (localStoredPublicKey)
    app.publicKey = JSON.parse(localStoredPublicKey);
  app.updatePublicKey();

  var localStoredBooths = localStorage.booths;
  if (localStoredBooths) {
    app.booths = JSON.parse(localStoredBooths);
    app.booths.forEach(function(booth) {
      if (!app.arrayHasOwnIndex(app.booths, booth))
        app.updateBoothCard(booth);
    });
  } else {
    app.booths = [];
    initialBoothList.forEach(function(booth) {
      if (!app.arrayHasOwnIndex(initialBoothList, booth)) {
        app.updateBoothCard(booth);
      }
    });
  }
  app.updateBooths();

  if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then(function() { console.log('Service Worker Registered'); });
  }
})();
