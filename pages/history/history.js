const { getHistory, removeCard } = require("../../utils/storage");

Page({
  data: {
    history: []
  },

  onShow() {
    this.setData({ history: getHistory() });
  },

  goCreate() {
    wx.switchTab({ url: "/pages/index/index" });
  },

  deleteCard(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: "删除记录",
      content: "这张探险收获卡删除后不能恢复。",
      confirmText: "删除",
      confirmColor: "#d94848",
      success: (res) => {
        if (res.confirm) {
          this.setData({ history: removeCard(id) });
        }
      }
    });
  }
});
