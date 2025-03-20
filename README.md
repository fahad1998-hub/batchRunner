# batchRunner
# Batch Processing Application

## Description
A Node.js application for processing batches of transactions with support for Excel file handling and API interactions.

## Features
- Excel file processing using xlsx and xlsx-stream-reader
- API integration with node-fetch
- Environment variable support via dotenv
- Batch transaction processing with logging

## Installation
1. Clone the repository
2. Install dependencies:

## Usage

1. Create a `.env` file in the root directory with the following variables:
   ```
   token=your_access_token
   url=your_api_endpoint
   organisation=your_organisation_id
   ```

2. Place your Excel file named `batch.xlsx` in your Downloads folder. The file should contain transaction IDs in column B.

3. Run the application:
   ```bash
   npm start
   ```

4. Monitor the process:
   - Console output shows real-time processing status
   - Check `process_logs.log` for detailed execution logs

### Configuration Options

You can modify these parameters in `index.js`:
- `batchSize`: Number of transactions per batch (default: 30)
- `setBatchLimit`: Number of batches processed in parallel (default: 25)
- `setDelayMs`: Delay between batch sets in milliseconds (default: 500)


