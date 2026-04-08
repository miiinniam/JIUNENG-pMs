/**
 * features/user/project — 内部员工端项目管理功能入口
 * ─────────────────────────────────────────────────────────────────────────────
 * 导出项目执行、在途跟踪、历史订单等操作函数。
 * ─────────────────────────────────────────────────────────────────────────────
 */
export {
  fetchFormalProjectsUi,
  fetchPotentialProjectsUi,
  fetchDashboardStats,
  fetchRecentProjectsUi,
} from '../../../services/projectService';

export type { ProjectRow, PotentialProjectRow } from '../../../lib/types';
