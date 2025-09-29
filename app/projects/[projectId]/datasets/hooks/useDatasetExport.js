'use client';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import axios from 'axios';

const useDatasetExport = projectId => {
  const { t } = useTranslation();

  // 分批导出数据集（用于大数据量）
  const exportDatasetsStreaming = async (exportOptions, onProgress) => {
    try {
      const batchSize = exportOptions.batchSize || 1000;
      let offset = 0;
      let allData = [];
      let hasMore = true;
      let totalProcessed = 0;

      // 分批获取数据
      while (hasMore) {
        let apiUrl = `/api/projects/${projectId}/datasets/export`;
        const params = ['batchMode=true', `offset=${offset}`, `batchSize=${batchSize}`];

        if (exportOptions.confirmedOnly) {
          params.push(`status=confirmed`);
        }

        // 检查是否是平衡导出模式
        if (exportOptions.balanceMode && exportOptions.balanceConfig) {
          params.push(`balanceMode=true`);
          params.push(`balanceConfig=${encodeURIComponent(JSON.stringify(exportOptions.balanceConfig))}`);
        }

        apiUrl += `?${params.join('&')}`;

        const response = await axios.get(apiUrl);
        const batchResult = response.data;

        // 如果需要包含文本块内容，批量查询并填充
        if (exportOptions.customFields?.includeChunk && batchResult.data.length > 0) {
          const chunkNames = batchResult.data.map(item => item.chunkName).filter(name => name); // 过滤掉空值

          if (chunkNames.length > 0) {
            try {
              const chunkResponse = await axios.post(`/api/projects/${projectId}/chunks/batch-content`, {
                chunkNames
              });
              const chunkContentMap = chunkResponse.data;

              // 填充 chunkContent
              batchResult.data.forEach(item => {
                if (item.chunkName && chunkContentMap[item.chunkName]) {
                  item.chunkContent = chunkContentMap[item.chunkName];
                }
              });
            } catch (chunkError) {
              console.error('获取文本块内容失败:', chunkError);
              // 继续处理，但不包含文本块内容
            }
          }
        }

        allData.push(...batchResult.data);
        hasMore = batchResult.hasMore;
        offset = batchResult.offset;
        totalProcessed += batchResult.data.length;

        // 通知进度更新
        if (onProgress) {
          onProgress({
            processed: totalProcessed,
            currentBatch: batchResult.data.length,
            hasMore
          });
        }

        // 避免过快请求，给服务器一点缓冲时间
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // 处理和下载数据
      await processAndDownloadData(allData, exportOptions);

      toast.success(t('datasets.exportSuccess'));
      return true;
    } catch (error) {
      console.error('Streaming export failed:', error);
      toast.error(error.message || t('datasets.exportFailed'));
      return false;
    }
  };

  // 处理和下载数据的通用函数
  const processAndDownloadData = async (dataToExport, exportOptions) => {
    // 根据选择的格式转换数据
    let formattedData;
    // 不同文件格式
    let mimeType = 'application/json';

    if (exportOptions.formatType === 'alpaca') {
      // 根据选择的字段类型生成不同的数据格式
      if (exportOptions.alpacaFieldType === 'instruction') {
        // 使用 instruction 字段
        formattedData = dataToExport.map(({ question, answer, cot }) => ({
          instruction: question,
          input: '',
          output: cot && exportOptions.includeCOT ? `<think>${cot}</think>\n${answer}` : answer,
          system: exportOptions.systemPrompt || ''
        }));
      } else {
        // 使用 input 字段
        formattedData = dataToExport.map(({ question, answer, cot }) => ({
          instruction: exportOptions.customInstruction || '',
          input: question,
          output: cot && exportOptions.includeCOT ? `<think>${cot}</think>\n${answer}` : answer,
          system: exportOptions.systemPrompt || ''
        }));
      }
    } else if (exportOptions.formatType === 'sharegpt') {
      formattedData = dataToExport.map(({ question, answer, cot }) => {
        const messages = [];

        // 添加系统提示词（如果有）
        if (exportOptions.systemPrompt) {
          messages.push({
            role: 'system',
            content: exportOptions.systemPrompt
          });
        }

        // 添加用户问题
        messages.push({
          role: 'user',
          content: question
        });

        // 添加助手回答
        messages.push({
          role: 'assistant',
          content: cot && exportOptions.includeCOT ? `<think>${cot}</think>\n${answer}` : answer
        });

        return { messages };
      });
    } else if (exportOptions.formatType === 'custom') {
      // 处理自定义格式
      const { questionField, answerField, cotField, includeLabels, includeChunk, questionOnly } =
        exportOptions.customFields;
      formattedData = dataToExport.map(({ question, answer, cot, questionLabel: labels, chunkContent }) => {
        const item = {
          [questionField]: question
        };

        // 如果不是仅导出问题模式，添加答案字段
        if (!questionOnly) {
          item[answerField] = answer;
        }

        // 如果有思维链且用户选择包含思维链，且不是仅导出问题模式，则添加思维链字段
        if (cot && exportOptions.includeCOT && cotField && !questionOnly) {
          item[cotField] = cot;
        }

        // 如果需要包含标签
        if (includeLabels && labels && labels.length > 0) {
          item.label = labels.split(' ')[1];
        }

        // 如果需要包含文本块内容
        if (includeChunk && chunkContent) {
          item.chunk = chunkContent;
        }

        return item;
      });
    }

    // 处理不同的文件格式
    let content;
    let fileExtension;

    if (exportOptions.fileFormat === 'jsonl') {
      // JSONL 格式：每行一个 JSON 对象
      content = formattedData.map(item => JSON.stringify(item)).join('\n');
      fileExtension = 'jsonl';
    } else if (exportOptions.fileFormat === 'csv') {
      // CSV 格式
      const headers = Object.keys(formattedData[0] || {});
      const csvRows = [
        // 添加表头
        headers.join(','),
        // 添加数据行
        ...formattedData.map(item =>
          headers
            .map(header => {
              // 处理包含逗号、换行符或双引号的字段
              let field = item[header]?.toString() || '';
              if (exportOptions.formatType === 'sharegpt') field = JSON.stringify(item[header]);
              if (field.includes(',') || field.includes('\n') || field.includes('"')) {
                field = `"${field.replace(/"/g, '""')}"`;
              }
              return field;
            })
            .join(',')
        )
      ];
      content = csvRows.join('\n');
      fileExtension = 'csv';
    } else {
      // 默认 JSON 格式
      content = JSON.stringify(formattedData, null, 2);
      fileExtension = 'json';
    }

    // 创建 Blob 对象
    const blob = new Blob([content], { type: mimeType || 'application/json' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const formatSuffix = exportOptions.formatType === 'alpaca' ? 'alpaca' : 'sharegpt';
    const balanceSuffix = exportOptions.balanceMode ? '-balanced' : '';
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `datasets-${projectId}-${formatSuffix}${balanceSuffix}-${dateStr}.${fileExtension}`;

    // 触发下载
    document.body.appendChild(a);
    a.click();

    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导出数据集（保持向后兼容的原有功能）
  const exportDatasets = async exportOptions => {
    try {
      let apiUrl = `/api/projects/${projectId}/datasets/export`;
      const params = [];

      if (exportOptions.confirmedOnly) {
        params.push(`status=confirmed`);
      }

      // 检查是否是平衡导出模式
      if (exportOptions.balanceMode && exportOptions.balanceConfig) {
        params.push(`balanceMode=true`);
        params.push(`balanceConfig=${encodeURIComponent(JSON.stringify(exportOptions.balanceConfig))}`);
      }

      if (params.length > 0) {
        apiUrl += `?${params.join('&')}`;
      }

      const response = await axios.get(apiUrl);
      let dataToExport = response.data;

      // 使用通用的数据处理和下载函数
      await processAndDownloadData(dataToExport, exportOptions);

      toast.success(t('datasets.exportSuccess'));
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  // 导出平衡数据集
  const exportBalancedDataset = async exportOptions => {
    const balancedOptions = {
      ...exportOptions,
      balanceMode: true,
      balanceConfig: exportOptions.balanceConfig
    };
    return await exportDatasets(balancedOptions);
  };

  return {
    exportDatasets,
    exportBalancedDataset,
    exportDatasetsStreaming
  };
};

export default useDatasetExport;
export { useDatasetExport };
