
import { DayRecord } from '../types';

export const exportToMarkdown = (records: DayRecord[]) => {
  let md = "# 三件事复盘日记\n\n";
  records.forEach(record => {
    md += `## ${record.date}\n`;
    md += `**今日评价**: ${record.dayRating ? '过得去' : '不太如意'}\n`;
    md += `**总结**: ${record.dayReflection || '无'}\n\n`;
    record.tasks.forEach((task, idx) => {
      md += `### 任务 ${idx + 1}: ${task.title} (${task.size === 'big' ? '大事' : '小事'})\n`;
      md += `- 状态: ${task.isDone ? '已完成' : '未完成'}\n`;
      md += `- 复盘: ${task.reflection || '未填写'}\n`;
      if (task.encouragement) md += `- 鼓励: ${task.encouragement}\n`;
      md += `\n`;
    });
    md += "---\n\n";
  });

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `memo_export_${new Date().toISOString().split('T')[0]}.md`;
  a.click();
};

export const exportToCSV = (records: DayRecord[]) => {
  let csv = "Date,Task,Size,Status,Reflection,Encouragement,DayRating,DaySummary\n";
  records.forEach(record => {
    record.tasks.forEach(task => {
      csv += `"${record.date}","${task.title}","${task.size}","${task.isDone ? 'Done' : 'Pending'}","${(task.reflection || '').replace(/"/g, '""')}","${(task.encouragement || '').replace(/"/g, '""')}","${record.dayRating}","${(record.dayReflection || '').replace(/"/g, '""')}"\n`;
    });
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `memo_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};
