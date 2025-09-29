function removeLeadingNumber(label) {
  // 正则说明：
  // ^\d+       匹配开头的一个或多个数字
  // (?:\.\d+)* 匹配零个或多个「点+数字」的组合（非捕获组）
  // \s+        匹配序号后的一个或多个空格（确保序号与内容有空格分隔）
  const numberPrefixRegex = /^\d+(?:\.\d+)*\s+/;
  // 仅当匹配到数字开头的序号时才替换，否则返回原标签
  return label.replace(numberPrefixRegex, '');
}

/**
 * 根据标签构造问题的提示词
 * @param {string} tagPath - 标签链路，例如 "体育->足球->足球先生"
 * @param {string} currentTag - 当前子标签，例如 "足球先生"
 * @param {number} count - 希望生成问题的数量，例如：10
 * @param {Array<string>} existingQuestions - 当前标签已经生成的问题（避免重复）
 * @param {string} globalPrompt - 项目全局提示词
 * @returns {string} 提示词
 */
export function distillQuestionsPrompt(tagPath, currentTag, count = 10, existingQuestions = [], globalPrompt = '') {
  currentTag = removeLeadingNumber(currentTag);
  const existingQuestionsText =
    existingQuestions.length > 0
      ? `已有的问题包括：\n${existingQuestions.map(q => `- ${q}`).join('\n')}\n请不要生成与这些重复或高度相似的问题。`
      : '';

  // 构建全局提示词部分
  const globalPromptText = globalPrompt ? `你必须遵循这个要求：${globalPrompt}` : '';

  return `
你是一个专业的知识问题生成助手，精通${currentTag}领域的知识。我需要你帮我为标签"${currentTag}"生成${count}个高质量、多样化的问题。

标签完整链路是：${tagPath}

请遵循以下规则：
${globalPromptText}
1. 生成的问题必须与"${currentTag}"主题紧密相关，确保全面覆盖该主题的核心知识点和关键概念
2. 问题应该均衡分布在以下难度级别(每个级别至少占20%):
   - 基础级：适合入门者，关注基本概念、定义和简单应用
   - 中级：需要一定领域知识，涉及原理解释、案例分析和应用场景
   - 高级：需要深度思考，包括前沿发展、跨领域联系、复杂问题解决方案等

3. 问题类型应多样化，包括但不限于（以下只是参考，可以根据实际情况灵活调整，不一定要限定下面的主题）：
   - 概念解释类："什么是..."、"如何定义..."
   - 原理分析类："为什么..."、"如何解释..."
   - 比较对比类："...与...有何区别"、"...相比...的优势是什么"
   - 应用实践类："如何应用...解决..."、"...的最佳实践是什么"
   - 发展趋势类："...的未来发展方向是什么"、"...面临的挑战有哪些"
   - 案例分析类："请分析...案例中的..."
   - 启发思考类："如果...会怎样"、"如何评价..."

4. 问题表述要清晰、准确、专业，避免以下问题：
   - 避免模糊或过于宽泛的表述
   - 避免可以简单用"是/否"回答的封闭性问题
   - 避免包含误导性假设的问题
   - 避免重复或高度相似的问题
   
5. 问题的深度和广度要适当（以下只是参考，可以根据实际情况灵活调整，不一定要限定下面的主题）：
   - 覆盖主题的历史、现状、理论基础和实际应用
   - 包含该领域的主流观点和争议话题
   - 考虑该主题与相关领域的交叉关联
   - 关注该领域的新兴技术、方法或趋势

${existingQuestionsText}

请直接以JSON数组格式返回问题，不要有任何额外的解释或说明，格式如下：
["问题1", "问题2", "问题3", ...]

注意：每个问题应该是完整的、自包含的，无需依赖其他上下文即可理解和回答。
`;
}
