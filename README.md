# Booths
A Progressive Web App for paperless booth visit provisioning.

## Usage
* Define booth list on the firebase backend, and also provide the same data in the off-line default store (jsonp file)
* Generate RSA public/private keypair at http://www-cs-students.stanford.edu/~tjw/jsbn/rsa2.html
* Encode booth key for each booth and generate QR codes for them
* Distribute the QR codes
* Make sure the visitors only see the booth's QR code when they completed the booth's quest
* The visitor can then scan the QR code, unlocking the achievement

## App basics
* Progressive Web Apps provide a way to have mobile app on multiple platforms without going through the hoops of releasing separate native apps into native app stores
* Progressive Web Apps work best with Chrome browser but with polyfill libraries other browsers could still provide the required features
* The user can take a picture of the specific QR code of a booth. The QR code will cryptographically prove that the individual visited the booth
* Using getUserMedia for visual capture (see e.g. https://github.com/samdutton/simpl/tree/gh-pages/getusermedia)
* Using MediaStreamTrack for video source selection (https://github.com/samdutton/simpl/tree/gh-pages/getusermedia/sources)
* Using jsQR for QR scanning (https://github.com/cozmo/jsQR)
* Using http://www-cs-students.stanford.edu/~tjw/jsbn/ for RSA encryption/decription
* The App should be able to operate off-line from cached data
* Firebase backend provides booth data
* The data is basically the list and properties of the booths

## TODO
* Computation server side for better security
* Minimize JS and even code to make cheating harder
* Minimize all assets (smaller icon data, minimize CSS too) for decrease load time and better bandwidth
* Inline everything together for faster experience
* QR code would read automatically and no SCAN button needed
* Improve cross-platform and cross-browser coverage
