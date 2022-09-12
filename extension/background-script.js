chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.create({ url: "/main/main.html" });
});
