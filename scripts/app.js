
(function() {
  'use strict';

  var initialBoothList = initial_booth_data;  // From jsonp!
  var public_key = null;

  var app = {
    hasRequestPending: false,
    isLoading: true,
    booths: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    unlockDialog: document.querySelector('.unlock-dialog'),
    checkDialog: document.querySelector('.check-dialog'),
    videoSelect: document.querySelector('select#videoSource'),
    unlockNote: document.getElementById('unlockNote'),
    gotVideoSourcesDone: false,
    videoWidth: 640,
    videoHeight: 480,
    videoSizeSaved: false,
    publicKey: {
      n: "C4E3F7212602E1E396C0B6623CF11D26204ACE3E7D26685E037AD2507DCE82FC\n28F2D5F8A67FC3AFAB89A6D818D1F4C28CFA548418BD9F8E7426789A67E73E41",
      e: "10001",
    },
    qrReadIntervalId: 0
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
        }
      );
    } else {
      app.unlockNote.textContent = 'This browser doesn not support getUserMedia. Try Chrome.';
    }
  }

  app.videoSelect.onchange = app.startVideoStream;

  app.gotVideoSources = function (sourceInfos) {
    for (var i = 0; i !== sourceInfos.length; ++i) {
      var sourceInfo = sourceInfos[i];
      var option = document.createElement('option');
      option.value = sourceInfo.id;
      if (sourceInfo.kind === 'video') {
        option.text = sourceInfo.label || 'camera ' + (app.videoSelect.length + 1);
        if (i == 0)
          option.setAttribute('selected', true);
        app.videoSelect.appendChild(option);
      }
    }
    app.gotVideoSourcesDone = true;
    app.startVideoStream();
  }

  document.getElementById('butScan').addEventListener('click', function() {
    app.toggleUnlockDialog(true);
    app.videoSizeSaved = false;

    if (typeof MediaStreamTrack === 'undefined' || typeof MediaStreamTrack.getSources === 'undefined') {
      app.unlockNote.textContent = 'This browser does not support MediaStreamTrack. Try Chrome.';
    } else {
      app.unlockNote.textContent = 'Press the SCAN button for scan.';
      if (!app.gotVideoSourcesDone) {
        var videoSourceSelect = document.getElementById('videoSourceSelect');
        videoSourceSelect.removeAttribute('hidden');
        MediaStreamTrack.getSources(app.gotVideoSources);
      } else {
        app.startVideoStream();
      }
    }
  });

  app.saveVideoSize = function() {
    app.qrReadIntervalId = setInterval(app.scanQRCode(), 500);
    if (app.videoSizeSaved && app.videoWidth && app.videoHeight)
      return;
    if (!this.videoWidth) {
      console.log('Video width is falsy');
      app.videoWidth = 640;
    } else {
      app.videoWidth = this.videoWidth;
    }
    if (!this.videoHeight) {
      console.log('Video height is falsy');
      app.videoHeight = 480;
    } else {
      app.videoHeight = this.videoHeight;
    }
    // Mozilla may call this callback repeatedly, so unregister it after successful data acquisition
    if (!!this.videoWidth && !!this.videoHeight) {
      document.getElementById('qrVideo').removeEventListener('playing', app.saveVideoSize, false);
      app.videoSizeSaved = true;
    }
  }

  app.readQRCode = function(qrCode) {
    if (qrCode) {
      var rsa = new RSAKey();
      var cyphertext = qrCode;
      rsa.setPublic(app.publicKey.n, app.publicKey.e);
      var cleartext = rsa.decodeSign(cyphertext);
      if (cleartext != null) {
        var booth = app.indexBooth(cleartext);
        if (booth) {
          if (!booth.unlocked) {
            booth.unlocked = true;
            updateBoothCard(cleartext);
          }
          booth.certificate = decoded;
          app.saveBooths();
          if (window.stream && window.stream.getVideoTracks)
            window.stream.getVideoTracks()[0].stop();
          app.unlockNote.textContent = 'Successfully unlocked ' + booth.label + '!';
          //app.toggleUnlockDialog(false);
        } else {
          app.unlockNote.textContent = 'QR code information problem. Keep going!';
        }
      } else {
        app.unlockNote.textContent = 'QR code information problem. Keep going!';
      }
    } else {
      app.unlockNote.textContent = 'Could not decode QR code. Keep going!';
    }
  }

  qrcode.callback = app.readQRCode;
  app.scanQRCode = function() {
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
      app.unlockNote.textContent = 'Error while decoding. Keep going!';
    }
  }

//   document.getElementById('butScanQR').addEventListener('click', function() {
//     var canvas = document.getElementById('qr-canvas');
//     canvas.width = app.videoWidth;
//     canvas.height = app.videoHeight;
//     var videoElement = document.getElementById('qrVideo');
//     var canvas2dContext = canvas.getContext('2d');
//     canvas2dContext.drawImage(videoElement, 0, 0, app.videoWidth, app.videoHeight);
//     var imageData = canvas2dContext.getImageData(0, 0, app.videoWidth, app.videoHeight);

