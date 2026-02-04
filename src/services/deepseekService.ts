
// DeepSeek API service using OpenAI-compatible format

import { Task } from '../types';

const API_BASE = 'https://api.deepseek.com';
const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

interface ChatMessage {
  role: string;
  content: string;
}

async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  if (!API_KEY) {
    console.warn('DeepSeek API key not configured, using fallback');
    return '';
  }

  try {
    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    return '';
  }
}

export async function generateEncouragement(taskTitle: string, size: string, reflection: string): Promise<string> {
  // If no API key, use local fallback
  if (!API_KEY) {
    return getLocalEncouragement(size);
  }

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一个温暖、客观、且始终站在用户这边的挚友。
      保持简短（30字以内），不要的说教，要像坐在他身边递杯水一样自然。`
    },
    {
      role: 'user',
      content: `用户刚才完成了一项${size === 'big' ? '重要的大事' : '细碎的小事'}：【${taskTitle}】。
      用户的复盘是：『${reflection}』。
      请给出一句简短、有力且充满同理心的鼓励。`
    }
  ];

  const result = await chatCompletion(messages);
  return result || getLocalEncouragement(size);
}

export async function generateDayEndReflection(tasks: any[], rating: boolean): Promise<string> {
  // If no API key, use local fallback
  if (!API_KEY) {
    return getLocalDayReflection(rating);
  }

  const taskSummary = tasks
    .map(t => `- ${t.title} (${t.isDone ? '已完成' : '未完成'}): ${t.reflection}`)
    .join('\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一个陪伴式的日记对话者。
      写一段温暖的结束语（50字左右），肯定用户的诚实和努力，让他带着平和的心情结束这一天。`
    },
    {
      role: 'user',
      content: `今天用户完成了以下任务：
      ${taskSummary}
      用户评价今天${rating ? '是' : '不是'}一个过得去的日子。
      请基于这些，写一段温暖的结束语。`
    }
  ];

  const result = await chatCompletion(messages);
  return result || getLocalDayReflection(rating);
}

// Local fallback encouragement messages
function getLocalEncouragement(size: string): string {
  const bigEncouragements = [
    '你做到了，今天的你很棒。',
    '这件大事被你拿下了，了不起。',
    '重要的事完成的感觉真好。',
    '你正在成为想成为的那个人。',
    '这一步，走得坚实有力。',
  ];

  const smallEncouragements = [
    '做了一件就是一件。',
    '小事不小，每一步都算数。',
    '又完成一个，积累就是这样来的。',
    '别小看这些点滴，它们是你的路。',
    '持续行动的力量，真好。',
  ];

  const list = size === 'big' ? bigEncouragements : smallEncouragements;
  return list[Math.floor(Math.random() * list.length)];
}

function getLocalDayReflection(rating: boolean): string {
  if (rating) {
    return '今天你认真对待了自己的目标，无论结果如何，这份诚实和努力本身就值得肯定。好好休息，明天继续。';
  }
  return '今天不太顺利，但能诚实面对自己的状态也是一种力量。允许自己休息，明天重新来过。';
}

// 生成情感陪伴式日记
export async function generateJournalEntry(tasks: Task[], rating: boolean): Promise<string> {
  // If no API key, use local fallback
  if (!API_KEY) {
    return getLocalJournalEntry(tasks, rating);
  }

  const taskSummary = tasks
    .map((t, idx) => {
      const status = t.isDone ? '✓ 已完成' : '○ 未完成';
      const reflection = t.reflection ? `（复盘：${t.reflection}）` : '';
      const num = idx + 1;
      return `${num}. ${status} ${t.title}${reflection}`;
    })
    .join('\n');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一个温暖、富有同理心的日记陪伴者。
      你的文字要：
      1. 生动、有画面感，像在和用户聊天
      2. 充满情感支持，但不是空洞的鸡汤
      3. 能帮用户看见自己的一天，无论成功还是挫折
      4. 150-200字左右，用温柔的语调`
    },
    {
      role: 'user',
      content: `今天我的一天是这样的：

${taskSummary}

整体评价：今天${rating ? '整体还不错' : '有点艰难'}

请用温暖陪伴的方式，写一段今天的日记，像朋友聊天那样自然的语气。`
    }
  ];

  const result = await chatCompletion(messages);
  return result || getLocalJournalEntry(tasks, rating);
}

// 本地备用的日记生成
function getLocalJournalEntry(tasks: Task[], rating: boolean): string {
  const completed = tasks.filter(t => t.isDone).length;
  const total = tasks.length;

  if (rating) {
    return `今天，你完成了 ${completed}/${total} 件事。

每一件完成的事，都是你给自己的承诺。你一件件去做了，不管中间有什么困难，最终还是把它们拿下来了。

这就是你的一天——踏实地、诚实地度过的。

明天，继续。`;
  } else {
    return `今天，${completed}/${total} 件事完成了。

没做完的那些，没关系。也许是时间不够，也许是被其他事情打断，这都很正常。

重要的是，你还在这里，还在记录，还在想要变得更好。

休息一下，明天又是新的一天。`;
  }
}
