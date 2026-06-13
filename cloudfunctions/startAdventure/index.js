const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const ESSAY_TYPES = {
  person: {
    id: "person",
    name: "写人",
    keywords: ["妈妈", "爸爸", "老师", "同学", "朋友", "爷爷", "奶奶", "哥哥", "姐姐", "弟弟", "妹妹", "一个人"],
    steps: [
      ["person_impression", "人物印象", "这个人给你的第一感觉是什么？", "可以想一想他/她平时说话、做事、照顾你的样子。", "人物宝石"],
      ["person_language", "语言细节", "他/她最常说的一句话是什么？", "可以模仿一下这句话是在什么时候说的。", "语言宝石"],
      ["person_action", "动作细节", "他/她做事时有什么特别的小动作？", "比如做饭、走路、讲题、收拾东西时的小动作。", "动作宝石"],
      ["person_event", "具体事件", "有没有一件小事能说明他/她的特点？", "不用很大，一件你记得清楚的小事就可以。", "事件宝石"],
      ["person_feeling", "我的感受", "想到这件事，你心里有什么感觉？", "可以说感谢、开心、心疼、佩服，或者别的真实感受。", "感受宝石"]
    ]
  },
  event: {
    id: "event",
    name: "记事",
    keywords: ["难忘", "一件事", "第一次", "经历", "比赛", "活动", "旅行", "生日", "开心", "后悔", "成长"],
    steps: [
      ["event_start", "事件起点", "这件事发生在什么时候、什么地方？", "先说一个大概时间和地点就可以。", "起点宝石"],
      ["event_reason", "事情起因", "一开始为什么会发生这件事？", "是谁先做了什么，或者发生了什么情况？", "起因宝石"],
      ["event_turn", "关键时刻", "过程中最难忘的一刻是什么？", "可以是紧张、开心、意外或有点害怕的一刻。", "画面宝石"],
      ["event_detail", "细节声音", "当时谁说了什么话？你记得哪一句？", "一句话、一个动作、一个表情都可以。", "细节宝石"],
      ["event_gain", "收获变化", "这件事结束后，你有什么变化或收获？", "可以说你明白了什么，或者下次会怎么做。", "收获宝石"]
    ]
  },
  object: {
    id: "object",
    name: "状物",
    keywords: ["书包", "文具", "玩具", "小狗", "小猫", "植物", "树", "花", "铅笔", "礼物", "我的小"],
    steps: [
      ["object_look", "外形观察", "它最特别的地方是什么？", "颜色、形状、大小、声音都可以说。", "外形宝石"],
      ["object_first", "第一次见", "你第一次见到它是什么时候？", "可以回忆是谁送的、在哪里看到的。", "来历宝石"],
      ["object_use", "特点用途", "它平时会帮你做什么，或者陪你做什么？", "说一个和你有关的用处。", "用途宝石"],
      ["object_story", "相关故事", "你和它之间有没有一个小故事？", "比如一次陪伴、一次损坏、一次特别经历。", "故事宝石"],
      ["object_feeling", "情感连接", "为什么它对你来说比较重要？", "可以说喜欢、珍惜、舍不得，或者它让你想到谁。", "情感宝石"]
    ]
  },
  imagination: {
    id: "imagination",
    name: "想象",
    keywords: ["未来", "假如", "如果", "奇妙", "梦", "星球", "机器人", "魔法", "童话", "变成", "穿越"],
    steps: [
      ["imagination_role", "主角设定", "这个想象故事里的主角是谁？", "可以是你、动物、机器人，也可以是一个神奇角色。", "角色宝石"],
      ["imagination_world", "世界设定", "故事发生在一个怎样的地方？", "那里和现实世界有什么不一样？", "世界宝石"],
      ["imagination_problem", "问题出现", "主角遇到了什么麻烦或任务？", "这个问题越清楚，故事越好写。", "问题宝石"],
      ["imagination_adventure", "冒险经过", "冒险中最奇妙的一幕是什么？", "可以想一个最有画面感的场景。", "冒险宝石"],
      ["imagination_end", "结局意义", "最后问题解决了吗？主角有什么变化？", "可以说学会了什么，或者明白了什么。", "结局宝石"]
    ]
  }
};

function detectType(title, requirement) {
  const source = `${title || ""} ${requirement || ""}`;
  const values = Object.values(ESSAY_TYPES);
  const matched = values
    .map((type) => ({
      type,
      score: type.keywords.reduce((sum, word) => sum + (source.includes(word) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score)[0];
  return matched && matched.score > 0 ? matched.type : ESSAY_TYPES.event;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const title = String(event.title || "").trim() || "我的作文题目";
  const grade = Number(event.grade) || 4;
  const requirement = String(event.requirement || "").trim();
  const type = detectType(title, requirement);
  const now = new Date();
  const first = type.steps[0];

  const created = await db.collection("adventures").add({
    data: {
      openid: wxContext.OPENID,
      title,
      grade,
      requirement,
      typeId: type.id,
      type: type.name,
      currentStep: 0,
      status: "active",
      answers: [],
      createdAt: now,
      updatedAt: now
    }
  });

  return {
    adventureId: created._id,
    type: type.name,
    typeId: type.id,
    stepId: first[0],
    stepName: first[1],
    question: first[2],
    hint: first[3],
    gemName: first[4],
    progress: {
      current: 1,
      total: type.steps.length
    }
  };
};
