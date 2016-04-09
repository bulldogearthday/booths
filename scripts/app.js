
(function() {
  'use strict';

  var initialBoothList = [{
    key: 'freecycle',
    label: 'Freecycle',
    description: 'bring something and/or take something',
    certificate: null
  }];

  var app = {
    hasRequestPending: false,
    isLoading: true,
    unlockedBooths: {},
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

  document.getElementById('butAdd').addEventListener('click', function() {
    // Initiate a QR Code snapshot process
    app.toggleUnlockProcess(true);
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
    var card = app.unlockedBooths[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.unlockedBooths[data.key] = card;
    }
    card.querySelector('.description').textContent = data.description;
    var today = new Date();
    card.querySelector('.date').textContent = today;
    // card.querySelector('.current .icon').classList.add(data.currently.icon);
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  // Gets a info for a specific booth and update the card with the data
  app.getBooth = function(key, label) {
    var url = 'https://publicdata-weather.firebaseio.com/';
    url += key + '.json';
    if ('caches' in window) {
    //   caches.match(url).then(function(response) {
    //     if (response) {
    //       response.json().then(function(json) {
    //         // Only update if the XHR is still pending, otherwise the XHR
    //         // has already returned and provided the latest data.
    //         if (app.hasRequestPending) {
    //           console.log('updated from cache');
    //           json.key = key;
    //           json.label = label;
    //           app.updateBoothCard(json);
    //         }
    //       });
    //     }
    //   });
    }
    // Make the XHR to get the data, then update the card
    app.hasRequestPending = true;
    var request = new XMLHttpRequest();
    // request.onreadystatechange = function() {
    //   if (request.readyState === XMLHttpRequest.DONE) {
    //     if (request.status === 200) {
    //       var response = JSON.parse(request.response);
    //       response.key = key;
    //       response.label = label;
    //       app.hasRequestPending = false;
    //       app.updateBoothCard(response);
    //     }
    //   }
    // };
    // request.open('GET', url);
    // request.send();
  };

  // Iterate all of the cards and attempt to get the latest booth data
  app.updateBooths = function() {
    var keys = Object.keys(app.unlockedBooths);
    keys.forEach(function(key) {
      app.getBooth(key);
    });
  };

  // Save list of cities to localStorage, see note below about localStorage.
  app.saveUnlockedBooths = function() {
    var unlockedBooths = JSON.stringify(app.unlockedBooths);
    // IMPORTANT: See notes about use of localStorage.
    localStorage.unlockedBooths = unlockedBooths;
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

  app.unlockedBooths = localStorage.unlockedBooths;
  if (app.unlockedBooths) {
    app.unlockedBooths = JSON.parse(app.unlockedBooths);
    app.unlockedBooths.forEach(function(booth) {
      app.getBooth(booth.key, booth.label);
    });
  } else {
    app.unlockedBooths = [];
    for(var i = 0; i < initialBoothList.length; i++) {
      app.updateBoothCard(initialBoothList[i]);
      app.unlockedBooths.push({key: initialBoothList[i].key, label: initialBoothList[i].label});
    }
    app.saveUnlockedBooths();
  }

  if('serviceWorker' in navigator) {
    navigator.serviceWorker
             .register('./service-worker.js')
             .then(function() { console.log('Service Worker Registered'); });
  }
})();
