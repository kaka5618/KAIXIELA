const CLOUD_ENV_ID = "kaixiela-d6gj7ytn9c262e774";

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      });
    } else {
      console.warn("当前基础库不支持 wx.cloud，请升级微信版本或基础库。");
    }
  },

  globalData: {
    appName: "开写啦",
    historyKey: "inspiration_adventures",
    cloudEnvId: CLOUD_ENV_ID,
    userInfo: null
  }
});
