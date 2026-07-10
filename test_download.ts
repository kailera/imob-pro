import fs from "fs";
import path from "path";
import https from "https";

// Test image from the first property (SC-00050), photo 2 (index 1), which is the first real photo of the property.
const fotoBase64 = "eyJhcnF1aXZvSWQiOiJJQUMtSU1PQi0zNUFDOTlGMi9EVkktSU0tQUI4N0UwQTNBQ0JGNDVENDk5RUUxODVFQjA4NEJBQkYtZm90b3MvOWU1ZDYwNDYtZWM3NmEyNTlmYjczNzIwYjk0OWNlNzNmOGJhNDFkOGIucG5nIiwidXJsIjoiaHR0cHM6Ly9kM3FtYzZtZzc5MGFzNS5jbG91ZGZyb250Lm5ldCJ9";

function getCloudfrontUrl(fotoBase64: string): string {
  const decodedStr = Buffer.from(fotoBase64, "base64").toString("utf-8");
  const decodedJson = JSON.parse(decodedStr);
  const key = decodedJson.arquivoId || decodedJson.key;
  const baseUrl = decodedJson.url || "https://d3qmc6mg790as5.cloudfront.net";
  
  const payload = {
    key: key,
    edits: {
      resize: {
        width: 1024,
        height: 576,
        fit: "cover",
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }
  };
  
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  return `${baseUrl}/${payloadBase64}`;
}

const url = getCloudfrontUrl(fotoBase64);
console.log("Constructed URL:", url);

const destPath = path.join(process.cwd(), "public", "imoveis", "test_photo.png");

const file = fs.createWriteStream(destPath);
https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download: Status Code ${response.statusCode}`);
    file.close();
    fs.unlinkSync(destPath);
    return;
  }
  response.pipe(file);
  file.on("finish", () => {
    file.close();
    console.log(`Download finished! File size: ${fs.statSync(destPath).size} bytes`);
  });
}).on("error", (err) => {
  console.error("Error downloading file:", err);
  file.close();
  fs.unlinkSync(destPath);
});
