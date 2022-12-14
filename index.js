const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive.metadata.readonly"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the names and IDs of up to 10 files.
//  * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
// async function listFiles(authClient) {
//   const drive = google.drive({ version: "v3", auth: authClient });
//   const res = await drive.files.list({
//     q: "mimeType='image/jpeg'",
//     fields: "nextPageToken, files(id, name)",
//   });
//   const files = res.data.files;
//   if (files.length === 0) {
//     console.log("No files found.");
//     return;
//   }

//   console.log(files);
// }

app.get("/", async (req, res) => {
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth: auth });
  const response = await drive.files.list({
    q: "mimeType='image/jpeg'",
    fields: "nextPageToken, files(id, name)",
  });
  const files = response.data.files;
  res.send(files);
});
app.get("/look/:file_name", async (req, res) => {
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth: auth });
  const response = await drive.files.list({
    q: `name contains '${req.params.file_name}'`,
    fields: "nextPageToken, files(id, name)",
  });
  const files = response.data.files;

  res.send(files);
});
/**
 * Load or request or authorization to call APIs.
 *
 */

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

authorize();
