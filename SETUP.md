# Audit Portal Backend Setup Guide

Follow these steps carefully to set up the Google Sheet database and the Google Apps Script backend for your application.

## Part 1: Setting up Google Sheets (The Database)

This process involves multiple separate spreadsheet files for a scalable "Hub-and-Spoke" architecture.

1.  **Create the Core "Hub" Spreadsheet:**
    *   Go to [sheets.new](https://sheets.new). Name it something like **"Audit Portal - Core"**.
    *   **Copy the Spreadsheet ID:** The ID is the long string in the URL. For example, in `https://docs.google.com/spreadsheets/d/1qA2b3c4D5e6F7g8H9i0J_kL/edit`, the ID is `1qA2b3c4D5e6F7g8H9i0J_kL`. You will need this for the `core` ID in the backend script.
    *   The setup script will create all core system sheets in this file (`Users`, `Settings`, `SuperMasterRecord`, `AppModules`, etc.).

2.  **Create the "People" Spoke Spreadsheet:**
    *   Go to [sheets.new](https://sheets.new) again. Name it **"Audit Portal - People"**.
    *   **Copy this new Spreadsheet ID.** You will need this for the `people` ID in the backend script.

3.  **Create the "Occupancy" Spoke Spreadsheet (Legacy):**
    *   Go to [sheets.new](https://sheets.new) again. Name it **"Audit Portal - Occupancy"**.
    *   **Copy this new Spreadsheet ID.** You will need this for the `occupancy` ID in the backend script.
    
4.  **Create the "Audit" Spoke Spreadsheet:**
    *   Go to [sheets.new](https://sheets.new) again. Name it **"Audit Portal - Audit"**.
    *   **Copy this new Spreadsheet ID.** You will need this for the `audit` ID in the backend script.

5.  **Create the "Logging" Spoke Spreadsheet:**
    *   Go to [sheets.new](https://sheets.new) again. Name it **"Audit Portal - Logs"**.
    *   **Copy this new Spreadsheet ID.** You will need this for the `logging` ID in the backend script.
    *   Inside this new spreadsheet, rename the default "Sheet1" to **`ApiCallLog`**.
    *   Copy the following headers and paste them into the first row (cell A1) of the `ApiCallLog` sheet:
        ```
        logId,timestamp,userId,module,action,targetId,apiProvider,modelName,promptTokens,inputFileTokens,outputTokens,totalTokens,durationMs,filename,fileType,fileSizeBytes,imageWidth,imageHeight,pdfPageCount,status,errorDetails,aiJson
        ```

## Part 2: Setting up a Telegram Bot

1.  On Telegram, search for the user `@BotFather` (it's the official bot for creating other bots).
2.  Start a chat and send the command `/newbot`.
3.  Follow the prompts: give your bot a name (e.g., "Audit Notifier") and a username (e.g., `AuditPortalBot`).
4.  BotFather will give you a **token** to access the API. It will look something like `1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`.
5.  **Copy this token and save it somewhere secure.** You'll need it in the next step.

## Part 3: Setting up Google Apps Script (The Backend)

1.  Go back to your **Core "Hub" Google Sheet**.
2.  Click on `Extensions` > `Apps Script`. A new browser tab will open with the script editor.
3.  **Create Script Files:**
    *   Delete the default `Code.gs` file.
    *   Create a new script file for each `.gs.txt` file provided in the `Appscript Files` directory. The names must match exactly (e.g., `Code.gs`, `UsersActions.gs`, `PeopleActions.gs`, etc.).
4.  **Populate the Script Files:**
    *   Copy the entire content of each `.gs.txt` file into its corresponding `.gs` file in the editor.
5.  **Configure Spreadsheet IDs:**
    *   Follow the instructions in **Part 3.5** below to securely store your Spreadsheet IDs.

### Part 3.5: Configure Spreadsheet IDs (IMPORTANT)

For the backend to connect to your Google Sheets, you must store the Spreadsheet IDs in the **Script Properties**.

1.  On the left sidebar of the Apps Script editor, click the `Project Settings` icon (a gear ⚙️).
2.  Scroll down to the **Script Properties** section and click `Add script property` for each of the following:
    *   **Property:** `SS_ID_CORE` | **Value:** (ID of your Core Hub Sheet)
    *   **Property:** `SS_ID_PEOPLE` | **Value:** (ID of your People Spoke Sheet)
    *   **Property:** `SS_ID_AUDIT` | **Value:** (ID of your Audit Spoke Sheet)
    *   **Property:** `SS_ID_ACCOUNT_SUBMISSIONS` | **Value:** (ID of your Account Submissions Spoke Sheet)
    *   **Property:** `SS_ID_VOUCHING_STATS` | **Value:** (ID of your Vouching Stats Spoke Sheet)
    *   **Property:** `SS_ID_LOGGING` | **Value:** (ID of your Logs Spoke Sheet)
    *   **Property:** `GOOGLE_API_KEY` | **Value:** (Your Google Gemini API Key)
    *   **Property:** `TELEGRAM_GROUP_ID_LOG` | **Value:** (Your Telegram Group ID, e.g., -100123456789)
3.  Click `Save script properties`.

### Part 3.6: Add Required Libraries (IMPORTANT)

For the image dimension logging feature to work, you must add a required third-party library.

1.  In the Apps Script editor, look at the left-hand sidebar.
2.  Click the `+` icon next to the **"Libraries"** section.
3.  A dialog box "Add a Library" will appear. In the **"Script ID"** field, paste the following ID:
    `1T03nYHRho6XMWYcaumClcWr6ble65mAT8OLJqRFJ5lukPVogAN2NDl-y`
4.  Click the **"Look up"** button.
5.  The library "ImgApp" will appear. Ensure the latest version is selected.
6.  The "Identifier" should be `ImgApp`. Do not change this.
7.  Click the **"Add"** button.

This library is now successfully added to your project.

### Part 3.6: Run the Initial Setup

1.  At the top of the script editor, select the `runInitialSetup` function from the list.
2.  Click the **▶ Run** button.
3.  **Authorize access:** A popup will appear asking for permission. Click `Review permissions`. Choose your Google account. You might see a "Google hasn't verified this app" screen. This is normal. Click `Advanced`, then `Go to [Your Project Name] (unsafe)`. Review the permissions and click `Allow`.
4.  The script will now set up all the necessary sheets and data in all of your spreadsheets.
5.  **Store the Telegram Bot Token Securely:**
    *   On the left sidebar, click the `Project Settings` icon (a gear ⚙️).
    *   Scroll down to the **Script Properties** section and click `Add script property`.
    *   For **Property**, enter `TELEGRAM_BOT_TOKEN`.
    *   For **Value**, paste the Telegram Bot token you got from BotFather.
    *   Click `Save script properties`.

## Part 4: Deploying the Web App

1.  In the Apps Script editor, click the blue **Deploy** button in the top-right corner, then select **New deployment**.
2.  Click the gear icon next to "Select type" and choose **Web app**.
3.  Fill in the deployment information:
    *   **Description:** `Audit Portal API v1`
    *   **Execute as:** `Me`
    *   **Who has access:** `Anyone` (This is crucial. It does NOT mean anyone can see your data; it just means anyone can visit the URL. Our script's code will handle security.)
4.  Click **Deploy**.
5.  **Authorize access:** A popup will appear. Click `Authorize access`. Choose your Google account. You might see a "Google hasn't verified this app" screen. This is normal. Click `Advanced`, then `Go to [Your Project Name] (unsafe)`.
6.  Review the permissions and click `Allow`.
7.  After successful deployment, you will get a **Web app URL**. **Copy this URL.**

## Part 5: Connecting the Frontend

1.  In your frontend project root directory, create a file named `.env`.
2.  Copy the contents of `.env.example` into `.env`.
3.  Replace the placeholder values with your actual deployed Web App URLs:
    *   `VITE_GAS_PROD_URL`: Your Production Web App URL.
    *   `VITE_GAS_STAGING_URL`: Your Staging/Development Web App URL.
4.  Save the file.

## Part 6: Updating the Backend Script (Important!)

Whenever you make changes to any of the `.gs` script files, you **MUST** re-deploy the web app for those changes to take effect on your live URL. Simply saving the script is not enough.

Follow these steps to update your deployment:

1.  In the Apps Script editor, click the **Deploy** button in the top-right corner.
2.  From the dropdown, select **Manage deployments**.
3.  A dialog will appear showing your active deployments. Find the one for your Web app (it should be labeled "Active").
4.  Click the **pencil icon (✏️ Edit)** next to your active deployment.
5.  In the edit dialog, find the **Version** dropdown. It will likely say "Existing". Click on it and select **New version**.
6.  You can add an optional description for your new version (e.g., "Modularized setup scripts").
7.  Click the blue **Deploy** button.

That's it! Your Web app URL remains the same, but it now runs the latest version of your code.

## Part 7: Maintaining Your Application

After the initial setup, you may perform manual data changes in the Google Sheet for testing purposes. This can lead to data inconsistencies (e.g., a permission record for a user who no longer exists).

To help you maintain the health of your data, a new **"Admin Tools"** menu is available directly in the Google Sheet UI.

-   **Location:** Open your Google Sheet and look for the "Admin Tools" menu at the top.
-   **Function:** It contains a "Run Data Cleanup" utility that safely finds and removes inconsistent or stale data from your application.
-   **When to Use:** It is highly recommended to run this utility after you have manually deleted rows from the `Users` sheet, or for general maintenance to keep the database clean.
-   **For a detailed guide on what this tool does, please refer to the `END-USER-GUIDE-ADMIN-TOOLS.md` document.