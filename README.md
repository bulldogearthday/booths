# Booths
A Progressive Web App for paperless booth visit provisioning.

## App basics
* Progressive Web Apps provide a way to have mobile app on multiple platforms without going through the hoops of releasing separate native apps into native app stores.
* Progressive Web Apps work best with Chrome browser but with polyfill libraries other browsers could still provide the required features.
* The user can take a picture of the specific QR code of a booth. The QR code will cryptographically prove that the individual visited the booth.
* I'll try to use HTML5's getUserMedia and own QR reader JavaScript library (or a web service) to provide smoother QR code reading exprience than what can be achieved with ZXing or Lazarsoft.
* There will be an assymetric keypair generated. The booths will have their own unique certificate encoded with the private key. The authenticity of the certificate can be easily checked by the public key.
* Probably the resulting QR code won't be small: 1024 bit encoding will mean about 256 bytes of data to be encoded in the QR.
* The App will be able to operate off-line from cached data.
* There will be a data backend on Firebase (maybe the app itself will be hosted there too).
* The data is basically the list and properties of the booths.
