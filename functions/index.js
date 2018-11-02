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

        // Update heater summary statistics
        return admin.database().ref('/users/'+context.params.uid+'/'+context.params.heater).once('value').then(
            (heaterSnap) => {
                const heater = heaterSnap.val();

                admin.database().ref('/users/'+context.params.uid).once('value').then(
                    (userSnap) => {
                        const user = userSnap.val();

                        // Low Fuel Notifications
                        const notificationLevel = heater.notificationLevel/100.0;
                        if (fuelReading < notificationLevel) {
                            if (!heater.notified) {
                                // Send an alert notification
                                console.log("Fuel level is low!");
                                const mailOptions = {
                                    from: `Yellow Heat <${gmailEmail}>`,
                                    to: user.email,
                                    bcc: heater.notifyYellowHeat ? gmailEmail : ''
                                };
                                mailOptions.subject = `Alert: Fuel level low!`;
                                mailOptions.html = `<p>Hey ${user.name || ''}!</p>`;
                                mailOptions.html += `<p>Your fuel level is at ${fuelReading*100}%.</p>`;
                                mailOptions.text = `Hey ${user.name || ''}! Your fuel level is at ${fuelReading*100}%. `;
                                if (heater.notifyYellowHeat) { 
                                    mailOptions.html += "<p>Yellow Heat has been notified and will contact you soon to arrange a delivery.</p>";
                                    mailOptions.text += "Yellow Heat has been notified and will contact you soon to arrange a delivery.";
                                };
                                return mailTransport.sendMail(mailOptions).then(() => {
                                    console.log('Alert email sent to:', user.email);
                                    return heaterSnap.ref.child('notified').set(true);
                                });
                            }
                        } else {
                            // The tank is above notification level.
                            // If there was a previouse notification,
                            // reset the notified flag.
                            if (heater.notified) heaterSnap.ref.child('notified').set(false);
                        }
                    }
                )
                // Calculate how much fuel used since last reading
                const lastFuelReading = heater.lastFuelReading;
                const tankSize = heater.tankSize;
                const fuelUse = round((lastFuelReading - fuelReading) * tankSize, 2);
                console.log("fuel use: ", fuelUse)

                // Update total fuel use
                let totalFuelUse = heater.totalFuelUse;
                console.log("Previous total fuel use: ", totalFuelUse)
                if (fuelUse > 0) {
                    totalFuelUse += round(fuelUse, 1);
                    console.log('User %s used %s gallons of fuel with heater %s', context.params.uid, fuelUse, context.params.heater);
                } else {
                    console.log('User %s added %s gallons of fuel to heater %s', context.params.uid, -fuelUse, context.params.heater);
                }

                // Update summary stats
                heaterSnap.ref.child('lastFuelReading').set(fuelReading);
                heaterSnap.ref.child('status').set(data.after.val().message);
                return heaterSnap.ref.child('totalFuelUse').set(totalFuelUse);
            }
        )        
    })

function round(number, decimals) { 
    return +(Math.round(number + "e+" + decimals) + "e-" + decimals); 
}
