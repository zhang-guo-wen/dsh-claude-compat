/** `/btw` answer card copy (zh is the source of truth; en mirrors it). */

/** Dictionary namespace owned by this plugin's card. */
export const NS = 'claudeCompatBtw'

const zh = {
  'card.title': '/btw 侧边问答',
  'card.aria': '/btw 侧边问答卡片',
  'card.dismiss': '关闭卡片',
  'status.watching': '正在回答…',
  'status.answered': '已回答',
  'status.failed': '失败',
}

/** Key union, sourced from the Chinese dictionary. */
export type BtwCardKey = keyof typeof zh

const en: Record<BtwCardKey, string> = {
  'card.title': '/btw side question',
  'card.aria': '/btw side question card',
  'card.dismiss': 'Dismiss card',
  'status.watching': 'Answering…',
  'status.answered': 'Answered',
  'status.failed': 'Failed',
}

export { zh, en }
