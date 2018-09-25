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

// Update fuel usage for Yellow Heat database
exports.calcFuelUse = functions.database.ref('/{uid}/{heater}/data/{id}')
    .onWrite((data, context) => {

        return data.after.ref.parent.parent.once('value').then(
            (heater) => {

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
                        
                            // The user subscribed to the newsletter.
                            mailOptions.subject = `Alert: Fuel level low!`;
                            mailOptions.text = `Hey ${user.name || ''}! Your fuel level is at ${fuelReading}.`;
                            return mailTransport.sendMail(mailOptions).then(() => {
                                return console.log('Alert email sent to:', user.email);
                            });
                        }
                    )
                }

                const tankSize = heater.child('tankSize').val();
                if (!heater.child('lastFuelReading')) {
                    heater.child('lastFuelReading').set('')
                }
                if (!heater.child('totalFuelUse')) {
                    heater.child('totalFuelUse').set('')
                    console.log("Setting totalFuelUse")
                }
                const lastFuelReading = heater.child('lastFuelReading').val();
                const fuelUse = round((lastFuelReading - fuelReading) * tankSize, 2);
                console.log("fuelUse: ", fuelUse)
                let totalFuelUse = heater.child('totalFuelUse').val();
                console.log("totalfuelUse: ", totalFuelUse)
                
                if (fuelUse > 0) {
                    totalFuelUse += fuelUse;
                    console.log('User %s used %s gallons of fuel with heater %s', context.params.uid, fuelUse, context.params.heater);
                } else {
                    console.log('User %s added %s gallons of fuel to heater %s', context.params.uid, -fuelUse, context.params.heater);
                }

                data.after.ref.parent.parent.child('lastFuelReading').set(fuelReading);
                return data.after.ref.parent.parent.child('totalFuelUse').set(totalFuelUse);
            }
        )        
    })

function round(number, decimals) { 
    return +(Math.round(number + "e+" + decimals) + "e-" + decimals); 
}
