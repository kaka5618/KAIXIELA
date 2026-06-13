const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const now = new Date();
  const record = {
    openid: wxContext.OPENID,
    title: event.title || "我的作文题目",
    grade: event.grade || 4,
    type: event.type || "记事",
    typeId: event.typeId || "event",
    gems: Array.isArray(event.gems) ? event.gems : [],
    outline: event.outline || {},
    phrases: Array.isArray(event.phrases) ? event.phrases : [],
    nextStep: event.nextStep || "先从最有画面感的一颗素材宝石开始写。",
    badge: event.badge || "灵感探险家",
    createdAt: now,
    deletedAt: null
  };

  const res = await db.collection("records").add({
    data: record
  });

  return {
    status: "success",
    recordId: res._id,
    ...record
  };
};
