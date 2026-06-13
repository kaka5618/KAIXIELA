function callCloudFunction(name, data = {}) {
  if (!wx.cloud) {
    return Promise.reject(new Error("当前基础库不支持云开发，请升级微信版本或基础库。"));
  }

  return wx.cloud.callFunction({
    name,
    data
  }).then((res) => res.result);
}

function startAdventure(payload) {
  return callCloudFunction("startAdventure", payload);
}

function nextQuestion(payload) {
  return callCloudFunction("nextQuestion", payload);
}

function generateHarvestCard(payload) {
  return callCloudFunction("generateHarvestCard", payload);
}

function saveRecord(payload) {
  return callCloudFunction("saveRecord", payload);
}

function deleteRecord(payload) {
  return callCloudFunction("deleteRecord", payload);
}

function listRecords(payload) {
  return callCloudFunction("listRecords", payload);
}

module.exports = {
  callCloudFunction,
  deleteRecord,
  generateHarvestCard,
  listRecords,
  nextQuestion,
  saveRecord,
  startAdventure
};
