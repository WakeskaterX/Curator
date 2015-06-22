/**
 * Article Server - stands up an HTTP server for local requests that allows our Curator to post
 * Last Updated June 2015 by Jason Carter
 */
var express = require('express');
var http = require('http');
var pg = require('pg');
var bodyParser = require('body-parser');
var connect = "postgres://username:password@localhost/database";  //Connection String - replace this with your own
var async = require('async');

var app = express();

//We're going to use Body Parser JSON to parse the json sent to the server
app.use(bodyParser.json());

//Our one endpoint a POST to /save.  This gets the data and lets us save it in the postgres database.
app.post('/save', function (req, res) {
  try {
    console.log("Recieved Request From: "+req.ip);
    var articles = req.body;
    var list_of_sites = [];
    for (var site in articles) {
      if (articles.hasOwnProperty(site)) {
        var site_arr = [site, articles[site].title, articles[site].article,articles[site].type,new Date().toDateString()];
        list_of_sites.push(site_arr);
      }
    }
    //Connect to our database and store the data.
    pg.connect(connect,function (err,client,done) {
      if (err) {
        res.status(500).send(err.toString());
      }
      checkSites(list_of_sites, client, function (err) {
        if (err) {
          client.end();
          res.status(400).send('There was an error: ' + err.toString());
        } else {
          client.end();
          res.send('Saved Data!');
        }
      });
    });
  } catch (e) {
    res.status(400).send('Invalid JSON Supplied: ' + e.toString());
  }
});

//Set up our app to listen on port 3030
app.listen(3030);

//Check sites accesses the database and gets the URLs that already exist in the database, we don't want duplicate data, so we're set up to recieve whatever
//and store only what we don't have
function checkSites(data, client, callback) {
  var all_sites = [];
  var insert_data = [];
  var query = client.query('SELECT site FROM articles');
  query.on('row', function (row) {
    //console.log(row);
    all_sites.push(row.site);
  });
  query.on('end', function (result) {
    for (var i = 0; i < data.length; i++) {
      var exists = false;
      for (var j = 0; j < all_sites.length; j++) {
        if (all_sites[j] === data[i][0]) {
          exists = true;
        }
      }
      if (!exists) insert_data.push(data[i]);
    }
    insertSites(insert_data, client, callback);
  });
}

//Insert our sites into our database.  We're going to use the Async library here so we can use callbacks to iterate through each entry asynchronously.
function insertSites(values_arr, client, callback) {
  if (values_arr.length < 1) { 
    callback(null); 
  } else {
    async.each(values_arr,function(values,callback){
      client.query('INSERT INTO articles (site, title, article, site_type, date_created) VALUES ($1, $2, $3, $4, $5)',values,function(err, result){
        console.log("Inserted "+values[0]+" site into PSQL Database!");
        callback(err);
      });
    },callback);
  }
}
