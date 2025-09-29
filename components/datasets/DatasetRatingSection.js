'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Divider, Paper } from '@mui/material';
import { toast } from 'sonner';
import StarRating from './StarRating';
import TagSelector from './TagSelector';
import NoteInput from './NoteInput';
import { useTranslation } from 'react-i18next';

/**
 * 数据集评分、标签、备注综合组件
 */
export default function DatasetRatingSection({ dataset, projectId, onUpdate }) {
  const { t } = useTranslation();
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(false);

  // 解析数据集中的标签
  const parseDatasetTags = tagsString => {
    try {
      return JSON.parse(tagsString || '[]');
    } catch (e) {
      return [];
    }
  };

  // 本地状态管理，从 props 初始化
  const [localScore, setLocalScore] = useState(dataset.score || 0);
  const [localTags, setLocalTags] = useState(() => parseDatasetTags(dataset.tags));
  const [localNote, setLocalNote] = useState(dataset.note || '');

  // 获取项目中已使用的标签
  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/datasets/tags`);
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data.tags || []);
        }
      } catch (error) {
        console.error('获取可用标签失败:', error);
      }
    };

    if (projectId) {
      fetchAvailableTags();
    }
  }, [projectId]);

  // 同步props中的dataset到本地状态
  useEffect(() => {
    setLocalScore(dataset.score || 0);
    setLocalTags(parseDatasetTags(dataset.tags));
    setLocalNote(dataset.note || '');
  }, [dataset]);

  // 更新数据集元数据
  const updateMetadata = async updates => {
    if (loading) return;

    // 立即更新本地状态，提升响应速度
    if (updates.score !== undefined) {
      setLocalScore(updates.score);
    }
    if (updates.tags !== undefined) {
      setLocalTags(updates.tags);
    }
    if (updates.note !== undefined) {
      setLocalNote(updates.note);
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/datasets/${dataset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('更新失败');
      }

      const result = await response.json();

      // 显示成功提示
      toast.success(t('datasets.updateSuccess', '更新成功'));

      // 如果有父组件的更新回调，调用它
      if (onUpdate) {
        onUpdate(result.dataset);
      }
    } catch (error) {
      console.error('更新数据集元数据失败:', error);
      // 显示错误提示
      toast.error(t('datasets.updateFailed', '更新失败'));

      // 出错时恢复本地状态
      if (updates.score !== undefined) {
        setLocalScore(dataset.score || 0);
      }
      if (updates.tags !== undefined) {
        setLocalTags(parseDatasetTags(dataset.tags));
      }
      if (updates.note !== undefined) {
        setLocalNote(dataset.note || '');
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理评分变更
  const handleScoreChange = newScore => {
    updateMetadata({ score: newScore });
  };

  // 处理标签变更
  const handleTagsChange = newTags => {
    updateMetadata({ tags: newTags });
  };

  // 处理备注变更
  const handleNoteChange = newNote => {
    updateMetadata({ note: newNote });
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('datasets.evaluation', '数据集标注')}
      </Typography>

      {/* 评分区域 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {t('datasets.rating', '评分')}
        </Typography>
        <StarRating value={localScore} onChange={handleScoreChange} readOnly={loading} />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 标签区域 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          {t('datasets.customTags', '自定义标签')}
        </Typography>
        <TagSelector
          value={localTags}
          onChange={handleTagsChange}
          availableTags={availableTags}
          readOnly={loading}
          placeholder={t('datasets.addCustomTag', '添加自定义标签...')}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 备注区域 */}
      <NoteInput
        value={localNote}
        onChange={handleNoteChange}
        readOnly={loading}
        placeholder={t('datasets.addNote', '添加备注...')}
      />
    </Paper>
  );
}
