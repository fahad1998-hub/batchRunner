import XlsxStreamReader from "xlsx-stream-reader";
import fs from "fs";
import fetch from "node-fetch";

// Function to add delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Logging function with levels
function log(level, message, logFilePath) {
  const logEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  fs.appendFileSync(logFilePath, `${JSON.stringify(logEntry)}\n`, "utf8");
}

// Function to process a single batch
async function processBatch(transactionIdBatch, logFilePath) {
  try {
    const apiUrl =
      "https://portaladminapi.mgrant.in/api/admin/v1/repair-imported-question?historyOff=nul";
    const headers = {
      organisation: "62286c8911b4fe05d587713e",
      "x-access-token":
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjA0MjA0ZGQ5ZDUwNmYyNjM2ZDRhNDYiLCJpZCI6IjY2MDQyMDRkZDlkNTA2ZjI2MzZkNGE0NiIsImxvZ2luSWQiOiI2NzM4NmI2ZGUyMjY1Y2Q5MDEyZmQwNDQiLCJ1c2VyVHlwZSI6ImFkbWluIiwiY2F0ZWdvcnkiOiJOb25lIiwidXNlck5hbWUiOiJBZG1pbnxTREUiLCJwcm9qZWN0IjpudWxsLCJ1c2VyRW1haWwiOiJmYWhhZEBkaHdhbmlyaXMuY29tIiwib3JnYW5pc2F0aW9uIjpbXSwiaWF0IjoxNzMxNzUwNzY1MDk5LCJleHAiOjU3NzE4OTUwNzY1MDg2LCJpc1Bhc3N3b3JkQ2hhbmdlQWxsb3dlZCI6dHJ1ZX0.x1F-B8dY7NlCZa3RVPvtEeCatJVT0XoYbdaiCv8yvNc",
      "Content-Type": "application/json",
    };
    // change payload as per requirement
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        parentFormId: 218,
        query: {
          transactionId: transactionIdBatch,
        },
      }),
    });
    //

    log(
      "success",
      `Processed batch of Transaction Ids: ${JSON.stringify(
        transactionIdBatch
      )}. Response: ${JSON.stringify(response)}`,
      logFilePath
    );
    console.log("Batch response OK");
  } catch (error) {
    console.error("Error for Transaction ID batch:", transactionIdBatch, error);
    log(
      "error",
      `Failed batch of Transaction Ids: ${JSON.stringify(
        transactionIdBatch
      )}. Error: ${error.message}`,
      logFilePath
    );
  }
}

// Main function to process all transaction IDs
async function processTransactionIds(
  filePath,
  batchSize = 25,
  logFilePath = "./process_logs.log"
) {
  console.log("Starting processing...");
  const workBookReader = new XlsxStreamReader();
  const readStream = fs.createReadStream(filePath);

  let allBatches = [];
  let currentBatch = [];

  workBookReader.on("worksheet", (workSheetReader) => {
    console.log(`🚀 ~ Processing sheet: ${workSheetReader.name}`);

    workSheetReader.on("row", (row) => {
      const transactionId = row.values[2]; // Assuming "Transaction Id" is in column B [TransactionId => payload data]
      if (transactionId) {
        currentBatch.push(transactionId);
      }

      if (currentBatch.length === batchSize) {
        allBatches.push(currentBatch); // Store the completed batch
        currentBatch = []; // Reset batch
      }
    });

    workSheetReader.on("end", () => {
      if (currentBatch.length > 0) {
        allBatches.push(currentBatch); // Process the remaining rows in the batch
      }
      console.log(`Finished processing sheet: ${workSheetReader.name}`);
    });

    workSheetReader.process();
  });

  workBookReader.on("end", async () => {
    console.log("Finished reading all sheets. Starting batch processing...");
    await processAllBatches(allBatches, logFilePath, 25, 500); // Process batches in sets
    console.log(" ------ All processing complete -----");
  });

  workBookReader.on("error", (err) => {
    console.error("Error occurred while processing:", err);
    log("error", `Workbook processing error: ${err.message}`, logFilePath);
  });

  readStream.pipe(workBookReader);
}

// Function to process all batches in sets of 25
async function processAllBatches(
  batches,
  logFilePath,
  setBatchLimit = 25,
  setDelayMs = 1000
) {
  for (let i = 0; i < batches.length; i += setBatchLimit) {
    const set = batches.slice(i, i + setBatchLimit);

    console.log(
      `Processing batch set ${Math.floor(i / setBatchLimit) + 1} of ${Math.ceil(
        batches.length / setBatchLimit
      )}...`
    );
    await Promise.all(
      set.map(async (batch) => {
        await processBatch(batch, logFilePath);
        await delay(100); // Wait 100ms between batch calls
      })
    );

    console.log(
      `Completed batch set ${
        Math.floor(i / setBatchLimit) + 1
      }. Waiting for ${setDelayMs}ms before continuing...`
    );
    await delay(setDelayMs); // Wait after each set of 25 batches
  }
}

(async () => {
  try {
    // Add file path from your local system
    await processTransactionIds(
      "/home/byteforge/Downloads/batch200.xlsx",
      30,
      "./process_logs.log"
    );
  } catch (error) {
    console.error("Error during processing:", error);
  }
})();
