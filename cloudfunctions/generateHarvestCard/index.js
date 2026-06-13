const cloud = require("wx-server-sdk");

const DEFAULT_AI_BASE_URL = "https://kaixiela-d6gj7ytn9c262e774.api.tcloudbasegateway.com/v1/ai/cloudbase";
const DEFAULT_AI_MODEL = "hunyuan-exp";

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const OUTLINES = {
  person: {
    start: "先写你对这个人的第一印象。",
    middle: "重点写一件最能表现他/她特点的小事。",
    end: "最后写你从这件事里的真实感受。"
  },
  event: {
    start: "先交代事情发生的时间、地点和起因。",
    middle: "把最难忘的一刻写具体，加入人物语言和动作。",
    end: "最后写这件事带给你的变化或收获。"
  },
  object: {
    start: "先写它最吸引你的样子或特点。",
    middle: "再写它和你之间发生过的小故事。",
    end: "最后写你为什么喜欢或珍惜它。"
  },
  imagination: {
    start: "先介绍神奇的角色和故事世界。",
    middle: "再写主角遇到的问题和冒险过程。",
    end: "最后写结局，以及主角学会了什么。"
  }
};

function buildPhrases(answers) {
  const first = answers[0] && answers[0].answer ? answers[0].answer : "这个画面";
  const second = answers[1] && answers[1].answer ? answers[1].answer : "这个细节";
  const last = answers[answers.length - 1] && answers[answers.length - 1].answer ? answers[answers.length - 1].answer : "我的感受";

  return [
    `一想到${first}，我眼前就像出现了一幅画。`,
    `${second}这个细节，让内容变得更真实。`,
    `那一刻，我心里最明显的感觉是：${last}。`
  ];
}

function isAiConfigured() {
  return Boolean(process.env.AI_API_KEY || process.env.TCB_API_KEY);
}

function getAiConfig() {
  return {
    apiKey: process.env.AI_API_KEY || process.env.TCB_API_KEY,
    baseUrl: (process.env.AI_BASE_URL || process.env.TCB_AI_BASE_URL || DEFAULT_AI_BASE_URL).replace(/\/$/, ""),
    model: process.env.AI_MODEL || process.env.TCB_AI_MODEL || DEFAULT_AI_MODEL,
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 15000
  };
}

function postJson(url, headers, body, timeoutMs) {
  const https = require("https");
  const parsed = new URL(url);
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = https.request({
      method: "POST",
      hostname: parsed.hostname,
      path: `${parsed.pathname}${parsed.search}`,
      port: parsed.port || 443,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...headers
      },
      timeout: timeoutMs
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`AI API ${res.statusCode}: ${text.slice(0, 300)}`));
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (error) {
          reject(new Error("AI API 返回不是 JSON"));
        }
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("AI API 请求超时"));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function extractJson(content) {
  const text = String(content || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      return null;
    }
  }
}

function hasForbiddenWriting(text) {
  const value = String(text || "");
  const forbidden = ["范文如下", "作文如下", "第一段", "第二段", "第三段", "总之，", "开头：我有", "结尾：", "下面是一篇"];
  return forbidden.some((keyword) => value.includes(keyword)) || value.length > 120;
}

function normalizeAiCard(result, fallback) {
  if (!result || result.mode !== "result") return null;

  const gems = Array.isArray(result.gems) ? result.gems.slice(0, 6).map((item, index) => ({
    name: String(item && item.name ? item.name : `素材宝石 ${index + 1}`).slice(0, 20),
    content: String(item && item.content ? item.content : "").slice(0, 90)
  })).filter((item) => item.content && !hasForbiddenWriting(item.content)) : [];

  const outline = result.outline || {};
  const phrases = Array.isArray(result.phrases) ? result.phrases
    .map((item) => String(item || "").trim())
    .filter((item) => item && item.length <= 45 && !hasForbiddenWriting(item))
    .slice(0, 4) : [];

  const nextStep = String(result.nextStep || fallback.nextStep).trim();
  const badge = String(result.badge || fallback.badge).trim();

  if (gems.length === 0 || phrases.length === 0) return null;
  if (!outline.start || !outline.middle || !outline.end) return null;
  if ([outline.start, outline.middle, outline.end, nextStep].some(hasForbiddenWriting)) return null;

  return {
    gems,
    outline: {
      start: String(outline.start).slice(0, 60),
      middle: String(outline.middle).slice(0, 70),
      end: String(outline.end).slice(0, 60)
    },
    phrases,
    nextStep: nextStep.slice(0, 80),
    badge: badge.slice(0, 12)
  };
}

