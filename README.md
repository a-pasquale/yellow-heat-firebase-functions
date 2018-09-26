# Yellow Heat Firebase Functions

These Firebase Realtime Database Functions are part of the Yellow Heat vegetable oil burner monitoring system. The other components in this system are:

- [Yellow Heat Firmware](https://github.com/a-pasquale/yellow-heat)
- [Yellow Heat Monitoring App](https://github.com/a-pasquale/yellow-heat-app)

More information about Yellow Heat vegetable oil burners is available at [https://www.yellowheat.com/](https://www.yellowheat.com/)

These functions calculate total fuel use for the burner and store the current burner status and fuel level.

## About Cloud Functions
Read more about [Cloud Functions for Firebase](https://firebase.google.com/docs/functions/)

## Getting Started
1. Create your project in the Firebase Console.
2. Enable the Google sign-in provider in the Authentication > SIGN-IN METHOD tab.
3. You must have the Firebase CLI installed. If you don't have it, install it and then configure it with firebase login:
```
npm install firebase-functions@latest --save
```

4. Clone this repository and open the functions directory: 
```
git clone https://github.com/a-pasquale/yellow-heat-firebase-functions; cd functions
```

5. Install cloud functions dependencies: 
```
npm --prefix functions install
```

6. On the command line select the Firebase project you have created.
``` 
firebase use --add
```

7. Configure Gmail SMTP transport for nodemailer:
```
firebase functions:config:set gmail.email='XXXXXXXXX@gmail.com'
firebase functions:config:set gmail.password='XXXXXXXXXXX'
```

8. On the command line run firebase deploy to deploy the application.
```
firebase deploy --only functions
```
