/**
 * ESO Patch Notes Curator - accesses The Elder Scrolls Online Website and gets the patch notes.
 * Last Updated: June 2015 by Jason Carter
 */

var casper = require('casper').create();
var age_gate_url = 'http://www.elderscrollsonline.com/en-us/agegate';
var eso_main_url = 'http://www.elderscrollsonline.com/en-us/home';
var patch_notes_url = 'http://www.elderscrollsonline.com/en-us/news/category/patch-notes';
var node_js_collector = "http://localhost:3030/save";
var patch_note_links = [];
var patch_note_info = {};
var current_link = 0;
var max_links = 20;

/**
 *  saveInfo - POSTS the data to our node js application that is stored in patch_note_info.
 */
function saveInfo(){
  this.start();
  this.then(function(){
    this.thenOpen(node_js_collector,{
      method: "POST",
      data: JSON.stringify(patch_note_info),
      headers: {
        "Content-Type":"application/json"
      }
    },function(response){
      this.echo("POSTED: ");
      this.echo(JSON.stringify(response));
      this.exit();
    });
  });
  this.run();
}

/**
 *  getPatchNoteLinks - Pulls in the news-anchor a tags and gets the HREF and stores it in a list
 *  @returns {String[]} links - array of the patch note links we want
 */
function getPatchNoteLinks(){
  var links = [];
  var elements = document.getElementsByClassName("news-anchor");
  for (var i = 0; i < elements.length; i++){
    links.push(elements[i].getAttribute("href"));
  }
  return links;
}

/**
 * cureateLink - Curates a single link, opening the link and evaluating the site.  Stores the information in patch_note_info.
 */
function curateLink(link){
  this.start(link, function(){
    var title = this.evaluate(function(){
      return document.querySelector('.post-title h2').innerHTML;
    });
    var article = this.evaluate(function(){
      return document.getElementsByTagName('article')[0].innerHTML;
    });
    patch_note_info[link] = {
      title: title,
      article: article,
      type: 'ESO Patch Notes'
    };
  });
}

/**
 * getNotes - Get our Patch Notes for each link and pass that link into curateLink.  Then run the next link or save the info if we are done.
 */
function getNotes(){
  if(patch_note_links[current_link] && current_link < max_links){
    this.echo('Getting Information for Link: '+patch_note_links[current_link]);
    curateLink.call(this,patch_note_links[current_link]);
    current_link++;
    this.run(getNotes);
  }else{
    this.run(saveInfo);
  }
}

/**
 * Start - This is where we start our Casper Program.  We start with the ESO Age gate, because we MAY or MAY NOT need to pass it, 
 *         so intead of testing, we'll just submit to the age gate to validate this session before we start.
 */
casper.start(age_gate_url);

/**
 * Wait for a selector to show before posting.  We want to make sure the page is loaded properly.  Then we post a valid age to the form.
 */
casper.waitForSelector('#year',function(){
  this.fillSelectors('form[action="'+age_gate_url+'"]', {'select#year': '1980', 'select#month': '11', 'select#day': '11'}, true);
});

/**
 * Then we're going to open our Patch Notes URL which has the list of the latest patch notes.  I did have to add a 1 second wait before 
 * accessing the next page to let the POST load properly.  Sometimes Casper was too fast.
 */
casper.thenOpen(patch_notes_url, function(){
  this.echo('Accessed Page');
  this.capture('img/patch_notes.png', {
    top: 0,
    left: 0,
    width: 1600,
    height: 900
  });
  patch_note_links = this.evaluate(getPatchNoteLinks);
});

/**
 * Now Start up our casper program!  This will call our Casper.start function at the top and run down the list, and at the end we'll start our getNotes loop which
 * will curate each of our patch notes links.
 */
casper.run(getNotes);