async function callAiForHarvestCard(adventure, fallbackCard) {
  if (!isAiConfigured()) return null;

  const aiConfig = getAiConfig();
  const answers = (adventure.answers || []).map((item) => ({
    stepName: item.stepName,
    question: item.question,
    answer: item.answer,
    gemName: item.gemName
  }));

  const systemPrompt = [
    "你是“开写啦”的小学作文灵感整理助手，不是作文代写工具。",
    "你只能根据孩子已经回答的内容整理素材卡、写作提纲、少量短句和下一步建议。",
    "严格禁止生成完整作文、完整范文、完整开头、完整结尾、完整主体段。",
    "严格禁止编造孩子没有说过的真实经历。",
    "短句必须是零散表达提示，不能串成一篇作文。",
    "输出必须是 JSON，不要输出 JSON 以外的任何文字。"
  ].join("\n");

  const userPrompt = JSON.stringify({
    task: "整理探险收获卡。不要写作文，只整理孩子自己的素材。",
    requiredJson: {
      mode: "result",
      gems: [{ name: "素材宝石名称", content: "基于孩子回答整理出的素材点" }],
      outline: {
        start: "写作方向，不是成文段落",
        middle: "写作方向，不是成文段落",
        end: "写作方向，不是成文段落"
      },
      phrases: ["零散短句，不超过45字"],
      nextStep: "建议孩子先从哪张素材卡开始写",
      badge: "不超过6个汉字的徽章名"
    },
    title: adventure.title,
    grade: adventure.grade,
    type: adventure.type,
    answers
  });

  try {
    const response = await postJson(
      `${aiConfig.baseUrl}/chat/completions`,
      { Authorization: `Bearer ${aiConfig.apiKey}` },
      {
        model: aiConfig.model,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      },
      aiConfig.timeoutMs
    );

    const result = extractJson(response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content);
    return normalizeAiCard(result, fallbackCard);
  } catch (error) {
    console.error("AI generateHarvestCard failed:", error);
    return null;
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const { adventureId } = event;

  if (!adventureId) {
    return { status: "error", message: "缺少探险会话。" };
  }

  const adventureRes = await db.collection("adventures").doc(adventureId).get();
  const adventure = adventureRes.data;

  if (!adventure || adventure.openid !== wxContext.OPENID) {
    return { status: "error", message: "没有找到这次灵感探险。" };
  }

  const answers = adventure.answers || [];
  const gems = answers.map((item, index) => ({
    name: item.gemName || item.stepName || `素材宝石 ${index + 1}`,
    content: item.answer
  }));

  const fallbackCard = {
    openid: wxContext.OPENID,
    adventureId,
    title: adventure.title,
    grade: adventure.grade,
    type: adventure.type,
    typeId: adventure.typeId,
    gems,
    outline: OUTLINES[adventure.typeId] || OUTLINES.event,
    phrases: buildPhrases(answers),
    nextStep: "你可以先从最有画面感的一颗素材宝石开始写，再把其他素材接进去。",
    badge: "灵感探险家",
    createdAt: new Date(),
    deletedAt: null
  };
  const aiCard = await callAiForHarvestCard(adventure, fallbackCard);
  const card = aiCard ? {
    ...fallbackCard,
    gems: aiCard.gems,
    outline: aiCard.outline,
    phrases: aiCard.phrases,
    nextStep: aiCard.nextStep,
    badge: aiCard.badge,
    aiGenerated: true
  } : {
    ...fallbackCard,
    aiGenerated: false
  };

  const record = await db.collection("records").add({
    data: card
  });

  await db.collection("adventures").doc(adventureId).update({
    data: {
      status: "completed",
      recordId: record._id,
      updatedAt: new Date()
    }
  });

  return {
    status: "success",
    recordId: record._id,
    ...card
  };
};
