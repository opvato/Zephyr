var request = require('request');
var async = require('async');
var moment = require('moment');
var firebase = require("firebase");

/*
if (process.env.project_id){
    console.log('heroku environment found');
    firebase.initializeApp({
        serviceAccount: {
            projectId: process.env.project_id,
            clientEmail: process.env.client_email,
            privateKey: process.env.private_key
        },
        databaseURL: "https://op-flight-b85b9.firebaseio.com/"
    });
}else{
    console.log("local environment found");
    firebase.initializeApp({
        serviceAccount: "op-flight-b434365c00ec.json", //excluded from git
        databaseURL: "https://op-flight-b85b9.firebaseio.com/"
    });
}
*/



firebase.initializeApp({
  databaseURL: "https://op-flight-b85b9.firebaseio.com/"
});

console.log(process.env.mode);
console.log("alma");

var db = firebase.database();


var origin = "BUD"; //origin airport code
var flex = 6; //days to check
var tickets = 2; //number of tickets
var weeks = 15; //number of weeks checked
var toPrior = ["STN","BVA","ATH","CFU","MLA","SXF","CIA","FCO","VCE","BCN","LPA","MAD","AGP","DUB"]; 
var toMore = ["CRL","BLL","CPH","BRS","EMA","MAN","TMP","VDA","NUE","BGY","PSA"];

var airports = {
    "BUD": "Budapest",
    "STN": "London",
    "BVA": "Párizs",
    "ATH": "Athén",
    "CFU": "Korfu",
    "MLA": "Málta",
    "SXF": "Berlin",
    "CIA": "Róma",
    "FCO": "Róma",
    "VCE": "Velence",
    "BCN": "Barcelona",
    "LPA": "GranCanaria",
    "MAD": "Madrid",
    "AGP": "Malaga",
    "DUB": "Dubai",
    "CRL": "Brüsszel",
    "BLL": "Bilund",
    "CPH": "Koppenhága",
    "BRS": "Bristol",
    "EMA": "EastMidlands",
    "MAN": "Manchester",
    "TMP": "Tampere",
    "VDA": "Ovda",
    "NUE": "Nürnberg",
    "BGY": "Bergamo",
    "PSA": "Píza"
}

var fareLimit = process.env.fare_limit || 8000; //price per ticket in HUF
var interval = process.env.interval || 100; // 20 seconds;

var toAll = toPrior.concat(toMore);  //no priority check atm

var weeksArr = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]; //array of week numbers. its dumb, but still works

var i = 0;
var j = 0;
var cyclecounter = 0;

async.forever( //never stop exploring:)
    function(next) {
        setTimeout( function () {         
        var dateIn = moment().add((j*7 + 1),'days').format('YYYY-MM-DD'); //tomorrow + week offset
        var dateOut = moment().add((j*7 + 8),'days').format('YYYY-MM-DD');             
            getFlights(origin, toAll[i], dateIn, dateOut, flex, tickets);
            if (i == toAll.length-1){
                if (j == weeksArr.length-1){
                    i = 0;
                    j = 0;       
                    cyclecounter += 1;  
                    console.log('cycle ' + cyclecounter + ' ended');           
                }else{
                    j += 1;
                }
            }else{
                if (j == weeksArr.length-1){
                    j = 0;
                    i += 1; 
                }else{
                    j +=1;
                }
            }
            next();                
        }, interval);
    },
    function(err) {
        console.log(err);
    }
);



function getFlights(origin, destination, outDate, inDate, flex, tickets){
    var url = 'https://desktopapps.ryanair.com/hu-hu/availability?ADT=' + 
    tickets
    +'&CHD=0&DateIn=' +
    outDate
    + '&DateOut=' +
    inDate
    + '&Destination=' +
    destination
    + '&FlexDaysIn=' +
    flex
    + '&FlexDaysOut=' +
    flex
    + '&INF=0&Origin=' +
    origin
    + '&RoundTrip=true&TEEN=0';
    console.log(origin + " - " + destination + " - " + outDate);
    request({url: url}, callback);
}
 var urlTmp = "https://desktopapps.ryanair.com/hu-hu/availability?ADT=2&CHD=0&DateIn=2016-11-28&DateOut=2016-12-05&Destination=BGY&FlexDaysIn=6&FlexDaysOut=6&INF=0&Origin=BUD&RoundTrip=true&TEEN=0"

 
var options = {
  url: urlTmp
};
 
function callback(error, response, body) {
  if (!error && response.statusCode == 200) {
      try{
            var info = JSON.parse(body);
            getLowFares(info, fareLimit);
      }catch (e){
          console.log(e);
      }
    
  }
}

function setFlight(trip, flight, type){
    var fromCity = airports[trip.origin];
    var toCity = airports[trip.destination];
    var key = fromCity + "_" + toCity + "/" + flight[type].fares[0].amount +"/" + flight.time[0].substr(0,10);
    console.log(key);
    var ref = db.ref("flights/"+ key);                
    ref.set(flight);
}

function getLowFares(response, fareLimit){
    response.trips.forEach(function(trip){
        trip.dates.forEach(function(dates){
            dates.flights.forEach(function(flight){ 
            if(flight.hasOwnProperty('businessFare')){
                if (flight.businessFare.fares[0].amount < fareLimit){                    
                    setFlight(trip, flight, 'businessFare');
                }
            }
            if(flight.hasOwnProperty('leisureFare')){
                if (flight.leisureFare.fares[0].amount < fareLimit){
                    setFlight(trip, flight, 'leisureFare');
                }
            }
            if(flight.hasOwnProperty('regularFare')){
                if (flight.regularFare.fares[0].amount < fareLimit){
                    setFlight(trip, flight, 'regularFare');
                }
            }
            })
        })
    })
}

var express = require('express')
var app = express()

app.set('port', (process.env.PORT || 5000))
app.use(express.static(__dirname + '/public'))

app.get('/', function(request, response) {
  response.send('Zephyr')
})

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))    
})