//     var decoded = jsQR.decodeQRFromImage(imageData.data, imageData.width, imageData.height);
//   });

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
    app.toggleCheckDialog(true);
    app.spinner.removeAttribute('hidden');
    // Check saved certificates and adjust unlocked states
    app.booths.forEach(function(booth) {
      if (!app.arrayHasOwnIndex(app.booths, booth)) {
        var unlocked = false;
        var rsa = new RSAKey();
        var cyphertext = booth.certificate;
        rsa.setPublic(app.publicKey.n, app.publicKey.e);
        var cleartext = rsa.decodeSign(cyphertext);
        if (cleartext != null && cleartext === booth.key)
          unlocked = true;
        booth.unlocked = unlocked;
        updateBoothCard(booth.key);
      }
    });
    app.saveBooths();
    app.spinner.setAttribute('hidden', true);
  });

  document.getElementById('butOK').addEventListener('click', function() {
    app.toggleCheckDialog(false);
  });

  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  app.toggleDialog = function(dialog, show) {
    if (show) {
      dialog.classList.add('dialog-container--unlocked');
    } else {
      dialog.classList.remove('dialog-container--unlocked');
    }
  };

  // Toggles the visibility of the QR scan dialog.
  app.toggleUnlockDialog = function(show) {
    app.toggleDialog(app.unlockDialog, show);
  };

  // Toggles the visibility of the QR scan dialog.
  app.toggleCheckDialog = function(show) {
    app.toggleDialog(app.checkDialog, show);
  };

  app.indexBooth = function(key) {
    app.booths.forEach(function(booth) {
      if (!app.arrayHasOwnIndex(app.booths, booth) && booth.key == key)
        return booth;
    });
    return null;
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
               "certificate": null,
               "unlocked": false
              };
      app.booths.push(card);
    }
    var cardNode = app.container.querySelector('.' + data.key);
    if (!cardNode) {
      cardNode = app.cardTemplate.cloneNode(true);
      cardNode.classList.add(data.key);
      cardNode.querySelector('.booth-key').textContent = data.key;
      cardNode.classList.remove('cardTemplate');
      cardNode.querySelector('.location').textContent = data.label;
      cardNode.removeAttribute('hidden');
      app.container.appendChild(cardNode);
    }
    cardNode.querySelector('.description').textContent = data.description;
    cardNode.querySelector('.icon').classList.remove(data.unlocked ? 'locked': 'unlocked');
    cardNode.querySelector('.icon').classList.add(data.unlocked ? 'unlocked' : 'locked');
    cardNode.querySelector('.icon').classList.add('inflate');
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      //app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
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

  // Gets a info for a specific booth and update the card with the data
  app.getBooth = function(key, label, description) {
    var url = 'https://earthday.firebaseio.com/';
    url += key + '.json';
    if ('caches' in window) {
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function(json) {
            // Only update if the XHR is still pending, otherwise the XHR
            // has already returned and provided the latest data.
            if (app.hasRequestPending) {
              console.log('updated from cache');
              if (json) {
                json.key = key;
                json.label = label;
                json.description = description;
              }
              app.updateBoothCard(json);
            }
          });
        } else if (app.booths != null) {
          app.booths.forEach(function(booth) {
            if (!app.arrayHasOwnIndex(app.booths, booth))
              app.updateBoothCard(booth);
          });
        }
      });
    } else if (app.booths != null) {
      app.booths.forEach(function(booth) {
        if (!app.arrayHasOwnIndex(app.booths, booth))
          app.updateBoothCard(booth);
      });
    }
    // Make the XHR to get the data, then update the card
    app.hasRequestPending = true;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          if (response) {
            response.key = key;
            response.label = label;
            response.description = description;
          }
          app.hasRequestPending = false;
          app.updateBoothCard(response);
        }
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Iterate all of the cards and attempt to get the latest booth data
  app.updateBooths = function() {
    app.booths.forEach(function(booth) {
      if (!app.arrayHasOwnIndex(app.booths, booth))
        app.getBooth(booth.key, booth.label, booth.description);
    });
  };

  // Save list of cities to localStorage, see note below about localStorage.
  app.saveBooths = function() {
    var booths = JSON.stringify(app.booths);
    // IMPORTANT: See notes about use of localStorage.
    localStorage.booths = booths;
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

  app.booths = localStorage.booths;
  if (app.booths) {
    app.booths = JSON.parse(app.booths);
    app.booths.forEach(function(booth) {
      if (!app.arrayHasOwnIndex(app.booths, booth))
        app.getBooth(booth.key, booth.label, booth.description);
    });
  } else {
    app.booths = [];
    initialBoothList.forEach(function(booth) {
      if (!app.arrayHasOwnIndex(initialBoothList, booth)) {
        app.updateBoothCard(booth);
        // app.booths.push(booth);
      }
    });
    app.saveBooths();
  }

  if('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./service-worker.js')
             .then(function() { console.log('Service Worker Registered'); });
  }
})();
