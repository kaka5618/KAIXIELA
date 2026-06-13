const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const { recordId } = event;

  if (!recordId) {
    return { status: "error", message: "缺少记录 ID。" };
  }

  const recordRes = await db.collection("records").doc(recordId).get();
  const record = recordRes.data;

  if (!record || record.openid !== wxContext.OPENID) {
    return { status: "error", message: "没有找到这条记录。" };
  }

  await db.collection("records").doc(recordId).update({
    data: {
      deletedAt: new Date()
    }
  });

  return {
    status: "success",
    recordId
  };
};
