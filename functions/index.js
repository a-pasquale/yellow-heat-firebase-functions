const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const admin = require("firebase-admin");


// Initialize the app with a null auth variable, limiting the server's access
admin.initializeApp({
    databaseURL: "https://yellow-heat.firebaseio.com",
    databaseAuthVariableOverride: null
});

// Configure the email transport using the default SMTP transport and a GMail account.
// For Gmail, enable these:
// 1. https://www.google.com/settings/security/lesssecureapps
// 2. https://accounts.google.com/DisplayUnlockCaptcha
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
console.log("gmailPassword: ", gmailPassword);
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

// Update current temperature 
exports.currentTemp = functions.database.ref('/{uid}/{heater}/temp/{id}')
    .onWrite(
        (data, context) => {
            const temp = round(data.after.val().temp, 1);
            console.log("Temp: ", temp);
            return admin.database().ref('/users/'+context.params.uid+'/'+context.params.heater).once('value').then(
                (snap) => {
                    return snap.ref.child('temp').set(temp);
                }
            )
        }
    )

// Update fuel usage for Yellow Heat database
exports.calcFuelUse = functions.database.ref('/{uid}/{heater}/data/{id}')
    .onWrite((data, context) => {

        const fuelReading = round(data.after.val().fuel, 4);
        console.log("Fuel Reading: ", fuelReading);

        // Low Fuel Notifications
        if (fuelReading < 0.5) {
            admin.database().ref('/users/'+context.params.uid).once('value').then(
                (snap) => {
                    const user = snap.val();
                    const mailOptions = {
                        from: `Holyoke Codes <holyokecodes@gmail.com>`,
                        to: user.email,
                    };
                
                    // Send an alert notification.
                    mailOptions.subject = `Alert: Fuel level low!`;
                    mailOptions.text = `Hey ${user.name || ''}! Your fuel level is at ${fuelReading}.`;
                    return mailTransport.sendMail(mailOptions).then(() => {
                        return console.log('Alert email sent to:', user.email);
                    });
                }
            )
        }
        // Update heater summary statistics
        return admin.database().ref('/users/'+context.params.uid+'/'+context.params.heater).once('value').then(
            (snap) => {
                // Calculate how much fuel used since last reading
                const lastFuelReading = snap.val().lastFuelReading;
                const tankSize = snap.val().tankSize;
                const fuelUse = round((lastFuelReading - fuelReading) * tankSize, 2);
                console.log("fuel use: ", fuelUse)

                // Update total fuel use
                let totalFuelUse = snap.val().totalFuelUse;
                console.log("Previous total fuel use: ", totalFuelUse)
                if (fuelUse > 0) {
                    totalFuelUse += round(fuelUse, 1);
                    console.log('User %s used %s gallons of fuel with heater %s', context.params.uid, fuelUse, context.params.heater);
                } else {
                    console.log('User %s added %s gallons of fuel to heater %s', context.params.uid, -fuelUse, context.params.heater);
                }

                // Update summary stats
                snap.ref.child('lastFuelReading').set(fuelReading);
                snap.ref.child('status').set(data.after.val().message);
                return snap.ref.child('totalFuelUse').set(totalFuelUse);
            }
        )        
    })

function round(number, decimals) { 
    return +(Math.round(number + "e+" + decimals) + "e-" + decimals); 
}
