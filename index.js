import XlsxStreamReader from "xlsx-stream-reader";
import fs from "fs";
import fetch from "node-fetch";

// Function to add delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Main function to process the batch data
function processTransactionIds(filePath) {
  console.log("Starting processing...");

  return new Promise((resolve, reject) => {
    const workBookReader = new XlsxStreamReader();
    const readStream = fs.createReadStream(filePath);

    // Open log file in append mode
    const logFilePath = "./process_logs.log";

    workBookReader.on("worksheet", function (workSheetReader) {
      const batchSize = 25;
      let batch = [];

      workSheetReader.on("row", function (row) {
        const transactionId = row.values[2]; // Assuming "Transaction Id" is in column B
        if (transactionId) {
          batch.push(transactionId);
        }

        // Process the batch when size reaches the limit
        if (batch.length === batchSize) {
          processBatch(batch, logFilePath); // Process batch
          batch = []; // Reset batch
        }
      });

      workSheetReader.on("end", function () {
        // Process remaining rows in the batch
        if (batch.length > 0) {
          processBatch(batch, logFilePath); // Process the last batch
        }
        console.log(`Finished processing sheet: ${workSheetReader.name}`);
      });

      // Start processing rows
      workSheetReader.process();
    });

    workBookReader.on("end", function () {
      console.log("Finished processing all sheets.");
      resolve(); // Signal that processing is complete
    });

    workBookReader.on("error", function (err) {
      console.error("Error occurred while processing:", err);
      reject(err); // Signal an error
    });

    readStream.pipe(workBookReader);
  });
}

// Function to process each batch and handle success/error logs
async function processBatch(transactionIdBatch, logFilePath) {
  try {
    await delay(200); // Delay
    const batchLog = `API CALL: Processed batch of Transaction Ids: ${JSON.stringify(
      transactionIdBatch
    )}\n ${new Date().toISOString()}\n\n`;
    fs.appendFileSync(logFilePath, batchLog, "utf8");
    const response = await fetch(
      "https://testgodrejadminapi.dhwaniris.in/api/admin/v1/generate-unique-id/61deb4706379273105cfcd4d?bulkUploadFormat=true&selectType=name&updateAll=true&updateByOrder=true&orderId=34&publishedFormId=218",
      {
        method: "POST",
        headers: {
          organisation: "62286c8911b4fe05d587713e",
          "x-access-token":
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NmQ2YTdkM2JiMmM5MGE0NTcyN2VmYWEiLCJpZCI6IjY2ZDZhN2QzYmIyYzkwYTQ1NzI3ZWZhYSIsImxvZ2luSWQiOiI2NzM1ZDE5NzUwMzI3ODQxMmY3ZjY5N2IiLCJ1c2VyVHlwZSI6IkFETUlOIiwiY2F0ZWdvcnkiOiJOb25lIiwidXNlck5hbWUiOiJhZG1pbiIsInByb2plY3QiOltdLCJ1c2VyRW1haWwiOiJmYWhhZEBkaHdhbmlyaXMuY29tIiwib3JnYW5pc2F0aW9uIjpbXSwiaWF0IjoxNzMxNTgwMzExNDY3LCJleHAiOjU3NzE4NzgwMzExNDQ5LCJpc1Bhc3N3b3JkQ2hhbmdlQWxsb3dlZCI6dHJ1ZX0.-Ali_DrIgTd-x6ug9Vry18BaefbJUMbb1mh4UY28Zvg",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionId: transactionIdBatch }),
      }
    );

    const data = await response.json();
    console.log("Batch response:", data);

    // Log success information
    const successLog = `SUCCESS: Processed batch of Transaction Ids: ${JSON.stringify(
      transactionIdBatch
    )}\nResponse: ${JSON.stringify(
      data
    )}\nDate: ${new Date().toISOString()}\n\n`;
    fs.appendFileSync(logFilePath, successLog, "utf8");
  } catch (error) {
    console.error("Error for Transaction ID batch:", error);

    // Prepare error log entry
    const errorLog = `ERROR: Failed batch: ${JSON.stringify(
      transactionIdBatch
    )}\nError Message: ${error.message}\nDate: ${new Date().toISOString()}\n\n`;
    fs.appendFileSync(logFilePath, errorLog, "utf8");
  }
}

// Example usage
(async () => {
  try {
    await processTransactionIds("/home/byteforge/Downloads/batch200.xlsx");
    console.log("------------ All processing complete -----------");
    console.log("waiting for response..");
  } catch (error) {
    console.error("Error during processing:", error);
  }
})();
