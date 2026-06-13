const HISTORY_KEY = "inspiration_adventures";

function getHistory() {
  return wx.getStorageSync(HISTORY_KEY) || [];
}

function saveCard(card) {
  const history = getHistory();
  const next = [card].concat(history.filter((item) => item.id !== card.id));
  wx.setStorageSync(HISTORY_KEY, next);
  return next;
}

function removeCard(id) {
  const next = getHistory().filter((item) => item.id !== id);
  wx.setStorageSync(HISTORY_KEY, next);
  return next;
}

module.exports = {
  HISTORY_KEY,
  getHistory,
  removeCard,
  saveCard
};
