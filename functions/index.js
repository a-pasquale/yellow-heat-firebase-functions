const functions = require('firebase-functions');

// Update fuel usage for Yellow Heat database
exports.calcFuelUse = functions.database.ref('/{uid}/{heater}/data/{id}')
    .onWrite(event => {
        return event.data.ref.parent.parent.once('value').then(
            (heater) => {
                const fuelReading = round(event.data.val().fuel, 4);
                const tankSize = heater.child('tankSize').val();
                const lastFuelReading = heater.child('lastFuelReading').val();
                const fuelUse = round((lastFuelReading - fuelReading) * tankSize, 2);
                let totalFuelUse = heater.child('totalFuelUse').val();
                
                if (fuelUse > 0) {
                    totalFuelUse += fuelUse;
                    console.log('User %s used %s gallons of fuel with heater %s', event.params.uid, fuelUse, event.params.heater);
                } else {
                    console.log('User %s added %s gallons of fuel to heater %s', event.params.uid, -fuelUse, event.params.heater);
                }

                event.data.ref.parent.parent.child('lastFuelReading').set(fuelReading);
                return event.data.ref.parent.parent.child('totalFuelUse').set(totalFuelUse);
            }
        )        
    })

function round(number, decimals) { 
    return +(Math.round(number + "e+" + decimals) + "e-" + decimals); 
}
