import XlsxStreamReader from "xlsx-stream-reader";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import os from "os";
import dotenv from 'dotenv';

dotenv.config();

// Clear the log file at the start
fs.writeFileSync("./process_logs.log", "", "utf8");

// Check for required environment variables
if (!process.env.token || !process.env.url || !process.env.organisation) {
  log("Missing Environment Variables", "Token, URL, and Organisation required", "./process_logs.log");
}

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
    const apiUrl = process.env.url;
    const headers = {
      organisation: process.env.organisation,
      "x-access-token": process.env.token,
      "Content-Type": "application/json",
    };
    // change payload as per requirement
    let response = await fetch(apiUrl, {
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
    response = await response?.json();
    log(
      "success",
      `Processed batch of Transaction Ids: ${JSON.stringify(
        transactionIdBatch
      )}. Response: ${JSON.stringify(response ? response.message : "No response or timed out")}`,
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
      // console.log("transactionId", transactionId);
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
    // Construct the file path dynamically
    const downloadsPath = path.join(os.homedir(), "Downloads", "batch.xlsx");
    await processTransactionIds(downloadsPath, 30, "./process_logs.log");
  } catch (error) {
    console.error("Error during processing:", error);
  }
})();
