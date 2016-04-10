
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
    addDialog: document.querySelector('.dialog-container')
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

  document.getElementById('butScan').addEventListener('click', function() {
    // Initiate a QR Code snapshot process
    app.toggleUnlockProcess(true);
  });

  document.getElementById('butScanQR').addEventListener('click', function() {
    // Snapshot a QR code to unlock a booth
    // var select = document.getElementById('selectCityToAdd');
    // var selected = select.options[select.selectedIndex];
    // var key = selected.value;
    // var label = selected.textContent;
    // app.getForecast(key, label);
    // app.selectedCities.push({key: key, label: label});
    // app.saveSelectedCities();
    app.toggleUnlockProcess(false);
  });

  document.getElementById('butCancel').addEventListener('click', function() {
    // Close the scan QR dialog
    app.toggleUnlockProcess(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the QR snapshot dialog.
  app.toggleUnlockProcess = function(unlocked) {
    if (unlocked) {
      app.addDialog.classList.add('dialog-container--unlocked');
    } else {
      app.addDialog.classList.remove('dialog-container--unlocked');
    }
  };

  // Updates a booth card with the latest booth information. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateBoothCard = function(data) {
    if (!data)
      return;
    var card = app.booths[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.booths[data.key] = card;
    }
    card.querySelector('.description').textContent = data.description;
    card.querySelector('.icon').classList.add(data.unlocked ? 'unlocked' : 'locked');
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
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
  app.getBooth = function(key, label) {
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
              }
              app.updateBoothCard(json);
            }
          });
        }
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
        app.getBooth(booth.key, booth.label);
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
        app.getBooth(booth.key, booth.label);
    });
  } else {
    app.booths = [];
    initialBoothList.forEach(function(booth) {
      if (!app.arrayHasOwnIndex(initialBoothList, booth)) {
        app.updateBoothCard(booth);
        app.booths.push(booth);
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
