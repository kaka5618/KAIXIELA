const cloud = require("wx-server-sdk");

const DEFAULT_AI_BASE_URL = "https://kaixiela-d6gj7ytn9c262e774.api.tcloudbasegateway.com/v1/ai/cloudbase";
const DEFAULT_AI_MODEL = "hy3-preview";

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const TYPE_STEPS = {
  person: [
    ["person_impression", "人物印象", "这个人给你的第一感觉是什么？", "可以想一想他/她平时说话、做事、照顾你的样子。", "人物宝石"],
    ["person_language", "语言细节", "他/她最常说的一句话是什么？", "可以模仿一下这句话是在什么时候说的。", "语言宝石"],
    ["person_action", "动作细节", "他/她做事时有什么特别的小动作？", "比如做饭、走路、讲题、收拾东西时的小动作。", "动作宝石"],
    ["person_event", "具体事件", "有没有一件小事能说明他/她的特点？", "不用很大，一件你记得清楚的小事就可以。", "事件宝石"],
    ["person_feeling", "我的感受", "想到这件事，你心里有什么感觉？", "可以说感谢、开心、心疼、佩服，或者别的真实感受。", "感受宝石"]
  ],
  event: [
    ["event_start", "事件起点", "这件事发生在什么时候、什么地方？", "先说一个大概时间和地点就可以。", "起点宝石"],
    ["event_reason", "事情起因", "一开始为什么会发生这件事？", "是谁先做了什么，或者发生了什么情况？", "起因宝石"],
    ["event_turn", "关键时刻", "过程中最难忘的一刻是什么？", "可以是紧张、开心、意外或有点害怕的一刻。", "画面宝石"],
    ["event_detail", "细节声音", "当时谁说了什么话？你记得哪一句？", "一句话、一个动作、一个表情都可以。", "细节宝石"],
    ["event_gain", "收获变化", "这件事结束后，你有什么变化或收获？", "可以说你明白了什么，或者下次会怎么做。", "收获宝石"]
  ],
  object: [
    ["object_look", "外形观察", "它最特别的地方是什么？", "颜色、形状、大小、声音都可以说。", "外形宝石"],
    ["object_first", "第一次见", "你第一次见到它是什么时候？", "可以回忆是谁送的、在哪里看到的。", "来历宝石"],
    ["object_use", "特点用途", "它平时会帮你做什么，或者陪你做什么？", "说一个和你有关的用处。", "用途宝石"],
    ["object_story", "相关故事", "你和它之间有没有一个小故事？", "比如一次陪伴、一次损坏、一次特别经历。", "故事宝石"],
    ["object_feeling", "情感连接", "为什么它对你来说比较重要？", "可以说喜欢、珍惜、舍不得，或者它让你想到谁。", "情感宝石"]
  ],
  imagination: [
    ["imagination_role", "主角设定", "这个想象故事里的主角是谁？", "可以是你、动物、机器人，也可以是一个神奇角色。", "角色宝石"],
    ["imagination_world", "世界设定", "故事发生在一个怎样的地方？", "那里和现实世界有什么不一样？", "世界宝石"],
    ["imagination_problem", "问题出现", "主角遇到了什么麻烦或任务？", "这个问题越清楚，故事越好写。", "问题宝石"],
    ["imagination_adventure", "冒险经过", "冒险中最奇妙的一幕是什么？", "可以想一个最有画面感的场景。", "冒险宝石"],
    ["imagination_end", "结局意义", "最后问题解决了吗？主角有什么变化？", "可以说学会了什么，或者明白了什么。", "结局宝石"]
  ]
};

function needsSmallerHint(answer) {
  const text = String(answer || "").trim();
  return !text || text.length < 4 || ["不知道", "没有", "忘了", "不会", "不懂"].includes(text);
}

function isAiConfigured() {
  return Boolean(process.env.AI_API_KEY || process.env.TCB_API_KEY);
}

