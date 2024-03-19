const activeWin = require("active-win");
const fs = require("fs");
const CDP = require("chrome-remote-interface");

const filePath = "processes.json";

const getUrl = async () => {
  try {
    const client = await CDP();

    // Extract necessary domains
    const { Page, Runtime } = client;

    // Enable necessary domains
    await Promise.all([Page.enable(), Runtime.enable()]);

    // Evaluate script to get current URL
    const result = await Runtime.evaluate({
      expression: "window.location.href",
    });

    await client.close();
    return result.result.value;
  } catch (err) {
    console.error("Error:", err);
  }
};

const storeData = async (appData) => {
  try {
    let data = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(data);
    const currentTimestamp = Date.now();

    // Find if the application is already in the data
    const index = jsonData.findIndex(
      (item) => item.processName === appData.processName
    );

    if (index !== -1) {
      // If the application is already in the data, update the time spent
      const elapsedTime =
        currentTimestamp - new Date(jsonData[index].timeStart).getTime();
      const minutesSpent = Math.floor(elapsedTime / (1000 * 60)); // Convert milliseconds to minutes and round down to nearest integer
      jsonData[index].timeSpent += minutesSpent;
    } else {
      // If the application is not in the data, add it with time start and URL (if available)
      appData.timeStart = new Date().toISOString();
      appData.timeSpent = 0; // Initialize as zero
      jsonData.push(appData);
    }

    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
};

async function monitorActiveWindow() {
  try {
    const activeWindow = await activeWin();
    const appData = {};

    const activeAppName = activeWindow.owner.name;
    if (
      activeAppName.includes("Google Chrome") &&
      activeWindow.platform === "windows"
    ) {
      const url = await getUrl();
      appData.url = url;
    }

    appData.activeWindow = activeWindow.title;
    appData.processName = activeWindow.owner.name;
    storeData(appData);
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

// Update data every 5 seconds
setInterval(monitorActiveWindow, 5000);
