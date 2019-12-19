const express = require("express");
const app = express();
const port = 3100;
//zoho crm
const ZCRMRestClient = require("zcrmsdk");
const mysql_util = require("zcrmsdk/lib/js/mysql/mysql_util");
const initialzie = require("./zoho/Initialize");
const fs = require("fs");

app.get("/", (req, res) => res.send("Hello World!"));

app.get("/getAttachments", function(req, res) {
  try {
    //obtain params from url
    let base_url = req.protocol + "://" + req.headers.host;
    // let request_url = req.url;
    let request_url = req.originalUrl;

    const current_url = new URL(request_url, base_url);
    const search_params = current_url.searchParams;

    let url_input = {};
    url_input.caseInfoID = search_params.get("caseInfoID");
    url_input.caseMamgID = search_params.get("caseMamgID");
    console.log("url_input");
    console.log(url_input);
    ZCRMRestClient.initialize().then(function() {
      mysql_util.getOAuthTokens().then(function(result) {
        if (result == null || result.length === 0) {
          //This token needs to be updated for initialization
          let token =
            "1000.8b10455febcd56e8884f7d92799ec540.fd95d5251a143391c26791afc38c3aa2";
          initialzie.getTokenOnetime(token);
        } else {
          getRelatedRecords(url_input, res);
          //uploadFile(url_input.caseMamgID);
          res.send("success");
        }
      });
    });
  } catch {
    throw new Error("exception!\n" + e);
  }
});

function getRelatedRecords(url_input, res) {
  let input = {};
  input.module = "Cases_Info";
  input.id = url_input.caseInfoID + "/Attachments";
  //"3890818000011802561/Attachments";
  let ids = [];
  ZCRMRestClient.API.MODULES.get(input).then(resp => {
    let data = JSON.parse(resp.body).data;
    for (let i = 0; i < data.length; i++) {
      ids.push(data[i].id);
    }
    downloadFile(url_input, ids);
  });
}

function downloadFile(url_input, attachIDs) {
  console.log("download + caseInfoID");
  console.log(url_input.caseInfoID);

  console.log(attachIDs);

  for (let i = 0; i < attachIDs.length; i++) {
    console.log("download + attachIDs[i]");
    console.log(attachIDs[i]);
    let input = {};
    input.id = url_input.caseInfoID;
    input.module = "Cases_Info";
    input.relatedId = attachIDs[i];
    input.download_file = true;

    ZCRMRestClient.API.ATTACHMENTS.downloadFile(input).then(resp => {
      let content = resp.body;
      let filename = "downloadFile/" + resp.filename;
      //let filename = resp.filename;

      fs.writeFile(filename, content, "binary", function(error) {
        if (error) {
          console.log(error);
        }
        console.log("download + filename");
        console.log(filename);
        uploadFile(url_input.caseMamgID);
      });
    });
  }
}
// caseMamgID = "3890818000014869012"
function uploadFile(caseMamgID) {
  console.log("uolpadID :");
  console.log(caseMamgID);
  let input = {};
  input.module = "Deals";
  input.id = caseMamgID;
  let dirname = "downloadFile/";
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      throw new Error("read directory Error: " + err);
    }
    filenames.forEach(function(filename) {
      let filepath = dirname + filename;
      fs.readFile(filepath, "utf-8", function(err, content) {
        if (err) {
          throw new Error("uploadFile Error: " + err);
        }
        let readStream = fs.createReadStream(filepath);
        input.x_file_content = readStream;

        const uploadFile = ZCRMRestClient.API.ATTACHMENTS.uploadFile(input);
        console.log(uploadFile);
        //delete the update file
        fs.unlink(filepath, err => {
          if (err) throw err;
        });
      });
    });
  });
}

app.get("/getLeads", function(req, res) {
  ZCRMRestClient.initialize().then(function() {
    let input = {};
    input.module = "Cases_Info";
    input.id = "3890818000011802561";

    ZCRMRestClient.API.MODULES.get(input).then(function(response) {
      let data = JSON.parse(response.body).data[0];
      console.log(data);
      //let result = wrap.wrapresult(input.module, data);
      res.set("Content-Type", "text/html");
      res.send(data);
    });
    // const response = await ZCRMRestClient.API.MODULES.get(input);
    // let data = JSON.parse(response.body).data;
    // let result = wrap.wrapresult(input.module, data);
    // res.set("Content-Type", "text/html");
    // res.send(result);
  });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