function getAiConfig() {
  return {
    apiKey: process.env.AI_API_KEY || process.env.TCB_API_KEY,
    baseUrl: (process.env.AI_BASE_URL || process.env.TCB_AI_BASE_URL || DEFAULT_AI_BASE_URL).replace(/\/$/, ""),
    model: process.env.AI_MODEL || process.env.TCB_AI_MODEL || DEFAULT_AI_MODEL,
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 12000
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
  return ["范文如下", "作文如下", "第一段", "第二段", "总之，", "下面是一篇"].some((keyword) => value.includes(keyword));
}

function validateQuestionResult(result) {
  if (!result || result.mode !== "question") return false;
  if (!result.question || String(result.question).length > 60) return false;
  if (result.hint && String(result.hint).length > 90) return false;
  if (hasForbiddenWriting(result.question) || hasForbiddenWriting(result.hint)) return false;
  return true;
}

async function callAiForQuestion({ adventure, steps, currentIndex, nextIndex, answer, defaultNext }) {
  if (!isAiConfigured()) return null;

  const aiConfig = getAiConfig();
  const history = (adventure.answers || []).map((item) => ({
    stepName: item.stepName,
    question: item.question,
    answer: item.answer
  }));

  const systemPrompt = [
    "你是“开写啦”的小学作文灵感引导助手，不是作文代写工具。",
    "你的服务对象是小学3-6年级孩子。你要通过温和、具体、简短的问题，帮助孩子回忆真实经历、观察生活细节、说出自己的感受。",
    "严格禁止生成完整作文、完整范文、完整段落、可直接提交的内容。",
    "严格禁止编造孩子没有说过的真实经历。",
    "每次只问一个主要问题。如果孩子回答很短，要把问题变小、变具体。",
    "输出必须是 JSON，不要输出 JSON 以外的任何文字。"
  ].join("\n");

  const userPrompt = JSON.stringify({
    task: "根据孩子刚刚的回答，生成下一关问题和提示。",
    requiredJson: {
      mode: "question",
      type: adventure.type,
      stepId: defaultNext[0],
      stepName: defaultNext[1],
      question: "不超过40个中文字符的一个问题",
      hint: "不超过60个中文字符的具体提示",
      gemName: defaultNext[4],
      shouldRetryCurrentStep: false,
      isFinalStep: nextIndex >= steps.length - 1
    },
    title: adventure.title,
    grade: adventure.grade,
    type: adventure.type,
    currentStep: steps[currentIndex],
    nextStep: defaultNext,
    childAnswer: answer,
    history
  });

  try {
    const response = await postJson(
      `${aiConfig.baseUrl}/chat/completions`,
      { Authorization: `Bearer ${aiConfig.apiKey}` },
      {
        model: aiConfig.model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      },
      aiConfig.timeoutMs
    );

    const result = extractJson(response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content);
    if (!validateQuestionResult(result)) return null;

    return {
      stepId: defaultNext[0],
      stepName: defaultNext[1],
      question: String(result.question).trim(),
      hint: String(result.hint || defaultNext[3]).trim(),
      gemName: defaultNext[4]
    };
  } catch (error) {
    console.error("AI nextQuestion failed:", error);
    return null;
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  const { adventureId, stepId } = event;
  const answer = String(event.answer || "").trim();

  if (!adventureId || !stepId) {
    return { status: "error", message: "缺少探险会话或关卡信息。" };
  }

  const adventureRes = await db.collection("adventures").doc(adventureId).get();
  const adventure = adventureRes.data;

  if (!adventure || adventure.openid !== wxContext.OPENID) {
    return { status: "error", message: "没有找到这次灵感探险。" };
  }

  const steps = TYPE_STEPS[adventure.typeId] || TYPE_STEPS.event;
  const currentIndex = Math.max(0, Number(adventure.currentStep) || 0);
  const current = steps[currentIndex] || steps[0];

  if (needsSmallerHint(answer)) {
    return {
      status: "retry",
      message: "没关系，我们把问题变小一点。",
      question: current[2],
      hint: "你可以先说一个画面、一个动作，或者一句你记得的话。",
      stepId: current[0],
      stepName: current[1],
      gemName: current[4],
      progress: {
        current: currentIndex + 1,
        total: steps.length
      }
    };
  }

  const nextAnswers = (adventure.answers || []).concat({
    stepId: current[0],
    stepName: current[1],
    question: current[2],
    answer,
    gemName: current[4],
    createdAt: new Date()
  });
  const nextIndex = currentIndex + 1;
  const completed = nextIndex >= steps.length;

  await db.collection("adventures").doc(adventureId).update({
    data: {
      currentStep: nextIndex,
      answers: nextAnswers,
      status: completed ? "ready_for_result" : "active",
      updatedAt: new Date()
    }
  });

  if (completed) {
    return {
      status: "complete",
      gem: {
        name: current[4],
        content: answer
      },
      message: "素材宝石收集完成！现在可以生成探险收获卡了。",
      progress: {
        current: steps.length,
        total: steps.length
      }
    };
  }

  const next = steps[nextIndex];
  const aiNext = await callAiForQuestion({
    adventure: { ...adventure, answers: nextAnswers },
    steps,
    currentIndex,
    nextIndex,
    answer,
    defaultNext: next
  });
  const nextPayload = aiNext || {
    stepId: next[0],
    stepName: next[1],
    question: next[2],
    hint: next[3],
    gemName: next[4]
  };

  return {
    status: "continue",
    gem: {
      name: current[4],
      content: answer
    },
    next: nextPayload,
    progress: {
      current: nextIndex + 1,
      total: steps.length
    }
  };
};
