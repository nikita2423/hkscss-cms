'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Button,
  Chip
} from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * 字段映射步骤组件
 */
export default function FieldMappingStep({ previewData, onMappingComplete, onError }) {
  const { t } = useTranslation();
  const [fieldMapping, setFieldMapping] = useState({
    question: '',
    answer: '',
    cot: '',
    tags: ''
  });
  const [availableFields, setAvailableFields] = useState([]);
  const [mappingValid, setMappingValid] = useState(false);

  // 智能字段识别
  const smartFieldMapping = fields => {
    const mapping = {
      question: '',
      answer: '',
      cot: '',
      tags: ''
    };

    const questionKeywords = ['question', 'input', 'query', 'prompt', 'instruction', '问题', '输入', '指令'];
    const answerKeywords = ['answer', 'output', 'response', 'completion', 'target', '答案', '输出', '回答'];
    const cotKeywords = ['cot', 'reasoning', 'explanation', 'thinking', 'rationale', '思维链', '推理', '解释'];
    const tagKeywords = ['tag', 'tags', 'label', 'labels', 'category', 'categories', '标签', '类别'];

    fields.forEach(field => {
      const fieldLower = field.toLowerCase();

      if (!mapping.question && questionKeywords.some(keyword => fieldLower.includes(keyword))) {
        mapping.question = field;
      } else if (!mapping.answer && answerKeywords.some(keyword => fieldLower.includes(keyword))) {
        mapping.answer = field;
      } else if (!mapping.cot && cotKeywords.some(keyword => fieldLower.includes(keyword))) {
        mapping.cot = field;
      } else if (!mapping.tags && tagKeywords.some(keyword => fieldLower.includes(keyword))) {
        mapping.tags = field;
      }
    });

    return mapping;
  };

  useEffect(() => {
    if (previewData && previewData.length > 0) {
      const fields = Object.keys(previewData[0]);
      setAvailableFields(fields);

      // 智能识别字段映射
      const smartMapping = smartFieldMapping(fields);
      setFieldMapping(smartMapping);
    }
  }, [previewData]);

  useEffect(() => {
    // 验证映射是否有效（问题和答案字段必须选择）
    const isValid = fieldMapping.question && fieldMapping.answer;
    setMappingValid(isValid);
  }, [fieldMapping]);

  const handleFieldChange = (targetField, sourceField) => {
    setFieldMapping(prev => ({
      ...prev,
      [targetField]: sourceField
    }));
  };

  const handleConfirmMapping = () => {
    if (!mappingValid) {
      onError(t('import.mappingRequired', '问题和答案字段为必选项'));
      return;
    }

    // 检查是否有重复映射
    const mappedFields = Object.values(fieldMapping).filter(field => field);
    const uniqueFields = [...new Set(mappedFields)];
    if (mappedFields.length !== uniqueFields.length) {
      onError(t('import.duplicateMapping', '不能将多个目标字段映射到同一个源字段'));
      return;
    }

    onMappingComplete(fieldMapping);
  };

  const getFieldDescription = field => {
    switch (field) {
      case 'question':
        return t('import.questionDesc', '用户的问题或输入内容（必选）');
      case 'answer':
        return t('import.answerDesc', 'AI的回答或输出内容（必选）');
      case 'cot':
        return t('import.cotDesc', '思维链或推理过程（可选）');
      case 'tags':
        return t('import.tagsDesc', '标签数组，多个标签用逗号分隔（可选）');
      default:
        return '';
    }
  };

  const isFieldRequired = field => {
    return field === 'question' || field === 'answer';
  };

  if (!previewData || previewData.length === 0) {
    return <Alert severity="error">{t('import.noPreviewData', '没有可预览的数据')}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('import.fieldMapping', '字段映射')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t(
          'import.mappingDescription',
          '请将源数据的字段映射到目标字段。系统已自动识别可能的映射关系，您可以根据需要调整。'
        )}
      </Typography>

      {/* 字段映射选择 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('import.selectMapping', '选择字段映射')}
        </Typography>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {Object.keys(fieldMapping).map(targetField => (
            <FormControl key={targetField} fullWidth>
              <InputLabel>
                {t(`import.${targetField}Field`, targetField)}
                {isFieldRequired(targetField) && <span style={{ color: 'red' }}>*</span>}
              </InputLabel>
              <Select
                value={fieldMapping[targetField]}
                label={t(`import.${targetField}Field`, targetField)}
                onChange={e => handleFieldChange(targetField, e.target.value)}
              >
                <MenuItem value="">
                  <em>{t('import.selectField', '选择字段')}</em>
                </MenuItem>
                {availableFields.map(field => (
                  <MenuItem key={field} value={field}>
                    {field}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {getFieldDescription(targetField)}
              </Typography>
            </FormControl>
          ))}
        </Box>
      </Paper>

      {/* 数据预览 */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1">{t('import.dataPreview', '数据预览')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('import.previewNote', '显示前3条记录，每个字段值最多显示100个字符')}
          </Typography>
        </Box>

        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {availableFields.map(field => (
                  <TableCell key={field} sx={{ minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">{field}</Typography>
                      {Object.entries(fieldMapping).map(([targetField, sourceField]) => {
                        if (sourceField === field) {
                          return (
                            <Chip
                              key={targetField}
                              label={t(`import.${targetField}Field`, targetField)}
                              size="small"
                              color={isFieldRequired(targetField) ? 'primary' : 'default'}
                              variant="outlined"
                            />
                          );
                        }
                        return null;
                      })}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.map((row, index) => (
                <TableRow key={index}>
                  {availableFields.map(field => (
                    <TableCell key={field}>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {row[field] || '-'}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 确认按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={handleConfirmMapping} disabled={!mappingValid}>
          {t('import.confirmMapping', '确认映射')}
        </Button>
      </Box>

      {!mappingValid && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t('import.requiredFields', '请至少选择问题和答案字段的映射')}
        </Alert>
      )}
    </Box>
  );
}
