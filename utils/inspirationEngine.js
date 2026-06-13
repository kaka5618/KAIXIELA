const ESSAY_TYPES = {
  person: {
    id: "person",
    name: "写人",
    routeName: "人物宝藏线",
    icon: "👩‍🚀",
    color: "#23b47e",
    keywords: ["妈妈", "爸爸", "老师", "同学", "朋友", "爷爷", "奶奶", "哥哥", "姐姐", "弟弟", "妹妹", "我最敬佩", "一个人"],
    gems: ["外貌印象", "口头禅", "小动作", "具体事件", "我的感受"],
    prompts: [
      "这个人最常说的一句话是什么？你能模仿一下吗？",
      "你想到这个人时，脑海里第一个画面是什么？",
      "他/她做一件事时有什么特别的小动作？",
      "有没有一件小事，让你觉得他/她很不一样？",
      "如果用一个词形容他/她，你会选什么？为什么？"
    ],
    outline: ["先写你对这个人的第一印象", "再写一件最能表现特点的小事", "最后写你从这件事里的感受"]
  },
  event: {
    id: "event",
    name: "记事",
    routeName: "故事线索线",
    icon: "🧭",
    color: "#2d8cff",
    keywords: ["难忘", "一件事", "第一次", "经历", "比赛", "活动", "旅行", "生日", "开心", "后悔", "成长"],
    gems: ["起因", "经过", "转折", "细节", "收获"],
    prompts: [
      "这件事发生在什么时候、什么地方？",
      "一开始为什么会发生这件事？",
      "过程中最紧张、最开心或最意外的一刻是什么？",
      "当时谁说了什么话？你记得哪一句？",
      "这件事结束后，你心里有什么变化？"
    ],
    outline: ["先交代时间、地点和起因", "再写事情经过，把最重要的一刻写具体", "最后写自己的变化或收获"]
  },
  object: {
    id: "object",
    name: "状物",
    routeName: "观察宝物线",
    icon: "💎",
    color: "#f3a51f",
    keywords: ["书包", "文具", "玩具", "小狗", "小猫", "植物", "树", "花", "铅笔", "礼物", "我的小"],
    gems: ["样子", "特点", "用途", "故事", "情感"],
    prompts: [
      "这个东西最特别的地方是什么？颜色、形状或声音都可以。",
      "你第一次见到它是什么时候？",
      "它平时会帮你做什么，或者陪你做什么？",
      "你和它之间有没有一个小故事？",
      "如果它会说话，你觉得它会对你说什么？"
    ],
    outline: ["先写它最吸引你的样子", "再写它的特点和与你有关的小故事", "最后写你为什么喜欢或珍惜它"]
  },
  imagination: {
    id: "imagination",
    name: "想象",
    routeName: "奇想星球线",
    icon: "🚀",
    color: "#7c6df2",
    keywords: ["未来", "假如", "如果", "奇妙", "梦", "星球", "机器人", "魔法", "童话", "变成", "穿越"],
    gems: ["角色", "世界", "问题", "冒险", "结局"],
    prompts: [
      "这个想象故事里，主角是谁？他/她有什么特别能力？",
      "故事发生在一个怎样的地方？那里和现实有什么不同？",
      "主角遇到了什么麻烦或任务？",
      "冒险中最奇妙的一幕是什么？",
      "故事最后，主角学会了什么或改变了什么？"
    ],
    outline: ["先介绍神奇的角色和世界", "再写主角遇到的问题和冒险过程", "最后写结局和主角的变化"]
  }
};

const TYPE_ORDER = ["person", "event", "object", "imagination"];

function normalizeText(text) {
  return String(text || "").trim();
}

function detectEssayType(title, requirement) {
  const source = `${normalizeText(title)} ${normalizeText(requirement)}`;
  const scores = TYPE_ORDER.map((id) => {
    const type = ESSAY_TYPES[id];
    const score = type.keywords.reduce((sum, word) => sum + (source.includes(word) ? 1 : 0), 0);
    return { id, score };
  });
  scores.sort((a, b) => b.score - a.score);
  if (scores[0].score > 0) return ESSAY_TYPES[scores[0].id];
  return ESSAY_TYPES.event;
}

function getTypeById(typeId) {
  return ESSAY_TYPES[typeId] || ESSAY_TYPES.event;
}

function createAdventure({ title, grade, requirement }) {
  const type = detectEssayType(title, requirement);
  return {
    id: `adv_${Date.now()}`,
    title: normalizeText(title) || "我的作文题目",
    grade: grade || "三年级",
    requirement: normalizeText(requirement),
    typeId: type.id,
    typeName: type.name,
    routeName: type.routeName,
    prompts: type.prompts,
    currentStep: 0,
    answers: [],
    gems: [],
    createdAt: new Date().toISOString()
  };
}

function buildFollowUp(answer, typeId, stepIndex) {
  const text = normalizeText(answer);
  const type = getTypeById(typeId);
  if (!text || text.length < 4 || ["不知道", "没有", "忘了", "不会"].includes(text)) {
    return "没关系，我们换个小角度想一想：你能说一个画面、一个动作，或者一句话吗？";
  }
  if (stepIndex < type.prompts.length - 1) {
    return `很好，你已经找到“${type.gems[stepIndex]}”宝石了。下一关继续挖细节。`;
  }
  return "素材宝石收集完成！我来帮你整理成探险收获卡。";
}

function addAnswer(adventure, answer) {
  const stepIndex = adventure.currentStep;
  const type = getTypeById(adventure.typeId);
  const text = normalizeText(answer);
  const nextAnswers = adventure.answers.concat({
    gem: type.gems[stepIndex],
    question: type.prompts[stepIndex],
    answer: text || "还没有想到",
    createdAt: new Date().toISOString()
  });
  const nextStep = Math.min(stepIndex + 1, type.prompts.length);
  return {
    ...adventure,
    answers: nextAnswers,
    gems: type.gems.slice(0, nextStep),
    currentStep: nextStep,
    lastFeedback: buildFollowUp(text, adventure.typeId, stepIndex)
  };
}

function isAdventureComplete(adventure) {
  const type = getTypeById(adventure.typeId);
  return adventure.currentStep >= type.prompts.length;
}

function makeShortHints(adventure) {
  const answers = adventure.answers.map((item) => item.answer).filter(Boolean);
  const first = answers[0] || "这个画面";
  const second = answers[1] || "那个细节";
  const third = answers[answers.length - 1] || "我的心情";
  return [
    `我一想到${first}，眼前就像出现了一幅画。`,
    `${second}这个细节，让这件事变得更真实。`,
    `那一刻，我心里最明显的感觉是：${third}。`
  ];
}

function generateHarvestCard(adventure) {
  const type = getTypeById(adventure.typeId);
  const materials = adventure.answers.map((item, index) => ({
    id: `${adventure.id}_${index}`,
    title: item.gem,
    question: item.question,
    content: item.answer,
    badge: `宝石 ${index + 1}`
  }));
  return {
    id: adventure.id,
    title: adventure.title,
    grade: adventure.grade,
    typeId: adventure.typeId,
    typeName: type.name,
    routeName: type.routeName,
    createdAt: adventure.createdAt,
    materials,
    outline: type.outline,
    hints: makeShortHints(adventure),
    nextStep: "先从你最有画面感的一张素材卡开始写，再把其他卡片接进去。"
  };
}

module.exports = {
  ESSAY_TYPES,
  TYPE_ORDER,
  addAnswer,
  createAdventure,
  detectEssayType,
  generateHarvestCard,
  getTypeById,
  isAdventureComplete
};
