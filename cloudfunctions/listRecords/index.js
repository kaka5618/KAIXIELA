const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;

  const res = await db.collection("records")
    .where({
      openid: wxContext.OPENID,
      deletedAt: _.eq(null)
    })
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return {
    status: "success",
    records: res.data
  };
};
